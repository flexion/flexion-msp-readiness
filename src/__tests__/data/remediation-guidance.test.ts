/**
 * Tests for Remediation Guidance Data
 */

import {
  REMEDIATION_GUIDANCE,
  getRemediationGuidance,
  getAvailableRemediationTypes,
  mapGapToRemediationType,
} from '../../data/remediation-guidance';

describe('RemediationGuidance', () => {
  describe('REMEDIATION_GUIDANCE', () => {
    it('should have guidance for priority finding types', () => {
      const expectedTypes = [
        'config-not-enabled',
        'cloudtrail-not-logging',
        'no-backup-plans',
        'old-access-keys',
        'alb-invalid-headers',
        'security-hub-not-enabled',
        'mfa-not-enabled',
        'inspector-not-enabled',
      ];

      for (const type of expectedTypes) {
        expect(REMEDIATION_GUIDANCE[type]).toBeDefined();
        expect(REMEDIATION_GUIDANCE[type].findingType).toBe(type);
      }
    });

    it('should have complete guidance structure for each type', () => {
      for (const [type, guidance] of Object.entries(REMEDIATION_GUIDANCE)) {
        expect(guidance.findingType).toBe(type);
        expect(guidance.rootCause).toBeTruthy();
        expect(guidance.impact).toBeTruthy();
        expect(guidance.riskLevel).toMatch(/^(critical|high|medium|low)$/);
        expect(guidance.estimatedEffort).toBeGreaterThan(0);
        expect(guidance.steps).toBeDefined();
        expect(guidance.steps.length).toBeGreaterThan(0);
        expect(guidance.awsDocs).toBeDefined();
        expect(guidance.awsDocs.length).toBeGreaterThan(0);
        expect(guidance.iacSnippets).toBeDefined();
        expect(guidance.iacSnippets.length).toBeGreaterThan(0);

        // Validate steps
        guidance.steps.forEach((step, index) => {
          expect(step.order).toBe(index + 1);
          expect(step.action).toBeTruthy();
          // At least one of command, details, or consoleSteps should be present
          const hasGuidance =
            step.command || step.details || (step.consoleSteps && step.consoleSteps.length > 0);
          expect(hasGuidance).toBeTruthy();
        });

        // Validate IaC snippets
        guidance.iacSnippets.forEach(snippet => {
          expect(snippet.language).toMatch(
            /^(cdk-typescript|cdk-python|cloudformation|terraform)$/
          );
          expect(snippet.description).toBeTruthy();
          expect(snippet.code).toBeTruthy();
        });

        // Validate AWS docs
        guidance.awsDocs.forEach(doc => {
          expect(doc).toMatch(/^https:\/\/docs\.aws\.amazon\.com\//);
        });
      }
    });
  });

  describe('getRemediationGuidance', () => {
    it('should return guidance for known types', () => {
      const guidance = getRemediationGuidance('config-not-enabled');
      expect(guidance).toBeDefined();
      expect(guidance?.findingType).toBe('config-not-enabled');
    });

    it('should return undefined for unknown types', () => {
      const guidance = getRemediationGuidance('unknown-type');
      expect(guidance).toBeUndefined();
    });
  });

  describe('getAvailableRemediationTypes', () => {
    it('should return all available types', () => {
      const types = getAvailableRemediationTypes();
      expect(types).toContain('config-not-enabled');
      expect(types).toContain('cloudtrail-not-logging');
      expect(types).toContain('no-backup-plans');
      expect(types.length).toBeGreaterThan(5);
    });
  });

  describe('mapGapToRemediationType', () => {
    it('should map Config gaps', () => {
      expect(mapGapToRemediationType('AWS Config not enabled')).toBe('config-not-enabled');
      expect(mapGapToRemediationType('Config service is not enabled in region')).toBe(
        'config-not-enabled'
      );
    });

    it('should map CloudTrail gaps', () => {
      expect(mapGapToRemediationType('CloudTrail not logging')).toBe('cloudtrail-not-logging');
      expect(mapGapToRemediationType('CloudTrail not enabled')).toBe('cloudtrail-not-logging');
      expect(mapGapToRemediationType('CloudTrail trail not logging API calls')).toBe(
        'cloudtrail-not-logging'
      );
    });

    it('should map Backup gaps', () => {
      expect(mapGapToRemediationType('No backup plans configured')).toBe('no-backup-plans');
      expect(mapGapToRemediationType('AWS Backup plan missing')).toBe('no-backup-plans');
    });

    it('should map access key gaps', () => {
      expect(mapGapToRemediationType('Access keys are old and need rotation')).toBe(
        'old-access-keys'
      );
      expect(mapGapToRemediationType('Old access key detected')).toBe('old-access-keys');
      expect(mapGapToRemediationType('Access key rotation required')).toBe('old-access-keys');
    });

    it('should map ALB gaps', () => {
      expect(mapGapToRemediationType('ALB not dropping invalid headers')).toBe(
        'alb-invalid-headers'
      );
      expect(mapGapToRemediationType('ALB invalid header configuration issue')).toBe(
        'alb-invalid-headers'
      );
    });

    it('should map Security Hub gaps', () => {
      expect(mapGapToRemediationType('Security Hub not enabled')).toBe('security-hub-not-enabled');
    });

    it('should map MFA gaps', () => {
      expect(mapGapToRemediationType('MFA not enabled for user')).toBe('mfa-not-enabled');
    });

    it('should map Inspector gaps', () => {
      expect(mapGapToRemediationType('Inspector not enabled')).toBe('inspector-not-enabled');
    });

    it('should return undefined for unknown gaps', () => {
      expect(mapGapToRemediationType('Some random gap description')).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      expect(mapGapToRemediationType('AWS CONFIG NOT ENABLED')).toBe('config-not-enabled');
      expect(mapGapToRemediationType('cloudtrail not logging')).toBe('cloudtrail-not-logging');
    });
  });
});
