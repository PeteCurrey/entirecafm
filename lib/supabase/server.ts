import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const createClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookie = (await cookieStore).get(name);
          return cookie?.value;
        },
        async set(name: string, value: string, options: any) {
          try {
            (await cookieStore).set({ name, value, ...options });
          } catch (error) {
            // Handle edge cases where set is called from a component
          }
        },
        async remove(name: string, options: any) {
          try {
            (await cookieStore).delete({ name, ...options });
          } catch (error) {
            // Handle edge cases where remove is called from a component
          }
        },
      },
    }
  );
};
