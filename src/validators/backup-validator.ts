/**
 * Backup Validator - OPS-005
 * Validates AWS Backup configuration
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class BackupValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['OPS-005'];
  }

  async validate(requirement: MSPRequirement, evidencePaths: string[]): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      const backupPath = evidencePaths.find(p => p.includes('backup'));
      if (!backupPath) {
        throw new Error('Backup evidence file not found');
      }

      const evidence = this.loadEvidenceFile(backupPath);

      // Check that backup vaults exist
      checks.push(
        this.validateMinimum(
          evidence.summary?.totalVaults || 0,
          1,
          'Backup vaults configured',
          'critical'
        )
      );

      // Check that backup plans exist
      checks.push(
        this.validateMinimum(
          evidence.summary?.totalPlans || 0,
          1,
          'Backup plans configured',
          'critical'
        )
      );

      // Check for recent backup jobs
      checks.push(
        this.validateMinimum(
          evidence.summary?.completedJobs || 0,
          1,
          'Successful backup jobs',
          'high'
        )
      );

      // Check for protected resources
      checks.push(
        this.validateMinimum(
          evidence.summary?.protectedResources || 0,
          1,
          'Resources protected by backup',
          'high'
        )
      );

      // Check individual backup plans for retention
      for (const plan of evidence.backupPlans || []) {
        const hasRetention = plan.rules?.some(
          (rule: any) => (rule.lifecycle?.deleteAfterDays || 0) >= 90
        );

        if (!hasRetention) {
          checks.push(
            this.createCheck(
              `Backup plan '${plan.name}' retention`,
              false,
              'retention >= 90 days',
              'retention < 90 days',
              'medium',
              'Backup retention should be at least 90 days for compliance'
            )
          );
        }
      }

      // Check for vault lock/immutability
      const vaultsWithLock = (evidence.backupVaults || []).filter(
        (v: any) => v.locked || v.minRetentionDays
      ).length;

      checks.push(
        this.createCheck(
          'Backup vault immutability',
          vaultsWithLock > 0,
          'at least one vault locked',
          vaultsWithLock > 0 ? `${vaultsWithLock} vault(s) locked` : 'no vaults locked',
          'medium',
          'Consider enabling vault lock for compliance and ransomware protection'
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
