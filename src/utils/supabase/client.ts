// import { createBrowserClient } from "@supabase/ssr";

// // Helper functions for cookie management
// const getCookie = (name: string): string | null => {
//   if (typeof document === 'undefined') return null;
//   const cookies = document.cookie.split('; ');
//   const cookie = cookies.find(c => c.startsWith(`${name}=`));
//   return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
// };

// const setCookie = (name: string, value: string, maxAge: number = 3600) => {
//   if (typeof document === 'undefined') return;
//   document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
// };

// const deleteCookie = (name: string) => {
//   if (typeof document === 'undefined') return;
//   document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
// };

// export function createClient() {
//   return createBrowserClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       auth: {
//         storageKey: 'splitbill-v1-auth',
//         persistSession: true,
//         flowType: 'pkce',
//         detectSessionInUrl: true,
//         storage: {
//           getItem: (key: string) => {
//             // Check cookies FIRST (most reliable for cross-tab)
//             const cookieValue = getCookie(key);
//             if (cookieValue) {
//               console.log(`✅ Found ${key} in cookies`);
//               return cookieValue;
//             }
            
//             // Fallback to localStorage
//             if (typeof window !== 'undefined') {
//               const localValue = window.localStorage.getItem(key);
//               if (localValue) {
//                 console.log(`✅ Found ${key} in localStorage`);
//                 return localValue;
//               }
//             }
            
//             console.log(`❌ ${key} not found in storage`);
//             return null;
//           },
          
//           setItem: (key: string, value: string) => {
//             console.log(`💾 Storing ${key}...`);
            
//             // Store in cookies FIRST (primary storage)
//             setCookie(key, value, 3600); // 1 hour
            
//             // Also store in localStorage as backup
//             if (typeof window !== 'undefined') {
//               window.localStorage.setItem(key, value);
//             }
            
//             console.log(`✅ Stored ${key} in both cookies and localStorage`);
//           },
          
//           removeItem: (key: string) => {
//             console.log(`🗑️ Removing ${key}...`);
            
//             // Remove from both
//             deleteCookie(key);
//             if (typeof window !== 'undefined') {
//               window.localStorage.removeItem(key);
//             }
//           },
//         },
//       },
//       cookies: {
//         getAll: () => {
//           if (typeof document === 'undefined') return [];
//           return document.cookie
//             .split('; ')
//             .filter(c => c.length > 0)
//             .map(cookie => {
//               const [name, ...rest] = cookie.split('=');
//               return { name, value: rest.join('=') };
//             });
//         },
//         setAll: (cookiesToSet) => {
//           cookiesToSet.forEach(({ name, value, options }) => {
//             let cookie = `${name}=${value}`;
//             if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
//             if (options?.path) cookie += `; path=${options.path}`;
//             if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
//             if (options?.secure) cookie += '; secure';
//             document.cookie = cookie;
//           });
//         },
//       },
//     }
//   );
// }


import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'splitbill-v1-auth',
        persistSession: true,
        // Let Supabase auto-detect the flow type
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}