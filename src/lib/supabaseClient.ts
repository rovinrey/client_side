import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let singleton: SupabaseClient | undefined;

/** True when URL and anon key are set (Vite `import.meta.env` at build time). */
export function isSupabaseConfigured(): boolean {
    return Boolean(
        import.meta.env.VITE_SUPABASE_URL?.trim() &&
            import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
    );
}

/**
 * Browser client using the anon key. Add to `.env.local` (dev) or your host’s build env (prod):
 * `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — from Supabase Dashboard → Settings → API.
 */
export function getSupabaseClient(): SupabaseClient | null {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!url || !anonKey) return null;
    if (!singleton) singleton = createClient(url, anonKey);
    return singleton;
}
