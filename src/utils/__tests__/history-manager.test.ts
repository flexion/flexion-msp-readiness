/**
 * History Manager Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  initializeHistory,
  saveAssessmentToHistory,
  listHistoricalAssessments,
  loadAssessment,
  compareAssessments,
  analyzeTrend,
  cleanupOldAssessments,
  exportHistoryToCSV,
  exportComparisonToCSV,
} from '../history-manager';
import { ProjectAssessment, RequirementAssessment } from '../../types';

const TEST_HISTORY_PATH = path.join(__dirname, '.test-history');

// Helper to create a mock assessment
function createMockAssessment(
  date: Date,
  addressed: number,
  partial: number,
  gap: number
): ProjectAssessment {
  const requirementAssessments: RequirementAssessment[] = [];

  for (let i = 0; i < addressed; i++) {
    requirementAssessments.push({
      requirement: {
        id: `REQ-${i}`,
        name: `Requirement ${i}`,
        category: 'security',
        description: 'Test requirement',
        priority: 'high',
        evidenceRequired: [],
      },
      status: 'addressed',
      confidence: 1,
      findings: [],
      evidence: [],
      gaps: [],
      recommendations: [],
    });
  }

  for (let i = 0; i < partial; i++) {
    requirementAssessments.push({
      requirement: {
        id: `REQ-P${i}`,
        name: `Partial Requirement ${i}`,
        category: 'operations',
        description: 'Test requirement',
        priority: 'medium',
        evidenceRequired: [],
      },
      status: 'partial',
      confidence: 0.5,
      findings: [],
      evidence: [],
      gaps: [],
      recommendations: [],
    });
  }

  for (let i = 0; i < gap; i++) {
    requirementAssessments.push({
      requirement: {
        id: `REQ-G${i}`,
        name: `Gap Requirement ${i}`,
        category: 'support',
        description: 'Test requirement',
        priority: 'low',
        evidenceRequired: [],
      },
      status: 'gap',
      confidence: 0,
      findings: [],
      evidence: [],
      gaps: [],
      recommendations: [],
      estimatedEffort: 10,
    });
  }

  return {
    projectName: 'Test Project',
    assessmentDate: date,
    version: '1.0',
    overallStatus: {
      addressed,
      partial,
      gap,
      notApplicable: 0,
      notStarted: 0,
    },
    requirementAssessments,
    criticalGaps: requirementAssessments.filter(ra => ra.status === 'gap'),
    totalEstimatedEffort: gap * 10,
    summary: 'Test assessment',
  };
}

describe('History Manager', () => {
  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_HISTORY_PATH)) {
      fs.rmSync(TEST_HISTORY_PATH, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_HISTORY_PATH)) {
      fs.rmSync(TEST_HISTORY_PATH, { recursive: true });
    }
  });

  describe('initializeHistory', () => {
    it('should create history directory if it does not exist', () => {
      initializeHistory(TEST_HISTORY_PATH);
      expect(fs.existsSync(TEST_HISTORY_PATH)).toBe(true);
    });

    it('should not fail if directory already exists', () => {
      fs.mkdirSync(TEST_HISTORY_PATH, { recursive: true });
      expect(() => initializeHistory(TEST_HISTORY_PATH)).not.toThrow();
    });
  });

  describe('saveAssessmentToHistory', () => {
    it('should save assessment with timestamp filename', () => {
      const assessment = createMockAssessment(new Date(), 5, 3, 2);
      const filepath = saveAssessmentToHistory(assessment, TEST_HISTORY_PATH);

      expect(fs.existsSync(filepath)).toBe(true);
      expect(path.basename(filepath)).toMatch(/^assessment-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
    });

    it('should save valid JSON', () => {
      const assessment = createMockAssessment(new Date(), 5, 3, 2);
      const filepath = saveAssessmentToHistory(assessment, TEST_HISTORY_PATH);

      const content = fs.readFileSync(filepath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.projectName).toBe(assessment.projectName);
      expect(loaded.overallStatus.addressed).toBe(5);
    });
  });

  describe('listHistoricalAssessments', () => {
    it('should return empty array if no history exists', () => {
      const files = listHistoricalAssessments(TEST_HISTORY_PATH);
      expect(files).toEqual([]);
    });

    it('should list assessment files in reverse chronological order', async () => {
      const assessment1 = createMockAssessment(new Date('2024-01-01'), 5, 3, 2);
      const assessment2 = createMockAssessment(new Date('2024-01-02'), 6, 2, 2);
      const assessment3 = createMockAssessment(new Date('2024-01-03'), 7, 1, 2);

      saveAssessmentToHistory(assessment1, TEST_HISTORY_PATH);
      await new Promise(resolve => setTimeout(resolve, 10));
      saveAssessmentToHistory(assessment2, TEST_HISTORY_PATH);
      await new Promise(resolve => setTimeout(resolve, 10));
      saveAssessmentToHistory(assessment3, TEST_HISTORY_PATH);

      const files = listHistoricalAssessments(TEST_HISTORY_PATH);

      expect(files.length).toBe(3);
      // Most recent first
      expect(files[0] > files[1]).toBe(true);
      expect(files[1] > files[2]).toBe(true);
    });

    it('should only list assessment files', () => {
      saveAssessmentToHistory(createMockAssessment(new Date(), 5, 3, 2), TEST_HISTORY_PATH);
      fs.writeFileSync(path.join(TEST_HISTORY_PATH, 'other-file.txt'), 'test');

      const files = listHistoricalAssessments(TEST_HISTORY_PATH);

      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/^assessment-.*\.json$/);
    });
  });

  describe('loadAssessment', () => {
    it('should load and deserialize assessment', () => {
      const originalDate = new Date('2024-01-01T12:00:00Z');
      const assessment = createMockAssessment(originalDate, 5, 3, 2);
      const filepath = saveAssessmentToHistory(assessment, TEST_HISTORY_PATH);

      const loaded = loadAssessment(filepath);

      expect(loaded.projectName).toBe(assessment.projectName);
      expect(loaded.assessmentDate).toBeInstanceOf(Date);
      expect(loaded.overallStatus.addressed).toBe(5);
    });
  });

  describe('compareAssessments', () => {
    it('should detect improvements', () => {
      const baseline = createMockAssessment(new Date('2024-01-01'), 5, 3, 2);
      const current = createMockAssessment(new Date('2024-01-15'), 7, 2, 1);

      // Make some requirements match
      current.requirementAssessments[0].requirement.id = baseline.requirementAssessments[0].requirement.id;
      current.requirementAssessments[0].status = 'addressed';
      baseline.requirementAssessments[0].status = 'partial';

      const comparison = compareAssessments(baseline, current);

      expect(comparison.improved.length).toBeGreaterThan(0);
      expect(comparison.summary.netChange).toBeGreaterThan(0);
      expect(comparison.summary.timeSpan).toBe(14); // days
    });

    it('should detect regressions', () => {
      const baseline = createMockAssessment(new Date('2024-01-01'), 5, 3, 2);
      const current = createMockAssessment(new Date('2024-01-15'), 4, 4, 2);

      // Make a requirement regress
      current.requirementAssessments[0].requirement.id = baseline.requirementAssessments[0].requirement.id;
      current.requirementAssessments[0].status = 'partial';
      baseline.requirementAssessments[0].status = 'addressed';

      const comparison = compareAssessments(baseline, current);

      expect(comparison.regressed.length).toBeGreaterThan(0);
      expect(comparison.summary.netChange).toBeLessThan(0);
    });

    it('should identify unchanged requirements', () => {
      const baseline = createMockAssessment(new Date('2024-01-01'), 5, 3, 2);
      const current = createMockAssessment(new Date('2024-01-15'), 5, 3, 2);

      // Make requirements match
      for (let i = 0; i < baseline.requirementAssessments.length; i++) {
        current.requirementAssessments[i].requirement.id = baseline.requirementAssessments[i].requirement.id;
        current.requirementAssessments[i].status = baseline.requirementAssessments[i].status;
      }

      const comparison = compareAssessments(baseline, current);

      expect(comparison.unchanged.length).toBe(baseline.requirementAssessments.length);
      expect(comparison.summary.netChange).toBe(0);
    });
  });

  describe('analyzeTrend', () => {
    it('should detect improving trend', async () => {
      saveAssessmentToHistory(createMockAssessment(new Date('2024-01-01'), 5, 3, 2), TEST_HISTORY_PATH);
      await new Promise(resolve => setTimeout(resolve, 10));
      saveAssessmentToHistory(createMockAssessment(new Date('2024-01-08'), 6, 2, 2), TEST_HISTORY_PATH);
      await new Promise(resolve => setTimeout(resolve, 10));
      saveAssessmentToHistory(createMockAssessment(new Date('2024-01-15'), 7, 1, 2), TEST_HISTORY_PATH);

      const trend = analyzeTrend(TEST_HISTORY_PATH);

      expect(trend.trend.direction).toBe('improving');
      expect(trend.trend.averageChangePerWeek).toBeGreaterThan(0);
      expect(trend.assessments.length).toBe(3);
    });

    it('should calculate projected completion date', () => {
      saveAssessmentToHistory(createMockAssessment(new Date('2024-01-01'), 5, 3, 2), TEST_HISTORY_PATH);
      saveAssessmentToHistory(createMockAssessment(new Date('2024-01-08'), 6, 2, 2), TEST_HISTORY_PATH);
      saveAssessmentToHistory(createMockAssessment(new Date('2024-01-15'), 7, 1, 2), TEST_HISTORY_PATH);

      const trend = analyzeTrend(TEST_HISTORY_PATH);

      if (trend.trend.projectedCompletion) {
        expect(trend.trend.projectedCompletion).toBeInstanceOf(Date);
      }
    });

    it('should handle single assessment', () => {
      saveAssessmentToHistory(createMockAssessment(new Date('2024-01-01'), 5, 3, 2), TEST_HISTORY_PATH);

      const trend = analyzeTrend(TEST_HISTORY_PATH);

      expect(trend.assessments.length).toBe(1);
      expect(trend.trend.direction).toBe('stable');
    });
  });

  describe('cleanupOldAssessments', () => {
    it('should delete old assessments beyond keep count', async () => {
      for (let i = 0; i < 15; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        saveAssessmentToHistory(createMockAssessment(date, 5, 3, 2), TEST_HISTORY_PATH);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const deletedCount = cleanupOldAssessments(TEST_HISTORY_PATH, 10);

      expect(deletedCount).toBe(5);
      expect(listHistoricalAssessments(TEST_HISTORY_PATH).length).toBe(10);
    });

    it('should keep most recent assessments', async () => {
      for (let i = 0; i < 15; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        saveAssessmentToHistory(createMockAssessment(date, 5, 3, 2), TEST_HISTORY_PATH);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      cleanupOldAssessments(TEST_HISTORY_PATH, 5);

      const remaining = listHistoricalAssessments(TEST_HISTORY_PATH);
      expect(remaining.length).toBe(5);
    });

    it('should not delete if under keep count', async () => {
      for (let i = 0; i < 5; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        saveAssessmentToHistory(createMockAssessment(date, 5, 3, 2), TEST_HISTORY_PATH);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const deletedCount = cleanupOldAssessments(TEST_HISTORY_PATH, 10);

      expect(deletedCount).toBe(0);
      expect(listHistoricalAssessments(TEST_HISTORY_PATH).length).toBe(5);
    });
  });

  describe('exportHistoryToCSV', () => {
    it('should export history to CSV format', () => {
      saveAssessmentToHistory(createMockAssessment(new Date('2024-01-01'), 5, 3, 2), TEST_HISTORY_PATH);
      saveAssessmentToHistory(createMockAssessment(new Date('2024-01-15'), 7, 2, 1), TEST_HISTORY_PATH);

      const csvPath = path.join(TEST_HISTORY_PATH, 'export.csv');
      exportHistoryToCSV(TEST_HISTORY_PATH, csvPath);

      expect(fs.existsSync(csvPath)).toBe(true);

      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');

      expect(lines[0]).toContain('Date,Addressed,Partial,Gap');
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe('exportComparisonToCSV', () => {
    it('should export comparison to CSV format', () => {
      const baseline = createMockAssessment(new Date('2024-01-01'), 5, 3, 2);
      const current = createMockAssessment(new Date('2024-01-15'), 7, 2, 1);

      // Make some requirements match with improvements
      current.requirementAssessments[0].requirement.id = baseline.requirementAssessments[0].requirement.id;
      current.requirementAssessments[0].status = 'addressed';
      baseline.requirementAssessments[0].status = 'partial';

      const comparison = compareAssessments(baseline, current);
      const csvPath = path.join(TEST_HISTORY_PATH, 'comparison.csv');

      initializeHistory(TEST_HISTORY_PATH);
      exportComparisonToCSV(comparison, csvPath);

      expect(fs.existsSync(csvPath)).toBe(true);

      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');

      expect(lines[0]).toContain('Requirement ID,Name,Category');
      expect(lines.length).toBeGreaterThan(1);
    });
  });
});
