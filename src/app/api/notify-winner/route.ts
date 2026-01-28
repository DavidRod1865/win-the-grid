import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { gridId, winner } = await request.json();

    if (!gridId || !winner) {
      return NextResponse.json(
        { error: 'Missing required fields: gridId and winner' },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get grid details including owner information
    const { data: grid, error: gridError } = await supabase
      .from('grids')
      .select('id, title, created_by, is_premium')
      .eq('id', gridId)
      .single();

    if (gridError || !grid) {
      console.error('Failed to fetch grid:', gridError);
      return NextResponse.json(
        { error: 'Grid not found' },
        { status: 404 }
      );
    }

    // Get owner's email for notification
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(grid.created_by);

    if (userError || !userData.user) {
      console.error('Failed to fetch user:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Log notification (you can extend this to actually send emails/SMS)
    console.log('Winner notification:', {
      gridId,
      gridTitle: grid.title,
      winner,
      ownerEmail: userData.user.email,
      quarter: winner.quarter,
      amount: winner.amount,
      participantName: winner.name,
    });

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // Example:
    // await sendEmail({
    //   to: userData.user.email,
    //   subject: `Winner announced: ${grid.title} - ${winner.quarter}`,
    //   body: `${winner.name} won $${winner.amount} for ${winner.quarter}!`
    // });

    // For now, we'll just track that a notification was requested
    // You could add a notifications table to track these
    const notificationData = {
      grid_id: gridId,
      recipient_email: userData.user.email,
      notification_type: 'winner_announced',
      winner_quarter: winner.quarter,
      winner_name: winner.name,
      winner_amount: winner.amount,
      sent_at: new Date().toISOString(),
      status: 'pending', // Would be 'sent' if email service is integrated
    };

    console.log('Notification logged:', notificationData);

    return NextResponse.json({
      success: true,
      message: 'Winner notification processed',
      notification: notificationData,
    });
  } catch (error) {
    console.error('Error notifying winner:', error);
    return NextResponse.json(
      { error: 'Failed to notify winner' },
      { status: 500 }
    );
  }
}
