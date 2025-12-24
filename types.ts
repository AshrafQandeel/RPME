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

export interface KYCBasePerson {
  name: string;
  nationality: string;
  dob: string;
  qidOrPassport: string;
}

export interface KYCDirector extends KYCBasePerson {}

export interface KYCShareholder extends KYCBasePerson {
  ownershipPercentage: number;
  incDateOrDob: string; // Shareholders can be entities or individuals
}

export interface KYCUBO extends KYCBasePerson {}

export interface KYCAuthorizedSignatory extends KYCBasePerson {
  authority: string;
}

export interface Client {
  id: string;
  // 1. Company & Engagement Information
  no: string;
  status: 'Active' | 'Pending' | 'Closed' | 'Blacklisted';
  qfcNo: string;
  legalStructure: string;
  corporateNationality: string;
  firstName: string; // Mapping to "Client Name"
  companyType: string;
  servicesNeeded: string;
  engagementYear: number;
  engagementDate: string;
  onboardingDate: string;
  incorporationDate: string;
  
  // 2. Registration & Licensing Details
  crExpiryDate: string;
  entityCardNo: string;
  entityCardExpiry: string;
  license: string;
  licenseExpiry: string;
  approvedAuditor: string;

  // 3. Business & Contact Details
  natureOfBusiness: string;
  registeredAddress: string;
  telephoneNumber: string;
  emailAddress: string;
  website?: string;

  // 4. Personnel Sections
  directors: KYCDirector[];
  shareholders: KYCShareholder[];
  ubos: KYCUBO[];
  signatories: KYCAuthorizedSignatory[];

  // 5. Governance & Key Roles
  secretary: string;
  seniorExecutiveFunction: string;
  
  // Compliance/System
  isPep: boolean;
  type: EntityType;
  createdAt: string;
  lastScreenedAt?: string;
  riskLevel: RiskLevel;
  matchId?: string;
  matches?: string[];
  
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