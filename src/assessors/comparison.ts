/**
 * MSP Assessment Comparison
 *
 * Compares two assessment runs to show improvements, regressions, and changes.
 */

import * as fs from 'fs';
import chalk from 'chalk';
import { ProjectAssessment, RequirementAssessment, RequirementStatus } from '../types';

/**
 * Status change direction
 */
export type ChangeDirection = 'improved' | 'regressed' | 'unchanged';

/**
 * Represents a change in requirement status between assessments
 */
export interface RequirementChange {
  requirementId: string;
  requirementName: string;
  category: string;
  priority: string;
  baseline: {
    status: RequirementStatus;
    confidence: number;
    findingsCount: number;
  };
  current: {
    status: RequirementStatus;
    confidence: number;
    findingsCount: number;
  };
  direction: ChangeDirection;
  reason: string;
}

/**
 * Comparison result between two assessments
 */
export interface ComparisonResult {
  baseline: {
    assessmentDate: Date;
    projectName: string;
    version: string;
    compliance: number;
  };
  current: {
    assessmentDate: Date;
    projectName: string;
    version: string;
    compliance: number;
  };
  changes: RequirementChange[];
  summary: {
    improved: number;
    regressed: number;
    unchanged: number;
    complianceChange: number; // Percentage points
  };
}

/**
 * Status progression hierarchy for determining improvements/regressions
 */
const STATUS_RANK: Record<RequirementStatus, number> = {
  'not-started': 0,
  gap: 1,
  partial: 2,
  addressed: 3,
  'not-applicable': 3, // Treat as same rank as addressed
};

/**
 * Load assessment from JSON file
 */
export function loadAssessment(filePath: string): ProjectAssessment {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Assessment file not found: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Convert date strings to Date objects
  data.assessmentDate = new Date(data.assessmentDate);

  return data as ProjectAssessment;
}

/**
 * Calculate compliance percentage
 */
function calculateCompliance(assessment: ProjectAssessment): number {
  const total =
    assessment.overallStatus.addressed +
    assessment.overallStatus.partial +
    assessment.overallStatus.gap +
    assessment.overallStatus.notApplicable;

  if (total === 0) return 0;

  return Math.round((assessment.overallStatus.addressed / total) * 100);
}

/**
 * Determine if status changed and in what direction
 */
function determineChange(
  baselineStatus: RequirementStatus,
  currentStatus: RequirementStatus
): ChangeDirection {
  const baselineRank = STATUS_RANK[baselineStatus];
  const currentRank = STATUS_RANK[currentStatus];

  if (currentRank > baselineRank) {
    return 'improved';
  } else if (currentRank < baselineRank) {
    return 'regressed';
  }

  return 'unchanged';
}

/**
 * Generate human-readable reason for status change
 */
function explainChange(baseline: RequirementAssessment, current: RequirementAssessment): string {
  const reasons: string[] = [];

  // Status change
  if (baseline.status !== current.status) {
    reasons.push(`Status changed from '${baseline.status}' to '${current.status}'`);
  }

  // Confidence change
  const confidenceDelta = current.confidence - baseline.confidence;
  if (Math.abs(confidenceDelta) >= 0.1) {
    const direction = confidenceDelta > 0 ? 'increased' : 'decreased';
    reasons.push(`Confidence ${direction} by ${Math.abs(Math.round(confidenceDelta * 100))}%`);
  }

  // Findings change
  const findingsDelta = current.findings.length - baseline.findings.length;
  if (findingsDelta > 0) {
    reasons.push(`${findingsDelta} new finding${findingsDelta > 1 ? 's' : ''} added`);
  } else if (findingsDelta < 0) {
    reasons.push(
      `${Math.abs(findingsDelta)} finding${Math.abs(findingsDelta) > 1 ? 's' : ''} removed`
    );
  }

  // Evidence change
  const evidenceDelta = current.evidence.length - baseline.evidence.length;
  if (evidenceDelta > 0) {
    reasons.push(`${evidenceDelta} new evidence artifact${evidenceDelta > 1 ? 's' : ''}`);
  }

  // Gap analysis
  if (baseline.gaps.length > current.gaps.length) {
    const resolved = baseline.gaps.length - current.gaps.length;
    reasons.push(`${resolved} gap${resolved > 1 ? 's' : ''} resolved`);
  } else if (current.gaps.length > baseline.gaps.length) {
    const added = current.gaps.length - baseline.gaps.length;
    reasons.push(`${added} new gap${added > 1 ? 's' : ''} identified`);
  }

  if (reasons.length === 0) {
    return 'No significant changes detected';
  }

  return reasons.join('; ');
}

/**
 * Compare two assessments
 */
export function compareAssessments(
  baseline: ProjectAssessment,
  current: ProjectAssessment
): ComparisonResult {
  // Build lookup maps
  const baselineMap = new Map<string, RequirementAssessment>();
  for (const req of baseline.requirementAssessments) {
    baselineMap.set(req.requirement.id, req);
  }

  const currentMap = new Map<string, RequirementAssessment>();
  for (const req of current.requirementAssessments) {
    currentMap.set(req.requirement.id, req);
  }

  // Find all requirement IDs (union of both assessments)
  const allRequirementIds = new Set([...baselineMap.keys(), ...currentMap.keys()]);

  // Compare each requirement
  const changes: RequirementChange[] = [];
  let improved = 0;
  let regressed = 0;
  let unchanged = 0;

  for (const reqId of allRequirementIds) {
    const baselineReq = baselineMap.get(reqId);
    const currentReq = currentMap.get(reqId);

    // Skip if requirement only in one assessment
    if (!baselineReq || !currentReq) {
      continue;
    }

    const direction = determineChange(baselineReq.status, currentReq.status);
    const reason = explainChange(baselineReq, currentReq);

    // Count changes
    if (direction === 'improved') improved++;
    else if (direction === 'regressed') regressed++;
    else unchanged++;

    changes.push({
      requirementId: reqId,
      requirementName: currentReq.requirement.name,
      category: currentReq.requirement.category,
      priority: currentReq.requirement.priority,
      baseline: {
        status: baselineReq.status,
        confidence: baselineReq.confidence,
        findingsCount: baselineReq.findings.length,
      },
      current: {
        status: currentReq.status,
        confidence: currentReq.confidence,
        findingsCount: currentReq.findings.length,
      },
      direction,
      reason,
    });
  }

  const baselineCompliance = calculateCompliance(baseline);
  const currentCompliance = calculateCompliance(current);

  return {
    baseline: {
      assessmentDate: baseline.assessmentDate,
      projectName: baseline.projectName,
      version: baseline.version,
      compliance: baselineCompliance,
    },
    current: {
      assessmentDate: current.assessmentDate,
      projectName: current.projectName,
      version: current.version,
      compliance: currentCompliance,
    },
    changes,
    summary: {
      improved,
      regressed,
      unchanged,
      complianceChange: currentCompliance - baselineCompliance,
    },
  };
}

/**
 * Filter changes by direction
 */
export function filterChanges(
  result: ComparisonResult,
  filter?: 'improvements' | 'regressions' | 'unchanged'
): RequirementChange[] {
  if (!filter) {
    return result.changes;
  }

  const directionMap = {
    improvements: 'improved',
    regressions: 'regressed',
    unchanged: 'unchanged',
  };

  const direction = directionMap[filter];
  return result.changes.filter(c => c.direction === direction);
}

/**
 * Print comparison summary to console
 */
export function printComparisonSummary(result: ComparisonResult): void {
  console.log(chalk.bold('\n📊 Assessment Comparison\n'));

  // Baseline info
  console.log(chalk.gray('Baseline:'));
  console.log(`  Date: ${result.baseline.assessmentDate.toISOString()}`);
  console.log(`  Compliance: ${result.baseline.compliance}%`);

  // Current info
  console.log(chalk.gray('\nCurrent:'));
  console.log(`  Date: ${result.current.assessmentDate.toISOString()}`);
  console.log(`  Compliance: ${result.current.compliance}%`);

  // Compliance change
  const complianceIcon =
    result.summary.complianceChange > 0 ? '📈' : result.summary.complianceChange < 0 ? '📉' : '➡️';
  const complianceColor =
    result.summary.complianceChange > 0
      ? chalk.green
      : result.summary.complianceChange < 0
        ? chalk.red
        : chalk.gray;

  console.log(
    chalk.bold(
      `\n${complianceIcon} Compliance Change: ${complianceColor(`${result.summary.complianceChange > 0 ? '+' : ''}${result.summary.complianceChange}%`)}`
    )
  );

  // Summary counts
  console.log(chalk.bold('\n📝 Changes Summary:\n'));
  console.log(chalk.green(`✅ Improved:   ${result.summary.improved} requirements`));
  console.log(chalk.red(`❌ Regressed:  ${result.summary.regressed} requirements`));
  console.log(chalk.gray(`➡️  Unchanged:  ${result.summary.unchanged} requirements`));
  console.log('');
}

/**
 * Print detailed changes to console
 */
export function printDetailedChanges(
  changes: RequirementChange[],
  title: string = 'Detailed Changes'
): void {
  if (changes.length === 0) {
    console.log(chalk.gray(`\nNo ${title.toLowerCase()}\n`));
    return;
  }

  console.log(chalk.bold(`\n${title}\n`));

  for (const change of changes) {
    const icon =
      change.direction === 'improved' ? '📈' : change.direction === 'regressed' ? '📉' : '➡️';
    const color =
      change.direction === 'improved'
        ? chalk.green
        : change.direction === 'regressed'
          ? chalk.red
          : chalk.gray;

    console.log(color(`${icon} ${change.requirementId}: ${change.requirementName}`));
    console.log(`  Status: ${change.baseline.status} → ${change.current.status}`);
    console.log(
      `  Confidence: ${Math.round(change.baseline.confidence * 100)}% → ${Math.round(change.current.confidence * 100)}%`
    );
    console.log(`  Reason: ${change.reason}`);
    console.log('');
  }
}

/**
 * Generate markdown comparison report
 */
export function generateMarkdownReport(result: ComparisonResult): string {
  const lines: string[] = [];

  lines.push('# MSP Readiness Assessment Comparison');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Baseline | Current | Change |');
  lines.push('|--------|----------|---------|--------|');
  lines.push(
    `| **Assessment Date** | ${result.baseline.assessmentDate.toISOString().split('T')[0]} | ${result.current.assessmentDate.toISOString().split('T')[0]} | - |`
  );
  lines.push(
    `| **Compliance %** | ${result.baseline.compliance}% | ${result.current.compliance}% | ${result.summary.complianceChange > 0 ? '+' : ''}${result.summary.complianceChange}% |`
  );
  lines.push('');

  // Changes summary
  lines.push('### Changes Overview');
  lines.push('');
  lines.push(`- ✅ **Improved**: ${result.summary.improved} requirements`);
  lines.push(`- ❌ **Regressed**: ${result.summary.regressed} requirements`);
  lines.push(`- ➡️ **Unchanged**: ${result.summary.unchanged} requirements`);
  lines.push('');

  // Improvements
  const improvements = filterChanges(result, 'improvements');
  if (improvements.length > 0) {
    lines.push('## Improvements');
    lines.push('');
    lines.push('| Requirement | Status Change | Confidence | Reason |');
    lines.push('|-------------|---------------|------------|--------|');

    for (const change of improvements) {
      lines.push(
        `| **${change.requirementId}**: ${change.requirementName} | ${change.baseline.status} → ${change.current.status} | ${Math.round(change.baseline.confidence * 100)}% → ${Math.round(change.current.confidence * 100)}% | ${change.reason} |`
      );
    }
    lines.push('');
  }

  // Regressions
  const regressions = filterChanges(result, 'regressions');
  if (regressions.length > 0) {
    lines.push('## Regressions');
    lines.push('');
    lines.push('| Requirement | Status Change | Confidence | Reason |');
    lines.push('|-------------|---------------|------------|--------|');

    for (const change of regressions) {
      lines.push(
        `| **${change.requirementId}**: ${change.requirementName} | ${change.baseline.status} → ${change.current.status} | ${Math.round(change.baseline.confidence * 100)}% → ${Math.round(change.current.confidence * 100)}% | ${change.reason} |`
      );
    }
    lines.push('');
  }

  // Unchanged gaps
  const unchangedGaps = result.changes.filter(
    c =>
      c.direction === 'unchanged' && (c.current.status === 'gap' || c.current.status === 'partial')
  );

  if (unchangedGaps.length > 0) {
    lines.push('## Unchanged Gaps');
    lines.push('');
    lines.push('Requirements still needing attention:');
    lines.push('');
    lines.push('| Requirement | Status | Priority | Findings |');
    lines.push('|-------------|--------|----------|----------|');

    for (const change of unchangedGaps) {
      lines.push(
        `| **${change.requirementId}**: ${change.requirementName} | ${change.current.status} | ${change.priority} | ${change.current.findingsCount} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Save comparison report to file
 */
export function saveComparisonReport(
  result: ComparisonResult,
  outputPath: string,
  format: 'json' | 'markdown' | 'both' = 'both'
): { jsonPath?: string; markdownPath?: string } {
  const paths: { jsonPath?: string; markdownPath?: string } = {};

  if (format === 'json' || format === 'both') {
    const jsonPath = outputPath.endsWith('.json') ? outputPath : `${outputPath}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    paths.jsonPath = jsonPath;
  }

  if (format === 'markdown' || format === 'both') {
    const mdPath = outputPath.endsWith('.md') ? outputPath : `${outputPath}.md`;
    const markdown = generateMarkdownReport(result);
    fs.writeFileSync(mdPath, markdown);
    paths.markdownPath = mdPath;
  }

  return paths;
}

/**
 * Determine exit code based on compliance change
 * Returns 1 if compliance decreased, 0 otherwise (for CI/CD integration)
 */
export function getExitCode(result: ComparisonResult): number {
  return result.summary.complianceChange < 0 ? 1 : 0;
}
