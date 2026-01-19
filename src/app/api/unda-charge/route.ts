import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { customer_no, amount, reference, account_id, channel_id } = await req.json();

    const UNDA_URL = process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL;
    const UNDA_ANON_KEY = process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY;
    const PLATFORM_UID = "49743906-9bd7-4ed0-b184-5d9abd2a72a3";

    // 1. Get a fresh token for database access
    const authRes = await fetch(`${UNDA_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': UNDA_ANON_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.UNDA_API_EMAIL,
        password: process.env.UNDA_API_PASSWORD
      })
    });
    const { access_token: token } = await authRes.json();

    // Fetch the RAW api_key from the base 'channels' table
    // We use the ID passed from the frontend to find the real key
    const supabase = createClient(UNDA_URL!, UNDA_ANON_KEY!);
    const { data: channel } = await supabase
      .from('channels')
      .select('api_key')
      .eq('id', channel_id)
      .single()
      .setHeader('Authorization', `Bearer ${token}`);

    if (!channel?.api_key) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    // 3. Request the STK Push using the RAW key
    const chargeResponse = await fetch(
      `${UNDA_URL}/functions/v1/api-public-channels-mpesa-charge-req?api_key=${channel.api_key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': UNDA_ANON_KEY!,
          'Authorization': `Bearer ${token}`,
          'x-platform-uid': PLATFORM_UID
        },
        body: JSON.stringify({
          customer_no,
          amount: Number(amount),
          reference,
          details: `SplitBill: ${reference}`
        })
      }
    );

    const chargeResult = await chargeResponse.json();
    return NextResponse.json(chargeResult, { status: chargeResponse.status });

  } catch (error: any) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }
}