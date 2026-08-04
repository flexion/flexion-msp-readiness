/**
 * Assessment report generator - creates markdown and JSON reports
 */

import * as fs from 'fs';
import * as path from 'path';
import { RequirementAssessment, ProjectAssessment } from '../types';
import { calculateSummary, getCriticalGaps } from './requirement-matcher';
import {
  enrichFindingsWithRemediation,
  generateRemediationReport,
  saveRemediationReport,
} from '../generators/remediation-generator';

/**
 * Generate project assessment from requirement assessments
 */
export function generateProjectAssessment(
  projectName: string,
  requirementAssessments: RequirementAssessment[],
  mspVersion: string,
  includeRemediation: boolean = true
): ProjectAssessment {
  // Enrich findings with remediation guidance if requested
  let enrichedAssessments = requirementAssessments;
  if (includeRemediation) {
    enrichedAssessments = enrichFindingsWithRemediation(requirementAssessments);
  }

  const summary = calculateSummary(enrichedAssessments);
  const criticalGaps = getCriticalGaps(enrichedAssessments);

  const assessment: ProjectAssessment = {
    projectName,
    assessmentDate: new Date(),
    version: mspVersion,
    overallStatus: summary,
    requirementAssessments: enrichedAssessments,
    criticalGaps,
    totalEstimatedEffort: summary.totalEffort,
    summary: generateSummaryText(summary, criticalGaps.length),
  };

  return assessment;
}

/**
 * Generate summary text
 */
function generateSummaryText(
  summary: ReturnType<typeof calculateSummary>,
  criticalGapCount: number
): string {
  const total =
    summary.addressed + summary.partial + summary.gap + summary.notApplicable + summary.notStarted;
  const completionPercent = Math.round((summary.addressed / total) * 100);

  let text = `Overall completion: ${completionPercent}% (${summary.addressed}/${total} requirements fully addressed).\n`;
  text += `${summary.partial} requirements partially implemented, ${summary.gap} gaps identified.\n`;

  if (criticalGapCount > 0) {
    text += `${criticalGapCount} critical/high-priority gaps require immediate attention.\n`;
  }

  text += `Estimated effort to complete: ${summary.totalEffort} hours.`;

  return text;
}

/**
 * Generate markdown report
 */
export function generateMarkdownReport(assessment: ProjectAssessment): string {
  let md = `# MSP Readiness Assessment Report\n\n`;
  md += `**Project**: ${assessment.projectName}\n`;
  md += `**Date**: ${assessment.assessmentDate.toISOString().split('T')[0]}\n`;
  md += `**MSP Version**: ${assessment.version}\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += assessment.summary + '\n\n';

  // Overall status
  md += `## Overall Status\n\n`;
  md += `- ✅ **Addressed**: ${assessment.overallStatus.addressed} requirements\n`;
  md += `- ⚠️ **Partial**: ${assessment.overallStatus.partial} requirements\n`;
  md += `- ❌ **Gap**: ${assessment.overallStatus.gap} requirements\n`;
  md += `- ⬜ **Not Applicable**: ${assessment.overallStatus.notApplicable} requirements\n`;

  if (assessment.overallStatus.notStarted > 0) {
    md += `- 🔲 **Not Started**: ${assessment.overallStatus.notStarted} requirements\n`;
  }
  md += `\n`;

  // Critical gaps
  if (assessment.criticalGaps.length > 0) {
    md += `## Critical Gaps\n\n`;
    md += `The following ${assessment.criticalGaps.length} critical/high-priority requirements need immediate attention:\n\n`;

    for (const gap of assessment.criticalGaps) {
      const icon = gap.status === 'gap' ? '🔴' : '🟡';
      md += `### ${icon} ${gap.requirement.id}: ${gap.requirement.name}\n\n`;
      md += `**Priority**: ${gap.requirement.priority}\n`;
      md += `**Status**: ${gap.status}\n`;
      md += `**Estimated Effort**: ${gap.estimatedEffort || 0} hours\n\n`;
      md += `**Description**: ${gap.requirement.description}\n\n`;

      if (gap.gaps.length > 0) {
        md += `**Gaps**:\n`;
        for (const gapItem of gap.gaps) {
          md += `- ${gapItem}\n`;
        }
        md += `\n`;
      }

      if (gap.recommendations.length > 0) {
        md += `**Recommendations**:\n`;
        for (const rec of gap.recommendations) {
          md += `- ${rec}\n`;
        }
        md += `\n`;
      }

      md += `---\n\n`;
    }
  }

  // Requirements by category
  const categories = ['security', 'operations', 'support'] as const;

  for (const category of categories) {
    const categoryReqs = assessment.requirementAssessments.filter(
      a => a.requirement.category === category
    );

    if (categoryReqs.length === 0) continue;

    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Requirements\n\n`;

    const categoryAddressed = categoryReqs.filter(a => a.status === 'addressed').length;
    const categoryTotal = categoryReqs.filter(a => a.status !== 'not-applicable').length;
    const categoryPercent =
      categoryTotal > 0 ? Math.round((categoryAddressed / categoryTotal) * 100) : 0;

    md += `**Completion**: ${categoryPercent}% (${categoryAddressed}/${categoryTotal})\n\n`;

    // Group by status
    const addressed = categoryReqs.filter(a => a.status === 'addressed');
    const partial = categoryReqs.filter(a => a.status === 'partial');
    const gaps = categoryReqs.filter(a => a.status === 'gap' || a.status === 'not-started');

    if (addressed.length > 0) {
      md += `### ✅ Addressed (${addressed.length})\n\n`;
      for (const req of addressed) {
        md += `- **${req.requirement.id}**: ${req.requirement.name}\n`;
      }
      md += `\n`;
    }

    if (partial.length > 0) {
      md += `### ⚠️ Partial (${partial.length})\n\n`;
      for (const req of partial) {
        md += `- **${req.requirement.id}**: ${req.requirement.name} (${req.estimatedEffort || 0}h to complete)\n`;
        if (req.gaps.length > 0) {
          md += `  - Gaps: ${req.gaps.join(', ')}\n`;
        }
      }
      md += `\n`;
    }

    if (gaps.length > 0) {
      md += `### ❌ Gaps (${gaps.length})\n\n`;
      for (const req of gaps) {
        md += `- **${req.requirement.id}**: ${req.requirement.name} (${req.estimatedEffort || 0}h)\n`;
        if (req.recommendations.length > 0) {
          md += `  - Recommendations: ${req.recommendations.slice(0, 2).join('; ')}\n`;
        }
      }
      md += `\n`;
    }
  }

  // Next actions
  md += `## Next Actions\n\n`;
  md += `Prioritized list of recommended next steps:\n\n`;

  const prioritizedGaps = assessment.criticalGaps.slice(0, 10);
  for (let i = 0; i < prioritizedGaps.length; i++) {
    const gap = prioritizedGaps[i];
    md += `${i + 1}. **${gap.requirement.id}**: ${gap.requirement.name} (${gap.estimatedEffort || 0}h)\n`;
    if (gap.recommendations.length > 0) {
      md += `   - ${gap.recommendations[0]}\n`;
    }
  }

  if (prioritizedGaps.length === 0) {
    md += `No critical gaps identified. Review partial implementations for completion opportunities.\n`;
  }

  md += `\n`;

  // Appendix: All requirements detail
  md += `## Appendix: All Requirements Detail\n\n`;

  for (const reqAssessment of assessment.requirementAssessments) {
    const icon =
      reqAssessment.status === 'addressed'
        ? '✅'
        : reqAssessment.status === 'partial'
          ? '⚠️'
          : reqAssessment.status === 'not-applicable'
            ? '⬜'
            : '❌';

    md += `### ${icon} ${reqAssessment.requirement.id}: ${reqAssessment.requirement.name}\n\n`;
    md += `**Status**: ${reqAssessment.status} (confidence: ${Math.round(reqAssessment.confidence * 100)}%)\n`;
    md += `**Priority**: ${reqAssessment.requirement.priority}\n`;
    md += `**Category**: ${reqAssessment.requirement.category}\n`;

    if (reqAssessment.estimatedEffort && reqAssessment.estimatedEffort > 0) {
      md += `**Estimated Effort**: ${reqAssessment.estimatedEffort} hours\n`;
    }

    md += `\n**Description**: ${reqAssessment.requirement.description}\n\n`;

    if (reqAssessment.findings.length > 0) {
      md += `**Findings** (${reqAssessment.findings.length}):\n`;
      for (const finding of reqAssessment.findings.slice(0, 3)) {
        md += `- ${finding.summary}\n`;
      }
      if (reqAssessment.findings.length > 3) {
        md += `- _(${reqAssessment.findings.length - 3} more findings)_\n`;
      }
      md += `\n`;
    }

    if (reqAssessment.gaps.length > 0) {
      md += `**Gaps**:\n`;
      for (const gap of reqAssessment.gaps) {
        md += `- ${gap}\n`;
      }
      md += `\n`;
    }

    if (reqAssessment.recommendations.length > 0) {
      md += `**Recommendations**:\n`;
      for (const rec of reqAssessment.recommendations) {
        md += `- ${rec}\n`;
      }
      md += `\n`;
    }

    // Add remediation guidance preview for gap findings
    const gapFindingsWithRemediation = reqAssessment.findings.filter(
      f => !f.supportive && f.remediation
    );

    if (gapFindingsWithRemediation.length > 0) {
      md += `**Remediation Available**: ${gapFindingsWithRemediation.length} finding(s) with detailed remediation guidance\n`;
      md += `See remediation report for step-by-step fixes, IaC code, and AWS documentation links.\n\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

/**
 * Save report to file
 */
export async function saveReport(
  assessment: ProjectAssessment,
  outputPath: string,
  format: 'markdown' | 'json' | 'both' = 'both',
  includeRemediationReport: boolean = true
): Promise<{ markdownPath?: string; jsonPath?: string; remediationPath?: string }> {
  const result: { markdownPath?: string; jsonPath?: string; remediationPath?: string } = {};

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const basePath = outputPath.replace(/\.(md|json)$/, '');

  // Save markdown
  if (format === 'markdown' || format === 'both') {
    const markdownPath = `${basePath}.md`;
    const markdown = generateMarkdownReport(assessment);
    fs.writeFileSync(markdownPath, markdown, 'utf-8');
    result.markdownPath = markdownPath;
  }

  // Save JSON
  if (format === 'json' || format === 'both') {
    const jsonPath = `${basePath}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(assessment, null, 2), 'utf-8');
    result.jsonPath = jsonPath;
  }

  // Generate and save remediation report
  if (includeRemediationReport) {
    const remediationReport = generateRemediationReport(assessment.requirementAssessments);
    const remediationFiles = saveRemediationReport(remediationReport, basePath, format);
    result.remediationPath = remediationFiles.markdownPath || remediationFiles.jsonPath;
  }

  return result;
}
