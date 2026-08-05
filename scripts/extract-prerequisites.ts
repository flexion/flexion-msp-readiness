#!/usr/bin/env ts-node
/**
 * Extract MSP Prerequisites from the official AWS MSP Self-Assessment spreadsheet
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_PATH = '/Users/tim/AWS Managed Service Provider (MSP) Program Self-Assessment.xlsx';
const OUTPUT_PATH = path.join(__dirname, '../src/data/msp-prerequisites.ts');

interface MSPPrerequisite {
  id: string;
  name: string;
  category: string;
  description: string;
  mandatory: boolean;
  evidenceRequired: string[];
  estimatedHours: number;
}

function parsePrerequisiteDescription(text: string): { name: string; description: string; evidence: string[] } {
  const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l);

  let name = '';
  let mandatory = false;
  let descriptionLines: string[] = [];
  let evidenceLines: string[] = [];
  let inEvidence = false;

  for (const line of lines) {
    if (line.toLowerCase() === 'mandatory') {
      mandatory = true;
      continue;
    }

    if (line.toLowerCase().startsWith('evidence must')) {
      inEvidence = true;
      evidenceLines.push(line);
      continue;
    }

    if (inEvidence) {
      evidenceLines.push(line);
    } else {
      if (!name && !line.startsWith('AWS Partner')) {
        name = line;
      } else {
        descriptionLines.push(line);
      }
    }
  }

  return {
    name: name || descriptionLines[0] || 'Unknown',
    description: descriptionLines.join(' '),
    evidence: [evidenceLines.join(' ')],
  };
}

function extractPrerequisites(): MSPPrerequisite[] {
  console.log('Reading MSP Self-Assessment spreadsheet...');
  const workbook = XLSX.readFile(SPREADSHEET_PATH);
  const worksheet = workbook.Sheets['MSP Prerequisites'];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  console.log(`Found ${data.length} rows in Prerequisites sheet`);

  const prerequisites: MSPPrerequisite[] = [];
  let currentCategory = '';

  // Row 1 has headers: ID, Requirement Description, Met?, Partner Response
  // Data starts at row 2
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const firstCol = row[0]?.toString().trim() || '';
    const secondCol = row[1]?.toString().trim() || '';

    // Skip empty rows
    if (!firstCol && !secondCol) continue;

    // Check if this is a category header (has text in first column only, no hyphen in ID)
    if (firstCol && !secondCol && !firstCol.includes('-')) {
      currentCategory = firstCol.toLowerCase();
      console.log(`Found category: ${currentCategory}`);
      continue;
    }

    // Check if this is a prerequisite (has ID format XXXP-NNN)
    if (firstCol.match(/^[A-Z]+P-\d{3}$/)) {
      const parsed = parsePrerequisiteDescription(secondCol);

      const prereq: MSPPrerequisite = {
        id: firstCol,
        name: parsed.name,
        category: currentCategory || 'general',
        description: parsed.description,
        mandatory: true,
        evidenceRequired: parsed.evidence,
        estimatedHours: 4, // Default estimate
      };

      prerequisites.push(prereq);
      console.log(`  Extracted: ${prereq.id} - ${prereq.name}`);
    }
  }

  console.log(`\n✅ Extracted ${prerequisites.length} prerequisites`);
  return prerequisites;
}

// Run extraction
try {
  const prerequisites = extractPrerequisites();

  if (prerequisites.length > 0) {
    // Generate TypeScript file
    const tsContent = `/**
 * AWS MSP Program Prerequisites
 *
 * These requirements must be met BEFORE the technical validation (ISSI audit).
 * Prerequisites focus on business processes, team structure, and foundational practices.
 *
 * Source: AWS Managed Service Provider (MSP) Program Self-Assessment.xlsx
 * Tab: MSP Prerequisites
 * Last updated: ${new Date().toISOString().split('T')[0]}
 */

export interface MSPPrerequisite {
  id: string;
  name: string;
  category: string;
  description: string;
  mandatory: boolean;
  evidenceRequired: string[];
  estimatedHours: number;
}

export const MSP_PREREQUISITES: MSPPrerequisite[] = ${JSON.stringify(prerequisites, null, 2)};

// Category breakdown
export const PREREQUISITE_CATEGORIES = {
  business: ${prerequisites.filter(p => p.category === 'business').length},
  people: ${prerequisites.filter(p => p.category === 'people').length},
  governance: ${prerequisites.filter(p => p.category === 'governance').length},
  platform: ${prerequisites.filter(p => p.category === 'platform').length},
  security: ${prerequisites.filter(p => p.category === 'security').length},
  operations: ${prerequisites.filter(p => p.category === 'operations').length},
};

export const TOTAL_PREREQUISITES = ${prerequisites.length};
`;

    fs.writeFileSync(OUTPUT_PATH, tsContent);
    console.log(`\n💾 Saved to ${OUTPUT_PATH}`);

    // Print summary
    console.log('\n📊 Prerequisites Summary by Category:');
    const categories = [...new Set(prerequisites.map(p => p.category))];
    categories.forEach(cat => {
      const count = prerequisites.filter(p => p.category === cat).length;
      console.log(`  ${cat}: ${count} requirements`);
    });

    console.log('\n📋 Prerequisites List:');
    prerequisites.forEach(prereq => {
      console.log(`  ${prereq.id}: ${prereq.name}`);
    });
  } else {
    console.log('\n⚠️  No prerequisites extracted.');
  }
} catch (error) {
  console.error('Error extracting prerequisites:', error);
  process.exit(1);
}
