/**
 * Tests for AWS Evidence Validator
 */

import { validateAWSEvidence } from '../../validators/aws-evidence-validator';
import { EvidenceArtifact, MSPRequirement } from '../../types';

describe('AWS Evidence Validator', () => {
  const mockRequirement: MSPRequirement = {
    id: 'SEC-003',
    name: 'AWS Account Configuration',
    category: 'security',
    description: 'Test requirement',
    priority: 'critical',
    awsServices: ['Config', 'CloudTrail', 'GuardDuty'],
    evidenceRequired: ['config-rules', 'cloudtrail-trails'],
    estimatedHours: 0,
  };

  describe('validateAWSEvidence', () => {
    it('should pass for successfully collected evidence', async () => {
      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/config.json',
        description: 'AWS Config rules',
        requirementIds: ['SEC-003'],
        collectedAt: new Date(),
        metadata: {
          collectionStatus: 'success',
          permissionError: false,
        },
      };

      const result = await validateAWSEvidence(evidence, mockRequirement);

      expect(result.requirementId).toBe('SEC-003');
      const collectionCheck = result.checks.find(c => c.name === 'Evidence collected successfully');
      expect(collectionCheck?.passed).toBe(true);
    });

    it('should fail if evidence collection failed', async () => {
      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/config.json',
        description: 'AWS Config rules',
        requirementIds: ['SEC-003'],
        collectedAt: new Date(),
        metadata: {
          collectionStatus: 'error',
          permissionError: false,
        },
      };

      const result = await validateAWSEvidence(evidence, mockRequirement);

      expect(result.passed).toBe(false);
      const collectionCheck = result.checks.find(c => c.name === 'Evidence collected successfully');
      expect(collectionCheck?.passed).toBe(false);
      expect(result.issues?.length).toBeGreaterThan(0);
    });

    it('should detect permission errors', async () => {
      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/config.json',
        description: 'AWS Config rules',
        requirementIds: ['SEC-003'],
        collectedAt: new Date(),
        metadata: {
          collectionStatus: 'success',
          permissionError: true,
        },
      };

      const result = await validateAWSEvidence(evidence, mockRequirement);

      const permissionCheck = result.checks.find(c => c.name === 'No permission errors');
      expect(permissionCheck?.passed).toBe(false);
      expect(result.issues?.some(i => i.type === 'permission-error')).toBe(true);
    });

    it('should detect stale evidence', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/config.json',
        description: 'AWS Config rules',
        requirementIds: ['SEC-003'],
        collectedAt: oldDate,
        metadata: {
          collectionStatus: 'success',
        },
      };

      const result = await validateAWSEvidence(evidence, mockRequirement);

      const freshnessCheck = result.checks.find(c => c.name === 'Evidence is current');
      expect(freshnessCheck?.passed).toBe(false);
    });

    it('should detect expired evidence', async () => {
      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/config.json',
        description: 'AWS Config rules',
        requirementIds: ['SEC-003'],
        collectedAt: new Date(),
        expiresAt: new Date('2020-01-01'), // Past date
        metadata: {
          collectionStatus: 'success',
        },
      };

      const result = await validateAWSEvidence(evidence, mockRequirement);

      const expiredCheck = result.checks.find(c => c.name === 'Evidence not expired');
      expect(expiredCheck?.passed).toBe(false);
    });

    it('should validate AWS Config rules', async () => {
      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/config.json',
        description: 'AWS Config rules',
        requirementIds: ['SEC-003'],
        collectedAt: new Date(),
        metadata: {
          collectionStatus: 'success',
          configRules: [
            { ConfigRuleName: 'encrypted-volumes', ConfigRuleState: 'ACTIVE' },
            { ConfigRuleName: 'root-mfa-enabled', ConfigRuleState: 'ACTIVE' },
          ],
        },
      };

      const result = await validateAWSEvidence(evidence, mockRequirement);

      const configCheck = result.checks.find(c => c.name === 'Config rules active');
      expect(configCheck?.passed).toBe(true);
    });

    it('should fail if no Config rules are active', async () => {
      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/config.json',
        description: 'AWS Config rules',
        requirementIds: ['SEC-003'],
        collectedAt: new Date(),
        metadata: {
          collectionStatus: 'success',
          configRules: [
            { ConfigRuleName: 'encrypted-volumes', ConfigRuleState: 'INACTIVE' },
          ],
        },
      };

      const result = await validateAWSEvidence(evidence, mockRequirement);

      const configCheck = result.checks.find(c => c.name === 'Config rules active');
      expect(configCheck?.passed).toBe(false);
    });

    it('should validate CloudTrail configuration', async () => {
      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/cloudtrail.json',
        description: 'CloudTrail trails',
        requirementIds: ['SEC-003'],
        collectedAt: new Date(),
        metadata: {
          collectionStatus: 'success',
          trails: [
            {
              Name: 'main-trail',
              IsMultiRegionTrail: true,
              IsLogging: true,
            },
          ],
        },
      };

      const result = await validateAWSEvidence(evidence, mockRequirement);

      const trailCheck = result.checks.find(c => c.name === 'CloudTrail active and multi-region');
      expect(trailCheck?.passed).toBe(true);
    });

    it('should validate GuardDuty is enabled', async () => {
      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/guardduty.json',
        description: 'GuardDuty detectors',
        requirementIds: ['SEC-003'],
        collectedAt: new Date(),
        metadata: {
          collectionStatus: 'success',
          detectors: [
            { DetectorId: 'abc123', Status: 'ENABLED' },
          ],
        },
      };

      const result = await validateAWSEvidence(evidence, mockRequirement);

      const guarddutyCheck = result.checks.find(c => c.name === 'GuardDuty enabled');
      expect(guarddutyCheck?.passed).toBe(true);
    });

    it('should validate backup configuration', async () => {
      const backupRequirement: MSPRequirement = {
        id: 'OPS-015',
        name: 'Disaster Recovery',
        category: 'operations',
        description: 'Test requirement',
        priority: 'critical',
        awsServices: ['Backup'],
        evidenceRequired: ['backup-vaults', 'backup-plans'],
        estimatedHours: 6,
      };

      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/backup.json',
        description: 'AWS Backup configuration',
        requirementIds: ['OPS-015'],
        collectedAt: new Date(),
        metadata: {
          collectionStatus: 'success',
          backupVaults: [{ BackupVaultName: 'main-vault' }],
          backupPlans: [{ BackupPlanName: 'daily-backup' }],
        },
      };

      const result = await validateAWSEvidence(evidence, backupRequirement);

      const vaultCheck = result.checks.find(c => c.name === 'Backup vaults configured');
      const planCheck = result.checks.find(c => c.name === 'Backup plans configured');
      expect(vaultCheck?.passed).toBe(true);
      expect(planCheck?.passed).toBe(true);
    });

    it('should validate IAM MFA enforcement', async () => {
      const iamRequirement: MSPRequirement = {
        id: 'SEC-007',
        name: 'Multi-Factor Authentication',
        category: 'security',
        description: 'Test requirement',
        priority: 'critical',
        awsServices: ['IAM'],
        evidenceRequired: ['iam-users'],
        estimatedHours: 4,
      };

      const evidence: EvidenceArtifact = {
        type: 'aws-snapshot',
        path: '/evidence/iam.json',
        description: 'IAM users',
        requirementIds: ['SEC-007'],
        collectedAt: new Date(),
        metadata: {
          collectionStatus: 'success',
          users: [
            { UserName: 'user1', MFAEnabled: true },
            { UserName: 'user2', MFAEnabled: true },
            { UserName: 'user3', MFAEnabled: false },
          ],
        },
      };

      const result = await validateAWSEvidence(evidence, iamRequirement);

      const mfaCheck = result.checks.find(c => c.name === 'IAM users have MFA enabled');
      expect(mfaCheck?.passed).toBe(false); // Only 66% have MFA, need 90%
    });
  });
});
