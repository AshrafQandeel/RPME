
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

export interface KYCDirector {
  name: string;
  qidOrPassport: string;
  nationality: string;
  dob: string;
}

export interface KYCShareholder {
  name: string;
  ownershipPercentage: number;
  qidPassportCrNo: string;
  nationality: string;
  dobOrDoi: string; // Date of Birth / Date of Incorporation
}

export interface KYCUBO {
  name: string;
  qidOrPassport: string;
  nationality: string;
  dob: string;
}

export interface KYCAuthorizedSignatory {
  name: string;
  qidOrPassport: string;
  nationality: string;
  dob: string;
  authority: string;
}

export interface Client {
  id: string;
  // Company & Engagement Information
  no: string;
  status: 'Active' | 'Pending' | 'Closed' | 'Blacklisted';
  qfcNo: string;
  legalStructure: string;
  corporateNationality: string;
  firstName: string; // Used for "Client Name"
  companyType: string;
  servicesNeeded: string;
  engagementYear: string;
  engagementDate: string;
  onboardingDate: string;
  incorporationDate: string; // Date of QFC Incorporation or Registration
  
  // Registration & Licensing Details
  crExpiryDate: string; // CR Expired date
  entityCardNo: string;
  entityCardExpiry: string;
  license: string;
  licenseExpiry: string;
  approvedAuditor: string;

  // Business & Contact Details
  natureOfBusiness: string;
  registeredAddress: string;
  telephoneNumber: string;
  emailAddress: string; // E Mail
  website?: string;

  // Personnel Sections
  directors: KYCDirector[];
  shareholders: KYCShareholder[];
  ubos: KYCUBO[];
  signatories: KYCAuthorizedSignatory[];

  // Governance & Key Roles
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
