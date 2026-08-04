/**
 * OPS-017: Migration Documentation Evidence Collector
 * Collects evidence of migration documentation and planning
 */

import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrationEvidence {
  migrationDocs: MigrationDocument[];
  migrationPlans: MigrationPlan[];
  summary: {
    totalDocs: number;
    hasMigrationPlan: boolean;
    hasRollbackPlan: boolean;
    hasTestingPlan: boolean;
    compliant: boolean;
  };
}

export interface MigrationDocument {
  fileName: string;
  filePath: string;
  hasMigrationSteps: boolean;
  hasRollback: boolean;
  hasTesting: boolean;
  hasTimeline: boolean;
  lastModified?: Date;
}

export interface MigrationPlan {
  name: string;
  type: 'lift-and-shift' | 'replatform' | 'refactor' | 'other';
  phases: string[];
  hasRisks: boolean;
  hasSuccessCriteria: boolean;
}

/**
 * Collect migration documentation evidence
 */
export async function collectMigrationEvidence(
  docsPath: string
): Promise<MigrationEvidence> {
  try {
    // Scan for migration documentation
    const migrationDocs = scanForMigrationDocs(docsPath);

    // Extract migration plans from docs
    const migrationPlans = extractMigrationPlans(migrationDocs);

    const summary = {
      totalDocs: migrationDocs.length,
      hasMigrationPlan: migrationDocs.some(d => d.hasMigrationSteps),
      hasRollbackPlan: migrationDocs.some(d => d.hasRollback),
      hasTestingPlan: migrationDocs.some(d => d.hasTesting),
      compliant:
        migrationDocs.length > 0 &&
        migrationDocs.some(d => d.hasMigrationSteps && d.hasRollback),
    };

    return {
      migrationDocs,
      migrationPlans,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect migration evidence: ${error}`);
    return {
      migrationDocs: [],
      migrationPlans: [],
      summary: {
        totalDocs: 0,
        hasMigrationPlan: false,
        hasRollbackPlan: false,
        hasTestingPlan: false,
        compliant: false,
      },
    };
  }
}

/**
 * Scan for migration documentation
 */
function scanForMigrationDocs(docsPath: string): MigrationDocument[] {
  const documents: MigrationDocument[] = [];

  if (!fs.existsSync(docsPath)) {
    return documents;
  }

  try {
    const files = fs.readdirSync(docsPath, { recursive: true }) as string[];

    for (const file of files) {
      const filePath = path.join(docsPath, file);

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) continue;

      const lowerFile = file.toLowerCase();
      const stats = fs.statSync(filePath);

      // Look for migration-related documentation
      if (
        lowerFile.includes('migration') ||
        lowerFile.includes('migrate') ||
        lowerFile.includes('cutover') ||
        lowerFile.includes('transition')
      ) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();

          documents.push({
            fileName: path.basename(file),
            filePath,
            hasMigrationSteps:
              lowerContent.includes('migration steps') ||
              lowerContent.includes('migration plan') ||
              lowerContent.includes('step 1'),
            hasRollback:
              lowerContent.includes('rollback') || lowerContent.includes('roll back'),
            hasTesting:
              lowerContent.includes('testing') ||
              lowerContent.includes('validation') ||
              lowerContent.includes('verify'),
            hasTimeline:
              lowerContent.includes('timeline') ||
              lowerContent.includes('schedule') ||
              lowerContent.includes('phase'),
            lastModified: stats.mtime,
          });
        } catch (error) {
          // File might not be readable
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan for migration docs: ${error}`);
  }

  return documents;
}

/**
 * Extract migration plans from documents
 */
function extractMigrationPlans(docs: MigrationDocument[]): MigrationPlan[] {
  const plans: MigrationPlan[] = [];

  for (const doc of docs) {
    if (!doc.hasMigrationSteps) continue;

    try {
      const content = fs.readFileSync(doc.filePath, 'utf-8');
      const lowerContent = content.toLowerCase();

      // Determine migration type
      let type: 'lift-and-shift' | 'replatform' | 'refactor' | 'other' = 'other';
      if (lowerContent.includes('lift and shift') || lowerContent.includes('lift-and-shift'))
        type = 'lift-and-shift';
      else if (lowerContent.includes('replatform')) type = 'replatform';
      else if (lowerContent.includes('refactor')) type = 'refactor';

      // Extract phases
      const phases: string[] = [];
      const phaseMatches = content.match(/phase\s+\d+[:\s]+([^\n]+)/gi);
      if (phaseMatches) {
        phases.push(...phaseMatches.map(m => m.trim()));
      }

      // Check for risks and success criteria
      const hasRisks =
        lowerContent.includes('risk') || lowerContent.includes('mitigation');
      const hasSuccessCriteria =
        lowerContent.includes('success criteria') ||
        lowerContent.includes('acceptance criteria') ||
        lowerContent.includes('validation criteria');

      plans.push({
        name: doc.fileName,
        type,
        phases,
        hasRisks,
        hasSuccessCriteria,
      });
    } catch (error) {
      // Ignore parse errors
    }
  }

  return plans;
}

/**
 * Save migration evidence to file
 */
export function saveOPS017Evidence(
  evidence: MigrationEvidence,
  outputPath: string
): EvidenceArtifact {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save evidence as JSON
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'document',
    path: outputPath,
    description: 'Migration documentation, plans, and procedures',
    requirementIds: ['OPS-017'],
    collectedAt: new Date(),
    metadata: {
      totalDocs: evidence.summary.totalDocs,
      hasMigrationPlan: evidence.summary.hasMigrationPlan,
      compliant: evidence.summary.compliant,
    },
  };
}
