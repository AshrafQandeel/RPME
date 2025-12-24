
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Client, AppSettings, RiskLevel, EntityType } from '../types';

let supabase: any = null;

const toSupabaseFormat = (client: Client) => {
  // Mapping the application object to the exact spreadsheet header names
  return {
    id: client.id,
    "No": client.no,
    "Status": client.status,
    "QFC No": client.qfcNo,
    "Legal Structure": client.legalStructure,
    "Corporate Nationality ": client.corporateNationality, // Note trailing space
    "Client Name": client.firstName,
    "Services needed": client.servicesNeeded,
    "Engagement Year ": client.engagementYear, // Note trailing space
    "Engagement Date": client.engagementDate,
    "Onboarding Date ": client.onboardingDate, // Note trailing space
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

    // Flat Personnel Mapping (Primary Entry)
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

    // Technical Fields
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
  // Helper to parse ownership percentage which might contain a '%' sign
  const parseOwnership = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const strVal = val.toString().replace('%', '').trim();
    const num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
  };

  return {
    id: data.id,
    no: data["No"] || '',
    status: data["Status"] || 'Pending',
    qfcNo: data["QFC No"] || '',
    legalStructure: data["Legal Structure"] || '',
    corporateNationality: data["Corporate Nationality "] || '',
    firstName: data["Client Name"] || '',
    companyType: data["Company Type"] || '',
    servicesNeeded: data["Services needed"] || '',
    engagementYear: data["Engagement Year "]?.toString() || '',
    engagementDate: data["Engagement Date"] || '',
    onboardingDate: data["Onboarding Date "] || '',
    incorporationDate: data["Date of QFC Incorporation or Registration"] || '',
    crExpiryDate: data["CR Expired date"] || '',
    entityCardNo: data["Entity Card No"] || '',
    entityCardExpiry: data["Entity Card Expiry"] || '',
    license: data["License"] || '',
    licenseExpiry: data["License Expiry"] || '',
    approvedAuditor: data["Approved Auditor"] || '',
    natureOfBusiness: data["Nature of Business"] || '',
    registeredAddress: data["Registered Address"] || '',
    telephoneNumber: data["Telephone Number"] || '',
    emailAddress: data["E Mail"] || '',
    website: data["Website"] || '',
    secretary: data["Secretary"] || '',
    seniorExecutiveFunction: data["Senior Executive Function"] || '',

    // Reconstruct Personnel Arrays from Flat Columns
    directors: [{
      name: data["Directors Names"] || '',
      qidOrPassport: data["QID / Passport"] || '',
      nationality: data["Nationality"] || '',
      dob: data["DOB"] || ''
    }],
    shareholders: [{
      name: data["Significant Shareholders"] || '',
      ownershipPercentage: parseOwnership(data["% on Ownership"]),
      qidPassportCrNo: data["QID / Passport / CR No."] || '',
      nationality: data["Nationality_1"] || '',
      dobOrDoi: data["DOB/ Date of incorporation"] || ''
    }],
    ubos: [{
      name: data["UBO Details"] || '',
      qidOrPassport: data["QID / Passport_1"] || '',
      nationality: data["Nationality_2"] || '',
      dob: data["DOB_1"] || ''
    }],
    signatories: [{
      name: data["Authorized Signatory"] || '',
      qidOrPassport: data["QID / Passport_2"] || '',
      nationality: data["Nationality_3"] || '',
      dob: data["DOB_2"] || '',
      authority: data["Authority"] || ''
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
