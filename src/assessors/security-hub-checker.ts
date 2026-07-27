/**
 * Security Hub Checker - analyzes Security Hub findings
 */

import {
  SecurityHubClient,
  DescribeHubCommand,
  GetFindingsCommand,
} from '@aws-sdk/client-securityhub';
import { AssessmentFinding } from '../types';

export interface SecurityHubAnalysis {
  timestamp: Date;
  hubEnabled: boolean;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  findings: AssessmentFinding[];
}

/**
 * Analyze Security Hub
 */
export async function analyzeSecurityHub(
  region: string,
  profile: string
): Promise<SecurityHubAnalysis> {
  const timestamp = new Date();
  const findings: AssessmentFinding[] = [];

  try {
    const clientConfig = { region };
    const securityHubClient = new SecurityHubClient(clientConfig);

    // Check if Security Hub is enabled
    let hubEnabled = false;
    try {
      await securityHubClient.send(new DescribeHubCommand({}));
      hubEnabled = true;

      findings.push({
        type: 'security-hub',
        source: 'Security Hub',
        summary: 'Security Hub is enabled',
        supportive: true,
        timestamp: new Date(),
      });
    } catch (error: any) {
      if (error.name === 'InvalidAccessException') {
        findings.push({
          type: 'security-hub',
          source: 'Security Hub',
          summary: 'Security Hub is not enabled - recommended for SEC-003',
          details: 'Security Hub aggregates findings from multiple AWS security services',
          supportive: false,
          timestamp: new Date(),
        });
      } else {
        throw error;
      }
    }

    // Get findings if hub is enabled
    let totalFindings = 0;
    let criticalFindings = 0;
    let highFindings = 0;
    let mediumFindings = 0;
    let lowFindings = 0;

    if (hubEnabled) {
      try {
        const findingsResponse = await securityHubClient.send(
          new GetFindingsCommand({
            Filters: {
              RecordState: [{ Value: 'ACTIVE', Comparison: 'EQUALS' }],
            },
            MaxResults: 100,
          })
        );

        const securityFindings = findingsResponse.Findings ?? [];
        totalFindings = securityFindings.length;

        for (const finding of securityFindings) {
          const severity = finding.Severity?.Label;
          if (severity === 'CRITICAL') criticalFindings++;
          else if (severity === 'HIGH') highFindings++;
          else if (severity === 'MEDIUM') mediumFindings++;
          else if (severity === 'LOW') lowFindings++;
        }

        if (criticalFindings > 0 || highFindings > 0) {
          findings.push({
            type: 'security-hub',
            source: 'Security Hub Findings',
            summary: `${criticalFindings + highFindings} critical/high severity finding(s) - requires attention`,
            details: `Critical: ${criticalFindings}, High: ${highFindings}`,
            supportive: false,
            timestamp: new Date(),
          });
        } else if (totalFindings > 0) {
          findings.push({
            type: 'security-hub',
            source: 'Security Hub Findings',
            summary: `${totalFindings} finding(s), no critical/high severity issues`,
            supportive: true,
            timestamp: new Date(),
          });
        } else {
          findings.push({
            type: 'security-hub',
            source: 'Security Hub Findings',
            summary: 'No active findings',
            supportive: true,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        findings.push({
          type: 'security-hub',
          source: 'Security Hub Findings',
          summary: `Failed to retrieve findings: ${error instanceof Error ? error.message : String(error)}`,
          supportive: false,
          timestamp: new Date(),
        });
      }
    }

    return {
      timestamp,
      hubEnabled,
      totalFindings,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
      findings,
    };
  } catch (error) {
    findings.push({
      type: 'security-hub',
      source: 'AWS SDK',
      summary: `Failed to analyze Security Hub: ${error instanceof Error ? error.message : String(error)}`,
      supportive: false,
      timestamp: new Date(),
    });

    return {
      timestamp,
      hubEnabled: false,
      totalFindings: 0,
      criticalFindings: 0,
      highFindings: 0,
      mediumFindings: 0,
      lowFindings: 0,
      findings,
    };
  }
}

/**
 * Print Security Hub analysis summary
 */
export function printSecurityHubSummary(analysis: SecurityHubAnalysis): void {
  console.log(`Security Hub analysis complete:`);
  console.log(`  Hub enabled: ${analysis.hubEnabled ? 'Yes' : 'No'}`);
  if (analysis.hubEnabled) {
    console.log(`  Total findings: ${analysis.totalFindings}`);
    console.log(`  Critical: ${analysis.criticalFindings}, High: ${analysis.highFindings}`);
    console.log(`  Medium: ${analysis.mediumFindings}, Low: ${analysis.lowFindings}`);
  }
  console.log(`  Assessment findings: ${analysis.findings.length}`);
  console.log('');
}
