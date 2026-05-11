
import { getSupabase } from './supabaseClient.js';

/**
 * Supabase Keep-Alive Service
 * 
 * This service performs periodic lightweight queries to the database
 * to prevent Supabase from pausing the project due to inactivity.
 */

const KEEP_ALIVE_INTERVAL = 1000 * 60 * 60 * 12; // Every 12 hours
let keepAliveTimeout: NodeJS.Timeout | null = null;

export async function performKeepAlive() {
  console.log(`[Keep-Alive] Initiating database activity ping at ${new Date().toISOString()}`);
  
  try {
    const supabase = await getSupabase();
    if (!supabase) {
      console.error('[Keep-Alive] Failed to initialize Supabase client');
      return false;
    }

    // Perform a lightweight query on a system table
    const { data, error } = await supabase
      .from('system_metadata')
      .select('key')
      .limit(1);

    if (error) {
      // If table doesn't exist, try clients table
      const { error: clientError } = await supabase
        .from('clients')
        .select('id')
        .limit(1);
        
      if (clientError) {
        throw clientError;
      }
    }

    console.log('[Keep-Alive] Activity ping successful. Database state: ACTIVE');
    return true;
  } catch (err: any) {
    console.error('[Keep-Alive] Ping failed:', err.message);
    return false;
  }
}

export function startKeepAliveJob() {
  if (keepAliveTimeout) {
    clearInterval(keepAliveTimeout as any);
  }

  console.log('[Keep-Alive] Starting periodic keep-alive job (12h interval)');
  
  // Run once immediately on start
  performKeepAlive();

  // Schedule periodic runs
  keepAliveTimeout = setInterval(() => {
    performKeepAlive();
  }, KEEP_ALIVE_INTERVAL);
}

export function stopKeepAliveJob() {
  if (keepAliveTimeout) {
    clearInterval(keepAliveTimeout as any);
    keepAliveTimeout = null;
    console.log('[Keep-Alive] Job stopped');
  }
}
