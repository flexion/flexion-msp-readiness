/**
 * Non-Technical Evidence Collector
 *
 * Scans for documentation related to business, people, governance, and platform requirements.
 * Covers 18 non-technical MSP requirements (BUS, PEO, GOV, PLAT).
 *
 * @module collectors/non-technical-collector
 *
 * @example
 * ```typescript
 * import {
 *   collectNonTechnicalEvidence,
 *   convertToEvidenceArtifacts,
 *   printNonTechnicalEvidenceSummary
 * } from './collectors/non-technical-collector';
 *
 * // Collect evidence from a project
 * const result = await collectNonTechnicalEvidence(
 *   '/path/to/project',
 *   '/path/to/project/docs'
 * );
 *
 * // Print summary
 * printNonTechnicalEvidenceSummary(result);
 *
 * // Convert to evidence artifacts for manifest
 * const artifacts = convertToEvidenceArtifacts(result.evidence);
 *
 * // Filter by category
 * const businessEvidence = filterByCategory(result, 'business');
 * const missingDocs = getMissingByCategory(result, 'governance');
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { EvidenceArtifact } from '../types';

export interface NonTechnicalEvidence {
  requirementId: string;
  category: 'business' | 'people' | 'governance' | 'platform';
  found: boolean;
  documentPath?: string;
  documentType: string;
  completeness?: number; // 0-100
  lastModified?: Date;
  notes?: string;
}

export interface NonTechnicalCollectorResult {
  evidence: NonTechnicalEvidence[];
  summary: {
    totalRequirements: number;
    found: number;
    missing: number;
    byCategory: Record<string, { found: number; total: number }>;
  };
}

/**
 * Mapping of requirements to document scan patterns
 */
const SCAN_PATTERNS: Record<string, { category: string; patterns: string[]; description: string }> = {
  'BUS-001': {
    category: 'business',
    patterns: [
      '**/company-overview.*',
      '**/about.*',
      '**/company-profile.*',
      '**/organization-overview.*',
      '**/company-presentation.*',
    ],
    description: 'Company overview presentation',
  },
  'BUS-002': {
    category: 'business',
    patterns: [
      '**/growth.*',
      '**/customers.*',
      '**/contracts.*',
      '**/customer-growth.*',
      '**/msp-growth.*',
    ],
    description: 'MSP practice growth documentation',
  },
  'BUS-003': {
    category: 'business',
    patterns: [
      '**/financial-*.*',
      '**/budget.*',
      '**/forecast.*',
      '**/financial-planning.*',
      '**/financial-reports.*',
    ],
    description: 'Financial planning and reporting',
  },
  'BUS-004': {
    category: 'business',
    patterns: [
      '**/gtm.*',
      '**/go-to-market.*',
      '**/sales-process.*',
      '**/sales-enablement.*',
      '**/marketing.*',
    ],
    description: 'Go-to-market process',
  },
  'PEO-001': {
    category: 'people',
    patterns: [
      '**/onboarding.*',
      '**/new-hire.*',
      '**/personnel-onboarding.*',
      '**/employee-onboarding.*',
      '**/training-plan.*',
    ],
    description: 'Personnel onboarding procedures',
  },
  'PEO-002': {
    category: 'people',
    patterns: [
      '**/ccoe.*',
      '**/cloud-center.*',
      '**/center-of-excellence.*',
      '**/cloud-governance.*',
      '**/cloud-strategy.*',
    ],
    description: 'Cloud Center of Excellence (CCOE)',
  },
  'PEO-003': {
    category: 'people',
    patterns: [
      '**/offboarding.*',
      '**/termination.*',
      '**/exit-procedure.*',
      '**/personnel-offboarding.*',
      '**/access-revocation.*',
    ],
    description: 'Personnel offboarding procedures',
  },
  'GOV-001': {
    category: 'governance',
    patterns: [
      '**/risk-register.*',
      '**/risk-assessment.*',
      '**/risk-management.*',
      '**/risk-mitigation.*',
      '**/business-risk.*',
    ],
    description: 'Risk and mitigation plans',
  },
  'GOV-002': {
    category: 'governance',
    patterns: [
      '**/customer-satisfaction.*',
      '**/csat.*',
      '**/feedback.*',
      '**/customer-survey.*',
      '**/satisfaction-metrics.*',
    ],
    description: 'Customer satisfaction measurement',
  },
  'GOV-003': {
    category: 'governance',
    patterns: [
      '**/data-governance.*',
      '**/data-ownership.*',
      '**/customer-offboarding.*',
      '**/data-transfer.*',
      '**/contract-template.*',
    ],
    description: 'Data ownership and customer offboarding',
  },
  'GOV-004': {
    category: 'governance',
    patterns: [
      '**/operational-readiness.*',
      '**/ops-readiness.*',
      '**/readiness-checklist.*',
      '**/operational-procedures.*',
    ],
    description: 'Operational readiness procedures',
  },
  'GOV-005': {
    category: 'governance',
    patterns: [
      '**/shared-responsibility.*',
      '**/raci.*',
      '**/responsibility-matrix.*',
      '**/security-requirements.*',
    ],
    description: 'Shared responsibility model',
  },
  'GOV-006': {
    category: 'governance',
    patterns: [
      '**/sustainability.*',
      '**/green-*.*',
      '**/carbon.*',
      '**/energy-efficiency.*',
      '**/optimization.*',
    ],
    description: 'Sustainability best practices',
  },
  'PLAT-001': {
    category: 'platform',
    patterns: [
      '**/account-management.*',
      '**/account-isolation.*',
      '**/account-creation.*',
      '**/multi-tenancy.*',
    ],
    description: 'Account management and isolation',
  },
  'PLAT-002': {
    category: 'platform',
    patterns: [
      '**/design-document.*',
      '**/architecture.*',
      '**/solution-design.*',
      '**/customer-solution.*',
      '**/requirements.*',
    ],
    description: 'Solution capabilities documentation',
  },
  'PLAT-003': {
    category: 'platform',
    patterns: [
      '**/nfr.*',
      '**/non-functional.*',
      '**/performance-requirements.*',
      '**/sla.*',
      '**/availability-requirements.*',
    ],
    description: 'Non-functional requirements',
  },
  'PLAT-004': {
    category: 'platform',
    patterns: [
      '**/well-architected.*',
      '**/wafr.*',
      '**/wa-review.*',
      '**/architecture-review.*',
    ],
    description: 'Well-Architected Framework reviews',
  },
  'PLAT-005': {
    category: 'platform',
    patterns: [
      '**/service-expertise.*',
      '**/aws-services.*',
      '**/workload-documentation.*',
      '**/service-utilization.*',
    ],
    description: 'AWS service expertise documentation',
  },
};

/**
 * Standard document locations to scan
 */
function getSearchPaths(projectPath: string, docsPath: string): string[] {
  return [
    path.join(docsPath, 'msp'),
    path.join(docsPath, 'policies'),
    path.join(docsPath, 'processes'),
    path.join(docsPath, 'procedures'),
    path.join(docsPath, 'governance'),
    path.join(docsPath, 'business'),
    path.join(docsPath, 'people'),
    path.join(docsPath, 'platform'),
    path.join(projectPath, 'docs'),
    path.join(projectPath, 'documentation'),
    path.join(projectPath, '.github'),
  ];
}

/**
 * Collect non-technical evidence by scanning for documentation
 */
export async function collectNonTechnicalEvidence(
  projectPath: string,
  docsPath: string
): Promise<NonTechnicalCollectorResult> {
  const evidence: NonTechnicalEvidence[] = [];
  const searchPaths = getSearchPaths(projectPath, docsPath);

  // Scan for each requirement
  for (const [requirementId, config] of Object.entries(SCAN_PATTERNS)) {
    const result = await scanForRequirement(
      requirementId,
      config.category as NonTechnicalEvidence['category'],
      config.patterns,
      config.description,
      searchPaths
    );
    evidence.push(result);
  }

  // Calculate summary
  const summary = generateSummary(evidence);

  return {
    evidence,
    summary,
  };
}

/**
 * Scan for a specific requirement's documentation
 */
async function scanForRequirement(
  requirementId: string,
  category: NonTechnicalEvidence['category'],
  patterns: string[],
  description: string,
  searchPaths: string[]
): Promise<NonTechnicalEvidence> {
  let foundPath: string | undefined;
  let lastModified: Date | undefined;

  // Search each location
  for (const searchPath of searchPaths) {
    if (!fs.existsSync(searchPath)) {
      continue;
    }

    // Try each pattern
    for (const pattern of patterns) {
      const fullPattern = path.join(searchPath, pattern);

      try {
        const matches = await glob(fullPattern, {
          nocase: true,
          absolute: true,
        });

        if (matches.length > 0) {
          // Use the first match
          foundPath = matches[0];
          const stats = fs.statSync(foundPath);
          lastModified = stats.mtime;
          break;
        }
      } catch (error) {
        // Continue to next pattern if glob fails
        continue;
      }
    }

    if (foundPath) {
      break;
    }
  }

  // Check completeness if found
  let completeness: number | undefined;
  if (foundPath) {
    completeness = await checkDocumentCompleteness(foundPath, requirementId);
  }

  return {
    requirementId,
    category,
    found: !!foundPath,
    documentPath: foundPath,
    documentType: description,
    completeness,
    lastModified,
  };
}

/**
 * Check basic document completeness
 * Returns a score from 0-100
 */
async function checkDocumentCompleteness(filePath: string, requirementId: string): Promise<number> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let score = 0;

    // Check 1: Has YAML frontmatter with requirementId (25 points)
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const frontmatterMatch = content.match(frontmatterRegex);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      if (frontmatter.includes(requirementId)) {
        score += 25;
      }
    }

    // Check 2: Has meaningful section headers (25 points)
    const headerRegex = /^#{1,3}\s+.+$/gm;
    const headers = content.match(headerRegex);
    if (headers && headers.length >= 3) {
      score += 25;
    }

    // Check 3: Minimum length >500 characters (25 points)
    if (content.length > 500) {
      score += 25;
    }

    // Check 4: Recently modified (within 180 days) (25 points)
    const stats = fs.statSync(filePath);
    const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 180) {
      score += 25;
    }

    return score;
  } catch (error) {
    return 0;
  }
}

/**
 * Generate summary statistics
 */
function generateSummary(
  evidence: NonTechnicalEvidence[]
): NonTechnicalCollectorResult['summary'] {
  const byCategory: Record<string, { found: number; total: number }> = {
    business: { found: 0, total: 0 },
    people: { found: 0, total: 0 },
    governance: { found: 0, total: 0 },
    platform: { found: 0, total: 0 },
  };

  let found = 0;

  for (const item of evidence) {
    byCategory[item.category].total++;
    if (item.found) {
      byCategory[item.category].found++;
      found++;
    }
  }

  return {
    totalRequirements: evidence.length,
    found,
    missing: evidence.length - found,
    byCategory,
  };
}

/**
 * Convert evidence to EvidenceArtifact format
 */
export function convertToEvidenceArtifacts(
  evidence: NonTechnicalEvidence[]
): EvidenceArtifact[] {
  const artifacts: EvidenceArtifact[] = [];

  for (const item of evidence) {
    if (item.found && item.documentPath) {
      artifacts.push({
        type: 'document',
        path: item.documentPath,
        description: item.documentType,
        requirementIds: [item.requirementId],
        collectedAt: new Date(),
        metadata: {
          found: true,
          completeness: item.completeness,
          lastModified: item.lastModified?.toISOString(),
          category: item.category,
        },
      });
    }
  }

  return artifacts;
}

/**
 * Save non-technical evidence to file
 */
export function saveNonTechnicalEvidence(
  result: NonTechnicalCollectorResult,
  outputPath: string
): EvidenceArtifact {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  return {
    type: 'document',
    path: outputPath,
    description: 'Non-technical evidence collection results',
    requirementIds: result.evidence.map(e => e.requirementId),
    collectedAt: new Date(),
    metadata: {
      totalRequirements: result.summary.totalRequirements,
      found: result.summary.found,
      missing: result.summary.missing,
      byCategory: result.summary.byCategory,
    },
  };
}

/**
 * Print non-technical evidence summary
 */
export function printNonTechnicalEvidenceSummary(result: NonTechnicalCollectorResult): void {
  console.log('Non-Technical Evidence Collection:');
  console.log(`  Total requirements: ${result.summary.totalRequirements}`);
  console.log(`  Found: ${result.summary.found}`);
  console.log(`  Missing: ${result.summary.missing}`);
  console.log(`  Coverage: ${Math.round((result.summary.found / result.summary.totalRequirements) * 100)}%`);
  console.log('');

  console.log('  By category:');
  for (const [category, stats] of Object.entries(result.summary.byCategory)) {
    const pct = stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0;
    console.log(`    ${category}: ${stats.found}/${stats.total} (${pct}%)`);
  }
  console.log('');

  // Show what was found
  const foundEvidence = result.evidence.filter(e => e.found);
  if (foundEvidence.length > 0) {
    console.log('  Found documents:');
    for (const item of foundEvidence) {
      const completenessStr = item.completeness ? ` (${item.completeness}% complete)` : '';
      console.log(`    ✓ ${item.requirementId}: ${path.basename(item.documentPath!)}${completenessStr}`);
    }
    console.log('');
  }

  // Show what's missing
  const missingEvidence = result.evidence.filter(e => !e.found);
  if (missingEvidence.length > 0) {
    console.log('  Missing documents:');
    for (const item of missingEvidence) {
      console.log(`    ✗ ${item.requirementId}: ${item.documentType}`);
    }
    console.log('');
  }
}

/**
 * Filter evidence by category
 */
export function filterByCategory(
  result: NonTechnicalCollectorResult,
  category: NonTechnicalEvidence['category']
): NonTechnicalEvidence[] {
  return result.evidence.filter(e => e.category === category);
}

/**
 * Get missing evidence by category
 */
export function getMissingByCategory(
  result: NonTechnicalCollectorResult,
  category: NonTechnicalEvidence['category']
): NonTechnicalEvidence[] {
  return result.evidence.filter(e => e.category === category && !e.found);
}
