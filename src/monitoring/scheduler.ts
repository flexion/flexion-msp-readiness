/**
 * Scheduled assessment runner
 */

import * as fs from 'fs';
import * as path from 'path';
import { Config, ProjectAssessment, AssessmentHistory } from '../types';
import { detectDrift, loadBaseline, saveBaseline } from './drift-detector';
import { sendDriftNotifications } from './notifier';
import { publishAssessmentMetrics, publishDriftMetrics } from './cloudwatch-publisher';

/**
 * Run scheduled assessment with drift detection
 */
export async function runScheduledAssessment(
  assessment: ProjectAssessment,
  config: Config
): Promise<void> {
  console.log('\n🔍 Running scheduled assessment...\n');

  // Store historical assessment
  if (config.monitoring?.store_history) {
    storeHistoricalAssessment(assessment, config);
  }

  // Publish metrics to CloudWatch
  if (config.notifications?.cloudwatch?.enabled) {
    try {
      await publishAssessmentMetrics(assessment, config, config.aws.region, config.aws.profile);
    } catch (error) {
      console.error('  Warning: Failed to publish metrics to CloudWatch:', error);
    }
  }

  // Detect drift if baseline exists
  const baselinePath = config.monitoring?.baseline_path || './baseline-assessment.json';

  if (fs.existsSync(baselinePath)) {
    try {
      console.log('  Loading baseline assessment...');
      const baseline = loadBaseline(baselinePath);

      console.log('  Detecting drift...');
      const driftResult = detectDrift(assessment, baseline);

      console.log(`  ✓ Drift detection complete (${driftResult.summary.totalDrifts} drifts)\n`);

      // Publish drift metrics
      if (config.notifications?.cloudwatch?.enabled) {
        await publishDriftMetrics(driftResult, config, config.aws.region, config.aws.profile);
      }

      // Send notifications if thresholds met
      if (config.notifications) {
        await sendDriftNotifications(driftResult, config);
      }

      // Save drift report
      const driftReportPath = path.join(config.output.evidence_path, `drift-${Date.now()}.json`);
      saveDriftReport(driftResult, driftReportPath);
      console.log(`  ✓ Drift report saved: ${driftReportPath}\n`);
    } catch (error) {
      console.error('  Warning: Drift detection failed:', error);
      console.log('  Continuing without drift detection\n');
    }
  } else {
    console.log('  No baseline found - saving current assessment as baseline');
    saveBaseline(assessment, baselinePath);
    console.log(`  ✓ Baseline saved: ${baselinePath}\n`);
  }
}

/**
 * Store historical assessment
 */
function storeHistoricalAssessment(assessment: ProjectAssessment, config: Config): void {
  const historyPath = config.monitoring?.history_path || './history';

  if (!fs.existsSync(historyPath)) {
    fs.mkdirSync(historyPath, { recursive: true });
  }

  // Save full assessment
  const timestamp = Date.now();
  const assessmentPath = path.join(historyPath, `assessment-${timestamp}.json`);
  fs.writeFileSync(assessmentPath, JSON.stringify(assessment, null, 2));

  // Update history index
  const indexPath = path.join(historyPath, 'index.json');
  let history: AssessmentHistory[] = [];

  if (fs.existsSync(indexPath)) {
    history = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }

  const total =
    assessment.overallStatus.addressed +
    assessment.overallStatus.partial +
    assessment.overallStatus.gap;
  const complianceScore = total > 0 ? (assessment.overallStatus.addressed / total) * 100 : 0;

  history.push({
    timestamp: assessment.assessmentDate,
    assessmentPath,
    summary: {
      addressed: assessment.overallStatus.addressed,
      partial: assessment.overallStatus.partial,
      gap: assessment.overallStatus.gap,
      notApplicable: assessment.overallStatus.notApplicable,
      totalEffort: assessment.totalEstimatedEffort,
      complianceScore,
    },
  });

  // Keep last 100 assessments
  if (history.length > 100) {
    const removed = history.shift();
    if (removed && fs.existsSync(removed.assessmentPath)) {
      fs.unlinkSync(removed.assessmentPath);
    }
  }

  fs.writeFileSync(indexPath, JSON.stringify(history, null, 2));
  console.log(`  ✓ Assessment stored in history (${history.length} total)`);
}

/**
 * Save drift report
 */
function saveDriftReport(driftResult: any, reportPath: string): void {
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(driftResult, null, 2));
}

/**
 * Load assessment history
 */
export function loadHistory(config: Config): AssessmentHistory[] {
  const historyPath = config.monitoring?.history_path || './history';
  const indexPath = path.join(historyPath, 'index.json');

  if (!fs.existsSync(indexPath)) {
    return [];
  }

  const history = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as AssessmentHistory[];

  // Restore Date objects
  for (const entry of history) {
    entry.timestamp = new Date(entry.timestamp);
  }

  return history;
}

/**
 * Get compliance trend (last N assessments)
 */
export function getComplianceTrend(config: Config, limit = 30): AssessmentHistory[] {
  const history = loadHistory(config);
  return history.slice(-limit);
}
