import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const undaSupabaseUrl = 'https://zpmyjmzvgmohyqhprqmr.supabase.co';
    const undaAnonKey = process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY;
    const platformUid = process.env.NEXT_PUBLIC_UNDA_PLATFORM_UID;

    const response = await fetch(
      `${undaSupabaseUrl}/functions/v1/api-public-channels`,
      {
        method: 'GET',
        headers: {
          'apikey': undaAnonKey || '',
          'x-platform-uid': platformUid || ''
        }
      }
    );

    const channels = await response.json();
    return NextResponse.json(channels);
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}