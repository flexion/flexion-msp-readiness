/**
 * History Manager - Store and compare assessment history
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectAssessment, RequirementAssessment } from '../types';

export interface HistoryConfig {
  historyPath: string;
  maxHistoryCount?: number; // Default: 10
}

export interface AssessmentComparison {
  baseline: ProjectAssessment;
  current: ProjectAssessment;
  improved: RequirementAssessment[];
  regressed: RequirementAssessment[];
  unchanged: RequirementAssessment[];
  newRequirements: RequirementAssessment[];
  summary: {
    totalImproved: number;
    totalRegressed: number;
    totalUnchanged: number;
    netChange: number;
    timeSpan: number; // days
  };
}

export interface TrendData {
  assessments: Array<{
    date: Date;
    filename: string;
    summary: {
      addressed: number;
      partial: number;
      gap: number;
      notApplicable: number;
      completionPercent: number;
    };
  }>;
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    averageChangePerWeek: number;
    projectedCompletion?: Date;
  };
}

/**
 * Initialize history directory
 */
export function initializeHistory(historyPath: string): void {
  if (!fs.existsSync(historyPath)) {
    fs.mkdirSync(historyPath, { recursive: true });
  }
}

/**
 * Save assessment to history with timestamp
 */
export function saveAssessmentToHistory(
  assessment: ProjectAssessment,
  historyPath: string
): string {
  initializeHistory(historyPath);

  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const filename = `assessment-${timestamp}.json`;
  const filepath = path.join(historyPath, filename);

  fs.writeFileSync(filepath, JSON.stringify(assessment, null, 2));

  return filepath;
}

/**
 * List all historical assessments
 */
export function listHistoricalAssessments(historyPath: string): string[] {
  if (!fs.existsSync(historyPath)) {
    return [];
  }

  return fs
    .readdirSync(historyPath)
    .filter(f => f.startsWith('assessment-') && f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first
}

/**
 * Load assessment from history
 */
export function loadAssessment(filepath: string): ProjectAssessment {
  const content = fs.readFileSync(filepath, 'utf-8');
  const assessment = JSON.parse(content);

  // Ensure dates are properly deserialized
  assessment.assessmentDate = new Date(assessment.assessmentDate);
  assessment.requirementAssessments.forEach((ra: RequirementAssessment) => {
    ra.findings.forEach(f => {
      f.timestamp = new Date(f.timestamp);
    });
    ra.evidence.forEach(e => {
      e.collectedAt = new Date(e.collectedAt);
      if (e.expiresAt) {
        e.expiresAt = new Date(e.expiresAt);
      }
    });
  });

  return assessment;
}

/**
 * Get most recent assessment
 */
export function getMostRecentAssessment(historyPath: string): ProjectAssessment | null {
  const files = listHistoricalAssessments(historyPath);
  if (files.length === 0) {
    return null;
  }

  return loadAssessment(path.join(historyPath, files[0]));
}

/**
 * Get baseline assessment (oldest)
 */
export function getBaselineAssessment(historyPath: string): ProjectAssessment | null {
  const files = listHistoricalAssessments(historyPath);
  if (files.length === 0) {
    return null;
  }

  return loadAssessment(path.join(historyPath, files[files.length - 1]));
}

/**
 * Compare two assessments
 */
export function compareAssessments(
  baseline: ProjectAssessment,
  current: ProjectAssessment
): AssessmentComparison {
  const improved: RequirementAssessment[] = [];
  const regressed: RequirementAssessment[] = [];
  const unchanged: RequirementAssessment[] = [];
  const newRequirements: RequirementAssessment[] = [];

  // Create map of baseline requirements
  const baselineMap = new Map<string, RequirementAssessment>();
  baseline.requirementAssessments.forEach(ra => {
    baselineMap.set(ra.requirement.id, ra);
  });

  // Compare each current requirement
  current.requirementAssessments.forEach(currentRA => {
    const baselineRA = baselineMap.get(currentRA.requirement.id);

    if (!baselineRA) {
      newRequirements.push(currentRA);
      return;
    }

    const baselineScore = getStatusScore(baselineRA.status);
    const currentScore = getStatusScore(currentRA.status);

    if (currentScore > baselineScore) {
      improved.push(currentRA);
    } else if (currentScore < baselineScore) {
      regressed.push(currentRA);
    } else {
      unchanged.push(currentRA);
    }
  });

  // Calculate time span
  const baselineDate = new Date(baseline.assessmentDate);
  const currentDate = new Date(current.assessmentDate);
  const timeSpanDays = Math.floor(
    (currentDate.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    baseline,
    current,
    improved,
    regressed,
    unchanged,
    newRequirements,
    summary: {
      totalImproved: improved.length,
      totalRegressed: regressed.length,
      totalUnchanged: unchanged.length,
      netChange: improved.length - regressed.length,
      timeSpan: timeSpanDays,
    },
  };
}

/**
 * Analyze trend across all historical assessments
 */
export function analyzeTrend(historyPath: string): TrendData {
  const files = listHistoricalAssessments(historyPath);
  const assessments = files.map(file => {
    const assessment = loadAssessment(path.join(historyPath, file));
    const total =
      assessment.overallStatus.addressed +
      assessment.overallStatus.partial +
      assessment.overallStatus.gap +
      assessment.overallStatus.notApplicable;
    const completionPercent = Math.round((assessment.overallStatus.addressed / total) * 100);

    return {
      date: new Date(assessment.assessmentDate),
      filename: file,
      summary: {
        addressed: assessment.overallStatus.addressed,
        partial: assessment.overallStatus.partial,
        gap: assessment.overallStatus.gap,
        notApplicable: assessment.overallStatus.notApplicable,
        completionPercent,
      },
    };
  });

  // Calculate trend direction
  let direction: 'improving' | 'declining' | 'stable' = 'stable';
  let averageChangePerWeek = 0;
  let projectedCompletion: Date | undefined;

  if (assessments.length >= 2) {
    const oldest = assessments[assessments.length - 1];
    const newest = assessments[0];

    const changeInCompletion =
      newest.summary.completionPercent - oldest.summary.completionPercent;
    const timeSpanDays =
      (newest.date.getTime() - oldest.date.getTime()) / (1000 * 60 * 60 * 24);
    const timeSpanWeeks = timeSpanDays / 7;

    averageChangePerWeek = timeSpanWeeks > 0 ? changeInCompletion / timeSpanWeeks : 0;

    if (averageChangePerWeek > 1) {
      direction = 'improving';
    } else if (averageChangePerWeek < -1) {
      direction = 'declining';
    }

    // Project completion date if improving
    if (direction === 'improving' && newest.summary.completionPercent < 100) {
      const remainingPercent = 100 - newest.summary.completionPercent;
      const weeksToCompletion = remainingPercent / averageChangePerWeek;
      projectedCompletion = new Date(
        newest.date.getTime() + weeksToCompletion * 7 * 24 * 60 * 60 * 1000
      );
    }
  }

  return {
    assessments: assessments.reverse(), // Oldest to newest for chart
    trend: {
      direction,
      averageChangePerWeek,
      projectedCompletion,
    },
  };
}

/**
 * Clean up old assessments, keeping only the most recent N
 */
export function cleanupOldAssessments(historyPath: string, keepCount: number = 10): number {
  const files = listHistoricalAssessments(historyPath);

  if (files.length <= keepCount) {
    return 0;
  }

  const toDelete = files.slice(keepCount);
  let deletedCount = 0;

  toDelete.forEach(file => {
    try {
      fs.unlinkSync(path.join(historyPath, file));
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete ${file}:`, error);
    }
  });

  return deletedCount;
}

/**
 * Export history to CSV
 */
export function exportHistoryToCSV(historyPath: string, outputPath: string): void {
  const files = listHistoricalAssessments(historyPath);
  const rows: string[] = [
    'Date,Addressed,Partial,Gap,Not Applicable,Completion %,Total Effort (hours)',
  ];

  files.reverse().forEach(file => {
    const assessment = loadAssessment(path.join(historyPath, file));
    const total =
      assessment.overallStatus.addressed +
      assessment.overallStatus.partial +
      assessment.overallStatus.gap +
      assessment.overallStatus.notApplicable;
    const completionPercent = Math.round((assessment.overallStatus.addressed / total) * 100);

    rows.push(
      [
        assessment.assessmentDate.toISOString().split('T')[0],
        assessment.overallStatus.addressed,
        assessment.overallStatus.partial,
        assessment.overallStatus.gap,
        assessment.overallStatus.notApplicable,
        completionPercent,
        assessment.totalEstimatedEffort || 0,
      ].join(',')
    );
  });

  fs.writeFileSync(outputPath, rows.join('\n'));
}

/**
 * Export detailed comparison to CSV
 */
export function exportComparisonToCSV(
  comparison: AssessmentComparison,
  outputPath: string
): void {
  const rows: string[] = ['Requirement ID,Name,Category,Baseline Status,Current Status,Change'];

  // Improved requirements
  comparison.improved.forEach(ra => {
    const baselineRA = comparison.baseline.requirementAssessments.find(
      bra => bra.requirement.id === ra.requirement.id
    );
    rows.push(
      [
        ra.requirement.id,
        `"${ra.requirement.name}"`,
        ra.requirement.category,
        baselineRA?.status || 'unknown',
        ra.status,
        'improved',
      ].join(',')
    );
  });

  // Regressed requirements
  comparison.regressed.forEach(ra => {
    const baselineRA = comparison.baseline.requirementAssessments.find(
      bra => bra.requirement.id === ra.requirement.id
    );
    rows.push(
      [
        ra.requirement.id,
        `"${ra.requirement.name}"`,
        ra.requirement.category,
        baselineRA?.status || 'unknown',
        ra.status,
        'regressed',
      ].join(',')
    );
  });

  // Unchanged requirements
  comparison.unchanged.forEach(ra => {
    rows.push(
      [
        ra.requirement.id,
        `"${ra.requirement.name}"`,
        ra.requirement.category,
        ra.status,
        ra.status,
        'unchanged',
      ].join(',')
    );
  });

  fs.writeFileSync(outputPath, rows.join('\n'));
}

/**
 * Helper function to score requirement status
 */
function getStatusScore(status: string): number {
  const scores: Record<string, number> = {
    addressed: 4,
    partial: 3,
    'not-started': 2,
    gap: 1,
    'not-applicable': 0,
  };
  return scores[status] || 0;
}
