
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Client, AppSettings, RiskLevel, EntityType } from '../types';

let supabase: any = null;

const toSupabaseFormat = (client: Client) => {
  return {
    id: client.id,
    no: client.no,
    status: client.status,
    qfc_no: client.qfcNo,
    legal_structure: client.legalStructure,
    corporate_nationality: client.corporateNationality,
    first_name: client.firstName, // Client Name
    company_type: client.companyType,
    services_needed: client.servicesNeeded,
    engagement_year: client.engagementYear,
    engagement_date: client.engagementDate,
    onboarding_date: client.onboardingDate,
    incorporation_date: client.incorporationDate, // Date of QFC Incorporation or Registration
    cr_expiry_date: client.crExpiryDate, // CR Expired date
    entity_card_no: client.entityCardNo,
    entity_card_expiry: client.entityCardExpiry,
    license: client.license,
    license_expiry: client.licenseExpiry,
    approved_auditor: client.approvedAuditor,
    nature_of_business: client.natureOfBusiness,
    registered_address: client.registeredAddress,
    telephone_number: client.telephoneNumber,
    email_address: client.emailAddress,
    website: client.website,
    directors: client.directors,
    shareholders: client.shareholders,
    ubos: client.ubos,
    signatories: client.signatories,
    secretary: client.secretary,
    senior_executive_function: client.seniorExecutiveFunction,
    is_pep: client.isPep,
    type: client.type,
    created_at: client.createdAt,
    last_screened_at: client.lastScreenedAt,
    risk_level: client.riskLevel,
    match_id: client.matchId,
    matches: client.matches,
    documents: client.documents
  };
};

const fromSupabaseFormat = (data: any): Client => {
  return {
    id: data.id,
    no: data.no,
    status: data.status,
    qfcNo: data.qfc_no,
    legalStructure: data.legal_structure,
    corporateNationality: data.corporate_nationality,
    firstName: data.first_name,
    companyType: data.company_type,
    servicesNeeded: data.services_needed,
    engagementYear: data.engagement_year?.toString() || '',
    engagementDate: data.engagement_date,
    onboardingDate: data.onboarding_date,
    incorporationDate: data.incorporation_date,
    crExpiryDate: data.cr_expiry_date,
    entityCardNo: data.entity_card_no,
    entityCardExpiry: data.entity_card_expiry,
    license: data.license,
    licenseExpiry: data.license_expiry,
    approvedAuditor: data.approved_auditor,
    natureOfBusiness: data.nature_of_business,
    registeredAddress: data.registered_address,
    telephoneNumber: data.telephone_number,
    emailAddress: data.email_address,
    website: data.website,
    directors: data.directors || [],
    shareholders: data.shareholders || [],
    ubos: data.ubos || [],
    signatories: data.signatories || [],
    secretary: data.secretary,
    seniorExecutiveFunction: data.senior_executive_function,
    isPep: data.is_pep,
    type: data.type as EntityType,
    createdAt: data.created_at,
    lastScreenedAt: data.last_screened_at,
    riskLevel: data.risk_level as RiskLevel,
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
