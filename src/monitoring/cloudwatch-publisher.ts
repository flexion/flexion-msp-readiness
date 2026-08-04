/**
 * CloudWatch metrics publisher
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { fromIni } from '@aws-sdk/credential-providers';
import { ProjectAssessment, DriftDetectionResult, Config } from '../types';

/**
 * Publish assessment metrics to CloudWatch
 */
export async function publishAssessmentMetrics(
  assessment: ProjectAssessment,
  config: Config,
  region: string,
  profile?: string
): Promise<void> {
  const cloudwatchConfig = config.notifications?.cloudwatch;
  if (!cloudwatchConfig?.enabled) {
    return;
  }

  const client = new CloudWatchClient({
    region,
    credentials: profile ? fromIni({ profile }) : undefined,
  });

  const namespace = cloudwatchConfig.namespace || 'MSP/Readiness';
  const dimensions = buildDimensions(config, cloudwatchConfig.dimensions);

  const timestamp = new Date();

  // Publish compliance metrics
  const metricData = [
    {
      MetricName: 'ComplianceScore',
      Value: calculateComplianceScore(assessment),
      Unit: 'Percent' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
    {
      MetricName: 'AddressedRequirements',
      Value: assessment.overallStatus.addressed,
      Unit: 'Count' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
    {
      MetricName: 'PartialRequirements',
      Value: assessment.overallStatus.partial,
      Unit: 'Count' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
    {
      MetricName: 'GapRequirements',
      Value: assessment.overallStatus.gap,
      Unit: 'Count' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
    {
      MetricName: 'CriticalGaps',
      Value: assessment.criticalGaps.length,
      Unit: 'Count' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
    {
      MetricName: 'EstimatedEffort',
      Value: assessment.totalEstimatedEffort,
      Unit: 'None' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
  ];

  const command = new PutMetricDataCommand({
    Namespace: namespace,
    MetricData: metricData,
  });

  await client.send(command);
  console.log(`  ✓ Published ${metricData.length} metrics to CloudWatch`);
}

/**
 * Publish drift metrics to CloudWatch
 */
export async function publishDriftMetrics(
  result: DriftDetectionResult,
  config: Config,
  region: string,
  profile?: string
): Promise<void> {
  const cloudwatchConfig = config.notifications?.cloudwatch;
  if (!cloudwatchConfig?.enabled) {
    return;
  }

  const client = new CloudWatchClient({
    region,
    credentials: profile ? fromIni({ profile }) : undefined,
  });

  const namespace = cloudwatchConfig.namespace || 'MSP/Readiness';
  const dimensions = buildDimensions(config, cloudwatchConfig.dimensions);

  const timestamp = new Date();

  // Publish drift metrics
  const metricData = [
    {
      MetricName: 'TotalDrifts',
      Value: result.summary.totalDrifts,
      Unit: 'Count' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
    {
      MetricName: 'ComplianceChange',
      Value: result.summary.complianceChange,
      Unit: 'Percent' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
    {
      MetricName: 'NewGaps',
      Value: result.summary.newGaps,
      Unit: 'Count' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
    {
      MetricName: 'ResolvedGaps',
      Value: result.summary.resolvedGaps,
      Unit: 'Count' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
    {
      MetricName: 'NewCriticalFindings',
      Value: result.summary.newCriticalFindings,
      Unit: 'Count' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    },
  ];

  // Add severity breakdown
  for (const [severity, count] of Object.entries(result.summary.byCriticality)) {
    metricData.push({
      MetricName: `Drifts_${severity}`,
      Value: count,
      Unit: 'Count' as const,
      Timestamp: timestamp,
      Dimensions: dimensions,
    });
  }

  const command = new PutMetricDataCommand({
    Namespace: namespace,
    MetricData: metricData,
  });

  await client.send(command);
  console.log(`  ✓ Published ${metricData.length} drift metrics to CloudWatch`);
}

/**
 * Build CloudWatch dimensions
 */
function buildDimensions(
  config: Config,
  customDimensions?: Record<string, string>
): Array<{ Name: string; Value: string }> {
  const dimensions: Array<{ Name: string; Value: string }> = [
    { Name: 'Project', Value: config.project.name },
    { Name: 'Stage', Value: config.aws.stage },
  ];

  if (customDimensions) {
    for (const [name, value] of Object.entries(customDimensions)) {
      dimensions.push({ Name: name, Value: value });
    }
  }

  return dimensions;
}

/**
 * Calculate compliance score (percentage)
 */
function calculateComplianceScore(assessment: ProjectAssessment): number {
  const total =
    assessment.overallStatus.addressed +
    assessment.overallStatus.partial +
    assessment.overallStatus.gap;

  if (total === 0) return 0;

  return (assessment.overallStatus.addressed / total) * 100;
}
