
import { SanctionEntry, EntityType } from '../types';
import * as XLSX from 'xlsx';

export const OFFICIAL_UN_XML_URL = "https://scsanctions.un.org/resources/xml/en/consolidated.xml";
export const QATAR_NCTC_PORTAL_URL = "https://portal.moi.gov.qa/wps/portal/NCTC/sanctionlist/unifiedsanctionlist/!ut/p/a1/hc29DsIgAATgZ_EJOIG2dqSkASKINSRWlobJkGh1MD6_-LOqt13yXY5EMpI4p3s-plu-zOn07LGeTEs51ZxaL7nAwDoTHHNQqirgUEClba_4GhvVhA6DpzrUO02B5b_9nsQ3Ec6Acljfy0JaHbRkwGrbfMCvixfAlwiQ63lENmLxAKkSZVg!/dl5/d5/L0lDUmlTUSEhL3dHa0FKRnNBLzRKVXBDQSEhL2VuX1VT/";

export const OPENSANCTIONS_URL = "https://www.opensanctions.org/datasets/default/entities.json";
export const OFAC_SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.csv";

const LOCAL_PROXY = "/api/proxy?url=";

/**
 * Generates a stable, deterministic ID for an entity when official IDs are missing.
 * Prevents duplicates by creating a fingerprint of the identity.
 */
const generateDeterministicId = (prefix: string, name: string, nationality: string, ref: string): string => {
  if (ref && ref.length > 2) return `${prefix}-${ref.replace(/[^a-zA-Z0-9]/g, '')}`;
  // Fallback: Hash the name and nationality
  const fingerprint = `${name}|${nationality}`.toUpperCase().replace(/\s+/g, '');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit int
  }
  return `${prefix}-DET-${Math.abs(hash).toString(36).toUpperCase()}`;
};

/**
 * Advanced parser for Qatar NCTC Portal HTML table structure.
 */
export const parseQatarNCTCHTML = (htmlString: string, fetchDate: string = new Date().toISOString()): SanctionEntry[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const entries: SanctionEntry[] = [];

  const dataContainer = doc.querySelector('.wpthemeTable, .v-grid-table, table[role="grid"]') || doc;
  const rows = Array.from(dataContainer.querySelectorAll('tr, .v-grid-row'));
  
  if (rows.length === 0) return [];

  let nameCol = -1;
  let refCol = -1;
  let natCol = -1;
  
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = Array.from(rows[i].querySelectorAll('td, th, .v-grid-cell'));
    const rowText = rows[i].textContent?.toUpperCase() || '';
    const hasHeaderKeywords = (
      rowText.includes('NAME') || rowText.includes('الاسم') || 
      rowText.includes('FULL') || rowText.includes('البيان') ||
      rowText.includes('NO.') || rowText.includes('الرقم')
    );

    if (hasHeaderKeywords) {
      cells.forEach((cell, idx) => {
        const cText = cell.textContent?.trim().toUpperCase() || '';
        if (cText.includes('NAME') || cText.includes('الاسم') || cText.includes('FULL')) nameCol = idx;
        if (cText.includes('NO') || cText.includes('الرقم') || cText.includes('REF') || cText.includes('SER')) refCol = idx;
        if (cText.includes('NAT') || cText.includes('الجنسية') || cText.includes('CITIZEN')) natCol = idx;
      });
      if (nameCol !== -1) break;
    }
  }

  if (nameCol === -1) nameCol = 1;
  if (refCol === -1) refCol = 0;
  if (natCol === -1) natCol = 2;

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td, .v-grid-cell'));
    if (cells.length < 2) return;

    const nameText = cells[nameCol]?.textContent?.trim() || '';
    const refNo = cells[refCol]?.textContent?.trim() || '';
    const nationality = cells[natCol]?.textContent?.trim() || 'Qatar (Designated)';

    if (!nameText || nameText.length < 4) return;
    const norm = nameText.toUpperCase();
    if (norm.includes('NAME') || norm.includes('الاسم') || norm.includes('IDENTITY')) return;
    
    const nameParts = nameText.split(/\s+/);
    const dataId = generateDeterministicId('QA-NCTC', nameText, nationality, refNo);
    
    entries.push({
      dataId,
      source: 'Qatar NCTC',
      firstName: nameParts[0] || 'UNKNOWN',
      lastName: nameParts.slice(1).join(' ') || '',
      unListType: 'National Unified List',
      referenceNumber: refNo || 'NCTC-REF',
      listedOn: new Date().toISOString().split('T')[0],
      comments: `Automated extraction from Qatar NCTC Unified Sanctions List.`,
      nationality: nationality,
      aliases: [],
      type: EntityType.INDIVIDUAL,
      fetchDate
    });
  });

  return entries;
};

/**
 * Handles the transport layer with server-side proxy to bypass CORS
 */
const fetchRawContent = async (url: string): Promise<string> => {
  try {
    const resp = await fetch(`${LOCAL_PROXY}${encodeURIComponent(url)}`);
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.details || `Proxy fault: ${resp.status}`);
    }
    return await resp.text();
  } catch (err: any) {
    const msg = err.message === 'Failed to fetch' 
      ? "Local proxy unreachable. Ensure the backend server is running."
      : err.message;
    throw new Error(`Critical Handshake Failure: Portal at ${new URL(url).hostname} is unreachable. Error: ${msg}`);
  }
};

export const fetchAndNormalize = async (url: string, name: string, fetchDate: string = new Date().toISOString()): Promise<SanctionEntry[]> => {
  const content = await fetchRawContent(url);
  const format = detectFormat(content, url);

  if (name.includes('UN Security Council') || format === 'XML') {
    return parseUNSanctionsXML(content, fetchDate);
  }
  
  if (name.includes('Qatar') || url.includes('moi.gov.qa') || content.includes('NCTC')) {
    return parseQatarNCTCHTML(content, fetchDate);
  }

  if (name.includes('OpenSanctions') || format === 'JSON') {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    return parseOpenSanctionsJSON(parsed, fetchDate);
  }
  
  return [];
};

export const parseUNSanctionsXML = (xmlString: string, fetchDate: string = new Date().toISOString()): SanctionEntry[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const entries: SanctionEntry[] = [];

  const getNodeVal = (parent: Element, tagName: string): string => {
    const node = parent.getElementsByTagName(tagName)[0];
    return node ? node.textContent?.trim() || '' : '';
  };

  const parseNode = (node: Element, isInd: boolean): SanctionEntry => {
    const natNode = node.getElementsByTagName("NATIONALITY")[0];
    const nationality = natNode ? getNodeVal(natNode, "VALUE") : '';
    const dataIdRaw = getNodeVal(node, "DATAID");

    return {
      dataId: `UN-${dataIdRaw}`,
      source: 'UN Consolidated',
      firstName: getNodeVal(node, "FIRST_NAME"),
      secondName: getNodeVal(node, "SECOND_NAME"),
      thirdName: getNodeVal(node, "THIRD_NAME"),
      lastName: getNodeVal(node, "LAST_NAME"),
      unListType: getNodeVal(node, "UN_LIST_TYPE"),
      referenceNumber: getNodeVal(node, "REFERENCE_NUMBER"),
      listedOn: getNodeVal(node, "LISTED_ON"),
      comments: getNodeVal(node, "COMMENTS1"),
      nationality: nationality,
      aliases: Array.from(node.getElementsByTagName(isInd ? "INDIVIDUAL_ALIAS" : "ENTITY_ALIAS"))
        .map(a => getNodeVal(a, "ALIAS_NAME"))
        .filter(Boolean),
      type: isInd ? EntityType.INDIVIDUAL : EntityType.CORPORATE,
      fetchDate
    };
  };

  const individuals = xmlDoc.getElementsByTagName("INDIVIDUAL");
  for (let i = 0; i < individuals.length; i++) {
    const entry = parseNode(individuals[i], true);
    if (entry.firstName || entry.lastName) entries.push(entry);
  }

  const entities = xmlDoc.getElementsByTagName("ENTITY");
  for (let i = 0; i < entities.length; i++) {
    const entry = parseNode(entities[i], false);
    if (entry.firstName || entry.lastName) entries.push(entry);
  }

  return entries;
};

export const parseOpenSanctionsJSON = (json: any, fetchDate: string = new Date().toISOString()): SanctionEntry[] => {
  const results: any[] = Array.isArray(json) ? json : (json.entities || json.data || []);
  
  return results.map((item: any) => {
    const nameStr = item.caption || item.name || '';
    const nameParts = nameStr.split(' ');
    const nationality = Array.isArray(item.properties?.nationality) ? item.properties.nationality[0] : (item.properties?.jurisdiction?.[0] || '');
    const dataId = item.id ? `OS-${item.id}` : generateDeterministicId('OS', nameStr, nationality, '');

    return {
      dataId,
      source: 'OpenSanctions',
      firstName: nameParts[0] || 'UNKNOWN',
      lastName: nameParts.slice(1).join(' ') || '',
      unListType: item.schema || 'Sanctioned Entity',
      referenceNumber: item.id || 'OS-ID',
      listedOn: item.first_seen || new Date().toISOString().split('T')[0],
      comments: item.notes || item.summary || '',
      nationality,
      aliases: item.properties?.alias || [],
      type: item.schema === 'Person' ? EntityType.INDIVIDUAL : EntityType.CORPORATE,
      fetchDate
    };
  });
};

export const detectFormat = (content: string, fileName: string): 'XML' | 'CSV' | 'EXCEL' | 'JSON' | 'HTML' | 'UNKNOWN' => {
  const ext = fileName.split('.').pop()?.toUpperCase();
  const trimmed = content.trim();
  if (ext === 'XLSX' || ext === 'XLS') return 'EXCEL';
  if (ext === 'CSV') return 'CSV';
  if (ext === 'JSON' || trimmed.startsWith('[') || trimmed.startsWith('{')) return 'JSON';
  if (ext === 'XML' || trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
    if (trimmed.toLowerCase().includes('<html')) return 'HTML';
    return 'XML';
  }
  if (trimmed.toLowerCase().includes('<!doctype html') || trimmed.toLowerCase().includes('<html')) return 'HTML';
  return 'UNKNOWN';
};

export const parseExcelToSanctions = (buffer: ArrayBuffer, sourceName: string): any[] => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

export const mapFieldsToSanction = (row: any, mapping: Record<string, string>, source: string): SanctionEntry => {
  const getVal = (key: string) => {
    const mappedKey = mapping[key];
    return mappedKey ? String(row[mappedKey] || '') : '';
  };
  const typeStr = getVal('type').toUpperCase();
  const entityType = (typeStr.includes('CORP') || typeStr.includes('ENTITY') || typeStr.includes('CORPORATE')) ? EntityType.CORPORATE : EntityType.INDIVIDUAL;
  const name = getVal('firstName') + ' ' + getVal('lastName');

  return {
    dataId: generateDeterministicId('MANUAL', name, getVal('nationality'), getVal('referenceNumber')),
    source: source,
    firstName: getVal('firstName') || 'UNKNOWN',
    lastName: getVal('lastName'),
    unListType: 'Manual Import',
    referenceNumber: getVal('referenceNumber'),
    listedOn: new Date().toISOString().split('T')[0],
    comments: getVal('comments'),
    nationality: getVal('nationality'),
    aliases: [],
    type: entityType,
    fetchDate: new Date().toISOString()
  };
};

export const parseCSVToSanctions = (csv: string, sourceName: string): any[] => {
  const rows: any[] = [];
  const lines = csv.split(/\r?\n/);
  if (lines.length < 1) return [];

  const splitLine = (line: string) => {
    const result = [];
    let startValueIndex = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes;
      if (line[i] === ',' && !inQuotes) {
        result.push(line.substring(startValueIndex, i).replace(/^"|"$/g, '').trim());
        startValueIndex = i + 1;
      }
    }
    result.push(line.substring(startValueIndex).replace(/^"|"$/g, '').trim());
    return result;
  };

  const headers = splitLine(lines[0]).filter(Boolean);
  if (headers.length === 0) return [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitLine(line);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  return rows;
};
