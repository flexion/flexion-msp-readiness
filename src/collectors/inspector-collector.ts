/**
 * Inspector Findings Collector - SEC-007, SEC-008
 */

import { Inspector2Client, ListFindingsCommand } from '@aws-sdk/client-inspector2';
import { EvidenceArtifact } from '../types';

export interface InspectorEvidence {
  findings: InspectorFinding[];
  summary: { total: number; critical: number; high: number; medium: number; low: number };
  timestamp: Date;
}

export interface InspectorFinding {
  arn: string;
  severity: string;
  title: string;
  type: string;
  resourceId: string;
  firstObserved: Date;
  status: string;
}

export async function collectInspectorEvidence(
  region: string,
  profile: string
): Promise<InspectorEvidence> {
  const clientConfig = { region };
  const inspectorClient = new Inspector2Client(clientConfig);
  const timestamp = new Date();

  try {
    const findingsResponse = await inspectorClient.send(
      new ListFindingsCommand({
        maxResults: 100,
        filterCriteria: { findingStatus: [{ comparison: 'EQUALS', value: 'ACTIVE' }] },
      })
    );

    const findings: InspectorFinding[] = [];
    const summary = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };

    for (const finding of findingsResponse.findings ?? []) {
      findings.push({
        arn: finding.findingArn ?? '',
        severity: finding.severity ?? 'UNKNOWN',
        title: finding.title ?? '',
        type: finding.type ?? '',
        resourceId: (finding.resources?.[0] as any)?.id ?? 'unknown',
        firstObserved: finding.firstObservedAt ?? new Date(),
        status: finding.status ?? 'UNKNOWN',
      });

      summary.total++;
      const sev = finding.severity?.toUpperCase();
      if (sev === 'CRITICAL') summary.critical++;
      else if (sev === 'HIGH') summary.high++;
      else if (sev === 'MEDIUM') summary.medium++;
      else if (sev === 'LOW') summary.low++;
    }

    return { findings, summary, timestamp };
  } catch (error) {
    console.error(`Failed to collect Inspector evidence: ${error}`);
    return {
      findings: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
      timestamp,
    };
  }
}

export function saveInspectorEvidence(
  evidence: InspectorEvidence,
  outputPath: string
): EvidenceArtifact {
  const fs = require('fs');
  const path = require('path');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'Amazon Inspector vulnerability findings',
    requirementIds: ['SEC-007', 'SEC-008'],
    collectedAt: new Date(),
    metadata: evidence.summary,
  };
}

export function printInspectorEvidenceSummary(evidence: InspectorEvidence): void {
  console.log('Inspector Evidence:');
  console.log(`  Total findings: ${evidence.summary.total}`);
  console.log(`  Critical: ${evidence.summary.critical}, High: ${evidence.summary.high}`);
  console.log(`  Medium: ${evidence.summary.medium}, Low: ${evidence.summary.low}`);
  console.log('');
}
