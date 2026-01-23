import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// 1. SPLITBILL CLIENT (Main App)
// This uses the unique storageKey so it doesn't clash with other projects
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      storageKey: 'splitbill-v1-auth', // Must match your utils/server.ts
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);

// 2. UNDA ADMIN BRIDGE (Payment Gateway)
// We use a function because we want a fresh, non-persisted instance every time
export const getUndaAuthClient = async () => {
  const undaSupa = createClient(
    process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,     // CRITICAL: Does not save to Cookies/LocalStorage
        autoRefreshToken: false,   // CRITICAL: Prevents background tasks from hijacking auth
        detectSessionInUrl: false,
      }
    }
  );

  // Authenticate the bridge using your project credentials
  // This happens in the background without affecting the user's login state
  const { error } = await undaSupa.auth.signInWithPassword({
    email: process.env.NEXT_PUBLIC_UNDA_API_USERNAME!,
    password: process.env.NEXT_PUBLIC_UNDA_API_PASSWORD!,
  });

  if (error) {
    console.error("Unda Bridge Authentication Failed:", error.message);
    throw error;
  }

  return undaSupa;
};