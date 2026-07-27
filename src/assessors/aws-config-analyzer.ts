/**
 * AWS Config Analyzer - analyzes AWS infrastructure state
 */

import {
  ConfigServiceClient,
  DescribeConfigurationRecordersCommand,
  DescribeDeliveryChannelsCommand,
  DescribeComplianceByConfigRuleCommand,
  DescribeConfigRulesCommand,
  GetComplianceDetailsByConfigRuleCommand,
  DescribeConformancePacksCommand,
  DescribeConformancePackComplianceCommand,
} from '@aws-sdk/client-config-service';
import {
  CloudTrailClient,
  DescribeTrailsCommand,
  GetTrailStatusCommand,
} from '@aws-sdk/client-cloudtrail';
import { AssessmentFinding } from '../types';
import { logger, wrapAWSError } from '../util/logger';

export interface AWSConfigAnalysis {
  region: string;
  timestamp: Date;
  configEnabled: boolean;
  configRules: ConfigRuleInfo[];
  conformancePacks: ConformancePackInfo[];
  cloudTrailStatus: CloudTrailStatus;
  findings: AssessmentFinding[];
  resourceCounts: Record<string, number>;
}

export interface ConfigRuleInfo {
  ruleName: string;
  description?: string;
  complianceType: string;
  source: string;
}

export interface ConformancePackInfo {
  name: string;
  complianceType: string;
}

export interface CloudTrailStatus {
  enabled: boolean;
  trailCount: number;
  multiRegion: boolean;
  logFileValidation: boolean;
}

/**
 * Analyze AWS Config state
 */
export async function analyzeAWSConfig(
  region: string,
  profile: string
): Promise<AWSConfigAnalysis> {
  const timestamp = new Date();
  const findings: AssessmentFinding[] = [];

  logger.debug('Starting AWS Config analysis', { region, profile });

  try {
    // Initialize AWS SDK clients
    const clientConfig = { region };
    const configClient = new ConfigServiceClient(clientConfig);
    const cloudTrailClient = new CloudTrailClient(clientConfig);

    // Check if Config is enabled
    const configEnabled = await checkConfigEnabled(configClient, findings);

    // Get Config rules
    const configRules = configEnabled ? await getConfigRules(configClient, findings) : [];

    // Get conformance packs
    const conformancePacks = configEnabled ? await getConformancePacks(configClient, findings) : [];

    // Check CloudTrail status
    const cloudTrailStatus = await checkCloudTrailStatus(cloudTrailClient, findings);

    // Analyze specific requirements
    await analyzeSecurityRequirements(configClient, configRules, cloudTrailStatus, findings);

    return {
      region,
      timestamp,
      configEnabled,
      configRules,
      conformancePacks,
      cloudTrailStatus,
      findings,
      resourceCounts: {}, // Will be populated with actual counts in future
    };
  } catch (error) {
    // Handle AWS credential or permission errors gracefully
    const wrappedError = wrapAWSError(error, 'Config');
    logger.error('AWS Config analysis failed', wrappedError, { region });

    findings.push({
      type: 'aws-config',
      source: 'AWS SDK',
      summary: `Failed to analyze AWS Config: ${error instanceof Error ? error.message : String(error)}`,
      supportive: false,
      timestamp: new Date(),
    });

    return {
      region,
      timestamp,
      configEnabled: false,
      configRules: [],
      conformancePacks: [],
      cloudTrailStatus: {
        enabled: false,
        trailCount: 0,
        multiRegion: false,
        logFileValidation: false,
      },
      findings,
      resourceCounts: {},
    };
  }
}

/**
 * Check if AWS Config is enabled
 */
async function checkConfigEnabled(
  client: ConfigServiceClient,
  findings: AssessmentFinding[]
): Promise<boolean> {
  try {
    const recorders = await client.send(new DescribeConfigurationRecordersCommand({}));

    const channels = await client.send(new DescribeDeliveryChannelsCommand({}));

    const enabled =
      (recorders.ConfigurationRecorders?.length ?? 0) > 0 &&
      (channels.DeliveryChannels?.length ?? 0) > 0;

    if (enabled) {
      findings.push({
        type: 'aws-config',
        source: 'AWS Config',
        summary: `AWS Config is enabled with ${recorders.ConfigurationRecorders?.length} recorder(s)`,
        supportive: true,
        timestamp: new Date(),
      });
    } else {
      findings.push({
        type: 'aws-config',
        source: 'AWS Config',
        summary: 'AWS Config is not enabled - required for SEC-003',
        details: 'AWS Config is required to track resource inventory and compliance',
        supportive: false,
        timestamp: new Date(),
      });
    }

    return enabled;
  } catch (error) {
    findings.push({
      type: 'aws-config',
      source: 'AWS Config',
      summary: `Unable to check Config status: ${error instanceof Error ? error.message : String(error)}`,
      supportive: false,
      timestamp: new Date(),
    });
    return false;
  }
}

/**
 * Get Config rules and their compliance status
 */
async function getConfigRules(
  client: ConfigServiceClient,
  findings: AssessmentFinding[]
): Promise<ConfigRuleInfo[]> {
  try {
    const rulesResponse = await client.send(new DescribeConfigRulesCommand({}));
    const rules: ConfigRuleInfo[] = [];

    if (!rulesResponse.ConfigRules || rulesResponse.ConfigRules.length === 0) {
      findings.push({
        type: 'aws-config',
        source: 'AWS Config Rules',
        summary: 'No Config rules configured - required for automated compliance checks',
        supportive: false,
        timestamp: new Date(),
      });
      return rules;
    }

    // Get compliance for each rule
    for (const rule of rulesResponse.ConfigRules) {
      if (!rule.ConfigRuleName) continue;

      try {
        const complianceResponse = await client.send(
          new DescribeComplianceByConfigRuleCommand({
            ConfigRuleNames: [rule.ConfigRuleName],
          })
        );

        const complianceType =
          complianceResponse.ComplianceByConfigRules?.[0]?.Compliance?.ComplianceType ?? 'UNKNOWN';

        rules.push({
          ruleName: rule.ConfigRuleName,
          description: rule.Description,
          complianceType,
          source: rule.Source?.Owner ?? 'UNKNOWN',
        });
      } catch {
        // Skip rules we can't get compliance for
        rules.push({
          ruleName: rule.ConfigRuleName,
          description: rule.Description,
          complianceType: 'UNKNOWN',
          source: rule.Source?.Owner ?? 'UNKNOWN',
        });
      }
    }

    findings.push({
      type: 'aws-config',
      source: 'AWS Config Rules',
      summary: `${rules.length} Config rules configured`,
      details: `Rules help automate compliance checks for MSP requirements`,
      supportive: true,
      timestamp: new Date(),
    });

    return rules;
  } catch (error) {
    findings.push({
      type: 'aws-config',
      source: 'AWS Config Rules',
      summary: `Failed to retrieve Config rules: ${error instanceof Error ? error.message : String(error)}`,
      supportive: false,
      timestamp: new Date(),
    });
    return [];
  }
}

/**
 * Get conformance packs
 */
async function getConformancePacks(
  client: ConfigServiceClient,
  findings: AssessmentFinding[]
): Promise<ConformancePackInfo[]> {
  try {
    const packsResponse = await client.send(new DescribeConformancePacksCommand({}));

    if (
      !packsResponse.ConformancePackDetails ||
      packsResponse.ConformancePackDetails.length === 0
    ) {
      return [];
    }

    const packs: ConformancePackInfo[] = [];

    for (const pack of packsResponse.ConformancePackDetails) {
      if (!pack.ConformancePackName) continue;

      try {
        const complianceResponse = await client.send(
          new DescribeConformancePackComplianceCommand({
            ConformancePackName: pack.ConformancePackName,
          })
        );

        const complianceType =
          complianceResponse.ConformancePackRuleComplianceList?.[0]?.ComplianceType ?? 'UNKNOWN';

        packs.push({
          name: pack.ConformancePackName,
          complianceType,
        });
      } catch {
        packs.push({
          name: pack.ConformancePackName,
          complianceType: 'UNKNOWN',
        });
      }
    }

    if (packs.length > 0) {
      findings.push({
        type: 'aws-config',
        source: 'AWS Config Conformance Packs',
        summary: `${packs.length} conformance pack(s) deployed`,
        details: 'Conformance packs provide pre-configured rule sets',
        supportive: true,
        timestamp: new Date(),
      });
    }

    return packs;
  } catch {
    // Conformance packs are optional, don't fail if not available
    return [];
  }
}

/**
 * Check CloudTrail status
 */
async function checkCloudTrailStatus(
  client: CloudTrailClient,
  findings: AssessmentFinding[]
): Promise<CloudTrailStatus> {
  try {
    const trailsResponse = await client.send(new DescribeTrailsCommand({}));

    const trails = trailsResponse.trailList ?? [];
    const multiRegion = trails.some(t => t.IsMultiRegionTrail);
    const logFileValidation = trails.some(t => t.LogFileValidationEnabled);

    let activeTrails = 0;
    for (const trail of trails) {
      if (!trail.Name) continue;

      try {
        const statusResponse = await client.send(new GetTrailStatusCommand({ Name: trail.Name }));
        if (statusResponse.IsLogging) {
          activeTrails++;
        }
      } catch {
        // Skip trails we can't check status for
      }
    }

    const enabled = activeTrails > 0;

    if (enabled) {
      findings.push({
        type: 'aws-config',
        source: 'CloudTrail',
        summary: `CloudTrail is enabled (${activeTrails} active trail(s))`,
        details: `Multi-region: ${multiRegion}, Log validation: ${logFileValidation}`,
        supportive: true,
        timestamp: new Date(),
      });
    } else {
      findings.push({
        type: 'aws-config',
        source: 'CloudTrail',
        summary: 'CloudTrail is not enabled - required for OPS-004',
        supportive: false,
        timestamp: new Date(),
      });
    }

    return {
      enabled,
      trailCount: activeTrails,
      multiRegion,
      logFileValidation,
    };
  } catch (error) {
    findings.push({
      type: 'aws-config',
      source: 'CloudTrail',
      summary: `Failed to check CloudTrail status: ${error instanceof Error ? error.message : String(error)}`,
      supportive: false,
      timestamp: new Date(),
    });

    return {
      enabled: false,
      trailCount: 0,
      multiRegion: false,
      logFileValidation: false,
    };
  }
}

/**
 * Analyze specific security requirements
 */
async function analyzeSecurityRequirements(
  client: ConfigServiceClient,
  configRules: ConfigRuleInfo[],
  cloudTrailStatus: CloudTrailStatus,
  findings: AssessmentFinding[]
): Promise<void> {
  // SECP-002: Public resource detection
  const publicResourceRules = configRules.filter(r => r.ruleName.toLowerCase().includes('public'));

  if (publicResourceRules.length > 0) {
    findings.push({
      type: 'aws-config',
      source: 'SECP-002 Analysis',
      summary: `${publicResourceRules.length} Config rule(s) for public resource detection`,
      details: `Rules: ${publicResourceRules.map(r => r.ruleName).join(', ')}`,
      supportive: true,
      timestamp: new Date(),
    });
  } else {
    findings.push({
      type: 'aws-config',
      source: 'SECP-002 Analysis',
      summary: 'No Config rules for public resource detection - gap for SECP-002',
      details:
        'Recommended: s3-bucket-public-read-prohibited, s3-bucket-public-write-prohibited, etc.',
      supportive: false,
      timestamp: new Date(),
    });
  }

  // SEC-003: AWS Account Configuration
  if (configRules.length >= 10 && cloudTrailStatus.enabled) {
    findings.push({
      type: 'aws-config',
      source: 'SEC-003 Analysis',
      summary: 'Strong AWS account configuration (Config + CloudTrail enabled)',
      supportive: true,
      timestamp: new Date(),
    });
  }

  // OPS-004: Logging
  if (cloudTrailStatus.enabled && cloudTrailStatus.logFileValidation) {
    findings.push({
      type: 'aws-config',
      source: 'OPS-004 Analysis',
      summary: 'CloudTrail logging with file validation enabled',
      supportive: true,
      timestamp: new Date(),
    });
  }
}

/**
 * Print AWS Config analysis summary
 */
export function printAWSConfigSummary(analysis: AWSConfigAnalysis): void {
  console.log(`AWS Config analysis complete:`);
  console.log(`  Region: ${analysis.region}`);
  console.log(`  Config enabled: ${analysis.configEnabled ? 'Yes' : 'No'}`);
  console.log(`  Config rules: ${analysis.configRules.length}`);
  console.log(`  Conformance packs: ${analysis.conformancePacks.length}`);
  console.log(
    `  CloudTrail: ${analysis.cloudTrailStatus.enabled ? 'Enabled' : 'Disabled'} (${analysis.cloudTrailStatus.trailCount} trails)`
  );
  console.log(`  Findings: ${analysis.findings.length}`);
  console.log('');
}
