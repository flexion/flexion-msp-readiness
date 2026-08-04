/**
 * AWS Evidence Validator
 * Validates AWS-collected evidence for completeness, accuracy, and compliance
 */

import {
  EvidenceArtifact,
  ValidationCheck,
  ValidationIssue,
  ValidationResult,
  MSPRequirement,
} from '../types';

/**
 * Validate AWS evidence artifact
 */
export async function validateAWSEvidence(
  evidence: EvidenceArtifact,
  requirement: MSPRequirement
): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];
  const issues: ValidationIssue[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check 1: Evidence was collected successfully
  const collectedSuccessfully = evidence.metadata?.collectionStatus !== 'error';
  checks.push({
    name: 'Evidence collected successfully',
    passed: collectedSuccessfully,
    expected: 'successful collection',
    actual: collectedSuccessfully ? 'success' : 'error',
    severity: 'critical',
    rule: 'AWS-001',
    location: evidence.path,
  });

  if (!collectedSuccessfully) {
    score -= 50;
    issues.push({
      type: 'invalid',
      severity: 'error',
      message: 'Evidence collection failed',
      recommendation: 'Check AWS permissions and retry evidence collection',
      affectedRequirements: [requirement.id],
      location: evidence.path,
    });
  }

  // Check 2: No permission errors
  const hasPermissionError = evidence.metadata?.permissionError === true;
  checks.push({
    name: 'No permission errors',
    passed: !hasPermissionError,
    expected: 'sufficient permissions',
    actual: hasPermissionError ? 'permission denied' : 'accessible',
    severity: 'critical',
    rule: 'AWS-002',
    location: evidence.path,
  });

  if (hasPermissionError) {
    score -= 40;
    issues.push({
      type: 'permission-error',
      severity: 'error',
      message: 'Insufficient AWS permissions to collect evidence',
      recommendation: `Grant required permissions for ${requirement.awsServices?.join(', ')}`,
      affectedRequirements: [requirement.id],
      location: evidence.path,
    });
  }

  // Check 3: Evidence is current (collected recently)
  const collectionAge =
    Date.now() - new Date(evidence.collectedAt).getTime();
  const daysOld = collectionAge / (1000 * 60 * 60 * 24);
  const isCurrent = daysOld <= 7; // Evidence should be less than 7 days old

  checks.push({
    name: 'Evidence is current',
    passed: isCurrent,
    expected: '<= 7 days old',
    actual: `${daysOld.toFixed(1)} days old`,
    severity: 'medium',
    rule: 'AWS-003',
    location: evidence.path,
  });

  if (!isCurrent) {
    score -= 10;
    issues.push({
      type: 'stale',
      severity: 'warning',
      message: `Evidence is ${daysOld.toFixed(0)} days old`,
      recommendation: 'Re-collect evidence to ensure current compliance state',
      affectedRequirements: [requirement.id],
      location: evidence.path,
    });
  }

  // Check 4: Evidence expires check
  if (evidence.expiresAt) {
    const isExpired = new Date(evidence.expiresAt) < new Date();
    checks.push({
      name: 'Evidence not expired',
      passed: !isExpired,
      expected: 'not expired',
      actual: isExpired ? 'expired' : 'valid',
      severity: 'high',
      rule: 'AWS-004',
      location: evidence.path,
    });

    if (isExpired) {
      score -= 30;
      issues.push({
        type: 'stale',
        severity: 'error',
        message: 'Evidence has expired',
        recommendation: 'Re-collect evidence immediately',
        affectedRequirements: [requirement.id],
        location: evidence.path,
      });
    }
  }

  // Check 5: Evidence metadata is complete
  const hasMetadata = !!(evidence.metadata && Object.keys(evidence.metadata).length > 0);
  checks.push({
    name: 'Evidence metadata present',
    passed: hasMetadata,
    expected: 'metadata present',
    actual: hasMetadata ? 'found' : 'missing',
    severity: 'medium',
    rule: 'AWS-005',
    location: evidence.path,
  });

  if (!hasMetadata) {
    score -= 5;
    issues.push({
      type: 'incomplete',
      severity: 'warning',
      message: 'Evidence missing metadata',
      recommendation: 'Ensure evidence collectors populate metadata fields',
      affectedRequirements: [requirement.id],
      location: evidence.path,
    });
  }

  // Service-specific validation
  if (requirement.awsServices && requirement.awsServices.length > 0) {
    const serviceChecks = await validateServiceSpecificEvidence(
      evidence,
      requirement
    );
    checks.push(...serviceChecks.checks);
    issues.push(...serviceChecks.issues);
    score -= serviceChecks.scoreDeduction;
    recommendations.push(...serviceChecks.recommendations);
  }

  // Ensure score stays in valid range
  score = Math.max(0, Math.min(100, score));

  const passed = checks.every(
    c => c.passed || c.severity === 'low' || c.severity === 'medium'
  );

  return {
    requirementId: requirement.id,
    passed,
    checks,
    summary: generateSummary(passed, issues),
    validatedAt: new Date(),
    score,
    issues,
    recommendations,
  };
}

/**
 * Validate service-specific evidence
 */
async function validateServiceSpecificEvidence(
  evidence: EvidenceArtifact,
  requirement: MSPRequirement
): Promise<{
  checks: ValidationCheck[];
  issues: ValidationIssue[];
  recommendations: string[];
  scoreDeduction: number;
}> {
  const checks: ValidationCheck[] = [];
  const issues: ValidationIssue[] = [];
  const recommendations: string[] = [];
  let scoreDeduction = 0;

  for (const service of requirement.awsServices || []) {
    switch (service.toLowerCase()) {
      case 'config':
        // Validate AWS Config evidence
        if (evidence.metadata?.configRules) {
          const rules = evidence.metadata.configRules as any[];
          const enabledRules = rules.filter(r => r.ConfigRuleState === 'ACTIVE');

          checks.push({
            name: `Config rules active`,
            passed: enabledRules.length > 0,
            expected: 'active rules',
            actual: `${enabledRules.length} active`,
            severity: 'high',
            rule: 'AWS-CONFIG-001',
            location: evidence.path,
          });

          if (enabledRules.length === 0) {
            scoreDeduction += 15;
            issues.push({
              type: 'threshold-not-met',
              severity: 'error',
              message: 'No active AWS Config rules found',
              recommendation: 'Enable AWS Config rules for compliance monitoring',
              affectedRequirements: [requirement.id],
              location: evidence.path,
            });
          }
        }
        break;

      case 'cloudtrail':
        // Validate CloudTrail evidence
        if (evidence.metadata?.trails) {
          const trails = evidence.metadata.trails as any[];
          const activeTrails = trails.filter(
            t => t.IsMultiRegionTrail && t.IsLogging
          );

          checks.push({
            name: 'CloudTrail active and multi-region',
            passed: activeTrails.length > 0,
            expected: 'multi-region trail logging',
            actual:
              activeTrails.length > 0 ? 'active' : 'not configured',
            severity: 'critical',
            rule: 'AWS-CLOUDTRAIL-001',
            location: evidence.path,
          });

          if (activeTrails.length === 0) {
            scoreDeduction += 20;
            issues.push({
              type: 'threshold-not-met',
              severity: 'error',
              message: 'No multi-region CloudTrail trails found',
              recommendation:
                'Enable CloudTrail with multi-region logging',
              affectedRequirements: [requirement.id],
              location: evidence.path,
            });
          }
        }
        break;

      case 'guardduty':
        // Validate GuardDuty evidence
        if (evidence.metadata?.detectors) {
          const detectors = evidence.metadata.detectors as any[];
          const enabledDetectors = detectors.filter(
            d => d.Status === 'ENABLED'
          );

          checks.push({
            name: 'GuardDuty enabled',
            passed: enabledDetectors.length > 0,
            expected: 'GuardDuty enabled',
            actual:
              enabledDetectors.length > 0 ? 'enabled' : 'disabled',
            severity: 'high',
            rule: 'AWS-GUARDDUTY-001',
            location: evidence.path,
          });

          if (enabledDetectors.length === 0) {
            scoreDeduction += 15;
            issues.push({
              type: 'threshold-not-met',
              severity: 'error',
              message: 'GuardDuty is not enabled',
              recommendation: 'Enable GuardDuty for threat detection',
              affectedRequirements: [requirement.id],
              location: evidence.path,
            });
          }
        }
        break;

      case 'backup':
        // Validate AWS Backup evidence
        if (evidence.metadata?.backupVaults || evidence.metadata?.backupPlans) {
          const vaults = (evidence.metadata.backupVaults as any[]) || [];
          const plans = (evidence.metadata.backupPlans as any[]) || [];

          checks.push({
            name: 'Backup vaults configured',
            passed: vaults.length > 0,
            expected: 'backup vaults present',
            actual: `${vaults.length} vaults`,
            severity: 'high',
            rule: 'AWS-BACKUP-001',
            location: evidence.path,
          });

          checks.push({
            name: 'Backup plans configured',
            passed: plans.length > 0,
            expected: 'backup plans present',
            actual: `${plans.length} plans`,
            severity: 'high',
            rule: 'AWS-BACKUP-002',
            location: evidence.path,
          });

          if (vaults.length === 0 || plans.length === 0) {
            scoreDeduction += 15;
            issues.push({
              type: 'threshold-not-met',
              severity: 'error',
              message: 'AWS Backup not fully configured',
              recommendation:
                'Configure backup vaults and plans for data protection',
              affectedRequirements: [requirement.id],
              location: evidence.path,
            });
          }
        }
        break;

      case 'iam':
      case 'iam identity center':
        // Validate IAM evidence
        if (evidence.metadata?.users || evidence.metadata?.roles) {
          const users = (evidence.metadata.users as any[]) || [];
          const usersWithMFA = users.filter(u => u.MFAEnabled);

          if (users.length > 0) {
            const mfaPercentage = (usersWithMFA.length / users.length) * 100;

            checks.push({
              name: 'IAM users have MFA enabled',
              passed: mfaPercentage >= 90,
              expected: '>= 90% with MFA',
              actual: `${mfaPercentage.toFixed(0)}% with MFA`,
              severity: 'critical',
              rule: 'AWS-IAM-001',
              location: evidence.path,
            });

            if (mfaPercentage < 90) {
              scoreDeduction += 20;
              issues.push({
                type: 'threshold-not-met',
                severity: 'error',
                message: `Only ${mfaPercentage.toFixed(0)}% of IAM users have MFA enabled`,
                recommendation:
                  'Enable MFA for all IAM users accessing the console',
                affectedRequirements: [requirement.id],
                location: evidence.path,
              });
            }
          }
        }
        break;

      case 'security hub':
      case 'securityhub':
        // Validate Security Hub evidence
        if (evidence.metadata?.securityScore || evidence.metadata?.findings) {
          const score = evidence.metadata.securityScore as number;

          if (score !== undefined) {
            checks.push({
              name: 'Security Hub score acceptable',
              passed: score >= 80,
              expected: '>= 80',
              actual: `${score}`,
              severity: 'high',
              rule: 'AWS-SECURITYHUB-001',
              location: evidence.path,
            });

            if (score < 80) {
              scoreDeduction += 10;
              recommendations.push(
                `Improve Security Hub score (currently ${score}/100)`
              );
            }
          }
        }
        break;
    }
  }

  return { checks, issues, recommendations, scoreDeduction };
}

/**
 * Generate summary text from validation results
 */
function generateSummary(passed: boolean, issues: ValidationIssue[]): string {
  if (passed) {
    return 'AWS evidence validation passed';
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (errors.length > 0 && warnings.length > 0) {
    return `${errors.length} error(s) and ${warnings.length} warning(s) found`;
  } else if (errors.length > 0) {
    return `${errors.length} error(s) found`;
  } else {
    return `${warnings.length} warning(s) found`;
  }
}
