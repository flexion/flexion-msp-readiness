/**
 * Validation Reporter
 * Formats and generates validation reports
 */

import {
  ValidationResult,
  ValidationReport,
  ValidationIssue,
  ValidationCheck,
  RequirementAssessment,
} from '../types';
import { CrossValidationResult } from '../types';

/**
 * Generate a comprehensive validation report
 */
export function generateValidationReport(
  results: ValidationResult[],
  crossValidation?: CrossValidationResult
): ValidationReport {
  const timestamp = new Date();

  // Calculate overall statistics
  const totalChecks = results.reduce((sum, r) => sum + r.checks.length, 0);
  const passedChecks = results.reduce(
    (sum, r) => sum + r.checks.filter(c => c.passed).length,
    0
  );
  const failedChecks = totalChecks - passedChecks;

  // Calculate overall score (average of all requirement scores)
  const scoresWithValues = results.filter(r => r.score !== undefined);
  const overallScore =
    scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, r) => sum + (r.score || 0), 0) /
        scoresWithValues.length
      : 0;

  // Group issues by severity
  const bySeverity = groupIssuesBySeverity(results, crossValidation);

  // Build requirement map
  const byRequirement = new Map<string, ValidationResult>();
  results.forEach(result => {
    byRequirement.set(result.requirementId, result);
  });

  // Generate recommendations
  const recommendations = generateRecommendations(results, crossValidation);

  // Generate summary
  const summary = generateReportSummary(
    overallScore,
    totalChecks,
    passedChecks,
    failedChecks,
    bySeverity
  );

  return {
    timestamp,
    overallScore,
    totalChecks,
    passedChecks,
    failedChecks,
    byRequirement,
    bySeverity,
    recommendations,
    summary,
  };
}

/**
 * Group issues by severity
 */
function groupIssuesBySeverity(
  results: ValidationResult[],
  crossValidation?: CrossValidationResult
): {
  critical: ValidationIssue[];
  high: ValidationIssue[];
  medium: ValidationIssue[];
  low: ValidationIssue[];
} {
  const grouped = {
    critical: [] as ValidationIssue[],
    high: [] as ValidationIssue[],
    medium: [] as ValidationIssue[],
    low: [] as ValidationIssue[],
  };

  // Collect issues from validation results
  results.forEach(result => {
    result.issues?.forEach(issue => {
      if (issue.severity === 'error') {
        // Map error severity to check severity
        const check = result.checks.find(c => !c.passed);
        if (check?.severity === 'critical') {
          grouped.critical.push(issue);
        } else {
          grouped.high.push(issue);
        }
      } else {
        grouped.medium.push(issue);
      }
    });
  });

  // Add cross-validation issues
  if (crossValidation) {
    crossValidation.conflicts.forEach(issue => {
      if (issue.severity === 'error') {
        grouped.high.push(issue);
      } else {
        grouped.medium.push(issue);
      }
    });

    crossValidation.missingReferences.forEach(issue => {
      grouped.medium.push(issue);
    });

    crossValidation.versionMismatches.forEach(issue => {
      grouped.low.push(issue);
    });
  }

  return grouped;
}

/**
 * Generate prioritized recommendations
 */
function generateRecommendations(
  results: ValidationResult[],
  crossValidation?: CrossValidationResult
): string[] {
  const recommendations = new Set<string>();

  // Critical issues first
  results.forEach(result => {
    const criticalIssues =
      result.issues?.filter(i => i.severity === 'error') || [];
    criticalIssues.forEach(issue => {
      recommendations.add(`[${result.requirementId}] ${issue.recommendation}`);
    });
  });

  // Add requirement-specific recommendations
  results.forEach(result => {
    result.recommendations?.forEach(rec => {
      recommendations.add(`[${result.requirementId}] ${rec}`);
    });
  });

  // Add cross-validation recommendations
  if (crossValidation) {
    crossValidation.conflicts.forEach(conflict => {
      if (conflict.severity === 'error') {
        recommendations.add(`[Cross] ${conflict.recommendation}`);
      }
    });
  }

  // Add high-priority issues
  results.forEach(result => {
    const highIssues =
      result.issues?.filter(i => i.severity === 'warning') || [];
    highIssues.slice(0, 3).forEach(issue => {
      // Limit to top 3 per requirement
      recommendations.add(`[${result.requirementId}] ${issue.recommendation}`);
    });
  });

  return Array.from(recommendations);
}

/**
 * Generate report summary text
 */
function generateReportSummary(
  overallScore: number,
  totalChecks: number,
  passedChecks: number,
  failedChecks: number,
  bySeverity: {
    critical: ValidationIssue[];
    high: ValidationIssue[];
    medium: ValidationIssue[];
    low: ValidationIssue[];
  }
): string {
  const lines: string[] = [];

  // Overall status
  const passRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

  lines.push(
    `Validation Score: ${overallScore.toFixed(1)}/100 (${passRate.toFixed(1)}% checks passed)`
  );

  // Check results
  lines.push(`Total Checks: ${totalChecks} (${passedChecks} passed, ${failedChecks} failed)`);

  // Issues by severity
  const criticalCount = bySeverity.critical.length;
  const highCount = bySeverity.high.length;
  const mediumCount = bySeverity.medium.length;
  const lowCount = bySeverity.low.length;

  if (criticalCount > 0) {
    lines.push(`Critical Issues: ${criticalCount} - IMMEDIATE ACTION REQUIRED`);
  }

  if (highCount > 0) {
    lines.push(`High Priority Issues: ${highCount} - Address soon`);
  }

  if (mediumCount > 0) {
    lines.push(`Medium Priority Issues: ${mediumCount} - Plan for remediation`);
  }

  if (lowCount > 0) {
    lines.push(`Low Priority Issues: ${lowCount} - Informational`);
  }

  // Overall assessment
  if (criticalCount === 0 && highCount === 0) {
    lines.push('\nAssessment: GOOD - No critical or high priority issues found');
  } else if (criticalCount > 0) {
    lines.push(
      '\nAssessment: CRITICAL - Immediate action required to address critical issues'
    );
  } else if (highCount > 5) {
    lines.push(
      '\nAssessment: NEEDS IMPROVEMENT - Multiple high priority issues require attention'
    );
  } else {
    lines.push('\nAssessment: FAIR - Address high priority issues to improve compliance');
  }

  return lines.join('\n');
}

/**
 * Format validation report as markdown
 */
export function formatReportAsMarkdown(report: ValidationReport): string {
  const lines: string[] = [];

  // Header
  lines.push('# Evidence Validation Report');
  lines.push('');
  lines.push(`Generated: ${report.timestamp.toISOString()}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('```');
  lines.push(report.summary);
  lines.push('```');
  lines.push('');

  // Issues by severity
  lines.push('## Issues by Severity');
  lines.push('');

  if (report.bySeverity.critical.length > 0) {
    lines.push('### Critical Issues');
    lines.push('');
    report.bySeverity.critical.forEach((issue, i) => {
      lines.push(`${i + 1}. **${issue.message}**`);
      lines.push(`   - Type: ${issue.type}`);
      lines.push(`   - Affected: ${issue.affectedRequirements.join(', ')}`);
      lines.push(`   - Recommendation: ${issue.recommendation}`);
      if (issue.location) {
        lines.push(`   - Location: \`${issue.location}\``);
      }
      lines.push('');
    });
  }

  if (report.bySeverity.high.length > 0) {
    lines.push('### High Priority Issues');
    lines.push('');
    report.bySeverity.high.forEach((issue, i) => {
      lines.push(`${i + 1}. **${issue.message}**`);
      lines.push(`   - Recommendation: ${issue.recommendation}`);
      lines.push('');
    });
  }

  if (report.bySeverity.medium.length > 0) {
    lines.push('### Medium Priority Issues');
    lines.push('');
    lines.push(
      `Found ${report.bySeverity.medium.length} medium priority issues. See detailed results below.`
    );
    lines.push('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    report.recommendations.slice(0, 10).forEach((rec, i) => {
      lines.push(`${i + 1}. ${rec}`);
    });

    if (report.recommendations.length > 10) {
      lines.push('');
      lines.push(`... and ${report.recommendations.length - 10} more recommendations`);
    }
    lines.push('');
  }

  // Detailed results by requirement
  lines.push('## Validation Results by Requirement');
  lines.push('');

  report.byRequirement.forEach((result, reqId) => {
    lines.push(`### ${reqId}`);
    lines.push('');
    lines.push(`**Status**: ${result.passed ? 'PASSED' : 'FAILED'}`);
    if (result.score !== undefined) {
      lines.push(`**Score**: ${result.score}/100`);
    }
    lines.push(`**Summary**: ${result.summary}`);
    lines.push('');

    // Show failed checks
    const failedChecks = result.checks.filter(c => !c.passed);
    if (failedChecks.length > 0) {
      lines.push('**Failed Checks**:');
      failedChecks.forEach(check => {
        lines.push(
          `- ${check.name}: Expected "${check.expected}", got "${check.actual}"`
        );
        if (check.message) {
          lines.push(`  - ${check.message}`);
        }
      });
      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Format validation report as JSON
 */
export function formatReportAsJSON(report: ValidationReport): string {
  // Convert Map to object for JSON serialization
  const byRequirementObj: Record<string, ValidationResult> = {};
  report.byRequirement.forEach((value, key) => {
    byRequirementObj[key] = value;
  });

  const jsonReport = {
    ...report,
    byRequirement: byRequirementObj,
  };

  return JSON.stringify(jsonReport, null, 2);
}

/**
 * Format validation report as HTML
 */
export function formatReportAsHTML(report: ValidationReport): string {
  const html: string[] = [];

  html.push('<!DOCTYPE html>');
  html.push('<html>');
  html.push('<head>');
  html.push('<meta charset="UTF-8">');
  html.push('<title>Evidence Validation Report</title>');
  html.push('<style>');
  html.push(`
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; }
    h2 { color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 32px; }
    h3 { color: #555; }
    .score { font-size: 48px; font-weight: bold; color: #0066cc; }
    .summary { background: #f5f5f5; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; }
    .issue { margin: 12px 0; padding: 12px; border-left: 4px solid #ccc; background: #f9f9f9; }
    .issue.critical { border-color: #d32f2f; background: #ffebee; }
    .issue.high { border-color: #f57c00; background: #fff3e0; }
    .issue.medium { border-color: #fbc02d; background: #fffde7; }
    .recommendation { margin: 8px 0; padding: 8px 12px; background: #e3f2fd; border-left: 3px solid #2196f3; }
    .passed { color: #2e7d32; font-weight: bold; }
    .failed { color: #d32f2f; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
  `);
  html.push('</style>');
  html.push('</head>');
  html.push('<body>');

  // Header
  html.push('<h1>Evidence Validation Report</h1>');
  html.push(
    `<p><strong>Generated:</strong> ${report.timestamp.toLocaleString()}</p>`
  );

  // Score
  html.push('<div style="text-align: center; margin: 32px 0;">');
  html.push(`<div class="score">${report.overallScore.toFixed(1)}/100</div>`);
  html.push(
    `<p>${report.passedChecks}/${report.totalChecks} checks passed</p>`
  );
  html.push('</div>');

  // Summary
  html.push('<h2>Summary</h2>');
  html.push(`<div class="summary">${report.summary}</div>`);

  // Critical issues
  if (report.bySeverity.critical.length > 0) {
    html.push('<h2>Critical Issues</h2>');
    report.bySeverity.critical.forEach(issue => {
      html.push('<div class="issue critical">');
      html.push(`<strong>${issue.message}</strong>`);
      html.push(`<p><strong>Recommendation:</strong> ${issue.recommendation}</p>`);
      html.push(
        `<p><small>Affected: ${issue.affectedRequirements.join(', ')}</small></p>`
      );
      html.push('</div>');
    });
  }

  // High priority issues
  if (report.bySeverity.high.length > 0) {
    html.push('<h2>High Priority Issues</h2>');
    report.bySeverity.high.forEach(issue => {
      html.push('<div class="issue high">');
      html.push(`<strong>${issue.message}</strong>`);
      html.push(`<p>${issue.recommendation}</p>`);
      html.push('</div>');
    });
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    html.push('<h2>Top Recommendations</h2>');
    report.recommendations.slice(0, 10).forEach(rec => {
      html.push(`<div class="recommendation">${rec}</div>`);
    });
  }

  // Results table
  html.push('<h2>Results by Requirement</h2>');
  html.push('<table>');
  html.push(
    '<thead><tr><th>Requirement</th><th>Status</th><th>Score</th><th>Summary</th></tr></thead>'
  );
  html.push('<tbody>');

  report.byRequirement.forEach((result, reqId) => {
    html.push('<tr>');
    html.push(`<td>${reqId}</td>`);
    html.push(
      `<td class="${result.passed ? 'passed' : 'failed'}">${result.passed ? 'PASSED' : 'FAILED'}</td>`
    );
    html.push(`<td>${result.score !== undefined ? result.score : 'N/A'}</td>`);
    html.push(`<td>${result.summary}</td>`);
    html.push('</tr>');
  });

  html.push('</tbody>');
  html.push('</table>');

  html.push('</body>');
  html.push('</html>');

  return html.join('\n');
}
