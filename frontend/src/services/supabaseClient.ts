/**
 * SHEildAI Frontend — Supabase Client
 *
 * Uses the **anon key** (safe for the browser).  Row Level Security (RLS)
 * policies on Supabase protect data — the anon key can only do what
 * RLS allows.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[SHEildAI] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Copy frontend/.env.example to frontend/.env and fill in your project values.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
