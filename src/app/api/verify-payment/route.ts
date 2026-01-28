import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check payment status
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        paid: false,
        status: session.payment_status,
      });
    }

    // Get grid details if it's a per-grid payment
    const { grid_id, product_type } = session.metadata || {};

    let gridData = null;
    if (grid_id && product_type === 'per-grid') {
      const { data: grid } = await supabase
        .from('grids')
        .select('id, share_code, is_premium')
        .eq('id', grid_id)
        .single();

      gridData = grid;
    }

    return NextResponse.json({
      paid: true,
      status: session.payment_status,
      productType: product_type,
      gridId: grid_id,
      grid: gridData,
      amount: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
