// ─── Supabase Client ────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT')) {
    console.warn(
        '⚠️ Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env\n' +
        '   The app will fall back to localStorage mode.'
    );
}

export const supabase = (supabaseUrl && !supabaseUrl.includes('YOUR_PROJECT'))
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export const isSupabaseReady = () => supabase !== null;
