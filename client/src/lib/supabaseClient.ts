import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

console.log('🔍 Supabase Debug:', {
  hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  url: import.meta.env.VITE_SUPABASE_URL ? 'FOUND' : 'MISSING',
  key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'FOUND' : 'MISSING',
  allEnvVars: Object.keys(import.meta.env)
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
