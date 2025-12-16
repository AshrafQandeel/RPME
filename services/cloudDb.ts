import { createClient } from '@supabase/supabase-js';
import { Client, AppSettings, RiskLevel, EntityType } from '../types';

let supabase: any = null;

// Helper to map Client (CamelCase) -> DB (SnakeCase)
const toSupabaseFormat = (client: Client) => {
  return {
    id: client.id,
    first_name: client.firstName,
    middle_name: client.middleName,
    last_name: client.lastName,
    dob: client.dob, // Was missing in previous schema
    nationality: client.nationality,
    passport_number: client.passportNumber,
    type: client.type,
    residence_country: client.residenceCountry,
    remarks: client.remarks,
    created_at: client.createdAt,
    last_screened_at: client.lastScreenedAt,
    risk_level: client.riskLevel,
    match_id: client.matchId
  };
};

// Helper to map DB (SnakeCase) -> Client (CamelCase)
const fromSupabaseFormat = (data: any): Client => {
  return {
    id: data.id,
    firstName: data.first_name,
    middleName: data.middle_name,
    lastName: data.last_name,
    dob: data.dob,
    nationality: data.nationality,
    passportNumber: data.passport_number,
    type: data.type as EntityType,
    residenceCountry: data.residence_country,
    remarks: data.remarks,
    createdAt: data.created_at,
    lastScreenedAt: data.last_screened_at,
    riskLevel: data.risk_level as RiskLevel,
    matchId: data.match_id
  };
};

export const initSupabase = (settings: AppSettings) => {
  if (settings.supabaseUrl && settings.supabaseKey) {
    try {
      supabase = createClient(settings.supabaseUrl, settings.supabaseKey);
      return true;
    } catch (e) {
      console.error("Failed to init Supabase", e);
      return false;
    }
  }
  return false;
};

export const fetchCloudClients = async (): Promise<Client[] | null> => {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase Fetch Error:", error);
    throw error;
  }

  return data.map(fromSupabaseFormat);
};

export const addCloudClient = async (client: Client): Promise<void> => {
  if (!supabase) return;

  const dbData = toSupabaseFormat(client);

  const { error } = await supabase
    .from('clients')
    .insert([dbData]);

  if (error) {
    console.error("Supabase Insert Error:", error);
    throw error;
  }
};

export const deleteCloudClient = async (id: string): Promise<void> => {
  if (!supabase) return;

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Delete Error:", error);
    throw error;
  }
};

export const updateCloudClient = async (client: Client): Promise<void> => {
  if (!supabase) return;

  const dbData = toSupabaseFormat(client);

  const { error } = await supabase
    .from('clients')
    .update(dbData)
    .eq('id', client.id);

  if (error) {
    console.error("Supabase Update Error:", error);
    throw error;
  }
};