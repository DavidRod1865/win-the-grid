import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICING } from '@/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase server credentials are not configured' },
        { status: 500 }
      );
    }

    const { gridId, userId, productType } = await req.json();

    // Validate required fields
    if (!gridId || !userId || !productType) {
      return NextResponse.json(
        { error: 'Missing required fields: gridId, userId, productType' },
        { status: 400 }
      );
    }

    if (gridId === 'local-grid') {
      return NextResponse.json(
        { error: 'Invalid gridId: grid must be saved before checkout' },
        { status: 400 }
      );
    }

    if (productType !== 'per-grid' && productType !== 'season-pass') {
      return NextResponse.json(
        { error: 'Invalid product type. Must be per-grid or season-pass' },
        { status: 400 }
      );
    }

    // Check if grid exists and user owns it
    const { data: grid, error: gridError } = await supabase
      .from('grids')
      .select('id, created_by, is_premium')
      .eq('id', gridId)
      .single();

    if (gridError) {
      console.error('Failed to load grid for checkout:', gridError);
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === 'production'
              ? 'Failed to load grid'
              : `Failed to load grid: ${gridError.message}`,
        },
        { status: 500 }
      );
    }

    if (!grid) {
      return NextResponse.json(
        { error: 'Grid not found' },
        { status: 404 }
      );
    }

    if (grid.created_by !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this grid' },
        { status: 403 }
      );
    }

    // Check if grid is already premium
    if (grid.is_premium && productType === 'per-grid') {
      return NextResponse.json(
        { error: 'Grid is already premium' },
        { status: 400 }
      );
    }

    // Get pricing
    const pricing = productType === 'per-grid' ? PRICING.PER_GRID : PRICING.SEASON_PASS;

    if (!pricing.priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for this product' },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subscription?.stripe_customer_id) {
      stripeCustomerId = subscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const customer = await stripe.customers.create({
        email: userData?.user?.email,
        metadata: {
          user_id: userId,
        },
      });
      stripeCustomerId = customer.id;

      // Update user_subscriptions with Stripe customer ID
      await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
        });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: productType === 'per-grid' ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: pricing.priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/edit-grid/${gridId}?payment=cancelled`,
      metadata: {
        grid_id: gridId,
        user_id: userId,
        product_type: productType,
        amount: pricing.amount.toString(),
      },
    });

    // Record payment as pending
    await supabase.from('payments').insert({
      user_id: userId,
      grid_id: productType === 'per-grid' ? gridId : null,
      amount: pricing.amount,
      currency: pricing.currency,
      stripe_checkout_session_id: session.id,
      status: 'pending',
      payment_type: productType,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
