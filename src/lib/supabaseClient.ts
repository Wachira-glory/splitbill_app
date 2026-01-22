import { createClient } from "@supabase/supabase-js";

// 1. YOUR Project Credentials (Local Auth)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 2. UNDA Platform Credentials (Payments)
const undaUrl = process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!;
const undaAnonKey = process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!;

// EXPORT 1: The standard client for your local project
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// EXPORT 2: The function to get the authenticated Unda client
export const getUndaAuthClient = async () => {
  const response = await fetch(`${undaUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "apikey": undaAnonKey 
    },
    body: JSON.stringify({
      email: process.env.NEXT_PUBLIC_UNDA_API_USERNAME,
      password: process.env.NEXT_PUBLIC_UNDA_API_PASSWORD,
    })
  });
  
  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error("Failed to authenticate with Unda platform.");
  }

  return createClient(undaUrl, undaAnonKey, {
    global: { 
      headers: { 
        Authorization: `Bearer ${data.access_token}` 
      } 
    }
  });
};