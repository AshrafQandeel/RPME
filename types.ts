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

export interface Client {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dob?: string;
  nationality: string;
  passportNumber?: string;
  type: EntityType;
  residenceCountry: string;
  remarks?: string;
  createdAt: string;
  lastScreenedAt?: string;
  riskLevel: RiskLevel;
  matchId?: string; // ID of the sanction entry matched
}

export interface MatchResult {
  clientId: string;
  sanctionId: string;
  score: number; // 0-100
  riskLevel: RiskLevel;
  matchedFields: string[];
  timestamp: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

export interface DashboardStats {
  totalClients: number;
  totalSanctions: number;
  highRiskMatches: number;
  lastUpdate: string;
}

export interface AppSettings {
  autoSync: boolean;
  syncIntervalMinutes: number; // in minutes
  sourceUrl: string;
  lastSync: string;
  nextSync: string;
}