/**
 * Tests for CloudWatch evidence collector
 */

import { saveCloudWatchEvidence } from '../../collectors/cloudwatch-collector';
import type { CloudWatchEvidence } from '../../collectors/cloudwatch-collector';
import * as fs from 'fs';
import * as path from 'path';

describe('cloudwatch-collector', () => {
  const testOutputDir = path.join(__dirname, '../fixtures/output');
  const testFilePath = path.join(testOutputDir, 'cloudwatch-test.json');

  beforeAll(() => {
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  });

  describe('saveCloudWatchEvidence', () => {
    it('should save evidence to JSON file', () => {
      const mockEvidence: CloudWatchEvidence = {
        alarms: [
          {
            name: 'test-alarm',
            arn: 'arn:aws:cloudwatch:us-east-1:123456789012:alarm:test-alarm',
            state: 'OK',
            metric: 'CPUUtilization',
            namespace: 'AWS/EC2',
            threshold: 80,
            comparisonOperator: 'GreaterThanThreshold',
            evaluationPeriods: 2,
            actionsEnabled: true,
            alarmActions: ['arn:aws:sns:us-east-1:123456789012:test-topic'],
          },
        ],
        alarmsByState: {
          ok: 1,
          alarm: 0,
          insufficientData: 0,
        },
        logGroups: [
          {
            name: '/aws/lambda/test-function',
            arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
            retentionInDays: 7,
            storedBytes: 1024,
            creationTime: new Date(),
            metricFilterCount: 0,
          },
        ],
        metricFilters: [],
        summary: {
          totalAlarms: 1,
          activeAlarms: 0,
          totalLogGroups: 1,
          totalMetricFilters: 0,
          logGroupsWithRetention: 1,
        },
        timestamp: new Date(),
      };

      const artifact = saveCloudWatchEvidence(mockEvidence, testFilePath);

      // Check that file was created
      expect(fs.existsSync(testFilePath)).toBe(true);

      // Check artifact metadata
      expect(artifact.type).toBe('aws-snapshot');
      expect(artifact.path).toBe(testFilePath);
      expect(artifact.requirementIds).toContain('OPS-003');
      expect(artifact.requirementIds).toContain('OPS-004');

      // Check file content
      const content = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
      expect(content.alarms.length).toBe(1);
      expect(content.logGroups.length).toBe(1);
      expect(content.summary.totalAlarms).toBe(1);
    });

    it('should include correct requirement IDs', () => {
      const mockEvidence: CloudWatchEvidence = {
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
        timestamp: new Date(),
      };

      const artifact = saveCloudWatchEvidence(mockEvidence, testFilePath);

      // CloudWatch evidence relates to OPS-003, OPS-004, OPSP-001
      expect(artifact.requirementIds).toContain('OPS-003');
      expect(artifact.requirementIds).toContain('OPS-004');
      expect(artifact.requirementIds).toContain('OPSP-001');
    });

    it('should include summary metadata', () => {
      const mockEvidence: CloudWatchEvidence = {
        alarms: [
          {
            name: 'alarm1',
            arn: 'arn1',
            state: 'ALARM',
            metric: 'metric',
            namespace: 'ns',
            threshold: 1,
            comparisonOperator: 'op',
            evaluationPeriods: 1,
            actionsEnabled: true,
            alarmActions: [],
          },
          {
            name: 'alarm2',
            arn: 'arn2',
            state: 'OK',
            metric: 'metric',
            namespace: 'ns',
            threshold: 1,
            comparisonOperator: 'op',
            evaluationPeriods: 1,
            actionsEnabled: true,
            alarmActions: [],
          },
        ],
        alarmsByState: { ok: 1, alarm: 1, insufficientData: 0 },
        logGroups: [],
        metricFilters: [],
        summary: {
          totalAlarms: 2,
          activeAlarms: 1,
          totalLogGroups: 0,
          totalMetricFilters: 0,
          logGroupsWithRetention: 0,
        },
        timestamp: new Date(),
      };

      const artifact = saveCloudWatchEvidence(mockEvidence, testFilePath);

      expect(artifact.metadata).toBeDefined();
      expect(artifact.metadata?.totalAlarms).toBe(2);
      expect(artifact.metadata?.activeAlarms).toBe(1);
    });
  });
});
