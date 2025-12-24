
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Client, AppSettings, RiskLevel, EntityType } from '../types';

let supabase: any = null;

const toSupabaseFormat = (client: Client) => {
  return {
    id: client.id,
    "No": client.no,
    "Status": client.status,
    "QFC No": client.qfcNo,
    "Legal Structure": client.legalStructure,
    "Corporate Nationality ": client.corporateNationality,
    "Client Name": client.firstName,
    "Services needed": client.servicesNeeded,
    "Engagement Year ": client.engagementYear,
    "Engagement Date": client.engagementDate,
    "Onboarding Date ": client.onboardingDate,
    "Date of QFC Incorporation or Registration": client.incorporationDate,
    "CR Expired date": client.crExpiryDate,
    "Entity Card No": client.entityCardNo,
    "Entity Card Expiry": client.entityCardExpiry,
    "License": client.license,
    "License Expiry": client.licenseExpiry,
    "Nature of Business": client.natureOfBusiness,
    "Registered Address": client.registeredAddress,
    "Telephone Number": client.telephoneNumber,
    "E Mail": client.emailAddress,
    "Website": client.website,
    "Approved Auditor": client.approvedAuditor,
    "Company Type": client.companyType,
    "Secretary": client.secretary,
    "Senior Executive Function": client.seniorExecutiveFunction,

    "Directors Names": client.directors[0]?.name || '',
    "QID / Passport": client.directors[0]?.qidOrPassport || '',
    "Nationality": client.directors[0]?.nationality || '',
    "DOB": client.directors[0]?.dob || '',

    "Significant Shareholders": client.shareholders[0]?.name || '',
    "% on Ownership": client.shareholders[0]?.ownershipPercentage?.toString() || '0',
    "QID / Passport / CR No.": client.shareholders[0]?.qidPassportCrNo || '',
    "Nationality_1": client.shareholders[0]?.nationality || '',
    "DOB/ Date of incorporation": client.shareholders[0]?.dobOrDoi || '',

    "UBO Details": client.ubos[0]?.name || '',
    "QID / Passport_1": client.ubos[0]?.qidOrPassport || '',
    "Nationality_2": client.ubos[0]?.nationality || '',
    "DOB_1": client.ubos[0]?.dob || '',

    "Authorized Signatory": client.signatories[0]?.name || '',
    "QID / Passport_2": client.signatories[0]?.qidOrPassport || '',
    "Nationality_3": client.signatories[0]?.nationality || '',
    "DOB_2": client.signatories[0]?.dob || '',
    "Authority": client.signatories[0]?.authority || '',

    is_pep: client.isPep,
    type: client.type,
    created_at: client.createdAt,
    last_screened_at: client.lastScreenedAt,
    risk_level: client.riskLevel,
    match_id: client.matchId,
    matches: client.matches || [],
    documents: client.documents || {}
  };
};

const fromSupabaseFormat = (data: any): Client => {
  const parseOwnership = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const strVal = val.toString().replace('%', '').trim();
    const num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
  };

  // Helper to find a value even if keys have slightly different spacing
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      if (data[k] !== undefined) return data[k];
    }
    return '';
  };

  return {
    id: data.id,
    no: getVal(["No", "No."]),
    status: getVal(["Status", "Client Status"]) || 'Pending',
    qfcNo: getVal(["QFC No", "QFC No."]),
    legalStructure: getVal(["Legal Structure"]),
    corporateNationality: getVal(["Corporate Nationality ", "Corporate Nationality"]),
    firstName: getVal(["Client Name"]),
    companyType: getVal(["Company Type"]),
    servicesNeeded: getVal(["Services needed"]),
    engagementYear: getVal(["Engagement Year ", "Engagement Year"])?.toString() || '',
    engagementDate: getVal(["Engagement Date"]),
    onboardingDate: getVal(["Onboarding Date ", "Onboarding Date"]),
    incorporationDate: getVal(["Date of QFC Incorporation or Registration", "Incorporation Date"]),
    crExpiryDate: getVal(["CR Expired date", "CR Expiry"]),
    entityCardNo: getVal(["Entity Card No", "Entity Card No."]),
    entityCardExpiry: getVal(["Entity Card Expiry"]),
    license: getVal(["License"]),
    licenseExpiry: getVal(["License Expiry"]),
    approvedAuditor: getVal(["Approved Auditor"]),
    natureOfBusiness: getVal(["Nature of Business"]),
    registeredAddress: getVal(["Registered Address"]),
    telephoneNumber: getVal(["Telephone Number"]),
    emailAddress: getVal(["E Mail", "Email", "E-Mail"]),
    website: getVal(["Website"]),
    secretary: getVal(["Secretary"]),
    seniorExecutiveFunction: getVal(["Senior Executive Function"]),

    directors: [{
      name: getVal(["Directors Names"]),
      qidOrPassport: getVal(["QID / Passport"]),
      nationality: getVal(["Nationality"]),
      dob: getVal(["DOB"])
    }],
    shareholders: [{
      name: getVal(["Significant Shareholders"]),
      ownershipPercentage: parseOwnership(getVal(["% on Ownership", "Ownership %"])),
      qidPassportCrNo: getVal(["QID / Passport / CR No.", "Shareholder ID"]),
      nationality: getVal(["Nationality_1", "Shareholder Nationality"]),
      dobOrDoi: getVal(["DOB/ Date of incorporation"])
    }],
    ubos: [{
      name: getVal(["UBO Details"]),
      qidOrPassport: getVal(["QID / Passport_1", "UBO ID"]),
      nationality: getVal(["Nationality_2", "UBO Nationality"]),
      dob: getVal(["DOB_1", "UBO DOB"])
    }],
    signatories: [{
      name: getVal(["Authorized Signatory"]),
      qidOrPassport: getVal(["QID / Passport_2", "Signatory ID"]),
      nationality: getVal(["Nationality_3", "Signatory Nationality"]),
      dob: getVal(["DOB_2", "Signatory DOB"]),
      authority: getVal(["Authority"])
    }],

    isPep: data.is_pep || false,
    type: (data.type as EntityType) || EntityType.ENTITY,
    createdAt: data.created_at || new Date().toISOString(),
    lastScreenedAt: data.last_screened_at,
    riskLevel: (data.risk_level as RiskLevel) || RiskLevel.NONE,
    matchId: data.match_id,
    matches: data.matches || [],
    documents: data.documents || {}
  };
};

export const initSupabase = (settings: AppSettings) => {
  if (settings.supabaseUrl && settings.supabaseKey) {
    try {
      supabase = createClient(settings.supabaseUrl, settings.supabaseKey);
      return true;
    } catch (e) { 
      console.error("Supabase init error:", e);
      return false; 
    }
  }
  return false;
};

export const fetchCloudClients = async (): Promise<Client[] | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromSupabaseFormat);
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
    if (supabase && channel) {
      await supabase.removeChannel(channel);
    }
};
