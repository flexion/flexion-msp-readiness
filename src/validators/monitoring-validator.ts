/**
 * Monitoring Validator - OPS-003
 * Validates CloudWatch monitoring and alerting
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class MonitoringValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['OPS-003'];
  }

  async validate(
    requirement: MSPRequirement,
    evidencePaths: string[]
  ): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      const cloudwatchPath = evidencePaths.find(p => p.includes('cloudwatch'));
      if (!cloudwatchPath) {
        throw new Error('CloudWatch evidence file not found');
      }

      const evidence = this.loadEvidenceFile(cloudwatchPath);

      // Check that alarms exist
      checks.push(
        this.validateMinimum(
          evidence.summary?.totalAlarms || 0,
          5,
          'CloudWatch alarms configured',
          'high'
        )
      );

      // Check that alarms have actions configured
      const alarmsWithActions = (evidence.alarms || []).filter(
        (a: any) => a.actionsEnabled && a.alarmActions?.length > 0
      ).length;

      checks.push(
        this.createCheck(
          'Alarms with SNS actions',
          alarmsWithActions >= Math.min(evidence.summary?.totalAlarms || 0, 5),
          'all alarms have actions',
          `${alarmsWithActions} alarm(s) with actions`,
          'high',
          alarmsWithActions < 5 ? 'Ensure critical alarms trigger SNS notifications' : undefined
        )
      );

      // Check log groups with retention
      checks.push(
        this.validateMinimum(
          evidence.summary?.logGroupsWithRetention || 0,
          1,
          'Log groups with retention configured',
          'medium'
        )
      );

      // Check for metric filters
      checks.push(
        this.validateMinimum(
          evidence.summary?.totalMetricFilters || 0,
          1,
          'Metric filters configured',
          'medium'
        )
      );

      // Check that no alarms are in ALARM state (indicate issues)
      const activeAlarms = evidence.alarmsByState?.alarm || 0;
      checks.push(
        this.createCheck(
          'No unresolved alarms',
          activeAlarms === 0,
          'no alarms in ALARM state',
          `${activeAlarms} alarm(s) in ALARM state`,
          'high',
          activeAlarms > 0 ? 'Investigate and resolve active alarms' : undefined
        )
      );
    } catch (error) {
      checks.push(
        this.createCheck(
          'Evidence file validation',
          false,
          'valid evidence file',
          'error loading evidence',
          'critical',
          `Failed to validate evidence: ${error}`
        )
      );
    }

    return this.createResult(requirement.id, checks);
  }
}
