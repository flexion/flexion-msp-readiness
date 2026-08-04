/**
 * Logging Validator - OPS-004
 * Validates CloudTrail configuration
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class LoggingValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['OPS-004'];
  }

  async validate(
    requirement: MSPRequirement,
    evidencePaths: string[]
  ): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      // Load CloudTrail evidence
      const cloudtrailPath = evidencePaths.find(p => p.includes('cloudtrail'));
      if (!cloudtrailPath) {
        throw new Error('CloudTrail evidence file not found');
      }

      const evidence = this.loadEvidenceFile(cloudtrailPath);

      // Check that at least one trail exists
      checks.push(
        this.validateMinimum(
          evidence.summary?.totalTrails || 0,
          1,
          'CloudTrail trails exist',
          'critical'
        )
      );

      // Check that at least one trail is actively logging
      checks.push(
        this.validateMinimum(
          evidence.summary?.activeTrails || 0,
          1,
          'CloudTrail actively logging',
          'critical'
        )
      );

      // Check multi-region configuration
      checks.push(
        this.validateMinimum(
          evidence.summary?.multiRegionTrails || 0,
          1,
          'Multi-region CloudTrail enabled',
          'high'
        )
      );

      // Check log file validation
      checks.push(
        this.validateMinimum(
          evidence.summary?.logFileValidationEnabled || 0,
          1,
          'Log file validation enabled',
          'high'
        )
      );

      // Check S3 bucket encryption
      checks.push(
        this.validateMinimum(
          evidence.summary?.s3BucketsEncrypted || 0,
          1,
          'S3 log bucket encrypted',
          'high'
        )
      );

      // Check individual trail settings
      for (const trail of evidence.trails || []) {
        // Verify trail is logging
        if (!trail.isLogging) {
          checks.push(
            this.createCheck(
              `Trail '${trail.name}' is logging`,
              false,
              'logging enabled',
              'logging disabled',
              'high',
              `CloudTrail '${trail.name}' is not actively logging`
            )
          );
        }

        // Verify log file validation
        if (!trail.logFileValidationEnabled) {
          checks.push(
            this.createCheck(
              `Trail '${trail.name}' log validation`,
              false,
              'validation enabled',
              'validation disabled',
              'medium',
              `Log file validation should be enabled for trail '${trail.name}'`
            )
          );
        }
      }

      // Check S3 bucket settings
      for (const bucket of evidence.s3BucketInfo || []) {
        // Verify versioning
        if (!bucket.versioningEnabled) {
          checks.push(
            this.createCheck(
              `S3 bucket '${bucket.bucketName}' versioning`,
              false,
              'versioning enabled',
              'versioning disabled',
              'medium',
              `Versioning should be enabled for S3 log bucket '${bucket.bucketName}'`
            )
          );
        }

        // Verify encryption
        if (!bucket.encryptionEnabled) {
          checks.push(
            this.createCheck(
              `S3 bucket '${bucket.bucketName}' encryption`,
              false,
              'encryption enabled',
              'encryption disabled',
              'high',
              `Encryption should be enabled for S3 log bucket '${bucket.bucketName}'`
            )
          );
        }
      }
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
