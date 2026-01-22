import { createBrowserClient } from "@supabase/ssr";

//This helps so we don't open 100 connections to Supabase.
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;
//also this page is when browser needs to fetch data (like your user profile or a list of projects), it uses the token in the background.
export function createClient() {
  if (browserClientInstance) return browserClientInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  //his prevents your app from creating a new connection every time a component renders. It reuses the same connection
  browserClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true, // Keeps my logged in across tabs, like to remeber me even after closing the tab
      autoRefreshToken: true, // Refreshes my "ticket" before it expires, so that the user never logged out while active u to token expiration
      detectSessionInUrl: true, // Looks for the login code in the URL
    },
  });

  return browserClientInstance;
}