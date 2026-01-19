// // app/api/unda-accounts/route.ts
// import { NextResponse } from 'next/server';

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const slug = searchParams.get('slug'); // Optional: filter by a specific bill

//     const response = await fetch(
//       `https://zpmyjmzvgmohyqhprqmr.supabase.co/functions/v1/api-public-payments${slug ? `?account_slug=${slug}` : ''}`,
//       {
//         headers: {
//           'apikey': process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!,
//           'Authorization': `Bearer ${process.env.NEXT_PUBLIC_UNDA_JWT}`,
//           'x-platform-uid': process.env.NEXT_PUBLIC_UNDA_PLATFORM_UID!
//         }
//       }
//     );

//     const data = await response.json();
//     return NextResponse.json(data);
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }


import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const url = `https://zpmyjmzvgmohyqhprqmr.supabase.co/rest/v1/accounts_public_v?p_id=eq.23&select=*`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_UNDA_JWT}`
            },
            next: { revalidate: 0 } 
        });

        if (!response.ok) return NextResponse.json([], { status: response.status });

        const data = await response.json();
        
        const formattedBills = data
            .filter((bill: any) => bill.data?.name) // Filter out the "Unnamed" empty bills
            .map((bill: any) => ({
                id: bill.id,
                slug: bill.slug,
                name: bill.data?.name || "Untitled",
                balance: Number(bill.balance || 0), 
                total_amount: Number(bill.data?.total_amount || 0),
                status: bill.status
            }));

        return NextResponse.json(formattedBills);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}