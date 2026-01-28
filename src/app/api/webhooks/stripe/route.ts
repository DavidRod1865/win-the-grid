import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Helper function to generate unique 6-character share code
 */
async function generateUniqueShareCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous characters
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code is unique
    const { data } = await supabase
      .from('grids')
      .select('id')
      .eq('share_code', code)
      .single();

    if (!data) {
      return code;
    }

    attempts++;
  }

  // Fallback: use timestamp + random chars
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
  const random = Math.random().toString(36).slice(-3).toUpperCase();
  return timestamp + random;
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { grid_id, user_id, product_type, amount } = session.metadata!;

  console.log('Processing checkout completion:', {
    session_id: session.id,
    grid_id,
    user_id,
    product_type,
  });

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: 'completed',
      stripe_payment_intent_id: session.payment_intent as string,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_checkout_session_id', session.id);

  if (product_type === 'per-grid') {
    // Unlock grid with premium features
    const shareCode = await generateUniqueShareCode();

    await supabase
      .from('grids')
      .update({
        is_premium: true,
        premium_unlocked_at: new Date().toISOString(),
        share_code: shareCode,
      })
      .eq('id', grid_id);

    console.log('Grid unlocked:', { grid_id, share_code: shareCode });

    // Update user subscription stats
    await supabase.rpc('increment_grids_purchased', {
      p_user_id: user_id,
      p_amount: parseFloat(amount),
    });
  } else if (product_type === 'season-pass') {
    // Activate season pass
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 months from now

    await supabase
      .from('user_subscriptions')
      .update({
        season_pass_active: true,
        season_pass_expires_at: expiresAt.toISOString(),
        stripe_subscription_id: session.subscription as string,
        total_spent: supabase.rpc('increment', { amount: parseFloat(amount) }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);

    // Upgrade all user's grids to premium
    const { data: userGrids } = await supabase
      .from('grids')
      .select('id')
      .eq('created_by', user_id)
      .eq('is_premium', false);

    if (userGrids && userGrids.length > 0) {
      for (const grid of userGrids) {
        const shareCode = await generateUniqueShareCode();
        await supabase
          .from('grids')
          .update({
            is_premium: true,
            premium_unlocked_at: new Date().toISOString(),
            share_code: shareCode,
          })
          .eq('id', grid.id);
      }
    }

    console.log('Season pass activated:', { user_id, expires_at: expiresAt });
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  // Type assertion needed: current_period_end exists in API but missing from TS definitions in Stripe v20.2.0
  const expiresAt = new Date((subscription as any).current_period_end * 1000);

  await supabase
    .from('user_subscriptions')
    .update({
      season_pass_active: true,
      season_pass_expires_at: expiresAt.toISOString(),
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  console.log('Subscription created:', { user_id: userId, subscription_id: subscription.id });
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;

  if (!userId) {
    // Try to find user by Stripe subscription ID
    const { data } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!data) {
      console.error('Cannot find user for cancelled subscription');
      return;
    }
  }

  await supabase
    .from('user_subscriptions')
    .update({
      season_pass_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Note: Don't downgrade existing grids, they remain premium
  console.log('Subscription cancelled:', { subscription_id: subscription.id });
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  console.log('Payment failed:', { payment_intent_id: paymentIntent.id });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  console.log('Received Stripe event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
