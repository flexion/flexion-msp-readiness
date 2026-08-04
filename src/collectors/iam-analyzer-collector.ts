/**
 * IAM Access Analyzer Evidence Collector - SEC-001, SECP-001
 */

import {
  AccessAnalyzerClient,
  ListAnalyzersCommand,
  ListFindingsCommand,
  ListFindingsCommandInput,
  GetAnalyzerCommand,
} from '@aws-sdk/client-accessanalyzer';
import { EvidenceArtifact } from '../types';

export interface IAMAnalyzerEvidence {
  analyzers: AnalyzerInfo[];
  findings: AccessFindingInfo[];
  findingsByType: Record<string, number>;
  findingsByResourceType: Record<string, number>;
  timestamp: Date;
}

export interface AnalyzerInfo {
  name: string;
  arn: string;
  status: string;
  type: string;
  createdAt: Date;
}

export interface AccessFindingInfo {
  id: string;
  resourceType: string;
  resourceOwnerAccount: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  principal?: string;
  action?: string[];
  condition?: Record<string, unknown>;
  isPublic: boolean;
}

export async function collectIAMAnalyzerEvidence(
  region: string,
  profile: string
): Promise<IAMAnalyzerEvidence> {
  const clientConfig = { region };
  const analyzerClient = new AccessAnalyzerClient(clientConfig);
  const timestamp = new Date();

  try {
    // Get all analyzers
    const analyzersResponse = await analyzerClient.send(new ListAnalyzersCommand({}));
    const analyzers: AnalyzerInfo[] = (analyzersResponse.analyzers ?? []).map(analyzer => ({
      name: analyzer.name ?? '',
      arn: analyzer.arn ?? '',
      status: analyzer.status ?? 'UNKNOWN',
      type: analyzer.type ?? 'ACCOUNT',
      createdAt: analyzer.createdAt ?? new Date(),
    }));

    // Collect findings from all active analyzers
    const findings: AccessFindingInfo[] = [];
    const findingsByType: Record<string, number> = {};
    const findingsByResourceType: Record<string, number> = {};

    for (const analyzer of analyzers) {
      if (analyzer.status !== 'ACTIVE') continue;

      let nextToken: string | undefined;
      let pageCount = 0;
      const maxPages = 10; // Limit to 10 pages per analyzer

      do {
        const findingsInput: ListFindingsCommandInput = {
          analyzerArn: analyzer.arn,
          maxResults: 100,
          nextToken: nextToken,
        };

        const findingsResponse = await analyzerClient.send(new ListFindingsCommand(findingsInput));

        for (const finding of findingsResponse.findings ?? []) {
          const resourceType = finding.resourceType ?? 'UNKNOWN';
          const principal = finding.principal?.AWS ?? finding.principal?.Federated ?? 'unknown';
          const isPublic = principal === '*' || principal.includes('*');

          findings.push({
            id: finding.id ?? '',
            resourceType: resourceType,
            resourceOwnerAccount: finding.resourceOwnerAccount ?? '',
            status: finding.status ?? 'UNKNOWN',
            createdAt: finding.createdAt ?? new Date(),
            updatedAt: finding.updatedAt ?? new Date(),
            principal: principal,
            action: finding.action as string[],
            condition: finding.condition as Record<string, unknown>,
            isPublic: isPublic,
          });

          // Update type counts
          findingsByType[finding.status ?? 'UNKNOWN'] =
            (findingsByType[finding.status ?? 'UNKNOWN'] ?? 0) + 1;
          findingsByResourceType[resourceType] = (findingsByResourceType[resourceType] ?? 0) + 1;
        }

        nextToken = findingsResponse.nextToken;
        pageCount++;
      } while (nextToken && pageCount < maxPages);
    }

    return {
      analyzers,
      findings,
      findingsByType,
      findingsByResourceType,
      timestamp,
    };
  } catch (error) {
    console.error(`Failed to collect IAM Access Analyzer evidence: ${error}`);
    return {
      analyzers: [],
      findings: [],
      findingsByType: {},
      findingsByResourceType: {},
      timestamp,
    };
  }
}

export function saveIAMAnalyzerEvidence(
  evidence: IAMAnalyzerEvidence,
  outputPath: string
): EvidenceArtifact {
  const fs = require('fs');
  const path = require('path');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  const publicFindings = evidence.findings.filter(f => f.isPublic).length;

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'IAM Access Analyzer findings for external and public access',
    requirementIds: ['SEC-001', 'SECP-001'],
    collectedAt: new Date(),
    metadata: {
      totalAnalyzers: evidence.analyzers.length,
      totalFindings: evidence.findings.length,
      publicFindings: publicFindings,
      findingsByType: evidence.findingsByType,
    },
  };
}

export function printIAMAnalyzerEvidenceSummary(evidence: IAMAnalyzerEvidence): void {
  console.log('IAM Access Analyzer Evidence:');
  console.log(`  Active analyzers: ${evidence.analyzers.length}`);
  console.log(`  Total findings: ${evidence.findings.length}`);
  console.log(`  Public access findings: ${evidence.findings.filter(f => f.isPublic).length}`);
  console.log('  Findings by status:');
  for (const [status, count] of Object.entries(evidence.findingsByType)) {
    console.log(`    ${status}: ${count}`);
  }
  console.log('');
}
