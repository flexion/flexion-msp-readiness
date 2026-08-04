/**
 * SEC-005: Policy Management Evidence Collector
 * Collects evidence of IAM policy management and validation using Access Analyzer
 */

import {
  AccessAnalyzerClient,
  ListFindingsCommand,
  ListAnalyzersCommand,
  GetFindingCommand,
} from '@aws-sdk/client-accessanalyzer';
import {
  IAMClient,
  ListPoliciesCommand,
  GetPolicyVersionCommand,
  ListAttachedRolePoliciesCommand,
  ListRolesCommand,
} from '@aws-sdk/client-iam';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface PolicyManagementEvidence {
  accessAnalyzers: AccessAnalyzerInfo[];
  findings: AccessAnalyzerFinding[];
  customPolicies: PolicyInfo[];
  policyDocuments: PolicyDocument[];
  summary: {
    totalAnalyzers: number;
    activeAnalyzers: number;
    totalFindings: number;
    criticalFindings: number;
    customPolicies: number;
    policiesWithIssues: number;
    compliant: boolean;
  };
}

export interface AccessAnalyzerInfo {
  name: string;
  arn: string;
  status: string;
  type: string;
  createdAt?: Date;
}

export interface AccessAnalyzerFinding {
  id: string;
  resourceArn: string;
  resourceType: string;
  condition: string;
  action: string[];
  principal?: Record<string, any>;
  status: string;
  analyzedAt?: Date;
}

export interface PolicyInfo {
  name: string;
  arn: string;
  attachmentCount: number;
  defaultVersion: string;
  hasIssues: boolean;
  issues: string[];
}

export interface PolicyDocument {
  policyName: string;
  path: string;
  content: string;
}

/**
 * Collect policy management evidence
 */
export async function collectPolicyManagementEvidence(
  region: string,
  docsPath: string
): Promise<PolicyManagementEvidence> {
  const analyzerClient = new AccessAnalyzerClient({ region });
  const iamClient = new IAMClient({ region });

  try {
    // Get Access Analyzers
    const analyzers = await listAccessAnalyzers(analyzerClient);

    // Get Access Analyzer findings
    const findings: AccessAnalyzerFinding[] = [];
    for (const analyzer of analyzers) {
      const analyzerFindings = await listFindings(analyzerClient, analyzer.arn);
      findings.push(...analyzerFindings);
    }

    // Get custom IAM policies
    const customPolicies = await listCustomPolicies(iamClient);

    // Scan for policy documentation
    const policyDocuments = scanForPolicyDocuments(docsPath);

    const criticalFindings = findings.filter(f =>
      f.status === 'ACTIVE' &&
      (f.action.includes('*') || f.resourceType === 'AWS::IAM::Role')
    );

    const summary = {
      totalAnalyzers: analyzers.length,
      activeAnalyzers: analyzers.filter(a => a.status === 'ACTIVE').length,
      totalFindings: findings.length,
      criticalFindings: criticalFindings.length,
      customPolicies: customPolicies.length,
      policiesWithIssues: customPolicies.filter(p => p.hasIssues).length,
      compliant: analyzers.length > 0 && criticalFindings.length === 0,
    };

    return {
      accessAnalyzers: analyzers,
      findings,
      customPolicies,
      policyDocuments,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect policy management evidence: ${error}`);
    return {
      accessAnalyzers: [],
      findings: [],
      customPolicies: [],
      policyDocuments: [],
      summary: {
        totalAnalyzers: 0,
        activeAnalyzers: 0,
        totalFindings: 0,
        criticalFindings: 0,
        customPolicies: 0,
        policiesWithIssues: 0,
        compliant: false,
      },
    };
  }
}

/**
 * List Access Analyzers
 */
async function listAccessAnalyzers(
  client: AccessAnalyzerClient
): Promise<AccessAnalyzerInfo[]> {
  try {
    const response = await client.send(new ListAnalyzersCommand({}));

    return (response.analyzers ?? []).map(analyzer => ({
      name: analyzer.name ?? 'unknown',
      arn: analyzer.arn ?? 'unknown',
      status: analyzer.status ?? 'unknown',
      type: analyzer.type ?? 'unknown',
      createdAt: analyzer.createdAt,
    }));
  } catch (error) {
    console.error(`Failed to list Access Analyzers: ${error}`);
    return [];
  }
}

/**
 * List findings for an analyzer
 */
async function listFindings(
  client: AccessAnalyzerClient,
  analyzerArn: string
): Promise<AccessAnalyzerFinding[]> {
  try {
    const response = await client.send(
      new ListFindingsCommand({ analyzerArn })
    );

    return (response.findings ?? []).map(finding => ({
      id: finding.id ?? 'unknown',
      resourceArn: finding.resource ?? 'unknown',
      resourceType: finding.resourceType ?? 'unknown',
      condition: JSON.stringify(finding.condition ?? {}),
      action: finding.action ?? [],
      principal: finding.principal as Record<string, any>,
      status: finding.status ?? 'unknown',
      analyzedAt: finding.analyzedAt,
    }));
  } catch (error) {
    console.error(`Failed to list findings: ${error}`);
    return [];
  }
}

/**
 * List custom IAM policies (not AWS managed)
 */
async function listCustomPolicies(client: IAMClient): Promise<PolicyInfo[]> {
  try {
    const response = await client.send(
      new ListPoliciesCommand({ Scope: 'Local' })
    );

    const policies: PolicyInfo[] = [];

    for (const policy of response.Policies ?? []) {
      if (!policy.PolicyName || !policy.Arn) continue;

      const issues: string[] = [];
      let hasIssues = false;

      // Get policy version details
      try {
        if (policy.DefaultVersionId) {
          const versionResponse = await client.send(
            new GetPolicyVersionCommand({
              PolicyArn: policy.Arn,
              VersionId: policy.DefaultVersionId,
            })
          );

          const document = versionResponse.PolicyVersion?.Document;
          if (document) {
            const policyDoc = JSON.parse(decodeURIComponent(document));

            // Check for overly permissive policies
            if (JSON.stringify(policyDoc).includes('"Action":"*"')) {
              issues.push('Policy grants wildcard (*) actions');
              hasIssues = true;
            }
            if (JSON.stringify(policyDoc).includes('"Resource":"*"')) {
              issues.push('Policy grants access to all resources (*)');
              hasIssues = true;
            }
          }
        }
      } catch (error) {
        // Policy version might not be accessible
      }

      policies.push({
        name: policy.PolicyName,
        arn: policy.Arn,
        attachmentCount: policy.AttachmentCount ?? 0,
        defaultVersion: policy.DefaultVersionId ?? 'unknown',
        hasIssues,
        issues,
      });
    }

    return policies;
  } catch (error) {
    console.error(`Failed to list custom policies: ${error}`);
    return [];
  }
}

/**
 * Scan for policy documentation files
 */
function scanForPolicyDocuments(docsPath: string): PolicyDocument[] {
  const documents: PolicyDocument[] = [];

  if (!fs.existsSync(docsPath)) {
    return documents;
  }

  try {
    const files = fs.readdirSync(docsPath, { recursive: true }) as string[];

    for (const file of files) {
      const filePath = path.join(docsPath, file);

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) continue;

      // Look for policy-related documentation
      if (
        file.toLowerCase().includes('policy') ||
        file.toLowerCase().includes('iam') ||
        file.toLowerCase().includes('access') ||
        file.toLowerCase().includes('permission')
      ) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          documents.push({
            policyName: path.basename(file),
            path: filePath,
            content: content.substring(0, 500), // First 500 chars
          });
        } catch (error) {
          // File might not be readable
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan for policy documents: ${error}`);
  }

  return documents;
}

/**
 * Save policy management evidence to file
 */
export function saveSEC005Evidence(
  evidence: PolicyManagementEvidence,
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
    type: 'aws-snapshot',
    path: outputPath,
    description: 'Policy management and IAM Access Analyzer findings',
    requirementIds: ['SEC-005'],
    collectedAt: new Date(),
    metadata: {
      totalAnalyzers: evidence.summary.totalAnalyzers,
      totalFindings: evidence.summary.totalFindings,
      criticalFindings: evidence.summary.criticalFindings,
      compliant: evidence.summary.compliant,
    },
  };
}
