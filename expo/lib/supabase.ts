import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '@/constants/supabase';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
  SUPABASE_CONFIG.URL,
  SUPABASE_CONFIG.PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export type SupabaseClient = typeof supabase;
