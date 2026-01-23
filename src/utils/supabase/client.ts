import { createBrowserClient } from "@supabase/ssr";

let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClientInstance) return browserClientInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  browserClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true, 
      autoRefreshToken: true, 
      detectSessionInUrl: true,
      // MUST MATCH: This must be the same key used in your channels page
      storageKey: 'splitbill-v1-auth', 
    },
  });

  return browserClientInstance;
}