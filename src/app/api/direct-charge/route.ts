// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import crypto from 'crypto';

// export async function POST(req: Request) {
//   try {
//     const rawText = await req.text();
//     const body = JSON.parse(rawText.trim());
//     const { customer_no, amount,team_id, reference, account_id, destination_channel } = body;

//     // 1. NEW CREDENTIALS
//     const key = "5f39932e1f401c57034c10dfab8ccedd";
//     const secret = "9914fed28e9497cc1ab70563b50ca2ff";
//     const DATE_HEADER = "date";
//     const timestamp = new Date().toUTCString();
    
//     // 2. GENERATE HMAC (Exact Mirror of your Express logic)
//     const toEncode = `${DATE_HEADER}: ${timestamp}`;
//     const hmac = crypto
//         .createHmac("SHA256", secret)
//         .update(toEncode)
//         .digest();
    
//     const encoded = Buffer.from(hmac).toString("base64");
//     const urlEncoded = encodeURIComponent(encoded);

//     const authString = `keyId="${key}",algorithm="hmac-sha256",headers="${DATE_HEADER}",signature="${urlEncoded}"`;
    
//     console.log("--- AUTH DEBUG ---");
//     console.log("Timestamp:", timestamp);
//     console.log("AuthHeader:", authString);

//     // 3. CONSTRUCT PAYLOAD
//     const requestBody = {
//         "data": {
//             "id": "gid",
//             "type": "charge",
//             "attributes": {
//                 "amount": parseFloat(amount),
//                 "posted_at": new Date().toISOString(),
//                 "reference": reference,
//                 "short_code": destination_channel,
//                 "customer_no": String(customer_no),
//                 "customer_type": "msisdn"
//             }
//         }
//     };

//     // 4. THE REQUEST
//     const quikkResponse = await fetch("https://tryapi.quikk.dev/v1/mpesa/charge", {
//       method: 'POST',
//       headers: {
//         "Content-Type": "application/vnd.api+json",
//         [DATE_HEADER]: timestamp,
//         "Authorization": authString
//       },
//       body: JSON.stringify(requestBody)
//     });

//     const quikkData = await quikkResponse.json();
//     console.log("Quikk Response:", JSON.stringify(quikkData, null, 2));

//     // 5. LEDGER LOGGING
//     const undaSupa = createClient(
//       process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!
//     );

//     await undaSupa.from('items').insert([{
//         p_id: 23,
//         team_id: teamId,
//         account_id: parseInt(account_id),
//         amount: parseFloat(amount),
//         status: 'pending',
//         data: { reference, channel: destination_channel, phone: customer_no }
//     }]);

//     return NextResponse.json({ success: true, quikk: quikkData });

//   } catch (error: any) {
//     console.error("🔥 ERROR:", error.message);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      customer_no, 
      amount, 
      reference, 
      account_id, 
      destination_channel,
      team_id // Extracted from the frontend call
    } = body;

    // 1. DARAJA AUTH (Direct to Safaricom)
    const auth = Buffer.from(`${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`).toString('base64');
    const tokenRes = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    const { access_token } = await tokenRes.json();

    // 2. STK PUSH LOGIC
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${destination_channel}${process.env.DARAJA_PASSKEY}${timestamp}`).toString('base64');

    const stkRes = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: destination_channel,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: customer_no,
        PartyB: destination_channel,
        PhoneNumber: customer_no,
        CallBackURL: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stk-callback`, // Uses your Ngrok URL
        AccountReference: reference,
        TransactionDesc: `Payment for Team ${team_id}`
      })
    });

    // 3. LOG TO UNDA (The Shared Database)
    const undaSupa = createClient(
      process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!
    );

    await undaSupa.from('items').insert([{
        p_id: 23,
        team_id: team_id, // Saved so both users see this specific row
        account_id: account_id,
        amount: amount,
        status: 'pending',
        data: { reference, phone: customer_no }
    }]);

    return NextResponse.json({ message: "STK Sent Successfully" });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}