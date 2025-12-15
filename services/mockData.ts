import { SanctionEntry, EntityType } from '../types';

export const MOCK_SANCTIONS: SanctionEntry[] = [
  {
    dataId: 'UN-001',
    source: 'UN Consolidated',
    firstName: 'OSAMA',
    lastName: 'BIN LADEN', 
    unListType: 'Al-Qaida',
    referenceNumber: 'QDi.001',
    listedOn: '2001-01-25',
    comments: 'Deceased.',
    nationality: 'Saudi Arabia',
    dateOfBirth: '1957-03-10',
    aliases: ['Usama bin Laden', 'The Prince'],
    type: EntityType.INDIVIDUAL
  },
  {
    dataId: 'UN-002',
    source: 'UN Consolidated',
    firstName: 'AL-QAIDA',
    unListType: 'Al-Qaida',
    referenceNumber: 'QDe.004',
    listedOn: '1999-10-15',
    comments: 'Terrorist organization.',
    nationality: 'Afghanistan',
    aliases: ['The Base', 'Al-Qaeda'],
    type: EntityType.ENTITY
  },
  {
    dataId: 'UN-003',
    source: 'UN Consolidated',
    firstName: 'VIKTOR',
    secondName: 'ANATOLYEVICH',
    lastName: 'BOUT',
    unListType: 'Others',
    referenceNumber: 'ODi.002',
    listedOn: '2004-03-17',
    comments: 'Arms dealer.',
    nationality: 'Russian Federation',
    dateOfBirth: '1967-01-13',
    aliases: ['Victor But', 'Vadim Markovich Aminov'],
    type: EntityType.INDIVIDUAL
  },
  {
    dataId: 'UN-004',
    source: 'UN Consolidated',
    firstName: 'JOSEPH',
    lastName: 'KONY',
    unListType: 'C.A.R.',
    referenceNumber: 'CFi.009',
    listedOn: '2016-03-07',
    comments: 'Leader of LRA.',
    nationality: 'Uganda',
    dateOfBirth: '1961-01-01',
    aliases: ['Kony'],
    type: EntityType.INDIVIDUAL
  }
];

export const QATAR_MOCK_SANCTIONS: SanctionEntry[] = [
  {
    dataId: 'QA-001',
    source: 'Qatar NCTC',
    firstName: 'KHALID',
    lastName: 'AL-SUWAIDI',
    unListType: 'National Terrorist',
    referenceNumber: 'NCTC.2023.05',
    listedOn: '2023-06-12',
    comments: 'Designated under NCTC authority.',
    nationality: 'Qatar',
    aliases: ['Abu Khalid'],
    type: EntityType.INDIVIDUAL
  },
  {
    dataId: 'QA-002',
    source: 'Qatar NCTC',
    firstName: 'DOHA',
    lastName: 'TRADING GROUP',
    unListType: 'National Entity',
    referenceNumber: 'NCTC.ENT.012',
    listedOn: '2022-11-30',
    comments: 'Financial support to prohibited groups.',
    nationality: 'Qatar',
    aliases: ['DTG Ltd'],
    type: EntityType.ENTITY
  }
];

// Helper to simulate a larger dataset
export const generateMockSanctions = (count: number): SanctionEntry[] => {
  const base = [...MOCK_SANCTIONS];
  for (let i = 0; i < count; i++) {
    base.push({
      dataId: `UN-GEN-${i}`,
      source: 'UN Consolidated',
      firstName: `TARGET`,
      lastName: `PERSON_${i}`,
      unListType: 'Simulated',
      referenceNumber: `SIM.${i}`,
      listedOn: new Date().toISOString().split('T')[0],
      comments: 'Simulated entry for load testing.',
      nationality: i % 2 === 0 ? 'Unknown' : 'Simulated Nation',
      aliases: [`Alias_${i}`],
      type: i % 5 === 0 ? EntityType.ENTITY : EntityType.INDIVIDUAL
    });
  }
  return base;
};