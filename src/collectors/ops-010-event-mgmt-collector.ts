/**
 * OPS-010: Event Management & Dynamic Monitoring Evidence Collector
 * Collects evidence of EventBridge rules, CloudWatch alarms, and SNS topics
 */

import {
  EventBridgeClient,
  ListRulesCommand,
  DescribeRuleCommand,
  ListTargetsByRuleCommand,
} from '@aws-sdk/client-eventbridge';
import {
  CloudWatchClient,
  DescribeAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  SNSClient,
  ListTopicsCommand,
  GetTopicAttributesCommand,
} from '@aws-sdk/client-sns';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface EventManagementEvidence {
  eventBridgeRules: EventBridgeRule[];
  cloudWatchAlarms: AlarmInfo[];
  snsTopics: SNSTopic[];
  summary: {
    totalRules: number;
    enabledRules: number;
    totalAlarms: number;
    alarmActions: number;
    totalTopics: number;
    hasEventManagement: boolean;
    compliant: boolean;
  };
}

export interface EventBridgeRule {
  name: string;
  arn: string;
  state: string;
  description?: string;
  eventPattern?: string;
  targetCount: number;
}

export interface AlarmInfo {
  name: string;
  arn: string;
  state: string;
  metric: string;
  threshold: number;
  actions: string[];
}

export interface SNSTopic {
  arn: string;
  name: string;
  subscriptions: number;
}

/**
 * Collect event management evidence
 */
export async function collectEventManagementEvidence(
  region: string
): Promise<EventManagementEvidence> {
  const eventBridgeClient = new EventBridgeClient({ region });
  const cloudWatchClient = new CloudWatchClient({ region });
  const snsClient = new SNSClient({ region });

  try {
    // Get EventBridge rules
    const eventBridgeRules = await listEventBridgeRules(eventBridgeClient);

    // Get CloudWatch alarms
    const cloudWatchAlarms = await listCloudWatchAlarms(cloudWatchClient);

    // Get SNS topics
    const snsTopics = await listSNSTopics(snsClient);

    const alarmActions = cloudWatchAlarms.reduce(
      (sum, alarm) => sum + alarm.actions.length,
      0
    );

    const summary = {
      totalRules: eventBridgeRules.length,
      enabledRules: eventBridgeRules.filter(r => r.state === 'ENABLED').length,
      totalAlarms: cloudWatchAlarms.length,
      alarmActions,
      totalTopics: snsTopics.length,
      hasEventManagement:
        eventBridgeRules.length > 0 || cloudWatchAlarms.length > 0,
      compliant:
        eventBridgeRules.filter(r => r.state === 'ENABLED').length >= 3 &&
        cloudWatchAlarms.length >= 5 &&
        alarmActions > 0,
    };

    return {
      eventBridgeRules,
      cloudWatchAlarms,
      snsTopics,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect event management evidence: ${error}`);
    return {
      eventBridgeRules: [],
      cloudWatchAlarms: [],
      snsTopics: [],
      summary: {
        totalRules: 0,
        enabledRules: 0,
        totalAlarms: 0,
        alarmActions: 0,
        totalTopics: 0,
        hasEventManagement: false,
        compliant: false,
      },
    };
  }
}

/**
 * List EventBridge rules
 */
async function listEventBridgeRules(
  client: EventBridgeClient
): Promise<EventBridgeRule[]> {
  const rules: EventBridgeRule[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListRulesCommand({ NextToken: nextToken })
      );

      for (const rule of response.Rules ?? []) {
        if (!rule.Name || !rule.Arn) continue;

        // Get rule targets
        let targetCount = 0;
        try {
          const targetsResponse = await client.send(
            new ListTargetsByRuleCommand({ Rule: rule.Name })
          );
          targetCount = targetsResponse.Targets?.length ?? 0;
        } catch (error) {
          // Targets might not be accessible
        }

        rules.push({
          name: rule.Name,
          arn: rule.Arn,
          state: rule.State ?? 'unknown',
          description: rule.Description,
          eventPattern: rule.EventPattern,
          targetCount,
        });
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list EventBridge rules: ${error}`);
  }

  return rules;
}

/**
 * List CloudWatch alarms
 */
async function listCloudWatchAlarms(
  client: CloudWatchClient
): Promise<AlarmInfo[]> {
  const alarms: AlarmInfo[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new DescribeAlarmsCommand({ NextToken: nextToken })
      );

      for (const alarm of response.MetricAlarms ?? []) {
        if (!alarm.AlarmName || !alarm.AlarmArn) continue;

        const actions = [
          ...(alarm.AlarmActions ?? []),
          ...(alarm.OKActions ?? []),
          ...(alarm.InsufficientDataActions ?? []),
        ];

        alarms.push({
          name: alarm.AlarmName,
          arn: alarm.AlarmArn,
          state: alarm.StateValue ?? 'unknown',
          metric: alarm.MetricName ?? 'unknown',
          threshold: alarm.Threshold ?? 0,
          actions,
        });
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list CloudWatch alarms: ${error}`);
  }

  return alarms;
}

/**
 * List SNS topics
 */
async function listSNSTopics(client: SNSClient): Promise<SNSTopic[]> {
  const topics: SNSTopic[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListTopicsCommand({ NextToken: nextToken })
      );

      for (const topic of response.Topics ?? []) {
        if (!topic.TopicArn) continue;

        // Get topic attributes for subscription count
        let subscriptions = 0;
        try {
          const attrResponse = await client.send(
            new GetTopicAttributesCommand({ TopicArn: topic.TopicArn })
          );
          subscriptions = parseInt(
            attrResponse.Attributes?.['SubscriptionsConfirmed'] ?? '0',
            10
          );
        } catch (error) {
          // Attributes might not be accessible
        }

        const name = topic.TopicArn.split(':').pop() ?? 'unknown';

        topics.push({
          arn: topic.TopicArn,
          name,
          subscriptions,
        });
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list SNS topics: ${error}`);
  }

  return topics;
}

/**
 * Save event management evidence to file
 */
export function saveOPS010Evidence(
  evidence: EventManagementEvidence,
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
    description: 'Event management via EventBridge, CloudWatch alarms, and SNS',
    requirementIds: ['OPS-010'],
    collectedAt: new Date(),
    metadata: {
      totalRules: evidence.summary.totalRules,
      totalAlarms: evidence.summary.totalAlarms,
      compliant: evidence.summary.compliant,
    },
  };
}
