import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, teamName, teamId } = await req.json();

    console.log(`[Admin Invite] Sending Supabase Magic Link to: ${email}`);

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