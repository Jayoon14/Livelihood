import { auditedFetch } from "./activityAudit";
import { createClient } from "@supabase/supabase-js";

import { hybridAuthStorage } from "./authStorage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: { fetch: auditedFetch },
    auth: {
      storage: hybridAuthStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
