import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const authHeader = req.headers.get('Authorization');

        // This request happens Server-to-Server, so CORS is ignored
        const response = await fetch(`${process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL}/functions/v1/api-public-accounts-create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader || '',
                'x-platform-uid': process.env.NEXT_PUBLIC_UNDA_PLATFORM_UID || '',
                'apikey': process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY || ''
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}