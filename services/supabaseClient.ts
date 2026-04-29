import { createClient } from '@supabase/supabase-js';

let supabaseInstance: any = null;
let supabaseInitializationPromise: Promise<any> | null = null;

export const getSupabase = async () => {
  if (supabaseInstance) return supabaseInstance;
  if (supabaseInitializationPromise) return supabaseInitializationPromise;

  supabaseInitializationPromise = (async () => {
    const isServer = typeof window === 'undefined';
    
    let supabaseUrl = isServer 
      ? process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
      : (import.meta as any).env.VITE_SUPABASE_URL;
      
    let supabaseKey = isServer
      ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANO
      : (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.VITE_SUPABASE_ANO;

    // Fallback: If in browser and missing, try to fetch from our server API
    if (!isServer && (!supabaseUrl || !supabaseKey)) {
      try {
        console.log('[Supabase] Fetching config from server fallback...');
        const response = await fetch('/api/config/supabase');
        if (response.ok) {
          const config = await response.json();
          supabaseUrl = supabaseUrl || config.supabaseUrl;
          supabaseKey = supabaseKey || config.supabaseKey;
        }
      } catch (err) {
        console.error('[Supabase] Failed to fetch server config fallback:', err);
      }
    }

    if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
      console.error('Supabase URL is missing or invalid:', supabaseUrl);
      supabaseInitializationPromise = null;
      return null;
    }

    if (!supabaseKey) {
      console.error('Supabase key is missing');
      supabaseInitializationPromise = null;
      return null;
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
  })();

  return supabaseInitializationPromise;
};
