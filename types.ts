
export enum RiskLevel {
  NONE = 'None',
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum EntityType {
  INDIVIDUAL = 'Individual',
  ENTITY = 'Entity'
}

export interface SanctionEntry {
  dataId: string;
  source: string;
  firstName?: string;
  secondName?: string;
  thirdName?: string;
  lastName?: string;
  unListType: string;
  referenceNumber: string;
  listedOn: string;
  comments: string;
  nationality?: string;
  dateOfBirth?: string;
  aliases: string[];
  type: EntityType;
}

export interface KYCIndividual {
  name: string;
  nationality: string;
  dob: string;
  qidNumber: string;
  qidExpiry: string;
  ownershipPercentage?: number;
  authority?: string;
}

export interface Client {
  id: string;
  // Core Company Info
  firstName: string; // Used as "Name as in CR"
  // Added optional fields to support individual screening mocks
  middleName?: string;
  lastName?: string;
  nationality?: string;
  dob?: string;
  crNumber: string;
  crExpiry: string;
  entityCardNumber: string;
  entityCardExpiry: string;
  natureOfBusiness: string;
  serviceNeeded: string;
  telephoneNumber: string;
  emailAddress: string;
  website?: string;
  registeredAddress: string;
  
  // Personnel
  shareholders: KYCIndividual[];
  ubos: KYCIndividual[];
  signatories: KYCIndividual[];
  
  // Compliance
  isPep: boolean;
  type: EntityType;
  
  // System Metadata
  createdAt: string;
  lastScreenedAt?: string;
  riskLevel: RiskLevel;
  matchId?: string; // High level match reference
  matches?: string[]; // Multiple matches for different people
  
  // Document Checklist
  documents: {
    cr: boolean;
    entityCard: boolean;
    tradeLicense: boolean;
    aoa: boolean;
    financials: boolean;
    uboInfo: boolean;
    shareholderIds: boolean;
    signatoryIds: boolean;
    parentCr: boolean;
  };
}

export interface MatchResult {
  clientId: string;
  sanctionId: string;
  score: number;
  riskLevel: RiskLevel;
  matchedFields: string[];
  matchedPersonName?: string;
  timestamp: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

export interface AppSettings {
  autoSync: boolean;
  syncIntervalMinutes: number;
  sourceUrl: string;
  lastSync: string;
  nextSync: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}
