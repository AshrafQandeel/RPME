
import { createClient } from '@supabase/supabase-js';
import { Client, RiskLevel, UserProfile, SanctionEntry, EntityType, IngestionLog, SystemLog, KYCStatus, SystemEnvironment } from '../types';

const MASTER_REGISTRY_URL = 'https://wbjiokaryxrjicavcvwx.supabase.co';
const MASTER_REGISTRY_KEY = 'sb_publishable_Folrp4epgSCgQArvm2GAfQ_Nbo-xJ-m';

const RETRIEVAL_NOISE = [
  'CO', 'LTD', 'CORP', 'INC', 'INTERNATIONAL', 'LIMITED', 'GROUP', 'COMPANY', 'LLC', 
  'PVT', 'FZE', 'PLC', 'SERVICES', 'TRADING', 'HOLDINGS', 'TRUST', 'SDN', 'BHD', 'BERHAD', 'PRIVATE'
];

let supabaseClient: any = null;

const extractError = (err: any): string => {
  if (!err) return "Unknown Error";
  if (typeof err === 'string') return err;
  if (err.message === 'Failed to fetch') {
    return "Network Error: Failed to fetch. This usually indicates a CORS block or the Supabase project is unreachable from your browser. Please ensure your Supabase project is active and allows requests from this domain.";
  }
  return err.message || err.details || JSON.stringify(err);
};

export const initSupabase = () => {
  if (supabaseClient) return true;
  try {
    supabaseClient = createClient(MASTER_REGISTRY_URL, MASTER_REGISTRY_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return true;
  } catch (e) {
    console.error("[Registry] Handshake Fatal:", e);
    return false;
  }
};

const mapRowToEntry = (row: any): SanctionEntry => ({
  dataId: String(row.data_id ?? row.dataId ?? row.id ?? ''),
  firstName: row.first_name ?? row.firstName ?? '',
  secondName: row.second_name ?? row.secondName ?? '',
  thirdName: row.third_name ?? row.thirdName ?? '',
  lastName: row.last_name ?? row.lastName ?? '',
  source: row.source ?? 'Master Registry',
  referenceNumber: row.reference_number ?? row.referenceNumber ?? '',
  listedOn: row.listed_on ?? row.listedOn ?? '',
  comments: row.comments ?? '',
  nationality: row.nationality ?? '',
  dateOfBirth: row.date_of_birth ?? row.dateOfBirth ?? '',
  aliases: Array.isArray(row.aliases) ? row.aliases : [],
  type: row.type ?? EntityType.CORPORATE,
  fetchDate: row.fetch_date ?? row.fetchDate ?? '',
  unListType: row.un_list_type ?? row.unListType ?? ''
});

export const searchSanctionsAuthoritative = async (
  name: string, 
  from: number = 0, 
  to: number = 14
): Promise<{ data: SanctionEntry[], count: number }> => {
  if (!supabaseClient) initSupabase();
  if (!supabaseClient) return { data: [], count: 0 };
  
  const cleanName = name.trim().replace(/[(),'"]/g, '').toUpperCase();
  
  if (!cleanName) {
    const { data, count } = await supabaseClient
      .from('sanctions')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('first_name', { ascending: true });
    return { data: (data || []).map(mapRowToEntry), count: count || 0 };
  }

  try {
    const tokens = cleanName.split(/\s+/)
      .filter(t => t.length >= 2 && !RETRIEVAL_NOISE.includes(t))
      .slice(0, 3); 

    const cols = ['first_name', 'last_name', 'comments', 'data_id', 'reference_number'];
    const filterParts: string[] = [];

    if (tokens.length === 0) {
      const term = `%${cleanName}%`;
      cols.forEach(col => filterParts.push(`${col}.ilike.${term}`));
    } else {
      tokens.forEach(t => {
        const term = `%${t}%`;
        cols.forEach(col => filterParts.push(`${col}.ilike.${term}`));
      });
    }

    const { data, count, error } = await supabaseClient
      .from('sanctions')
      .select('*', { count: 'exact' })
      .or(filterParts.join(','))
      .range(from, to)
      .order('first_name', { ascending: true });

    if (error) throw new Error(`REGISTRY_QUERY_FAULT: ${extractError(error)}`);

    return { 
      data: (data || []).map(mapRowToEntry), 
      count: count || 0 
    };
  } catch (e: any) {
    console.error("[Search] Authoritative Execution Fault:", e.message);
    return { data: [], count: 0 };
  }
};

export const fetchCloudClients = async (from: number, to: number, userRole?: string, userId?: string): Promise<Client[]> => {
  if (!supabaseClient) initSupabase();
  
  let query = supabaseClient.from('clients').select('*');

  // Compliance Managers and Admins see everything. Regular users see only their own.
  if (userRole === 'user' && userId) {
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return (data || []).map((row: any) => ({ ...row, id: row.id } as Client));
};

export const fetchClientsTotalCount = async (): Promise<number> => {
  if (!supabaseClient) initSupabase();
  const { count, error } = await supabaseClient.from('clients').select('*', { count: 'exact', head: true });
  return error ? 0 : count || 0;
};

export const fetchGlobalRiskCounts = async (): Promise<Record<RiskLevel, number>> => {
  if (!supabaseClient) initSupabase();
  const summary: Record<RiskLevel, number> = {
    [RiskLevel.HIGH]: 0,
    [RiskLevel.MEDIUM]: 0,
    [RiskLevel.LOW]: 0,
    [RiskLevel.NONE]: 0
  };

  try {
    const riskLevels = [RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW, RiskLevel.NONE];
    const results = await Promise.all(
      riskLevels.map(rl => 
        supabaseClient.from('clients').select('*', { count: 'exact', head: true }).eq('riskLevel', rl)
      )
    );

    riskLevels.forEach((rl, index) => {
      summary[rl] = results[index].count || 0;
    });
    
    return summary;
  } catch (e) {
    console.error("[Stats] Failed to aggregate risk metrics:", e);
    return summary;
  }
};

export const upsertCloudClient = async (client: Client) => {
  if (!supabaseClient) initSupabase();
  const { error } = await supabaseClient.from('clients').upsert([client], { onConflict: 'id' });
  if (error) throw new Error(extractError(error));
};

export const deleteCloudClient = async (id: string) => {
  if (!supabaseClient) initSupabase();
  const { error } = await supabaseClient.from('clients').delete().eq('id', id);
  if (error) throw error;
};

export const subscribeToClients = (callback: () => void) => {
  if (!supabaseClient) initSupabase();
  return supabaseClient.channel('clients-all').on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, callback).subscribe();
};

export const unsubscribeFromClients = (subscription: any) => subscription?.unsubscribe();

export const fetchSanctionsTotalCount = async (): Promise<number> => {
  if (!supabaseClient) initSupabase();
  const { count, error } = await supabaseClient.from('sanctions').select('*', { count: 'exact', head: true });
  return error ? 0 : count || 0;
};

export const upsertCloudSanctions = async (sanctions: SanctionEntry[], onProgress?: (p: number) => void) => {
  if (!supabaseClient) initSupabase();
  const chunkSize = 150; 
  for (let i = 0; i < sanctions.length; i += chunkSize) {
    const chunk = sanctions.slice(i, i + chunkSize).map(s => ({
      data_id: s.dataId, 
      first_name: s.firstName, 
      second_name: s.secondName, 
      third_name: s.thirdName, 
      last_name: s.lastName, 
      source: s.source, 
      reference_number: s.referenceNumber, 
      listed_on: s.listedOn,
      comments: s.comments, 
      nationality: s.nationality, 
      date_of_birth: s.dateOfBirth, 
      aliases: s.aliases,
      type: s.type, 
      fetch_date: s.fetchDate || new Date().toISOString(), 
      un_list_type: s.unListType
    }));
    const { error } = await supabaseClient.from('sanctions').upsert(chunk, { onConflict: 'data_id' });
    if (error) throw error;
    if (onProgress) onProgress(Math.round(((i + chunk.length) / sanctions.length) * 100));
  }
};

export const deleteStaleSanctions = async (source: string, latestTimestamp: string) => {
  if (!supabaseClient) initSupabase();
  const { error } = await supabaseClient
    .from('sanctions')
    .delete()
    .eq('source', source)
    .lt('fetch_date', latestTimestamp);
  
  if (error) console.error(`[Purge] Failed to remove stale identities from ${source}:`, error);
};

export const logIngestionEvent = async (log: any) => {
  if (!supabaseClient) initSupabase();
  await supabaseClient.from('ingestion_logs').insert([log]);
};

export const fetchIngestionLogs = async (): Promise<IngestionLog[]> => {
  if (!supabaseClient) initSupabase();
  const { data, error } = await supabaseClient.from('ingestion_logs').select('*').order('timestamp', { ascending: false }).limit(50);
  return error ? [] : data || [];
};

export const logAuditEvent = async (action: string, details: string, triggeredBy: string) => {
  const log: SystemLog = { 
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, 
    timestamp: new Date().toISOString(), 
    source: action, 
    method: 'AUDIT', 
    status: 'Success', 
    details, 
    triggeredBy: triggeredBy 
  };
  
  try {
    const localLogs = JSON.parse(localStorage.getItem('unsg_audit_local') || '[]');
    localStorage.setItem('unsg_audit_local', JSON.stringify([log, ...localLogs].slice(0, 100)));
  } catch (e) {}

  if (!supabaseClient) initSupabase();
  if (supabaseClient) {
    const { error: primaryError } = await supabaseClient.from('system_logs').insert([{
      id: log.id,
      timestamp: log.timestamp,
      source: log.source,
      method: log.method,
      status: log.status,
      details: log.details,
      triggered_by: triggeredBy
    }]);

    if (primaryError && (primaryError.code === '42P01' || primaryError.message.includes('schema cache'))) {
      const { error: fallbackError } = await supabaseClient.from('ingestion_logs').insert([{
        id: log.id,
        timestamp: log.timestamp,
        source: log.source,
        method: 'AUDIT_REDUNDANT',
        status: log.status,
        details: log.details,
        triggeredBy: triggeredBy,
        recordsProcessed: 0,
        recordsAccepted: 0,
        recordsRejected: 0
      }]);
      return !fallbackError;
    }
    return !primaryError;
  }
  return true;
};

export const fetchSystemLogs = async (): Promise<SystemLog[]> => {
  let combined: SystemLog[] = [];
  try { combined = JSON.parse(localStorage.getItem('unsg_audit_local') || '[]'); } catch (e) {}

  if (!supabaseClient) initSupabase();
  if (supabaseClient) {
    try {
      const { data: primary, error: pErr } = await supabaseClient.from('system_logs').select('*').limit(50).order('timestamp', { ascending: false });
      if (!pErr && primary) {
        primary.forEach((row: any) => combined.push({
          id: row.id, timestamp: row.timestamp, source: row.source, method: row.method || 'AUDIT',
          status: row.status || 'Success', details: row.details, triggeredBy: row.triggered_by || row.triggeredBy
        }));
      }
      const { data: fallback, error: fErr } = await supabaseClient.from('ingestion_logs').select('*').eq('method', 'AUDIT_REDUNDANT').limit(50).order('timestamp', { ascending: false });
      if (!fErr && fallback) {
        fallback.forEach((row: any) => combined.push({
          id: row.id, timestamp: row.timestamp, source: row.source, method: 'AUDIT (Redundant)',
          status: row.status || 'Success', details: row.details, triggeredBy: row.triggeredBy
        }));
      }
    } catch (e) {}
  }
  const seen = new Set();
  return combined
    .filter(l => {
      const isNew = !seen.has(l.id);
      seen.add(l.id);
      return isNew;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const checkConnection = async () => {
  try {
    if (!supabaseClient) initSupabase();
    const { error } = await supabaseClient.from('clients').select('id').limit(1);
    if (error) {
      console.error("[Registry] Connection Check Error:", error);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error("[Registry] Connection Check Exception:", e);
    if (e.message === 'Failed to fetch') {
      // This is the specific error the user is seeing
      throw new Error("Failed to fetch: The connection to Supabase was blocked. Check your internet or Supabase CORS settings.");
    }
    return false;
  }
};

export const validateRegistrySchemaV431 = async () => {
  if (!supabaseClient) initSupabase();
  const discrepancies: string[] = [];
  
  // Verify basic table accessibility for standard operations
  const { error: clientErr } = await supabaseClient.from('clients').select('id').limit(1);
  if (clientErr && clientErr.code === '42P01') {
    discrepancies.push("Registry Critical: Table 'clients' is missing from cloud schema.");
  }

  // Check profiles table which is critical for identity management
  const { error: profileErr } = await supabaseClient.from('profiles').select('id').limit(1);
  if (profileErr && profileErr.code === '42P01') {
    discrepancies.push("Registry Critical: Table 'profiles' is missing from cloud schema.");
  }

  // Check system_logs table
  const { error: logsErr } = await supabaseClient.from('system_logs').select('id').limit(1);
  if (logsErr && logsErr.code === '42P01') {
    discrepancies.push("Governance Warning: Table 'system_logs' missing. Run bootstrap script.");
  }

  // Check system_metadata table
  const { error: metaErr } = await supabaseClient.from('system_metadata').select('key').limit(1);
  if (metaErr && metaErr.code === '42P01') {
    discrepancies.push("Registry Critical: Table 'system_metadata' missing.");
  }
  
  // Security Integrity Check: Attempt an insert into system_metadata.
  // This should fail for anonymous/public keys if Row-Level Security (RLS) is enabled.
  const { error: securityErr } = await supabaseClient.from('system_metadata').insert({ key: 'security_audit_test', value: 'unauthorized_probe' });
  if (!securityErr) {
    discrepancies.push("Vulnerability Detected: Row-Level Security (RLS) is NOT active on the master schema.");
  }

  return { success: discrepancies.length === 0, discrepancies };
};

export const fetchGlobalSyncStatus = async () => {
  if (!supabaseClient) initSupabase();
  const { data, error } = await supabaseClient.from('system_metadata').select('value').eq('key', 'global_sync').maybeSingle();
  return error ? null : data?.value || null;
};

export const subscribeToGlobalSync = (callback: (meta: any) => void) => {
  if (!supabaseClient) initSupabase();
  return supabaseClient.channel('global-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'system_metadata', filter: 'key=eq.global_sync' }, (p: any) => callback(p.new?.value)).subscribe();
};

export const setGlobalSyncLock = async (isSyncing: boolean, lastSync: string, progress: number = 0, currentSource: string = '') => {
  if (!supabaseClient) initSupabase();
  await supabaseClient.from('system_metadata').upsert({ 
    key: 'global_sync', 
    value: { is_syncing: isSyncing, last_sync: lastSync, progress, current_source: currentSource } 
  });
};

export const fetchGlobalEnvironment = async (): Promise<SystemEnvironment | null> => {
  if (!supabaseClient) initSupabase();
  const { data, error } = await supabaseClient.from('system_metadata').select('value').eq('key', 'system_environment').maybeSingle();
  return error ? null : data?.value || null;
};

export const setGlobalEnvironment = async (env: SystemEnvironment) => {
  if (!supabaseClient) initSupabase();
  await supabaseClient.from('system_metadata').upsert({ 
    key: 'system_environment', 
    value: env 
  });
};

export const subscribeToGlobalEnvironment = (callback: (env: SystemEnvironment) => void) => {
  if (!supabaseClient) initSupabase();
  return supabaseClient.channel('global-env').on('postgres_changes', { event: '*', schema: 'public', table: 'system_metadata', filter: 'key=eq.system_environment' }, (p: any) => callback(p.new?.value)).subscribe();
};

export const screenEntityAgainstDb = async (client: Client, triggeredBy?: string): Promise<Client> => {
  const { screenClient } = await import('./screeningEngine');
  const response = await searchSanctionsAuthoritative(client["Client Name"], 0, 150);
  const match = screenClient(client, response.data);
  return { 
    ...client, 
    riskLevel: match ? match.riskLevel : RiskLevel.NONE, 
    matches: match ? [match.sanctionId] : [], 
    lastScreenedAt: new Date().toISOString() 
  };
};

export const fetchCloudUsers = async (): Promise<UserProfile[]> => {
  if (!supabaseClient) initSupabase();
  const { data, error = null } = await supabaseClient.from('profiles').select('*').order('full_name', { ascending: true });
  return error ? [] : data || [];
};

export const upsertCloudUser = async (user: any) => {
  if (!supabaseClient) initSupabase();
  const { error } = await supabaseClient.from('profiles').upsert([user], { onConflict: 'email' });
  if (error) throw error;
};

export const deleteCloudUser = async (email: string) => {
  if (!supabaseClient) initSupabase();
  const { error } = await supabaseClient.from('profiles').delete().eq('email', email);
  if (error) throw error;
};
