/**
 * Drift detection - compare current assessment against baseline
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ProjectAssessment,
  DriftDetectionResult,
  Drift,
  DriftSummary,
  RequirementAssessment,
} from '../types';

/**
 * Compare current assessment against baseline and detect drifts
 */
export function detectDrift(
  currentAssessment: ProjectAssessment,
  baselineAssessment: ProjectAssessment
): DriftDetectionResult {
  const drifts: Drift[] = [];

  // Build requirement maps for easy lookup
  const currentReqs = new Map(
    currentAssessment.requirementAssessments.map(r => [r.requirement.id, r])
  );
  const baselineReqs = new Map(
    baselineAssessment.requirementAssessments.map(r => [r.requirement.id, r])
  );

  // Check for status changes and new gaps
  for (const [reqId, currentReq] of currentReqs) {
    const baselineReq = baselineReqs.get(reqId);

    if (!baselineReq) {
      // New requirement - not a drift
      continue;
    }

    // Status change detection
    if (currentReq.status !== baselineReq.status) {
      drifts.push(createStatusChangeDrift(reqId, currentReq, baselineReq));
    }

    // New gap detection (requirement went from addressed/partial to gap)
    if (
      baselineReq.status !== 'gap' &&
      currentReq.status === 'gap' &&
      currentReq.requirement.priority === 'critical'
    ) {
      drifts.push({
        requirementId: reqId,
        requirementName: currentReq.requirement.name,
        type: 'new_gap',
        severity: 'critical',
        previousValue: baselineReq.status,
        currentValue: currentReq.status,
        description: `Critical requirement ${reqId} now has a gap`,
        impact: 'This may affect MSP readiness certification',
      });
    }

    // Check for new findings
    if (currentReq.findings.length > baselineReq.findings.length) {
      const newFindings = currentReq.findings.length - baselineReq.findings.length;
      const hasUnsupportiveFindings = currentReq.findings.some(f => !f.supportive);

      if (hasUnsupportiveFindings) {
        drifts.push({
          requirementId: reqId,
          requirementName: currentReq.requirement.name,
          type: 'new_finding',
          severity: currentReq.requirement.priority === 'critical' ? 'high' : 'medium',
          description: `${newFindings} new finding(s) for ${reqId}`,
          impact: 'Additional evidence or remediation may be required',
        });
      }
    }

    // Check for compliance improvement (gap -> partial/addressed)
    if (
      baselineReq.status === 'gap' &&
      (currentReq.status === 'partial' || currentReq.status === 'addressed')
    ) {
      drifts.push({
        requirementId: reqId,
        requirementName: currentReq.requirement.name,
        type: 'compliance_improve',
        severity: 'info',
        previousValue: baselineReq.status,
        currentValue: currentReq.status,
        description: `${reqId} compliance improved from ${baselineReq.status} to ${currentReq.status}`,
        impact: 'Positive change - compliance improved',
      });
    }
  }

  // Calculate overall compliance change
  const baselineCompliance = calculateComplianceScore(baselineAssessment);
  const currentCompliance = calculateComplianceScore(currentAssessment);
  const complianceChange = currentCompliance - baselineCompliance;

  if (complianceChange < -5) {
    // Significant drop
    drifts.push({
      requirementId: 'OVERALL',
      requirementName: 'Overall Compliance',
      type: 'compliance_drop',
      severity: 'critical',
      previousValue: `${baselineCompliance.toFixed(1)}%`,
      currentValue: `${currentCompliance.toFixed(1)}%`,
      description: `Overall compliance dropped by ${Math.abs(complianceChange).toFixed(1)}%`,
      impact: 'Immediate attention required to restore compliance levels',
    });
  }

  const summary = createDriftSummary(drifts, complianceChange);

  return {
    timestamp: new Date(),
    baselineDate: baselineAssessment.assessmentDate,
    currentAssessment,
    baselineAssessment,
    drifts,
    summary,
  };
}

/**
 * Create drift for status change
 */
function createStatusChangeDrift(
  reqId: string,
  current: RequirementAssessment,
  baseline: RequirementAssessment
): Drift {
  const isRegression =
    (baseline.status === 'addressed' && current.status !== 'addressed') ||
    (baseline.status === 'partial' && current.status === 'gap');

  const severity = isRegression
    ? current.requirement.priority === 'critical'
      ? 'high'
      : 'medium'
    : 'low';

  return {
    requirementId: reqId,
    requirementName: current.requirement.name,
    type: 'status_change',
    severity,
    previousValue: baseline.status,
    currentValue: current.status,
    description: `${reqId} status changed from ${baseline.status} to ${current.status}`,
    impact: isRegression ? 'Compliance regression detected' : 'Status changed',
  };
}

/**
 * Calculate compliance score (percentage)
 */
function calculateComplianceScore(assessment: ProjectAssessment): number {
  const total =
    assessment.overallStatus.addressed +
    assessment.overallStatus.partial +
    assessment.overallStatus.gap;

  if (total === 0) return 0;

  return (assessment.overallStatus.addressed / total) * 100;
}

/**
 * Create drift summary
 */
function createDriftSummary(drifts: Drift[], complianceChange: number): DriftSummary {
  const byCriticality: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const drift of drifts) {
    byCriticality[drift.severity] = (byCriticality[drift.severity] || 0) + 1;
    byType[drift.type] = (byType[drift.type] || 0) + 1;
  }

  const newGaps = drifts.filter(d => d.type === 'new_gap').length;
  const resolvedGaps = drifts.filter(
    d => d.type === 'compliance_improve' && d.previousValue === 'gap'
  ).length;
  const newCriticalFindings = drifts.filter(
    d => d.type === 'new_finding' && d.severity === 'critical'
  ).length;

  return {
    totalDrifts: drifts.length,
    byCriticality,
    byType,
    complianceChange,
    newGaps,
    resolvedGaps,
    newCriticalFindings,
  };
}

/**
 * Load baseline assessment from file
 */
export function loadBaseline(baselinePath: string): ProjectAssessment {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline file not found: ${baselinePath}`);
  }

  const content = fs.readFileSync(baselinePath, 'utf-8');
  const assessment = JSON.parse(content) as ProjectAssessment;

  // Restore Date objects
  assessment.assessmentDate = new Date(assessment.assessmentDate);
  for (const req of assessment.requirementAssessments) {
    for (const finding of req.findings) {
      finding.timestamp = new Date(finding.timestamp);
    }
    for (const evidence of req.evidence) {
      evidence.collectedAt = new Date(evidence.collectedAt);
      if (evidence.expiresAt) {
        evidence.expiresAt = new Date(evidence.expiresAt);
      }
    }
  }

  return assessment;
}

/**
 * Save assessment as baseline
 */
export function saveBaseline(assessment: ProjectAssessment, baselinePath: string): void {
  const dir = path.dirname(baselinePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(baselinePath, JSON.stringify(assessment, null, 2));
}

/**
 * Print drift detection results
 */
export function printDriftSummary(result: DriftDetectionResult): void {
  console.log(`\n  Baseline:  ${result.baselineDate.toISOString()}`);
  console.log(`  Current:   ${result.timestamp.toISOString()}`);
  console.log(`  Total Drifts: ${result.summary.totalDrifts}`);

  if (result.summary.complianceChange !== 0) {
    const sign = result.summary.complianceChange > 0 ? '+' : '';
    console.log(`  Compliance Change: ${sign}${result.summary.complianceChange.toFixed(1)}%`);
  }

  if (result.summary.newGaps > 0) {
    console.log(`  New Gaps: ${result.summary.newGaps}`);
  }

  if (result.summary.resolvedGaps > 0) {
    console.log(`  Resolved Gaps: ${result.summary.resolvedGaps}`);
  }

  if (result.summary.newCriticalFindings > 0) {
    console.log(`  New Critical Findings: ${result.summary.newCriticalFindings}`);
  }
}
