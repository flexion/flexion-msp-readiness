/**
 * Config Rules Evidence Collector
 * Collects evidence of AWS Config rules and compliance for SEC-003, SECP-002
 */

import {
  ConfigServiceClient,
  DescribeConfigRulesCommand,
  DescribeComplianceByConfigRuleCommand,
  GetComplianceDetailsByConfigRuleCommand,
  DescribeConformancePacksCommand,
  DescribeConformancePackComplianceCommand,
  GetResourceConfigHistoryCommand,
  SelectResourceConfigCommand,
} from '@aws-sdk/client-config-service';
import { EvidenceArtifact } from '../types';

export interface ConfigRulesEvidence {
  configRules: ConfigRuleDetail[];
  conformancePacks: ConformancePackDetail[];
  complianceSummary: ComplianceSummary;
  publicResourceRules: ConfigRuleDetail[];
  timestamp: Date;
}

export interface ConfigRuleDetail {
  ruleName: string;
  description?: string;
  complianceType: string;
  source: string;
  scope?: string[];
  nonCompliantResources?: number;
}

export interface ConformancePackDetail {
  name: string;
  status: string;
  compliantRules: number;
  nonCompliantRules: number;
  totalRules: number;
}

export interface ComplianceSummary {
  totalRules: number;
  compliant: number;
  nonCompliant: number;
  notApplicable: number;
  insufficientData: number;
}

/**
 * Collect Config rules evidence
 */
export async function collectConfigRulesEvidence(
  region: string,
  profile: string
): Promise<ConfigRulesEvidence> {
  const clientConfig = { region };
  const configClient = new ConfigServiceClient(clientConfig);
  const timestamp = new Date();

  try {
    // Get all Config rules
    const rulesResponse = await configClient.send(new DescribeConfigRulesCommand({}));

    const configRules: ConfigRuleDetail[] = [];
    const complianceSummary: ComplianceSummary = {
      totalRules: 0,
      compliant: 0,
      nonCompliant: 0,
      notApplicable: 0,
      insufficientData: 0,
    };

    for (const rule of rulesResponse.ConfigRules ?? []) {
      if (!rule.ConfigRuleName) continue;

      // Get compliance for this rule
      let complianceType = 'UNKNOWN';
      let nonCompliantResources = 0;

      try {
        const complianceResponse = await configClient.send(
          new DescribeComplianceByConfigRuleCommand({
            ConfigRuleNames: [rule.ConfigRuleName],
          })
        );

        const compliance = complianceResponse.ComplianceByConfigRules?.[0]?.Compliance;
        complianceType = compliance?.ComplianceType ?? 'UNKNOWN';

        // Get non-compliant resource count
        if (complianceType === 'NON_COMPLIANT') {
          try {
            const detailsResponse = await configClient.send(
              new GetComplianceDetailsByConfigRuleCommand({
                ConfigRuleName: rule.ConfigRuleName,
                ComplianceTypes: ['NON_COMPLIANT'],
              })
            );
            nonCompliantResources = detailsResponse.EvaluationResults?.length ?? 0;
          } catch {
            // Details might not be available
          }
        }
      } catch {
        // Compliance might not be available
      }

      // Update summary
      complianceSummary.totalRules++;
      switch (complianceType) {
        case 'COMPLIANT':
          complianceSummary.compliant++;
          break;
        case 'NON_COMPLIANT':
          complianceSummary.nonCompliant++;
          break;
        case 'NOT_APPLICABLE':
          complianceSummary.notApplicable++;
          break;
        case 'INSUFFICIENT_DATA':
          complianceSummary.insufficientData++;
          break;
      }

      configRules.push({
        ruleName: rule.ConfigRuleName,
        description: rule.Description,
        complianceType,
        source: rule.Source?.Owner ?? 'UNKNOWN',
        scope: rule.Scope?.ComplianceResourceTypes,
        nonCompliantResources: nonCompliantResources > 0 ? nonCompliantResources : undefined,
      });
    }

    // Get conformance packs
    const conformancePacks = await getConformancePacks(configClient);

    // Identify public resource detection rules (SECP-002)
    const publicResourceRules = configRules.filter(r =>
      r.ruleName.toLowerCase().includes('public')
    );

    return {
      configRules,
      conformancePacks,
      complianceSummary,
      publicResourceRules,
      timestamp,
    };
  } catch (error) {
    console.error(`Failed to collect Config rules evidence: ${error}`);
    return {
      configRules: [],
      conformancePacks: [],
      complianceSummary: {
        totalRules: 0,
        compliant: 0,
        nonCompliant: 0,
        notApplicable: 0,
        insufficientData: 0,
      },
      publicResourceRules: [],
      timestamp,
    };
  }
}

/**
 * Get conformance packs
 */
async function getConformancePacks(client: ConfigServiceClient): Promise<ConformancePackDetail[]> {
  try {
    const packsResponse = await client.send(new DescribeConformancePacksCommand({}));

    const packs: ConformancePackDetail[] = [];

    for (const pack of packsResponse.ConformancePackDetails ?? []) {
      if (!pack.ConformancePackName) continue;

      let compliantRules = 0;
      let nonCompliantRules = 0;
      let totalRules = 0;

      try {
        const complianceResponse = await client.send(
          new DescribeConformancePackComplianceCommand({
            ConformancePackName: pack.ConformancePackName,
          })
        );

        for (const rule of complianceResponse.ConformancePackRuleComplianceList ?? []) {
          totalRules++;
          if (rule.ComplianceType === 'COMPLIANT') {
            compliantRules++;
          } else if (rule.ComplianceType === 'NON_COMPLIANT') {
            nonCompliantRules++;
          }
        }
      } catch {
        // Compliance might not be available
      }

      packs.push({
        name: pack.ConformancePackName,
        status: (pack as any).ConformancePackState ?? 'UNKNOWN',
        compliantRules,
        nonCompliantRules,
        totalRules,
      });
    }

    return packs;
  } catch {
    return [];
  }
}

/**
 * Save Config rules evidence to file
 */
export function saveConfigRulesEvidence(
  evidence: ConfigRulesEvidence,
  outputPath: string
): EvidenceArtifact {
  const fs = require('fs');
  const path = require('path');

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
    description: 'AWS Config rules and compliance status',
    requirementIds: ['SEC-003', 'SECP-002'],
    collectedAt: new Date(),
    metadata: {
      totalRules: evidence.complianceSummary.totalRules,
      compliant: evidence.complianceSummary.compliant,
      nonCompliant: evidence.complianceSummary.nonCompliant,
      publicResourceRules: evidence.publicResourceRules.length,
    },
  };
}

/**
 * Print Config rules evidence summary
 */
export function printConfigRulesEvidenceSummary(evidence: ConfigRulesEvidence): void {
  console.log('Config Rules Evidence:');
  console.log(`  Total rules: ${evidence.complianceSummary.totalRules}`);
  console.log(`  Compliant: ${evidence.complianceSummary.compliant}`);
  console.log(`  Non-compliant: ${evidence.complianceSummary.nonCompliant}`);
  console.log(`  Not applicable: ${evidence.complianceSummary.notApplicable}`);
  console.log(`  Public resource rules: ${evidence.publicResourceRules.length}`);
  console.log(`  Conformance packs: ${evidence.conformancePacks.length}`);
  console.log('');
}
