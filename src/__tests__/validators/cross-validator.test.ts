/**
 * Tests for Cross-Requirement Validator
 */

import { validateCrossRequirements } from '../../validators/cross-validator';
import { RequirementAssessment, MSPRequirement } from '../../types';

describe('Cross-Requirement Validator', () => {
  const createMockAssessment = (
    id: string,
    status: 'addressed' | 'partial' | 'gap' | 'not-applicable' | 'not-started',
    category: string,
    cisControls: string[] = []
  ): RequirementAssessment => ({
    requirement: {
      id,
      name: `Test Requirement ${id}`,
      category: category as any,
      description: 'Test',
      priority: 'high',
      cisControls,
      evidenceRequired: [],
    },
    status,
    confidence: 0.8,
    findings: [],
    evidence: [],
    gaps: [],
    recommendations: [],
  });

  describe('validateCrossRequirements', () => {
    it('should pass when no conflicts exist', async () => {
      const assessments = [
        createMockAssessment('SEC-003', 'addressed', 'security'),
        createMockAssessment('SEC-004', 'addressed', 'security'),
      ];

      const result = await validateCrossRequirements(assessments);

      expect(result.valid).toBe(true);
      expect(result.conflicts.length).toBe(0);
    });

    it('should detect SEC-003/SEC-004 inconsistency', async () => {
      const assessments = [
        createMockAssessment('SEC-003', 'gap', 'security'),
        createMockAssessment('SEC-004', 'addressed', 'security'),
      ];

      const result = await validateCrossRequirements(assessments);

      expect(result.valid).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].affectedRequirements).toContain('SEC-003');
      expect(result.conflicts[0].affectedRequirements).toContain('SEC-004');
    });

    it('should detect SEC-004/SEC-007 inconsistency', async () => {
      const assessments = [
        createMockAssessment('SEC-004', 'addressed', 'security'),
        createMockAssessment('SEC-007', 'gap', 'security'),
      ];

      const result = await validateCrossRequirements(assessments);

      expect(result.valid).toBe(false);
      expect(result.conflicts.some(c =>
        c.message.includes('SEC-007') && c.message.includes('MFA')
      )).toBe(true);
    });

    it('should detect IAM/offboarding inconsistency', async () => {
      const assessments = [
        createMockAssessment('SEC-004', 'addressed', 'security'),
        createMockAssessment('PEO-003', 'gap', 'people'),
      ];

      const result = await validateCrossRequirements(assessments);

      expect(result.valid).toBe(false);
      expect(result.conflicts.some(c =>
        c.message.includes('PEO-003') && c.message.includes('Offboarding')
      )).toBe(true);
    });

    it('should detect role-based access/IAM inconsistency', async () => {
      const assessments = [
        createMockAssessment('SEC-004', 'addressed', 'security'),
        createMockAssessment('SEC-006', 'gap', 'security'),
      ];

      const result = await validateCrossRequirements(assessments);

      expect(result.valid).toBe(false);
      expect(result.conflicts.some(c =>
        c.message.includes('SEC-006') && c.severity === 'error'
      )).toBe(true);
    });

    it('should detect monitoring/logging inconsistency', async () => {
      const assessments = [
        createMockAssessment('OPS-010', 'addressed', 'operations'),
        createMockAssessment('SEC-009', 'gap', 'security'),
      ];

      const result = await validateCrossRequirements(assessments);

      expect(result.valid).toBe(false);
      expect(result.conflicts.some(c =>
        c.message.includes('SEC-009') && c.message.includes('Logging')
      )).toBe(true);
    });

    it('should detect runbooks/monitoring inconsistency', async () => {
      const assessments = [
        createMockAssessment('OPS-011', 'addressed', 'operations'),
        createMockAssessment('OPS-010', 'gap', 'operations'),
      ];

      const result = await validateCrossRequirements(assessments);

      expect(result.valid).toBe(false);
      expect(result.conflicts.some(c =>
        c.message.includes('OPS-011') && c.message.includes('Runbooks')
      )).toBe(true);
    });

    it('should detect missing document references', async () => {
      const assessment = createMockAssessment('SEC-001', 'addressed', 'security');
      assessment.findings = [
        {
          type: 'documentation',
          source: '/docs/policy.md',
          summary: 'Policy documented',
          details: 'See [related playbook](../playbooks/security-response.md)',
          supportive: true,
          timestamp: new Date(),
        },
      ];
      assessment.evidence = [
        {
          type: 'document',
          path: '/docs/policy.md',
          description: 'Security policy',
          requirementIds: ['SEC-001'],
          collectedAt: new Date(),
        },
      ];

      const result = await validateCrossRequirements([assessment]);

      expect(result.missingReferences.length).toBeGreaterThan(0);
      expect(result.missingReferences[0].type).toBe('missing');
    });

    it('should ignore external URL references', async () => {
      const assessment = createMockAssessment('SEC-001', 'addressed', 'security');
      assessment.findings = [
        {
          type: 'documentation',
          source: '/docs/policy.md',
          summary: 'Policy documented',
          details: 'See [AWS docs](https://aws.amazon.com/security)',
          supportive: true,
          timestamp: new Date(),
        },
      ];

      const result = await validateCrossRequirements([assessment]);

      expect(result.missingReferences.length).toBe(0);
    });

    it('should detect CIS Controls inconsistency', async () => {
      const assessments = [
        createMockAssessment('SEC-003', 'addressed', 'security', ['4', '5']),
        createMockAssessment('SEC-004', 'gap', 'security', ['5']),
      ];

      const result = await validateCrossRequirements(assessments);

      expect(result.conflicts.some(c =>
        c.message.includes('CIS Control 5')
      )).toBe(true);
    });

    it('should not flag single requirement per CIS Control', async () => {
      const assessments = [
        createMockAssessment('SEC-003', 'addressed', 'security', ['4']),
        createMockAssessment('SEC-007', 'addressed', 'security', ['6']),
      ];

      const result = await validateCrossRequirements(assessments);

      // Should not have CIS Control conflicts since each control has only one requirement
      const cisConflicts = result.conflicts.filter(c => c.message.includes('CIS Control'));
      expect(cisConflicts.length).toBe(0);
    });

    it('should generate comprehensive summary', async () => {
      const assessments = [
        createMockAssessment('SEC-003', 'gap', 'security'),
        createMockAssessment('SEC-004', 'addressed', 'security'),
      ];

      const result = await validateCrossRequirements(assessments);

      expect(result.summary).toBeTruthy();
      expect(result.summary).toContain('conflict');
    });
  });
});
