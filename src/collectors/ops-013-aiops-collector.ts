/**
 * OPS-013: Predictive Monitoring & AIOps Evidence Collector (Recommended)
 * Collects evidence of ML-based predictive monitoring and DevOps Guru
 */

import {
  DevOpsGuruClient,
  DescribeAccountHealthCommand,
  ListInsightsCommand,
  DescribeServiceIntegrationCommand,
} from '@aws-sdk/client-devops-guru';
import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface AIOpsEvidence {
  devOpsGuruEnabled: boolean;
  devOpsGuruInsights: DevOpsGuruInsight[];
  mlMonitoring: MLMonitoringInfo;
  summary: {
    hasAIOps: boolean;
    totalInsights: number;
    activeInsights: number;
    hasMLMonitoring: boolean;
    compliant: boolean;
  };
}

export interface DevOpsGuruInsight {
  id: string;
  name?: string;
  severity: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
}

export interface MLMonitoringInfo {
  anomalyDetectionAlarms: number;
  metricMathAlarms: number;
  compositAlarms: number;
}

/**
 * Collect AIOps evidence
 */
export async function collectAIOpsEvidence(
  region: string
): Promise<AIOpsEvidence> {
  const devOpsGuruClient = new DevOpsGuruClient({ region });
  const cloudWatchClient = new CloudWatchClient({ region });

  try {
    // Check DevOps Guru status
    const { devOpsGuruEnabled, devOpsGuruInsights } = await checkDevOpsGuru(
      devOpsGuruClient
    );

    // Get ML monitoring info
    const mlMonitoring = await getMLMonitoringInfo(cloudWatchClient);

    const summary = {
      hasAIOps: devOpsGuruEnabled || mlMonitoring.anomalyDetectionAlarms > 0,
      totalInsights: devOpsGuruInsights.length,
      activeInsights: devOpsGuruInsights.filter(i => i.status === 'ONGOING').length,
      hasMLMonitoring: mlMonitoring.anomalyDetectionAlarms > 0,
      compliant:
        devOpsGuruEnabled ||
        mlMonitoring.anomalyDetectionAlarms >= 3,
    };

    return {
      devOpsGuruEnabled,
      devOpsGuruInsights,
      mlMonitoring,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect AIOps evidence: ${error}`);
    return {
      devOpsGuruEnabled: false,
      devOpsGuruInsights: [],
      mlMonitoring: {
        anomalyDetectionAlarms: 0,
        metricMathAlarms: 0,
        compositAlarms: 0,
      },
      summary: {
        hasAIOps: false,
        totalInsights: 0,
        activeInsights: 0,
        hasMLMonitoring: false,
        compliant: false,
      },
    };
  }
}

/**
 * Check DevOps Guru status and get insights
 */
async function checkDevOpsGuru(
  client: DevOpsGuruClient
): Promise<{ devOpsGuruEnabled: boolean; devOpsGuruInsights: DevOpsGuruInsight[] }> {
  let devOpsGuruEnabled = false;
  const devOpsGuruInsights: DevOpsGuruInsight[] = [];

  try {
    // Check if DevOps Guru is enabled
    const healthResponse = await client.send(new DescribeAccountHealthCommand({}));
    devOpsGuruEnabled = true; // If this call succeeds, DevOps Guru is enabled

    // Get recent insights
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    const insightsResponse = await client.send(
      new ListInsightsCommand({
        StatusFilter: {
          Any: {
            Type: 'REACTIVE',
            StartTimeRange: {
              FromTime: startTime,
              ToTime: endTime,
            },
          },
        },
      })
    );

    for (const insight of insightsResponse.ProactiveInsights ?? []) {
      devOpsGuruInsights.push({
        id: insight.Id ?? 'unknown',
        name: insight.Name,
        severity: insight.Severity ?? 'unknown',
        status: insight.Status ?? 'unknown',
        startTime: insight.InsightTimeRange?.StartTime,
        endTime: insight.InsightTimeRange?.EndTime,
      });
    }

    for (const insight of insightsResponse.ReactiveInsights ?? []) {
      devOpsGuruInsights.push({
        id: insight.Id ?? 'unknown',
        name: insight.Name,
        severity: insight.Severity ?? 'unknown',
        status: insight.Status ?? 'unknown',
        startTime: insight.InsightTimeRange?.StartTime,
        endTime: insight.InsightTimeRange?.EndTime,
      });
    }
  } catch (error: any) {
    // DevOps Guru might not be enabled
    if (error.name !== 'ResourceNotFoundException') {
      console.error(`Failed to check DevOps Guru: ${error}`);
    }
  }

  return { devOpsGuruEnabled, devOpsGuruInsights };
}

/**
 * Get ML monitoring information from CloudWatch
 */
async function getMLMonitoringInfo(
  client: CloudWatchClient
): Promise<MLMonitoringInfo> {
  let anomalyDetectionAlarms = 0;
  let metricMathAlarms = 0;
  let compositAlarms = 0;

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new DescribeAlarmsCommand({ NextToken: nextToken })
      );

      // Count metric alarms
      for (const alarm of response.MetricAlarms ?? []) {
        // Check for anomaly detection
        if (alarm.Metrics && alarm.Metrics.length > 0) {
          for (const metric of alarm.Metrics) {
            if (metric.Expression?.includes('ANOMALY_DETECTION_BAND')) {
              anomalyDetectionAlarms++;
              break;
            }
            if (metric.Expression) {
              metricMathAlarms++;
              break;
            }
          }
        }
      }

      // Count composite alarms
      compositAlarms += response.CompositeAlarms?.length ?? 0;

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to get ML monitoring info: ${error}`);
  }

  return {
    anomalyDetectionAlarms,
    metricMathAlarms,
    compositAlarms,
  };
}

/**
 * Save AIOps evidence to file
 */
export function saveOPS013Evidence(
  evidence: AIOpsEvidence,
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
    description: 'Predictive monitoring and AIOps via DevOps Guru and ML-based alarms',
    requirementIds: ['OPS-013'],
    collectedAt: new Date(),
    metadata: {
      hasAIOps: evidence.summary.hasAIOps,
      devOpsGuruEnabled: evidence.devOpsGuruEnabled,
      compliant: evidence.summary.compliant,
    },
  };
}
