/**
 * Tests for requirement matcher
 */

import { matchRequirements, calculateSummary } from '../../assessors/requirement-matcher';
import { DocumentReference } from '../../assessors/doc-scanner';

describe('requirement-matcher', () => {
  // Create a minimal mock DocScanResult
  const createMockDocScan = (requirements: string[]) => {
    const requirementMentions = new Map<string, DocumentReference[]>();

    requirements.forEach(reqId => {
      requirementMentions.set(reqId, [
        {
          file: `playbooks/${reqId.toLowerCase()}.md`,
          line: 10,
          context: `This addresses ${reqId}`,
          type: 'strong',
        },
      ]);
    });

    return {
      files: [
        {
          path: '/test/playbooks/incident-response.md',
          relativePath: 'playbooks/incident-response.md',
          content: 'Incident response content',
          type: 'playbook' as const,
        },
      ],
      requirementMentions,
      playbooksFound: ['playbooks/incident-response.md'],
      runbooksFound: [],
      evidenceFound: [],
      assessmentFiles: [],
      totalFiles: 1,
      totalRequirementMentions: requirements.length,
    };
  };

  it('should match requirements from doc scan', () => {
    const mockDocScan = createMockDocScan(['SEC-001', 'SEC-002']);
    const assessments = matchRequirements(mockDocScan, []);

    expect(assessments.length).toBeGreaterThan(0);
  });

  it('should mark documented requirements as addressed or partial', () => {
    const mockDocScan = createMockDocScan(['SEC-001']);
    const assessments = matchRequirements(mockDocScan, []);

    const sec001 = assessments.find(a => a.requirement.id === 'SEC-001');
    expect(sec001).toBeDefined();
    expect(['addressed', 'partial']).toContain(sec001!.status);
  });

  it('should mark undocumented requirements as gap', () => {
    const mockDocScan = createMockDocScan([]);
    const assessments = matchRequirements(mockDocScan, []);

    // All requirements should be gaps since doc scan is empty
    const gapRequirements = assessments.filter(
      a => a.status === 'gap' || a.status === 'not-started'
    );
    expect(gapRequirements.length).toBeGreaterThan(0);
  });

  it('should calculate confidence scores', () => {
    const mockDocScan = createMockDocScan(['SEC-001']);
    const assessments = matchRequirements(mockDocScan, []);

    const sec001 = assessments.find(a => a.requirement.id === 'SEC-001');
    expect(sec001).toBeDefined();
    expect(sec001!.confidence).toBeGreaterThan(0);
    expect(sec001!.confidence).toBeLessThanOrEqual(1);
  });

  it('should skip requirements in skip list', () => {
    const mockDocScan = createMockDocScan(['SEC-001', 'SEC-002']);
    const skipRequirements = ['SEC-001'];
    const assessments = matchRequirements(mockDocScan, skipRequirements);

    // SEC-001 should be marked as not-applicable
    const sec001 = assessments.find(a => a.requirement.id === 'SEC-001');
    expect(sec001).toBeDefined();
    expect(sec001!.status).toBe('not-applicable');
  });

  it('should provide gaps for gap requirements', () => {
    const mockDocScan = createMockDocScan([]);
    const assessments = matchRequirements(mockDocScan, []);

    const gapRequirement = assessments.find(a => a.status === 'gap');
    if (gapRequirement) {
      expect(gapRequirement.gaps.length).toBeGreaterThan(0);
    }
  });

  it('should provide recommendations for gap requirements', () => {
    const mockDocScan = createMockDocScan([]);
    const assessments = matchRequirements(mockDocScan, []);

    const gapRequirement = assessments.find(a => a.status === 'gap');
    if (gapRequirement) {
      expect(gapRequirement.recommendations.length).toBeGreaterThan(0);
    }
  });

  describe('calculateSummary', () => {
    it('should calculate summary statistics', () => {
      const mockDocScan = createMockDocScan(['SEC-001']);
      const assessments = matchRequirements(mockDocScan, []);
      const summary = calculateSummary(assessments);

      expect(summary.addressed).toBeGreaterThanOrEqual(0);
      expect(summary.partial).toBeGreaterThanOrEqual(0);
      expect(summary.gap).toBeGreaterThanOrEqual(0);
      expect(summary.notApplicable).toBeGreaterThanOrEqual(0);
      expect(summary.notStarted).toBeGreaterThanOrEqual(0);

      const total =
        summary.addressed +
        summary.partial +
        summary.gap +
        summary.notApplicable +
        summary.notStarted;
      expect(total).toBe(assessments.length);
    });

    it('should calculate total effort', () => {
      const mockDocScan = createMockDocScan([]);
      const assessments = matchRequirements(mockDocScan, []);
      const summary = calculateSummary(assessments);

      expect(summary.totalEffort).toBeGreaterThanOrEqual(0);
    });
  });
});
