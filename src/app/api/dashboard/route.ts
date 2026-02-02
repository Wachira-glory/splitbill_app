// import { createClient } from '@/utils/supabase/server';
// import { NextResponse } from 'next/server';
// import { getAuthenticatedUndaClient } from '@/lib/undaClient';


// export async function GET() {
//   const supabase = await createClient();
//   //Sesion Verificaton check, if the user logged in
//   const { data: { user } } = await supabase.auth.getUser();
//   //if not throw an Unauthorized error
//   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

//   try {
//     // Get slugs from DB
//     const { data: appData, error: appError } = await supabase
//       .from('app_bills')
//       .select('*')
//       .order('created_at', { ascending: false });

//     if (appError) throw appError;
//     if (!appData || appData.length === 0) return NextResponse.json([]);

//     // 2. Use the helper to get the authenticated Unda instance
//     const undaSupa = await getAuthenticatedUndaClient();

//     const slugs = appData.map((b: any) => b.slug);
//     const { data: undaAccounts, error: undaError } = await undaSupa
//       .from('accounts')
//       .select('*, items(*)')
//       .in('slug', slugs)
//       .eq('p_id', 23);

//     if (undaError) throw undaError;

//     // 3. Merge Data
//     const enriched = appData.map((bill: any) => {
//       const undaMatch = (undaAccounts as any[])?.find(ua => ua.slug === bill.slug);
//       const items = undaMatch?.items || [];
//       const collected = items
//         .filter((p: any) => ['SUCCESS', 'PAID', 'COMPLETED'].includes(p.status?.toUpperCase()))
//         .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

//       return {
//         ...bill,
//         real_collected: collected,
//         goal: Number(bill.total_goal)
//       };
//     });

//     return NextResponse.json(enriched);
//   } catch (error: any) {
//     console.error('Dashboard API Error:', error.message);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }


import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  // 1. Get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'No Session' }, { status: 401 });

  try {
    // 2. Fetch from app_bills (The primary table)
    const { data: appData, error: appError } = await supabase
      .from('app_bills')
      .select('*')
      .eq('owner_id', user.id) // Ensure this matches your DB column name
      .order('created_at', { ascending: false });

    if (appError) {
        console.error("DB Error:", appError);
        throw appError;
    }

    // 3. Simple Mapping for the Frontend
    const mappedData = (appData || []).map(bill => ({
      ...bill,
      goal: Number(bill.total_goal || 0),
      real_collected: Number(bill.collected_amount || 0) // Fallback if Unda sync isn't ready
    }));

    return NextResponse.json(mappedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}