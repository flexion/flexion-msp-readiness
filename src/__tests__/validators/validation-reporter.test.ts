/**
 * Tests for Validation Reporter
 */

import {
  generateValidationReport,
  formatReportAsMarkdown,
  formatReportAsJSON,
  formatReportAsHTML,
} from '../../validators/validation-reporter';
import { ValidationResult, ValidationCheck, ValidationIssue } from '../../types';

describe('Validation Reporter', () => {
  const createMockValidationResult = (
    requirementId: string,
    passed: boolean,
    score: number
  ): ValidationResult => {
    const checks: ValidationCheck[] = [
      {
        name: 'Test check 1',
        passed: true,
        expected: 'value',
        actual: 'value',
        severity: 'high',
      },
      {
        name: 'Test check 2',
        passed,
        expected: 'expected',
        actual: passed ? 'expected' : 'actual',
        severity: passed ? 'low' : 'critical',
      },
    ];

    const issues: ValidationIssue[] = passed
      ? []
      : [
          {
            type: 'incomplete',
            severity: 'error',
            message: 'Test issue',
            recommendation: 'Fix the issue',
            affectedRequirements: [requirementId],
          },
        ];

    return {
      requirementId,
      passed,
      checks,
      summary: passed ? 'All checks passed' : 'Some checks failed',
      validatedAt: new Date(),
      score,
      issues,
      recommendations: passed ? [] : ['Test recommendation'],
    };
  };

  describe('generateValidationReport', () => {
    it('should generate report for passing results', () => {
      const results = [
        createMockValidationResult('SEC-001', true, 100),
        createMockValidationResult('SEC-002', true, 100),
      ];

      const report = generateValidationReport(results);

      expect(report.overallScore).toBe(100);
      expect(report.totalChecks).toBe(4);
      expect(report.passedChecks).toBe(4);
      expect(report.failedChecks).toBe(0);
      expect(report.bySeverity.critical.length).toBe(0);
    });

    it('should generate report for failing results', () => {
      const results = [
        createMockValidationResult('SEC-001', false, 50),
        createMockValidationResult('SEC-002', true, 100),
      ];

      const report = generateValidationReport(results);

      expect(report.overallScore).toBe(75); // Average of 50 and 100
      expect(report.totalChecks).toBe(4);
      expect(report.passedChecks).toBe(3);
      expect(report.failedChecks).toBe(1);
      expect(report.bySeverity.critical.length).toBeGreaterThan(0);
    });

    it('should calculate correct overall score', () => {
      const results = [
        createMockValidationResult('SEC-001', false, 60),
        createMockValidationResult('SEC-002', false, 80),
        createMockValidationResult('SEC-003', true, 100),
      ];

      const report = generateValidationReport(results);

      expect(report.overallScore).toBeCloseTo(80, 0); // (60 + 80 + 100) / 3
    });

    it('should group issues by severity', () => {
      const results = [
        createMockValidationResult('SEC-001', false, 50),
        createMockValidationResult('SEC-002', false, 60),
      ];

      const report = generateValidationReport(results);

      expect(report.bySeverity.critical.length).toBeGreaterThan(0);
      expect(report.bySeverity.high.length + report.bySeverity.critical.length).toBe(2);
    });

    it('should populate requirement map', () => {
      const results = [
        createMockValidationResult('SEC-001', true, 100),
        createMockValidationResult('SEC-002', false, 50),
      ];

      const report = generateValidationReport(results);

      expect(report.byRequirement.size).toBe(2);
      expect(report.byRequirement.get('SEC-001')?.passed).toBe(true);
      expect(report.byRequirement.get('SEC-002')?.passed).toBe(false);
    });

    it('should generate recommendations', () => {
      const results = [
        createMockValidationResult('SEC-001', false, 50),
        createMockValidationResult('SEC-002', false, 60),
      ];

      const report = generateValidationReport(results);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('SEC-001'))).toBe(true);
    });

    it('should include timestamp', () => {
      const results = [createMockValidationResult('SEC-001', true, 100)];

      const report = generateValidationReport(results);

      expect(report.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('formatReportAsMarkdown', () => {
    it('should format report as markdown', () => {
      const results = [
        createMockValidationResult('SEC-001', false, 50),
        createMockValidationResult('SEC-002', true, 100),
      ];

      const report = generateValidationReport(results);
      const markdown = formatReportAsMarkdown(report);

      expect(markdown).toContain('# Evidence Validation Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('SEC-001');
      expect(markdown).toContain('SEC-002');
    });

    it('should include critical issues section', () => {
      const results = [createMockValidationResult('SEC-001', false, 30)];

      const report = generateValidationReport(results);
      const markdown = formatReportAsMarkdown(report);

      if (report.bySeverity.critical.length > 0) {
        expect(markdown).toContain('### Critical Issues');
      }
    });

    it('should include recommendations', () => {
      const results = [createMockValidationResult('SEC-001', false, 50)];

      const report = generateValidationReport(results);
      const markdown = formatReportAsMarkdown(report);

      expect(markdown).toContain('## Recommendations');
    });

    it('should show validation results by requirement', () => {
      const results = [
        createMockValidationResult('SEC-001', false, 50),
        createMockValidationResult('SEC-002', true, 100),
      ];

      const report = generateValidationReport(results);
      const markdown = formatReportAsMarkdown(report);

      expect(markdown).toContain('## Validation Results by Requirement');
      expect(markdown).toContain('### SEC-001');
      expect(markdown).toContain('### SEC-002');
    });
  });

  describe('formatReportAsJSON', () => {
    it('should format report as JSON', () => {
      const results = [
        createMockValidationResult('SEC-001', true, 100),
        createMockValidationResult('SEC-002', false, 50),
      ];

      const report = generateValidationReport(results);
      const json = formatReportAsJSON(report);

      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.overallScore).toBe(report.overallScore);
      expect(parsed.totalChecks).toBe(report.totalChecks);
    });

    it('should serialize all report data', () => {
      const results = [createMockValidationResult('SEC-001', false, 50)];

      const report = generateValidationReport(results);
      const json = formatReportAsJSON(report);
      const parsed = JSON.parse(json);

      expect(parsed.byRequirement['SEC-001']).toBeDefined();
      expect(parsed.bySeverity).toBeDefined();
      expect(parsed.recommendations).toBeDefined();
    });
  });

  describe('formatReportAsHTML', () => {
    it('should format report as HTML', () => {
      const results = [
        createMockValidationResult('SEC-001', false, 50),
        createMockValidationResult('SEC-002', true, 100),
      ];

      const report = generateValidationReport(results);
      const html = formatReportAsHTML(report);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('Evidence Validation Report');
      expect(html).toContain('SEC-001');
      expect(html).toContain('SEC-002');
    });

    it('should include score display', () => {
      const results = [createMockValidationResult('SEC-001', true, 100)];

      const report = generateValidationReport(results);
      const html = formatReportAsHTML(report);

      expect(html).toContain('class="score"');
      expect(html).toContain('100');
    });

    it('should include CSS styling', () => {
      const results = [createMockValidationResult('SEC-001', true, 100)];

      const report = generateValidationReport(results);
      const html = formatReportAsHTML(report);

      expect(html).toContain('<style>');
      expect(html).toContain('font-family');
    });

    it('should display issues with severity colors', () => {
      const results = [createMockValidationResult('SEC-001', false, 30)];

      const report = generateValidationReport(results);
      const html = formatReportAsHTML(report);

      if (report.bySeverity.critical.length > 0) {
        expect(html).toContain('class="issue critical"');
      }
    });

    it('should include results table', () => {
      const results = [
        createMockValidationResult('SEC-001', false, 50),
        createMockValidationResult('SEC-002', true, 100),
      ];

      const report = generateValidationReport(results);
      const html = formatReportAsHTML(report);

      expect(html).toContain('<table>');
      expect(html).toContain('<thead>');
      expect(html).toContain('<tbody>');
    });
  });
});
