import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize the ADMIN client with the Service Role Key
// This key should NEVER be used in "use client" files
const supabaseAdmin = createClient(
  "https://bufdseweassfymorwyyc.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, teamName, teamId } = await req.json();

    console.log(`[Admin Invite] Sending Supabase Magic Link to: ${email}`);

    // 1. Administrative Invite via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        invited_to_team: teamId,
        project_ref: 23 
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
    });

    if (authError) {
      console.error('[Supabase Auth Error]:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Log it in your 'invitations' table so the dashboard knows they are pending
    const { error: dbError } = await supabaseAdmin
      .from('invitations')
      .insert([{ 
          team_id: teamId, 
          email: email.toLowerCase().trim(),
          status: 'sent',
          invited_user_id: authData.user.id
      }]);

    if (dbError) {
      console.error('[Database Error]:', dbError.message);
    }

    return NextResponse.json({ success: true, user: authData.user });

  } catch (err: any) {
    console.error('[Server Panic]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

