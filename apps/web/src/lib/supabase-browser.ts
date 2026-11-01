import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://marcus-boc-telescope-composition.trycloudflare.com";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const hasSupabaseEnvironment = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment is not configured.");
  }

  if (typeof window !== "undefined") {
    try {
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
          const val = window.localStorage.getItem(key);
          if (val && val.length > 6000) {
            window.localStorage.removeItem(key);
          }
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }

  browserClient ??= createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
