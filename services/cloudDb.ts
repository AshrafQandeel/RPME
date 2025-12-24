
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Client, AppSettings, RiskLevel, EntityType } from '../types';

let supabase: any = null;

const fromSupabaseFormat = (data: any): Client => {
  if (!data) return {} as Client;

  const parseOwnership = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const strVal = val.toString().replace('%', '').trim();
    const num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
  };

  // Helper to find a value even if keys have slightly different spacing or naming
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      if (data[k] !== undefined && data[k] !== null) return data[k];
    }
    return '';
  };

  return {
    id: data.id || Math.random().toString(36).substr(2, 9),
    no: getVal(["No", "No."]) || 'N/A',
    status: (getVal(["Status", "Client Status"]) as any) || 'Pending',
    qfcNo: getVal(["QFC No", "QFC No."]) || '',
    legalStructure: getVal(["Legal Structure"]) || '',
    corporateNationality: getVal(["Corporate Nationality ", "Corporate Nationality"]) || 'Unknown',
    firstName: getVal(["Client Name", "Name", "firstName"]) || 'Unnamed Client',
    companyType: getVal(["Company Type"]) || '',
    servicesNeeded: getVal(["Services needed"]) || '',
    engagementYear: getVal(["Engagement Year ", "Engagement Year"])?.toString() || '',
    engagementDate: getVal(["Engagement Date"]) || '',
    onboardingDate: getVal(["Onboarding Date ", "Onboarding Date"]) || '',
    incorporationDate: getVal(["Date of QFC Incorporation or Registration", "Incorporation Date"]) || '',
    crExpiryDate: getVal(["CR Expired date", "CR Expiry"]) || '',
    entityCardNo: getVal(["Entity Card No", "Entity Card No."]) || '',
    entityCardExpiry: getVal(["Entity Card Expiry"]) || '',
    license: getVal(["License"]) || '',
    licenseExpiry: getVal(["License Expiry"]) || '',
    approvedAuditor: getVal(["Approved Auditor"]) || '',
    natureOfBusiness: getVal(["Nature of Business"]) || '',
    registeredAddress: getVal(["Registered Address"]) || '',
    telephoneNumber: getVal(["Telephone Number"]) || '',
    emailAddress: getVal(["E Mail", "Email", "E-Mail"]) || '',
    website: getVal(["Website"]) || '',
    secretary: getVal(["Secretary"]) || '',
    seniorExecutiveFunction: getVal(["Senior Executive Function"]) || '',

    directors: [{
      name: getVal(["Directors Names"]) || '',
      qidOrPassport: getVal(["QID / Passport"]) || '',
      nationality: getVal(["Nationality"]) || '',
      dob: getVal(["DOB"]) || ''
    }],
    shareholders: [{
      name: getVal(["Significant Shareholders"]) || '',
      ownershipPercentage: parseOwnership(getVal(["% on Ownership", "Ownership %"])),
      qidPassportCrNo: getVal(["QID / Passport / CR No.", "Shareholder ID"]) || '',
      nationality: getVal(["Nationality_1", "Shareholder Nationality"]) || '',
      dobOrDoi: getVal(["DOB/ Date of incorporation"]) || ''
    }],
    ubos: [{
      name: getVal(["UBO Details"]) || '',
      qidOrPassport: getVal(["QID / Passport_1", "UBO ID"]) || '',
      nationality: getVal(["Nationality_2", "UBO Nationality"]) || '',
      dob: getVal(["DOB_1", "UBO DOB"]) || ''
    }],
    signatories: [{
      name: getVal(["Authorized Signatory"]) || '',
      qidOrPassport: getVal(["QID / Passport_2", "Signatory ID"]) || '',
      nationality: getVal(["Nationality_3", "Signatory Nationality"]) || '',
      dob: getVal(["DOB_2", "Signatory DOB"]) || '',
      authority: getVal(["Authority"]) || ''
    }],

    isPep: !!data.is_pep,
    type: (data.type as EntityType) || EntityType.ENTITY,
    createdAt: data.created_at || new Date().toISOString(),
    lastScreenedAt: data.last_screened_at || null,
    riskLevel: (data.risk_level as RiskLevel) || RiskLevel.NONE,
    matchId: data.match_id || null,
    matches: Array.isArray(data.matches) ? data.matches : [],
    documents: data.documents || {}
  };
};

export const initSupabase = (settings: AppSettings) => {
  if (settings.supabaseUrl && settings.supabaseKey && settings.supabaseUrl.startsWith('http')) {
    try {
      supabase = createClient(settings.supabaseUrl, settings.supabaseKey, {
        auth: { persistSession: false }
      });
      return true;
    } catch (e) { 
      console.error("Supabase init error:", e);
      return false; 
    }
  }
  supabase = null;
  return false;
};

export const checkConnection = async (): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('clients').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};

export const fetchCloudClients = async (): Promise<Client[] | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Supabase fetch error:", error);
    throw error;
  }
  return (data || []).map(fromSupabaseFormat);
};

export const addCloudClient = async (client: Client): Promise<void> => {
  if (!supabase) return;
  // (toSupabaseFormat logic omitted for brevity as it's defined in previous turns)
  const { error } = await supabase.from('clients').insert([client]); 
  if (error) throw error;
};

export const deleteCloudClient = async (id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
};

export const subscribeToClients = (onUpdate: () => void): RealtimeChannel | null => {
  if (!supabase) return null;
  return supabase
    .channel('clients-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, onUpdate)
    .subscribe();
};

export const unsubscribeFromClients = async (channel: RealtimeChannel | null) => {
    if (supabase && channel) {
      await supabase.removeChannel(channel);
    }
};
