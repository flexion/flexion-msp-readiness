/**
 * CloudWatch Evidence Collector - OPS-003, OPS-004, OPSP-001
 */

import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  DescribeAlarmsCommandInput,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogGroupsCommandInput,
  DescribeMetricFiltersCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { EvidenceArtifact } from '../types';

export interface CloudWatchEvidence {
  alarms: AlarmInfo[];
  alarmsByState: AlarmStateSummary;
  logGroups: LogGroupInfo[];
  metricFilters: MetricFilterInfo[];
  summary: CloudWatchSummary;
  timestamp: Date;
}

export interface AlarmInfo {
  name: string;
  arn: string;
  state: string;
  metric: string;
  namespace: string;
  threshold: number;
  comparisonOperator: string;
  evaluationPeriods: number;
  actionsEnabled: boolean;
  alarmActions: string[];
}

export interface AlarmStateSummary {
  ok: number;
  alarm: number;
  insufficientData: number;
}

export interface LogGroupInfo {
  name: string;
  arn: string;
  retentionInDays?: number;
  storedBytes: number;
  creationTime: Date;
  metricFilterCount?: number;
}

export interface MetricFilterInfo {
  filterName: string;
  logGroupName: string;
  filterPattern: string;
  metricTransformations: MetricTransformation[];
}

export interface MetricTransformation {
  metricName: string;
  metricNamespace: string;
  metricValue: string;
}

export interface CloudWatchSummary {
  totalAlarms: number;
  activeAlarms: number;
  totalLogGroups: number;
  totalMetricFilters: number;
  logGroupsWithRetention: number;
}

export async function collectCloudWatchEvidence(
  region: string,
  profile: string
): Promise<CloudWatchEvidence> {
  const cwClientConfig = { region };
  const cloudWatchClient = new CloudWatchClient(cwClientConfig);
  const logsClient = new CloudWatchLogsClient(cwClientConfig);
  const timestamp = new Date();

  try {
    // Get alarms with pagination
    const alarms: AlarmInfo[] = [];
    const alarmsByState: AlarmStateSummary = {
      ok: 0,
      alarm: 0,
      insufficientData: 0,
    };

    let nextToken: string | undefined;
    let pageCount = 0;
    const maxPages = 10;

    do {
      const alarmsInput: DescribeAlarmsCommandInput = {
        MaxRecords: 100,
        NextToken: nextToken,
      };

      const alarmsResponse = await cloudWatchClient.send(new DescribeAlarmsCommand(alarmsInput));

      for (const alarm of alarmsResponse.MetricAlarms ?? []) {
        alarms.push({
          name: alarm.AlarmName ?? '',
          arn: alarm.AlarmArn ?? '',
          state: alarm.StateValue ?? 'UNKNOWN',
          metric: alarm.MetricName ?? '',
          namespace: alarm.Namespace ?? '',
          threshold: alarm.Threshold ?? 0,
          comparisonOperator: alarm.ComparisonOperator ?? '',
          evaluationPeriods: alarm.EvaluationPeriods ?? 0,
          actionsEnabled: alarm.ActionsEnabled ?? false,
          alarmActions: alarm.AlarmActions ?? [],
        });

        // Update state counts
        const state = alarm.StateValue?.toLowerCase();
        if (state === 'ok') alarmsByState.ok++;
        else if (state === 'alarm') alarmsByState.alarm++;
        else alarmsByState.insufficientData++;
      }

      nextToken = alarmsResponse.NextToken;
      pageCount++;
    } while (nextToken && pageCount < maxPages);

    // Get log groups with pagination
    const logGroups: LogGroupInfo[] = [];
    nextToken = undefined;
    pageCount = 0;

    do {
      const logGroupsInput: DescribeLogGroupsCommandInput = {
        limit: 50,
        nextToken: nextToken,
      };

      const logGroupsResponse = await logsClient.send(new DescribeLogGroupsCommand(logGroupsInput));

      for (const logGroup of logGroupsResponse.logGroups ?? []) {
        logGroups.push({
          name: logGroup.logGroupName ?? '',
          arn: logGroup.arn ?? '',
          retentionInDays: logGroup.retentionInDays,
          storedBytes: logGroup.storedBytes ?? 0,
          creationTime: logGroup.creationTime ? new Date(logGroup.creationTime) : new Date(),
          metricFilterCount: logGroup.metricFilterCount,
        });
      }

      nextToken = logGroupsResponse.nextToken;
      pageCount++;
    } while (nextToken && pageCount < maxPages);

    // Get metric filters for first 10 log groups (to avoid excessive API calls)
    const metricFilters: MetricFilterInfo[] = [];
    for (const logGroup of logGroups.slice(0, 10)) {
      try {
        const filtersResponse = await logsClient.send(
          new DescribeMetricFiltersCommand({
            logGroupName: logGroup.name,
            limit: 50,
          })
        );

        for (const filter of filtersResponse.metricFilters ?? []) {
          metricFilters.push({
            filterName: filter.filterName ?? '',
            logGroupName: filter.logGroupName ?? '',
            filterPattern: filter.filterPattern ?? '',
            metricTransformations:
              filter.metricTransformations?.map(mt => ({
                metricName: mt.metricName ?? '',
                metricNamespace: mt.metricNamespace ?? '',
                metricValue: mt.metricValue ?? '',
              })) ?? [],
          });
        }
      } catch (error) {
        // Continue if we can't get filters for a specific log group
        console.warn(`Could not get metric filters for ${logGroup.name}: ${error}`);
      }
    }

    const summary: CloudWatchSummary = {
      totalAlarms: alarms.length,
      activeAlarms: alarmsByState.alarm,
      totalLogGroups: logGroups.length,
      totalMetricFilters: metricFilters.length,
      logGroupsWithRetention: logGroups.filter(lg => lg.retentionInDays).length,
    };

    return {
      alarms,
      alarmsByState,
      logGroups,
      metricFilters,
      summary,
      timestamp,
    };
  } catch (error) {
    console.error(`Failed to collect CloudWatch evidence: ${error}`);
    return {
      alarms: [],
      alarmsByState: { ok: 0, alarm: 0, insufficientData: 0 },
      logGroups: [],
      metricFilters: [],
      summary: {
        totalAlarms: 0,
        activeAlarms: 0,
        totalLogGroups: 0,
        totalMetricFilters: 0,
        logGroupsWithRetention: 0,
      },
      timestamp,
    };
  }
}

export function saveCloudWatchEvidence(
  evidence: CloudWatchEvidence,
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
    description: 'CloudWatch alarms, log groups, and metric filters for monitoring',
    requirementIds: ['OPS-003', 'OPS-004', 'OPSP-001'],
    collectedAt: new Date(),
    metadata: evidence.summary as unknown as Record<string, unknown>,
  };
}

export function printCloudWatchEvidenceSummary(evidence: CloudWatchEvidence): void {
  console.log('CloudWatch Evidence:');
  console.log(`  Total alarms: ${evidence.summary.totalAlarms}`);
  console.log(`    OK: ${evidence.alarmsByState.ok}`);
  console.log(`    ALARM: ${evidence.alarmsByState.alarm}`);
  console.log(`    Insufficient Data: ${evidence.alarmsByState.insufficientData}`);
  console.log(`  Log groups: ${evidence.summary.totalLogGroups}`);
  console.log(`  Log groups with retention: ${evidence.summary.logGroupsWithRetention}`);
  console.log(`  Metric filters: ${evidence.summary.totalMetricFilters}`);
  console.log('');
}
