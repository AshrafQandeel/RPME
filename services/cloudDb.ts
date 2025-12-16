import { createClient } from '@supabase/supabase-js';
import { Client, AppSettings } from '../types';

let supabase: any = null;

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

  // Map DB columns back to Client interface if needed, 
  // but we assume we store the JSON blob or mapped columns matching types
  // For simplicity in this demo, we assume the DB stores a 'full_data' jsonb column 
  // OR the columns match the JSON keys exactly. 
  // Let's assume the columns match exactly for cleaner SQL.
  
  return data as Client[];
};

export const addCloudClient = async (client: Client): Promise<void> => {
  if (!supabase) return;

  const { error } = await supabase
    .from('clients')
    .insert([client]);

  if (error) {
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
    throw error;
  }
};

// Update client (e.g. after screening)
export const updateCloudClient = async (client: Client): Promise<void> => {
  if (!supabase) return;

  const { error } = await supabase
    .from('clients')
    .update(client)
    .eq('id', client.id);

  if (error) {
    throw error;
  }
};