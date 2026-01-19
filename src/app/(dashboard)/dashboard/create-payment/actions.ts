"use server"

export async function createUndaBillAction(billData: any) {
    console.log("--- CREATING BILL ---", billData.slug);
    try {
        const url = `https://zpmyjmzvgmohyqhprqmr.supabase.co/rest/v1/accounts`;
        
        const payload = {
            uid: String(billData.uid),
            slug: String(billData.slug),
            type: 'bill',
            p_id: 23, 
            data: { 
                name: String(billData.name),
                total_amount: Number(billData.total_amount)
            },
            status: 'pending'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_UNDA_JWT}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("UNDA FAIL:", errorText);
            return { success: false, error: errorText };
        }

        const result = await response.json();
        return { success: true, data: result };

    } catch (error: any) {
        console.error("CRASH:", error.message);
        return { success: false, error: error.message };
    }
}

export async function getBillStatusAction(slug: string) {
    try {
        const url = `https://zpmyjmzvgmohyqhprqmr.supabase.co/rest/v1/accounts_public_v?slug=eq.${slug}&select=*`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_UNDA_JWT}`
            },
            cache: 'no-store'
        });
        const data = await response.json();
        return { success: true, data: data[0] || null };
    } catch (e) {
        return { success: false, error: "Fetch failed" };
    }
}