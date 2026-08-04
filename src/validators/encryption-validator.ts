/**
 * Encryption Validator - SEC-009
 * Validates encryption at rest configuration
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class EncryptionValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['SEC-009'];
  }

  async validate(
    requirement: MSPRequirement,
    evidencePaths: string[]
  ): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      const encryptionPath = evidencePaths.find(p => p.includes('encryption'));
      if (!encryptionPath) {
        throw new Error('Encryption evidence file not found');
      }

      const evidence = this.loadEvidenceFile(encryptionPath);

      // Check KMS keys exist
      checks.push(
        this.validateMinimum(
          evidence.summary?.totalKMSKeys || 0,
          1,
          'KMS keys configured',
          'high'
        )
      );

      // Check for customer-managed keys (best practice)
      checks.push(
        this.validateMinimum(
          evidence.summary?.customerManagedKeys || 0,
          1,
          'Customer-managed KMS keys',
          'medium'
        )
      );

      // Check S3 bucket encryption
      const totalS3 = evidence.summary?.s3BucketsEncrypted + evidence.summary?.s3BucketsUnencrypted || 0;
      const s3EncryptionPercentage = totalS3 > 0
        ? (evidence.summary?.s3BucketsEncrypted / totalS3) * 100
        : 100;

      checks.push(
        this.createCheck(
          'S3 buckets encrypted',
          s3EncryptionPercentage >= 100,
          '100% encrypted',
          `${s3EncryptionPercentage.toFixed(0)}% encrypted`,
          'critical',
          s3EncryptionPercentage < 100
            ? `${evidence.summary?.s3BucketsUnencrypted} S3 bucket(s) not encrypted`
            : undefined
        )
      );

      // Check RDS encryption
      const totalRDS = evidence.summary?.rdsInstancesEncrypted + evidence.summary?.rdsInstancesUnencrypted || 0;
      const rdsEncryptionPercentage = totalRDS > 0
        ? (evidence.summary?.rdsInstancesEncrypted / totalRDS) * 100
        : 100;

      checks.push(
        this.createCheck(
          'RDS instances encrypted',
          rdsEncryptionPercentage >= 100,
          '100% encrypted',
          `${rdsEncryptionPercentage.toFixed(0)}% encrypted`,
          'critical',
          rdsEncryptionPercentage < 100
            ? `${evidence.summary?.rdsInstancesUnencrypted} RDS instance(s) not encrypted`
            : undefined
        )
      );

      // Check EBS encryption
      const totalEBS = evidence.summary?.ebsVolumesEncrypted + evidence.summary?.ebsVolumesUnencrypted || 0;
      const ebsEncryptionPercentage = totalEBS > 0
        ? (evidence.summary?.ebsVolumesEncrypted / totalEBS) * 100
        : 100;

      checks.push(
        this.createCheck(
          'EBS volumes encrypted',
          ebsEncryptionPercentage >= 100,
          '100% encrypted',
          `${ebsEncryptionPercentage.toFixed(0)}% encrypted`,
          'high',
          ebsEncryptionPercentage < 100
            ? `${evidence.summary?.ebsVolumesUnencrypted} EBS volume(s) not encrypted`
            : undefined
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
