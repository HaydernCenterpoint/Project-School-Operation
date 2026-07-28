import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseEnvironment = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment is not configured.");
  }

  browserClient ??= createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
