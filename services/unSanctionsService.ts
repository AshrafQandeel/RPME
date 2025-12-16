import { SanctionEntry, EntityType } from '../types';

export const OFFICIAL_UN_XML_URL = "https://scsanctions.un.org/resources/xml/en/consolidated.xml";

/**
 * Parses the UN Consolidated List XML string into SanctionEntry objects.
 */
export const parseUNSanctionsXML = (xmlString: string): SanctionEntry[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const entries: SanctionEntry[] = [];

  // Parse INDIVIDUALS
  const individuals = xmlDoc.getElementsByTagName("INDIVIDUAL");
  for (let i = 0; i < individuals.length; i++) {
    const node = individuals[i];
    entries.push(parseIndividual(node));
  }

  // Parse ENTITIES
  const entities = xmlDoc.getElementsByTagName("ENTITY");
  for (let i = 0; i < entities.length; i++) {
    const node = entities[i];
    entries.push(parseEntity(node));
  }

  return entries;
};

const getNodeVal = (parent: Element, tagName: string): string => {
  const node = parent.getElementsByTagName(tagName)[0];
  return node ? node.textContent?.trim() || '' : '';
};

const parseIndividual = (node: Element): SanctionEntry => {
  const dataId = getNodeVal(node, "DATAID");
  const firstName = getNodeVal(node, "FIRST_NAME");
  const secondName = getNodeVal(node, "SECOND_NAME");
  const thirdName = getNodeVal(node, "THIRD_NAME");
  const unListType = getNodeVal(node, "UN_LIST_TYPE");
  const referenceNumber = getNodeVal(node, "REFERENCE_NUMBER");
  const listedOn = getNodeVal(node, "LISTED_ON");
  const comments = getNodeVal(node, "COMMENTS1");
  
  // Extract Nationality (often nested or in multiple fields, taking first for simplicity)
  const nationalityNode = node.getElementsByTagName("NATIONALITY")[0];
  const nationality = nationalityNode ? getNodeVal(nationalityNode, "VALUE") : '';

  // Extract DOB
  const dobNode = node.getElementsByTagName("INDIVIDUAL_DATE_OF_BIRTH")[0];
  const dob = dobNode ? getNodeVal(dobNode, "DATE") : '';

  // Extract Aliases
  const aliases: string[] = [];
  const aliasNodes = node.getElementsByTagName("INDIVIDUAL_ALIAS");
  for (let j = 0; j < aliasNodes.length; j++) {
    const aliasName = getNodeVal(aliasNodes[j], "ALIAS_NAME");
    if (aliasName) aliases.push(aliasName);
  }

  return {
    dataId: `UN-${dataId}`,
    source: 'UN Consolidated',
    firstName,
    secondName,
    thirdName,
    lastName: '', // UN XML puts everything in 1st/2nd/3rd usually, mapping logic varies
    unListType,
    referenceNumber,
    listedOn,
    comments,
    nationality,
    dateOfBirth: dob,
    aliases,
    type: EntityType.INDIVIDUAL
  };
};

const parseEntity = (node: Element): SanctionEntry => {
  const dataId = getNodeVal(node, "DATAID");
  const firstName = getNodeVal(node, "FIRST_NAME");
  const unListType = getNodeVal(node, "UN_LIST_TYPE");
  const referenceNumber = getNodeVal(node, "REFERENCE_NUMBER");
  const listedOn = getNodeVal(node, "LISTED_ON");
  const comments = getNodeVal(node, "COMMENTS1");

  // Aliases
  const aliases: string[] = [];
  const aliasNodes = node.getElementsByTagName("ENTITY_ALIAS");
  for (let j = 0; j < aliasNodes.length; j++) {
    const aliasName = getNodeVal(aliasNodes[j], "ALIAS_NAME");
    if (aliasName) aliases.push(aliasName);
  }

  return {
    dataId: `UN-${dataId}`,
    source: 'UN Consolidated',
    firstName: firstName, // Entities often use First Name field for the entity name
    lastName: '',
    unListType,
    referenceNumber,
    listedOn,
    comments,
    nationality: '', // Less common for entities in simple schema
    aliases,
    type: EntityType.ENTITY
  };
};

/**
 * Attempts to fetch the XML from a URL. 
 * Note: Will fail in browser due to CORS if the target doesn't support it.
 */
export const fetchFromUrl = async (url: string): Promise<SanctionEntry[]> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const text = await response.text();
    return parseUNSanctionsXML(text);
  } catch (error) {
    throw error;
  }
};