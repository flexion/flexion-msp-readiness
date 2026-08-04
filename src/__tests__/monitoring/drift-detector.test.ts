/**
 * Tests for drift detection
 */

import { detectDrift } from '../../monitoring/drift-detector';
import { ProjectAssessment, RequirementAssessment } from '../../types';

describe('Drift Detection', () => {
  const createMockAssessment = (overrides?: Partial<ProjectAssessment>): ProjectAssessment => {
    return {
      projectName: 'Test Project',
      assessmentDate: new Date('2026-01-01'),
      version: '1.0',
      overallStatus: {
        addressed: 10,
        partial: 5,
        gap: 3,
        notApplicable: 2,
        notStarted: 0,
      },
      requirementAssessments: [],
      criticalGaps: [],
      totalEstimatedEffort: 100,
      summary: 'Test assessment',
      ...overrides,
    };
  };

  const createMockRequirement = (
    id: string,
    status: RequirementAssessment['status'],
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): RequirementAssessment => {
    return {
      requirement: {
        id,
        name: `Requirement ${id}`,
        category: 'security',
        description: 'Test requirement',
        priority,
        evidenceRequired: [],
      },
      status,
      confidence: 0.8,
      findings: [],
      evidence: [],
      gaps: [],
      recommendations: [],
    };
  };

  describe('detectDrift', () => {
    it('should detect no drifts when assessments are identical', () => {
      const req1 = createMockRequirement('SECP-001', 'addressed');
      const baseline = createMockAssessment({ requirementAssessments: [req1] });
      const current = createMockAssessment({ requirementAssessments: [req1] });

      const result = detectDrift(current, baseline);

      expect(result.summary.totalDrifts).toBe(0);
      expect(result.drifts).toHaveLength(0);
    });

    it('should detect status change drift', () => {
      const req1 = createMockRequirement('SECP-001', 'addressed');
      const req2 = createMockRequirement('SECP-001', 'partial');

      const baseline = createMockAssessment({ requirementAssessments: [req1] });
      const current = createMockAssessment({ requirementAssessments: [req2] });

      const result = detectDrift(current, baseline);

      expect(result.summary.totalDrifts).toBeGreaterThan(0);
      expect(result.drifts[0].type).toBe('status_change');
      expect(result.drifts[0].previousValue).toBe('addressed');
      expect(result.drifts[0].currentValue).toBe('partial');
    });

    it('should detect new gap for critical requirements', () => {
      const req1 = createMockRequirement('SECP-001', 'addressed', 'critical');
      const req2 = createMockRequirement('SECP-001', 'gap', 'critical');

      const baseline = createMockAssessment({ requirementAssessments: [req1] });
      const current = createMockAssessment({ requirementAssessments: [req2] });

      const result = detectDrift(current, baseline);

      const newGapDrift = result.drifts.find(d => d.type === 'new_gap');
      expect(newGapDrift).toBeDefined();
      expect(newGapDrift?.severity).toBe('critical');
      expect(result.summary.newGaps).toBe(1);
    });

    it('should detect compliance improvement', () => {
      const req1 = createMockRequirement('SECP-001', 'gap');
      const req2 = createMockRequirement('SECP-001', 'addressed');

      const baseline = createMockAssessment({ requirementAssessments: [req1] });
      const current = createMockAssessment({ requirementAssessments: [req2] });

      const result = detectDrift(current, baseline);

      const improveDrift = result.drifts.find(d => d.type === 'compliance_improve');
      expect(improveDrift).toBeDefined();
      expect(improveDrift?.severity).toBe('info');
    });

    it('should detect overall compliance drop', () => {
      const baseline = createMockAssessment({
        overallStatus: { addressed: 15, partial: 3, gap: 2, notApplicable: 0, notStarted: 0 },
      });
      const current = createMockAssessment({
        overallStatus: { addressed: 10, partial: 5, gap: 5, notApplicable: 0, notStarted: 0 },
      });

      const result = detectDrift(current, baseline);

      const complianceDrift = result.drifts.find(d => d.type === 'compliance_drop');
      expect(complianceDrift).toBeDefined();
      expect(result.summary.complianceChange).toBeLessThan(-5);
    });

    it('should calculate compliance change correctly', () => {
      const baseline = createMockAssessment({
        overallStatus: { addressed: 10, partial: 5, gap: 5, notApplicable: 0, notStarted: 0 },
      });
      const current = createMockAssessment({
        overallStatus: { addressed: 12, partial: 5, gap: 3, notApplicable: 0, notStarted: 0 },
      });

      const result = detectDrift(current, baseline);

      // Baseline: 10/20 = 50%, Current: 12/20 = 60%, Change: +10%
      expect(result.summary.complianceChange).toBeCloseTo(10, 1);
    });

    it('should count drifts by criticality', () => {
      const req1 = createMockRequirement('SECP-001', 'addressed', 'critical');
      const req2 = createMockRequirement('SECP-001', 'gap', 'critical');
      const req3 = createMockRequirement('OPS-001', 'addressed', 'medium');
      const req4 = createMockRequirement('OPS-001', 'partial', 'medium');

      const baseline = createMockAssessment({ requirementAssessments: [req1, req3] });
      const current = createMockAssessment({ requirementAssessments: [req2, req4] });

      const result = detectDrift(current, baseline);

      expect(result.summary.byCriticality.high).toBeGreaterThan(0); // Critical gap
      expect(result.summary.byCriticality.medium).toBeGreaterThan(0); // Medium status change
    });
  });
});
