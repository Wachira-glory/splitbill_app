import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Verify if the payment was successful (Quikk/M-Pesa status)
    if (body.status !== 'SUCCESS') {
       return NextResponse.json({ message: "Payment not successful" });
    }

    // 2. Connect to Unda Supabase using Service Role (to bypass RLS for the hook)
    const undaSupa = createClient(
      process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service key for system updates
    );

    // 3. Find the 'item' we created during the charge request
    // We match via the reference sent to Quikk
    const { data: item, error: findError } = await undaSupa
      .from('items')
      .select('*, accounts(*)')
      .eq('data->>reference', body.reference)
      .single();

    if (item) {
      // 4. Update the item status
      await undaSupa.from('items').update({ status: 'paid' }).eq('id', item.id);

      // 5. Update the account balance (The Actual Reconciliation)
      const newBalance = (item.accounts.balance || 0) + Number(body.amount);
      
      await undaSupa
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', item.account_id);

      console.log(`✅ Reconciled KES ${body.amount} to Account ${item.account_id}`);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error("Hook Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}