/**
 * OPS-012: Anomaly Detection Evidence Collector
 * Collects evidence of CloudWatch Anomaly Detection alarms
 */

import {
  CloudWatchClient,
  DescribeAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface AnomalyDetectionEvidence {
  anomalyAlarms: AnomalyAlarm[];
  summary: {
    totalAnomalyAlarms: number;
    enabledAlarms: number;
    alarmsWithActions: number;
    compliant: boolean;
  };
}

export interface AnomalyAlarm {
  name: string;
  arn: string;
  state: string;
  metric: string;
  namespace: string;
  anomalyDetectorConfig: string;
  actions: string[];
}

/**
 * Collect anomaly detection evidence
 */
export async function collectAnomalyDetectionEvidence(
  region: string
): Promise<AnomalyDetectionEvidence> {
  const client = new CloudWatchClient({ region });

  try {
    // Get all alarms and filter for anomaly detection
    const anomalyAlarms = await listAnomalyDetectionAlarms(client);

    const summary = {
      totalAnomalyAlarms: anomalyAlarms.length,
      enabledAlarms: anomalyAlarms.filter(a => a.state !== 'INSUFFICIENT_DATA').length,
      alarmsWithActions: anomalyAlarms.filter(a => a.actions.length > 0).length,
      compliant: anomalyAlarms.length >= 3 && anomalyAlarms.some(a => a.actions.length > 0),
    };

    return {
      anomalyAlarms,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect anomaly detection evidence: ${error}`);
    return {
      anomalyAlarms: [],
      summary: {
        totalAnomalyAlarms: 0,
        enabledAlarms: 0,
        alarmsWithActions: 0,
        compliant: false,
      },
    };
  }
}

/**
 * List CloudWatch alarms that use anomaly detection
 */
async function listAnomalyDetectionAlarms(
  client: CloudWatchClient
): Promise<AnomalyAlarm[]> {
  const alarms: AnomalyAlarm[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new DescribeAlarmsCommand({ NextToken: nextToken })
      );

      for (const alarm of response.MetricAlarms ?? []) {
        // Check if this alarm uses anomaly detection
        if (alarm.Metrics && alarm.Metrics.length > 0) {
          for (const metric of alarm.Metrics) {
            if (metric.Expression?.includes('ANOMALY_DETECTION_BAND')) {
              const actions = [
                ...(alarm.AlarmActions ?? []),
                ...(alarm.OKActions ?? []),
              ];

              alarms.push({
                name: alarm.AlarmName ?? 'unknown',
                arn: alarm.AlarmArn ?? 'unknown',
                state: alarm.StateValue ?? 'unknown',
                metric: metric.Id ?? 'unknown',
                namespace: alarm.Namespace ?? 'unknown',
                anomalyDetectorConfig: metric.Expression ?? '',
                actions,
              });
              break; // Only add alarm once
            }
          }
        }
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list anomaly detection alarms: ${error}`);
  }

  return alarms;
}

/**
 * Save anomaly detection evidence to file
 */
export function saveOPS012Evidence(
  evidence: AnomalyDetectionEvidence,
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
    description: 'CloudWatch Anomaly Detection alarms and configuration',
    requirementIds: ['OPS-012'],
    collectedAt: new Date(),
    metadata: {
      totalAnomalyAlarms: evidence.summary.totalAnomalyAlarms,
      alarmsWithActions: evidence.summary.alarmsWithActions,
      compliant: evidence.summary.compliant,
    },
  };
}
