/**
 * IAM Validator - SEC-004, SECP-001
 * Validates IAM configuration and access key security
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class IAMValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['SEC-004', 'SECP-001'];
  }

  async validate(
    requirement: MSPRequirement,
    evidencePaths: string[]
  ): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      const iamPath = evidencePaths.find(p => p.includes('iam'));
      if (!iamPath) {
        throw new Error('IAM evidence file not found');
      }

      const evidence = this.loadEvidenceFile(iamPath);

      if (requirement.id === 'SEC-004') {
        // IAM security checks
        const totalUsers = evidence.summary?.totalUsers || 0;
        const usersWithMFA = evidence.summary?.usersWithMFA || 0;
        const mfaPercentage = totalUsers > 0 ? (usersWithMFA / totalUsers) * 100 : 0;

        checks.push(
          this.createCheck(
            'MFA enabled for users',
            mfaPercentage >= 100,
            '100% of users',
            `${mfaPercentage.toFixed(0)}% of users`,
            'critical',
            mfaPercentage < 100
              ? `${totalUsers - usersWithMFA} user(s) without MFA`
              : undefined
          )
        );

        // Check password policy
        const policy = evidence.passwordPolicy || {};
        checks.push(
          this.validateMinimum(
            policy.minimumPasswordLength || 0,
            14,
            'Password length minimum',
            'high'
          )
        );
        checks.push(
          this.validateEnabled(policy.requireSymbols, 'Password requires symbols', 'medium')
        );
        checks.push(
          this.validateEnabled(policy.requireNumbers, 'Password requires numbers', 'medium')
        );
        checks.push(
          this.validateEnabled(
            policy.requireUppercaseCharacters,
            'Password requires uppercase',
            'medium'
          )
        );
        checks.push(
          this.validateEnabled(
            policy.requireLowercaseCharacters,
            'Password requires lowercase',
            'medium'
          )
        );

        // Check Access Analyzer
        checks.push(
          this.createCheck(
            'IAM Access Analyzer findings',
            (evidence.summary?.accessAnalyzerFindings || 0) === 0,
            'no findings',
            `${evidence.summary?.accessAnalyzerFindings || 0} finding(s)`,
            'high',
            evidence.summary?.accessAnalyzerFindings > 0
              ? 'Review and remediate Access Analyzer findings'
              : undefined
          )
        );
      }

      if (requirement.id === 'SECP-001') {
        // Access key exposure checks
        checks.push(
          this.createCheck(
            'No exposed AWS access keys',
            (evidence.summary?.exposedKeys || 0) === 0,
            'no exposed keys',
            `${evidence.summary?.exposedKeys || 0} exposed key(s)`,
            'critical',
            evidence.summary?.exposedKeys > 0
              ? 'Immediately rotate exposed access keys'
              : undefined
          )
        );

        // Check for old access keys
        const oldKeyThresholdDays = 90;
        const now = new Date();
        let oldKeysCount = 0;

        for (const user of evidence.users || []) {
          for (const key of user.accessKeys || []) {
            if (key.status === 'Active' && key.createDate) {
              const keyAge =
                (now.getTime() - new Date(key.createDate).getTime()) / (1000 * 60 * 60 * 24);
              if (keyAge > oldKeyThresholdDays) {
                oldKeysCount++;
              }
            }
          }
        }

        checks.push(
          this.createCheck(
            'Access keys rotated regularly',
            oldKeysCount === 0,
            'all keys < 90 days old',
            `${oldKeysCount} key(s) > 90 days old`,
            'high',
            oldKeysCount > 0 ? 'Rotate access keys older than 90 days' : undefined
          )
        );
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
