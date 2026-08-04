/**
 * Availability Validator - OPS-011
 * Validates high availability configuration
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class AvailabilityValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['OPS-011'];
  }

  async validate(requirement: MSPRequirement, evidencePaths: string[]): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      const availabilityPath = evidencePaths.find(p => p.includes('availability'));
      if (!availabilityPath) {
        throw new Error('Availability evidence file not found');
      }

      const evidence = this.loadEvidenceFile(availabilityPath);

      // Check RDS Multi-AZ configuration
      const totalRDS =
        evidence.summary?.multiAZRDSInstances + evidence.summary?.singleAZRDSInstances || 0;
      const multiAZPercentage =
        totalRDS > 0 ? (evidence.summary?.multiAZRDSInstances / totalRDS) * 100 : 100;

      checks.push(
        this.createCheck(
          'RDS Multi-AZ enabled',
          multiAZPercentage >= 100,
          '100% Multi-AZ',
          `${multiAZPercentage.toFixed(0)}% Multi-AZ`,
          'high',
          multiAZPercentage < 100
            ? `${evidence.summary?.singleAZRDSInstances} RDS instance(s) not in Multi-AZ`
            : undefined
        )
      );

      // Check for Auto Scaling groups
      checks.push(
        this.validateMinimum(
          evidence.summary?.autoScalingGroups || 0,
          1,
          'Auto Scaling groups configured',
          'medium'
        )
      );

      // Check for multi-AZ load balancers
      checks.push(
        this.validateMinimum(
          evidence.summary?.multiAZLoadBalancers || 0,
          1,
          'Multi-AZ load balancers',
          'high'
        )
      );

      // Check for Route53 health checks
      checks.push(
        this.validateMinimum(
          evidence.summary?.route53HealthChecks || 0,
          1,
          'Route53 health checks configured',
          'medium'
        )
      );

      // Check for S3 cross-region replication
      checks.push(
        this.createCheck(
          'S3 cross-region replication',
          (evidence.summary?.s3BucketsWithReplication || 0) > 0,
          'replication configured',
          `${evidence.summary?.s3BucketsWithReplication || 0} bucket(s) with replication`,
          'medium',
          'Consider enabling cross-region replication for critical data'
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
