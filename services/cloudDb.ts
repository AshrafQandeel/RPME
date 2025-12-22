import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Client, AppSettings, RiskLevel, EntityType } from '../types';

let supabase: any = null;

const toSupabaseFormat = (client: Client) => {
  return {
    id: client.id,
    first_name: client.firstName,
    cr_number: client.crNumber,
    cr_expiry: client.crExpiry,
    entity_card_number: client.entityCardNumber,
    entity_card_expiry: client.entityCardExpiry,
    nature_of_business: client.natureOfBusiness,
    service_needed: client.serviceNeeded,
    telephone_number: client.telephoneNumber,
    email_address: client.emailAddress,
    website: client.website,
    registered_address: client.registeredAddress,
    // Store arrays as JSONB
    shareholders: client.shareholders,
    ubos: client.ubos,
    signatories: client.signatories,
    documents: client.documents,
    is_pep: client.isPep,
    type: client.type,
    created_at: client.createdAt,
    last_screened_at: client.lastScreenedAt,
    risk_level: client.riskLevel,
    match_id: client.matchId,
    matches: client.matches
  };
};

const fromSupabaseFormat = (data: any): Client => {
  return {
    id: data.id,
    firstName: data.first_name,
    crNumber: data.cr_number,
    crExpiry: data.cr_expiry,
    entityCardNumber: data.entity_card_number,
    entityCardExpiry: data.entity_card_expiry,
    natureOfBusiness: data.nature_of_business,
    serviceNeeded: data.service_needed,
    telephoneNumber: data.telephone_number,
    emailAddress: data.email_address,
    website: data.website,
    registeredAddress: data.registered_address,
    shareholders: data.shareholders || [],
    ubos: data.ubos || [],
    signatories: data.signatories || [],
    documents: data.documents || {},
    isPep: data.is_pep,
    type: data.type as EntityType,
    createdAt: data.created_at,
    lastScreenedAt: data.last_screened_at,
    riskLevel: data.risk_level as RiskLevel,
    matchId: data.match_id,
    matches: data.matches || []
  };
};

export const initSupabase = (settings: AppSettings) => {
  if (settings.supabaseUrl && settings.supabaseKey) {
    try {
      supabase = createClient(settings.supabaseUrl, settings.supabaseKey);
      return true;
    } catch (e) { return false; }
  }
  return false;
};

export const fetchCloudClients = async (): Promise<Client[] | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(fromSupabaseFormat);
};

export const addCloudClient = async (client: Client): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('clients').insert([toSupabaseFormat(client)]);
  if (error) throw error;
};

export const deleteCloudClient = async (id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
};

export const updateCloudClient = async (client: Client): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('clients').update(toSupabaseFormat(client)).eq('id', client.id);
  if (error) throw error;
};

export const subscribeToClients = (onUpdate: () => void): RealtimeChannel | null => {
  if (!supabase) return null;
  return supabase.channel('clients-all').on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, onUpdate).subscribe();
};

export const unsubscribeFromClients = async (channel: RealtimeChannel | null) => {
    if (supabase && channel) await supabase.removeChannel(channel);
};