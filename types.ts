
export const APP_VERSION = '2.2.0-PREMIUM';

export enum RiskLevel {
  NONE = 'None',
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum EntityType {
  INDIVIDUAL = 'Individual',
  CORPORATE = 'Corporate'
}

export enum KYCStatus {
  DRAFT = 'Draft',
  PENDING_REVIEW = 'Pending Review',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  SUSPENDED = 'Suspended'
}

export enum UserRole {
  ADMIN = 'admin',
  COMPLIANCE_MANAGER = 'compliance_manager',
  USER = 'user'
}

export enum AccountStatus {
  ACTIVE = 'Active',
  DISABLED = 'Disabled'
}

export enum SystemEnvironment {
  PRODUCTION = 'Production',
  SANDBOX = 'Sandbox'
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_system_admin: boolean;
  status: AccountStatus;
  must_change_password: boolean;
  password_expiry: string;
  password_hash_mock?: string;
  last_login?: string;
  created_at: string;
}

export interface PersonRecord {
  name: string;
  qid_passport: string;
  nationality: string;
  dob: string;
  authority?: string;
  percentage?: number;
}

export interface SanctionEntry {
  dataId: string;
  source: string;
  firstName: string;
  secondName?: string;
  thirdName?: string;
  lastName: string;
  unListType: string;
  referenceNumber: string;
  listedOn: string;
  comments: string;
  nationality: string;
  dateOfBirth?: string;
  aliases: string[];
  type: string;
  fetchDate?: string;
}

export interface MatchResult {
  clientId: string;
  sanctionId: string;
  score: number;
  riskLevel: RiskLevel;
  matchedFields: string[];
  timestamp: string;
}

export interface ScreeningProgress {
  totalRecords: number;
  screenedRecords: number;
  pendingRecords: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  currentBatch: number;
}

export interface Client {
  id: string;
  "No": string;
  "Status": 'Active' | 'Pending' | 'Closed' | 'Blacklisted';
  "QFC No": string;
  "Legal Structure": string;
  "Company Nationality": string;
  "Client Name": string;
  "Services Provided": string[];
  "Engagement Year": string;
  "Engagement Date": string;
  "Onboarding Date": string;
  "Date of QFC Incorporation or Registration": string;
  "CR Expired date": string;
  "Entity Card No": string;
  "Entity Card Expiry": string;
  "License": string;
  "License Expiry": string;
  "Nature of Business": string;
  "Registered Address": string;
  "Telephone Number": string;
  "E Mail": string;
  "Website": string;
  "Directors Names": PersonRecord[];
  "Significant Shareholders": PersonRecord[];
  "UBO Details": PersonRecord[];
  "Authorized Signatory": PersonRecord[];
  "Secretary": string;
  "Senior Executive Function": string;
  "Approved Auditor": string;
  "Company Type": string;
  created_at: string;
  created_by?: string;
  kyc_status: KYCStatus;
  riskLevel: RiskLevel;
  matches?: string[];
  lastScreenedAt?: string;
  entity_type: EntityType;
}

export interface IngestionLog {
  id: string;
  timestamp: string;
  source: string;
  method: 'Automated' | 'Manual';
  status: 'Success' | 'Failed';
  recordsProcessed: number;
  recordsAccepted: number;
  recordsRejected: number;
  details: string;
  triggeredBy: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  source: string;
  method: string;
  status: string;
  details: string;
  triggeredBy: string;
}

export interface AppSettings {
  autoSync: boolean;
  syncIntervalMinutes: number;
  sourceUrl: string;
  lastSync: string;
  nextSync: string;
  environment: SystemEnvironment;
}
