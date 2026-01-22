import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  //Upon signing up when a user clicks the email link, supabase sends a temporary code in the URL
  const code = requestUrl.searchParams.get("code"); // Grab the temporary code
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    // Wethen trade the temporary code for a permanent Secure Cookie
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      //If no error, redirected to the dashboard
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Something went wrong  - send them to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}