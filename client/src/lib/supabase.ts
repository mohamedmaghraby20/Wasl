import { createClient } from '@supabase/supabase-js';

const runtimeEnv = (
  import.meta as ImportMeta & {
    env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string };
  }
).env;
const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = runtimeEnv;

export const supabase =
  VITE_SUPABASE_URL && VITE_SUPABASE_PUBLISHABLE_KEY
    ? createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
    : null;

export async function getCurrentAccessToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token;
}
