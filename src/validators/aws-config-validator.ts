/**
 * AWS Config Validator - SEC-003
 * Validates AWS Config rules and compliance
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class AWSConfigValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['SEC-003'];
  }

  async validate(requirement: MSPRequirement, evidencePaths: string[]): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      const configPath = evidencePaths.find(p => p.includes('config'));
      if (!configPath) {
        throw new Error('AWS Config evidence file not found');
      }

      const evidence = this.loadEvidenceFile(configPath);

      // Check that Config recorder is enabled
      checks.push(
        this.validateEnabled(
          evidence.configurationRecorder?.recording || false,
          'Config recorder enabled',
          'critical'
        )
      );

      // Check that Config rules exist
      checks.push(
        this.validateMinimum(
          evidence.summary?.totalRules || 0,
          10,
          'Config rules configured',
          'high'
        )
      );

      // Check compliance status
      const compliantPercentage =
        evidence.summary?.totalRules > 0
          ? (evidence.summary.compliantRules / evidence.summary.totalRules) * 100
          : 0;

      checks.push(
        this.createCheck(
          'Config rules compliance',
          compliantPercentage >= 90,
          '>= 90% compliant',
          `${compliantPercentage.toFixed(0)}% compliant`,
          'high',
          compliantPercentage < 90
            ? `${evidence.summary?.nonCompliantRules} rule(s) non-compliant`
            : undefined
        )
      );

      // Check for critical non-compliant resources
      const criticalNonCompliant = evidence.summary?.nonCompliantResources || 0;
      checks.push(
        this.createCheck(
          'No critical non-compliant resources',
          criticalNonCompliant <= 5,
          '<= 5 non-compliant resources',
          `${criticalNonCompliant} non-compliant resource(s)`,
          'high',
          criticalNonCompliant > 5 ? 'Review and remediate non-compliant resources' : undefined
        )
      );

      // Check delivery channel (for Config snapshots)
      checks.push(
        this.validateExists(
          evidence.deliveryChannel?.s3BucketName,
          'Config delivery channel to S3',
          'medium'
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
