/**
 * Tests for comparison module
 */

import * as fs from 'fs';
import {
  loadAssessment,
  compareAssessments,
  filterChanges,
  generateMarkdownReport,
  saveComparisonReport,
  getExitCode,
} from '../comparison';
import { ProjectAssessment, RequirementAssessment } from '../../types';

// Mock fs
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('comparison module', () => {
  // Sample assessment data
  const baselineAssessment: ProjectAssessment = {
    projectName: 'Test Project',
    assessmentDate: new Date('2026-01-01'),
    version: 'Feb2026-Aug2026',
    overallStatus: {
      addressed: 10,
      partial: 5,
      gap: 4,
      notApplicable: 1,
      notStarted: 0,
    },
    requirementAssessments: [
      {
        requirement: {
          id: 'OPSP-001',
          name: 'Incident Management',
          category: 'operations',
          description: 'Test requirement',
          priority: 'critical',
          evidenceRequired: ['doc'],
          estimatedHours: 12,
        },
        status: 'gap',
        confidence: 0.5,
        findings: [
          {
            type: 'documentation',
            source: 'test.md',
            summary: 'Missing incident response playbook',
            supportive: false,
            timestamp: new Date('2026-01-01'),
          },
        ],
        evidence: [],
        gaps: ['No incident response playbook'],
        recommendations: ['Create incident response playbook'],
      },
      {
        requirement: {
          id: 'SEC-001',
          name: 'Access Control',
          category: 'security',
          description: 'Test requirement',
          priority: 'high',
          evidenceRequired: ['doc'],
          estimatedHours: 8,
        },
        status: 'partial',
        confidence: 0.7,
        findings: [
          {
            type: 'documentation',
            source: 'test.md',
            summary: 'Partial IAM policies',
            supportive: true,
            timestamp: new Date('2026-01-01'),
          },
        ],
        evidence: [],
        gaps: ['MFA not enforced'],
        recommendations: ['Enable MFA'],
      },
    ] as RequirementAssessment[],
    criticalGaps: [],
    totalEstimatedEffort: 20,
    summary: 'Test baseline',
  };

  const currentAssessment: ProjectAssessment = {
    projectName: 'Test Project',
    assessmentDate: new Date('2026-02-01'),
    version: 'Feb2026-Aug2026',
    overallStatus: {
      addressed: 11,
      partial: 5,
      gap: 3,
      notApplicable: 1,
      notStarted: 0,
    },
    requirementAssessments: [
      {
        requirement: {
          id: 'OPSP-001',
          name: 'Incident Management',
          category: 'operations',
          description: 'Test requirement',
          priority: 'critical',
          evidenceRequired: ['doc'],
          estimatedHours: 12,
        },
        status: 'addressed',
        confidence: 0.9,
        findings: [
          {
            type: 'documentation',
            source: 'test.md',
            summary: 'Missing incident response playbook',
            supportive: false,
            timestamp: new Date('2026-01-01'),
          },
          {
            type: 'documentation',
            source: 'incident-response.md',
            summary: 'Incident response playbook created',
            supportive: true,
            timestamp: new Date('2026-02-01'),
          },
        ],
        evidence: [
          {
            type: 'document',
            path: 'evidence/incident-response.md',
            description: 'Incident response playbook',
            requirementIds: ['OPSP-001'],
            collectedAt: new Date('2026-02-01'),
          },
        ],
        gaps: [],
        recommendations: [],
      },
      {
        requirement: {
          id: 'SEC-001',
          name: 'Access Control',
          category: 'security',
          description: 'Test requirement',
          priority: 'high',
          evidenceRequired: ['doc'],
          estimatedHours: 8,
        },
        status: 'partial',
        confidence: 0.7,
        findings: [
          {
            type: 'documentation',
            source: 'test.md',
            summary: 'Partial IAM policies',
            supportive: true,
            timestamp: new Date('2026-01-01'),
          },
        ],
        evidence: [],
        gaps: ['MFA not enforced'],
        recommendations: ['Enable MFA'],
      },
    ] as RequirementAssessment[],
    criticalGaps: [],
    totalEstimatedEffort: 15,
    summary: 'Test current',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadAssessment', () => {
    it('should load assessment from file', () => {
      const testPath = '/test/assessment.json';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(baselineAssessment));

      const result = loadAssessment(testPath);

      expect(mockFs.existsSync).toHaveBeenCalledWith(testPath);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(testPath, 'utf-8');
      expect(result.projectName).toBe('Test Project');
    });

    it('should throw error if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => loadAssessment('/test/missing.json')).toThrow('Assessment file not found');
    });
  });

  describe('compareAssessments', () => {
    it('should detect improvements', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);

      expect(result.summary.improved).toBe(1);
      expect(result.summary.regressed).toBe(0);
      expect(result.summary.unchanged).toBe(1);

      const opsp001Change = result.changes.find(c => c.requirementId === 'OPSP-001');
      expect(opsp001Change).toBeDefined();
      expect(opsp001Change?.direction).toBe('improved');
      expect(opsp001Change?.baseline.status).toBe('gap');
      expect(opsp001Change?.current.status).toBe('addressed');
    });

    it('should calculate compliance change', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);

      // Baseline: 10/20 = 50%
      // Current: 11/20 = 55%
      expect(result.baseline.compliance).toBe(50);
      expect(result.current.compliance).toBe(55);
      expect(result.summary.complianceChange).toBe(5);
    });

    it('should detect regressions', () => {
      const regressedAssessment = JSON.parse(JSON.stringify(currentAssessment));
      regressedAssessment.requirementAssessments[0].status = 'gap';
      regressedAssessment.overallStatus.addressed = 10;
      regressedAssessment.overallStatus.gap = 4;

      const result = compareAssessments(currentAssessment, regressedAssessment);

      expect(result.summary.regressed).toBeGreaterThan(0);
      expect(result.summary.complianceChange).toBeLessThan(0);
    });

    it('should explain changes with specific reasons', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);

      const opsp001Change = result.changes.find(c => c.requirementId === 'OPSP-001');
      expect(opsp001Change?.reason).toContain("Status changed from 'gap' to 'addressed'");
      expect(opsp001Change?.reason).toContain('Confidence increased');
      expect(opsp001Change?.reason).toContain('new finding');
    });
  });

  describe('filterChanges', () => {
    it('should filter improvements only', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      const improvements = filterChanges(result, 'improvements');

      expect(improvements.length).toBe(1);
      expect(improvements[0].direction).toBe('improved');
    });

    it('should filter regressions only', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      const regressions = filterChanges(result, 'regressions');

      expect(regressions.length).toBe(0);
    });

    it('should filter unchanged only', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      const unchanged = filterChanges(result, 'unchanged');

      expect(unchanged.length).toBe(1);
      expect(unchanged[0].direction).toBe('unchanged');
    });

    it('should return all changes when no filter specified', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      const all = filterChanges(result);

      expect(all.length).toBe(2);
    });
  });

  describe('generateMarkdownReport', () => {
    it('should generate valid markdown', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      const markdown = generateMarkdownReport(result);

      expect(markdown).toContain('# MSP Readiness Assessment Comparison');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('| Metric | Baseline | Current | Change |');
      expect(markdown).toContain('## Improvements');
      expect(markdown).toContain('OPSP-001');
    });

    it('should include regressions section when present', () => {
      const regressedAssessment = JSON.parse(JSON.stringify(currentAssessment));
      regressedAssessment.assessmentDate = new Date(regressedAssessment.assessmentDate);
      regressedAssessment.requirementAssessments[0].status = 'gap';

      const result = compareAssessments(currentAssessment, regressedAssessment);
      const markdown = generateMarkdownReport(result);

      expect(markdown).toContain('## Regressions');
    });

    it('should include unchanged gaps section', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      const markdown = generateMarkdownReport(result);

      expect(markdown).toContain('## Unchanged Gaps');
      expect(markdown).toContain('SEC-001');
    });
  });

  describe('saveComparisonReport', () => {
    it('should save JSON format', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      const outputPath = '/test/comparison';

      const paths = saveComparisonReport(result, outputPath, 'json');

      expect(paths.jsonPath).toBe('/test/comparison.json');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/comparison.json',
        expect.any(String)
      );
    });

    it('should save markdown format', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      const outputPath = '/test/comparison';

      const paths = saveComparisonReport(result, outputPath, 'markdown');

      expect(paths.markdownPath).toBe('/test/comparison.md');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('/test/comparison.md', expect.any(String));
    });

    it('should save both formats', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      const outputPath = '/test/comparison';

      const paths = saveComparisonReport(result, outputPath, 'both');

      expect(paths.jsonPath).toBe('/test/comparison.json');
      expect(paths.markdownPath).toBe('/test/comparison.md');
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('should handle paths with extensions', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);

      const paths = saveComparisonReport(result, '/test/comparison.json', 'json');

      expect(paths.jsonPath).toBe('/test/comparison.json');
    });
  });

  describe('getExitCode', () => {
    it('should return 0 when compliance improved', () => {
      const result = compareAssessments(baselineAssessment, currentAssessment);
      expect(getExitCode(result)).toBe(0);
    });

    it('should return 0 when compliance unchanged', () => {
      const result = compareAssessments(baselineAssessment, baselineAssessment);
      expect(getExitCode(result)).toBe(0);
    });

    it('should return 1 when compliance decreased', () => {
      const regressedAssessment = JSON.parse(JSON.stringify(currentAssessment));
      regressedAssessment.overallStatus.addressed = 9;
      regressedAssessment.overallStatus.gap = 5;

      const result = compareAssessments(currentAssessment, regressedAssessment);
      expect(getExitCode(result)).toBe(1);
    });
  });
});
