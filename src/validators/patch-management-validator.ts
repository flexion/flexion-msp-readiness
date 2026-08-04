/**
 * Patch Management Validator - OPS-008
 * Validates SSM patch compliance
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class PatchManagementValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['OPS-008'];
  }

  async validate(requirement: MSPRequirement, evidencePaths: string[]): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      const ssmPath = evidencePaths.find(p => p.includes('ssm') || p.includes('patch'));
      if (!ssmPath) {
        throw new Error('SSM evidence file not found');
      }

      const evidence = this.loadEvidenceFile(ssmPath);

      // Check that patch baselines exist
      checks.push(
        this.validateMinimum(
          evidence.summary?.patchBaselines || 0,
          1,
          'Patch baselines configured',
          'high'
        )
      );

      // Check for managed instances
      checks.push(
        this.validateMinimum(
          evidence.summary?.totalInstances || 0,
          1,
          'Managed instances enrolled',
          'high'
        )
      );

      // Check that most instances are online
      const onlinePercentage =
        evidence.summary?.totalInstances > 0
          ? (evidence.summary.onlineInstances / evidence.summary.totalInstances) * 100
          : 0;

      checks.push(
        this.createCheck(
          'Managed instances online',
          onlinePercentage >= 80,
          '>= 80% online',
          `${onlinePercentage.toFixed(0)}% online`,
          'medium',
          onlinePercentage < 80 ? 'Investigate offline instances' : undefined
        )
      );

      // Check for missing patches
      const totalMissing = evidence.summary?.totalMissingPatches || 0;
      checks.push(
        this.createCheck(
          'No critical missing patches',
          totalMissing === 0,
          'no missing patches',
          `${totalMissing} missing patch(es)`,
          'critical',
          totalMissing > 0 ? 'Apply missing patches promptly' : undefined
        )
      );

      // Check for failed patches
      const totalFailed = evidence.summary?.totalFailedPatches || 0;
      checks.push(
        this.createCheck(
          'No failed patch installations',
          totalFailed === 0,
          'no failed patches',
          `${totalFailed} failed patch(es)`,
          'high',
          totalFailed > 0 ? 'Investigate and remediate failed patches' : undefined
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
