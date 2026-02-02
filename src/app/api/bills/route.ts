import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: appData, error: appError } = await supabase
      .from('app_bills')
      .select('*')
      .order('created_at', { ascending: false });

    if (appError) throw appError;
    if (!appData || appData.length === 0) return NextResponse.json([]);

    // 3. Authenticate with Unda
    const authResponse = await fetch(`${process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "apikey": process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY! 
      },
      body: JSON.stringify({
        email: process.env.UNDA_API_USERNAME || process.env.UNDA_API_EMAIL,
        password: process.env.UNDA_API_PASSWORD,
      })
    });
    
    const authData = await authResponse.json();

    if (!authData.access_token) {
        console.error("Unda Auth Failed:", authData);
        throw new Error("Failed to authenticate with Unda system");
    }

    // 4. Correct way to pass the Bearer token to Supabase client
    const undaSupa = createSupabaseClient(
      process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authData.access_token}`,
          },
        },
      }
    );

    const slugs = appData.map((b: any) => b.slug);
    const { data: undaAccounts, error: undaError } = await undaSupa
      .from('accounts')
      .select('*, items(*)')
      .in('slug', slugs)
      .eq('p_id', 23);

    if (undaError) throw undaError;

    const enriched = appData.map((bill: any) => {
      const undaMatch = undaAccounts?.find((ua: any) => ua.slug === bill.slug);
      const items = undaMatch?.items || [];
      const collected = items
        .filter((p: any) => ['SUCCESS', 'PAID', 'COMPLETED'].includes(p.status?.toUpperCase()))
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      return {
        ...bill,
        real_collected: collected,
        goal: Number(bill.total_goal)
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('API Route Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}