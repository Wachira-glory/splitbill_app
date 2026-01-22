import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";


//This page is mostly used when I do something like refresh a page, the token automaticaly attaches itself to the request
export async function createClient() {
  const cookieStore = await cookies(); // Access the browser's cookie jar

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Reads cookies to see if the user has a "session ticket"
        getAll() { return cookieStore.getAll(); },
        // If Supabase updates the ticket, we save it back 
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Ignored in Server Components */ }
        },
      },
    }
  );
}