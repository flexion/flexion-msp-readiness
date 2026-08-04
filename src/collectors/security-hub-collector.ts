/**
 * Security Hub Evidence Collector - SEC-001, SEC-003, SEC-004, SECP-001, SECP-002
 */

import {
  SecurityHubClient,
  GetFindingsCommand,
  GetFindingsCommandInput,
  DescribeHubCommand,
  GetEnabledStandardsCommand,
} from '@aws-sdk/client-securityhub';
import { EvidenceArtifact } from '../types';

export interface SecurityHubEvidence {
  hubStatus: HubStatus;
  enabledStandards: StandardInfo[];
  findings: FindingInfo[];
  findingsBySeverity: SeveritySummary;
  complianceStatus: ComplianceStatusInfo;
  timestamp: Date;
}

export interface HubStatus {
  hubArn: string;
  subscribedAt?: string;
  autoEnableControls: boolean;
}

export interface StandardInfo {
  name: string;
  arn: string;
  enabled: boolean;
}

export interface FindingInfo {
  id: string;
  title: string;
  severity: string;
  complianceStatus?: string;
  resourceType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeveritySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
}

export interface ComplianceStatusInfo {
  passed: number;
  failed: number;
  warning: number;
  notAvailable: number;
}

export async function collectSecurityHubEvidence(
  region: string,
  profile: string
): Promise<SecurityHubEvidence> {
  const clientConfig = { region };
  const securityHubClient = new SecurityHubClient(clientConfig);
  const timestamp = new Date();

  try {
    // Get Hub status
    const hubResponse = await securityHubClient.send(new DescribeHubCommand({}));
    const hubStatus: HubStatus = {
      hubArn: hubResponse.HubArn ?? '',
      subscribedAt: hubResponse.SubscribedAt,
      autoEnableControls: hubResponse.AutoEnableControls ?? false,
    };

    // Get enabled standards
    const standardsResponse = await securityHubClient.send(new GetEnabledStandardsCommand({}));
    const enabledStandards: StandardInfo[] = (standardsResponse.StandardsSubscriptions ?? []).map(
      standard => ({
        name: standard.StandardsArn?.split('/').pop() ?? '',
        arn: standard.StandardsArn ?? '',
        enabled: standard.StandardsStatus === 'READY',
      })
    );

    // Get findings with pagination
    const findings: FindingInfo[] = [];
    const findingsBySeverity: SeveritySummary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
    };
    const complianceStatus: ComplianceStatusInfo = {
      passed: 0,
      failed: 0,
      warning: 0,
      notAvailable: 0,
    };

    let nextToken: string | undefined;
    let pageCount = 0;
    const maxPages = 10; // Limit to 10 pages to avoid excessive API calls

    do {
      const findingsInput: GetFindingsCommandInput = {
        Filters: {
          RecordState: [{ Value: 'ACTIVE', Comparison: 'EQUALS' }],
        },
        MaxResults: 100,
        NextToken: nextToken,
      };

      const findingsResponse = await securityHubClient.send(new GetFindingsCommand(findingsInput));

      for (const finding of findingsResponse.Findings ?? []) {
        const severity = finding.Severity?.Label?.toLowerCase() ?? 'informational';
        const createdAtStr = finding.CreatedAt;
        const updatedAtStr = finding.UpdatedAt;

        findings.push({
          id: finding.Id ?? '',
          title: finding.Title ?? '',
          severity: severity,
          complianceStatus: finding.Compliance?.Status,
          resourceType: finding.Resources?.[0]?.Type,
          createdAt: createdAtStr ? new Date(createdAtStr) : new Date(),
          updatedAt: updatedAtStr ? new Date(updatedAtStr) : new Date(),
        });

        // Update severity counts
        if (severity === 'critical') findingsBySeverity.critical++;
        else if (severity === 'high') findingsBySeverity.high++;
        else if (severity === 'medium') findingsBySeverity.medium++;
        else if (severity === 'low') findingsBySeverity.low++;
        else findingsBySeverity.informational++;

        // Update compliance status counts
        const compStatus = finding.Compliance?.Status;
        if (compStatus === 'PASSED') complianceStatus.passed++;
        else if (compStatus === 'FAILED') complianceStatus.failed++;
        else if (compStatus === 'WARNING') complianceStatus.warning++;
        else if (compStatus === 'NOT_AVAILABLE') complianceStatus.notAvailable++;
      }

      nextToken = findingsResponse.NextToken;
      pageCount++;
    } while (nextToken && pageCount < maxPages);

    return {
      hubStatus,
      enabledStandards,
      findings,
      findingsBySeverity,
      complianceStatus,
      timestamp,
    };
  } catch (error) {
    console.error(`Failed to collect Security Hub evidence: ${error}`);
    return {
      hubStatus: { hubArn: '', autoEnableControls: false },
      enabledStandards: [],
      findings: [],
      findingsBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        informational: 0,
      },
      complianceStatus: {
        passed: 0,
        failed: 0,
        warning: 0,
        notAvailable: 0,
      },
      timestamp,
    };
  }
}

export function saveSecurityHubEvidence(
  evidence: SecurityHubEvidence,
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
    description: 'AWS Security Hub findings, standards, and compliance status',
    requirementIds: ['SEC-001', 'SEC-003', 'SEC-004', 'SECP-001', 'SECP-002'],
    collectedAt: new Date(),
    metadata: {
      totalFindings: evidence.findings.length,
      criticalFindings: evidence.findingsBySeverity.critical,
      highFindings: evidence.findingsBySeverity.high,
      enabledStandards: evidence.enabledStandards.length,
    },
  };
}

export function printSecurityHubEvidenceSummary(evidence: SecurityHubEvidence): void {
  console.log('Security Hub Evidence:');
  console.log(`  Hub ARN: ${evidence.hubStatus.hubArn}`);
  console.log(`  Enabled standards: ${evidence.enabledStandards.length}`);
  console.log(`  Total findings: ${evidence.findings.length}`);
  console.log(`    Critical: ${evidence.findingsBySeverity.critical}`);
  console.log(`    High: ${evidence.findingsBySeverity.high}`);
  console.log(`    Medium: ${evidence.findingsBySeverity.medium}`);
  console.log(`    Low: ${evidence.findingsBySeverity.low}`);
  console.log('');
}
