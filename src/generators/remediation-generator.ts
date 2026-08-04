/**
 * Remediation Generator - Generates actionable remediation guidance for assessment findings
 */

import { RequirementAssessment, AssessmentFinding, RemediationGuidance } from '../types';
import { getRemediationGuidance, mapGapToRemediationType } from '../data/remediation-guidance';

/**
 * Enhanced assessment finding with remediation
 */
export interface FindingWithRemediation extends AssessmentFinding {
  remediation: RemediationGuidance;
}

/**
 * Remediation report structure
 */
export interface RemediationReport {
  totalFindings: number;
  findingsWithRemediation: number;
  findingsWithoutRemediation: number;
  totalEstimatedEffort: number;
  criticalFindings: FindingWithRemediation[];
  highFindings: FindingWithRemediation[];
  mediumFindings: FindingWithRemediation[];
  lowFindings: FindingWithRemediation[];
  allFindings: FindingWithRemediation[];
}

/**
 * Add remediation guidance to assessment findings
 */
export function enrichFindingsWithRemediation(
  assessments: RequirementAssessment[]
): RequirementAssessment[] {
  return assessments.map(assessment => {
    const enrichedFindings = assessment.findings.map(finding => {
      // Skip findings that are supportive (not gaps)
      if (finding.supportive) {
        return finding;
      }

      // Try to find remediation guidance
      let remediationType: string | undefined;

      // First, try mapping from finding summary
      remediationType = mapGapToRemediationType(finding.summary);

      // If not found, try from finding details
      if (!remediationType && finding.details) {
        remediationType = mapGapToRemediationType(finding.details);
      }

      // If not found, try from gap descriptions
      if (!remediationType) {
        for (const gap of assessment.gaps) {
          remediationType = mapGapToRemediationType(gap);
          if (remediationType) break;
        }
      }

      // Get remediation guidance if type was found
      if (remediationType) {
        const remediation = getRemediationGuidance(remediationType);
        if (remediation) {
          return {
            ...finding,
            remediation,
          };
        }
      }

      return finding;
    });

    return {
      ...assessment,
      findings: enrichedFindings,
    };
  });
}

/**
 * Generate remediation report from assessments
 */
export function generateRemediationReport(assessments: RequirementAssessment[]): RemediationReport {
  const allFindings: FindingWithRemediation[] = [];

  for (const assessment of assessments) {
    for (const finding of assessment.findings) {
      if (!finding.supportive && finding.remediation) {
        allFindings.push(finding as FindingWithRemediation);
      }
    }
  }

  // Categorize by risk level
  const critical = allFindings.filter(f => f.remediation.riskLevel === 'critical');
  const high = allFindings.filter(f => f.remediation.riskLevel === 'high');
  const medium = allFindings.filter(f => f.remediation.riskLevel === 'medium');
  const low = allFindings.filter(f => f.remediation.riskLevel === 'low');

  // Calculate total effort
  const totalEffort = allFindings.reduce(
    (sum, f) => sum + (f.remediation?.estimatedEffort || 0),
    0
  );

  // Count total findings (including those without remediation)
  const totalFindings = assessments.reduce((sum, a) => {
    return sum + a.findings.filter(f => !f.supportive).length;
  }, 0);

  return {
    totalFindings,
    findingsWithRemediation: allFindings.length,
    findingsWithoutRemediation: totalFindings - allFindings.length,
    totalEstimatedEffort: totalEffort,
    criticalFindings: critical,
    highFindings: high,
    mediumFindings: medium,
    lowFindings: low,
    allFindings,
  };
}

/**
 * Generate markdown remediation report
 */
export function generateRemediationMarkdown(report: RemediationReport): string {
  let md = '# Remediation Guidance Report\n\n';

  // Summary
  md += '## Summary\n\n';
  md += `- **Total Findings**: ${report.totalFindings}\n`;
  md += `- **Findings with Remediation Guidance**: ${report.findingsWithRemediation}\n`;
  md += `- **Findings without Remediation**: ${report.findingsWithoutRemediation}\n`;
  md += `- **Total Estimated Effort**: ${report.totalEstimatedEffort} hours\n\n`;

  // Breakdown by severity
  md += '### Findings by Risk Level\n\n';
  md += `- 🔴 **Critical**: ${report.criticalFindings.length} findings\n`;
  md += `- 🟠 **High**: ${report.highFindings.length} findings\n`;
  md += `- 🟡 **Medium**: ${report.mediumFindings.length} findings\n`;
  md += `- 🟢 **Low**: ${report.lowFindings.length} findings\n\n`;

  // Critical findings
  if (report.criticalFindings.length > 0) {
    md += '## 🔴 Critical Priority Remediations\n\n';
    md += 'These findings pose the highest risk and should be addressed immediately.\n\n';

    for (const finding of report.criticalFindings) {
      md += formatFindingRemediation(finding);
    }
  }

  // High findings
  if (report.highFindings.length > 0) {
    md += '## 🟠 High Priority Remediations\n\n';

    for (const finding of report.highFindings) {
      md += formatFindingRemediation(finding);
    }
  }

  // Medium findings
  if (report.mediumFindings.length > 0) {
    md += '## 🟡 Medium Priority Remediations\n\n';

    for (const finding of report.mediumFindings) {
      md += formatFindingRemediation(finding);
    }
  }

  // Low findings
  if (report.lowFindings.length > 0) {
    md += '## 🟢 Low Priority Remediations\n\n';

    for (const finding of report.lowFindings) {
      md += formatFindingRemediation(finding);
    }
  }

  return md;
}

/**
 * Format a single finding with remediation guidance
 */
function formatFindingRemediation(finding: FindingWithRemediation): string {
  const r = finding.remediation;
  let md = `### ${finding.summary}\n\n`;

  md += `**Source**: ${finding.source}\n`;
  md += `**Risk Level**: ${r.riskLevel}\n`;
  md += `**Estimated Effort**: ${r.estimatedEffort} hours\n\n`;

  // Root cause
  md += `#### Root Cause\n\n`;
  md += `${r.rootCause}\n\n`;

  // Impact
  md += `#### Impact\n\n`;
  md += `${r.impact}\n\n`;

  // Prerequisites
  if (r.prerequisites && r.prerequisites.length > 0) {
    md += `#### Prerequisites\n\n`;
    for (const prereq of r.prerequisites) {
      md += `- ${prereq}\n`;
    }
    md += `\n`;
  }

  // Steps
  md += `#### Remediation Steps\n\n`;
  for (const step of r.steps) {
    md += `${step.order}. **${step.action}**\n`;

    if (step.details) {
      md += `   - ${step.details}\n`;
    }

    if (step.command) {
      md += `   \`\`\`bash\n`;
      md += `   ${step.command}\n`;
      md += `   \`\`\`\n`;
    }

    if (step.consoleSteps && step.consoleSteps.length > 0) {
      md += `   - Console steps:\n`;
      for (const consoleStep of step.consoleSteps) {
        md += `     - ${consoleStep}\n`;
      }
    }

    md += `\n`;
  }

  // Validation
  if (r.validation && r.validation.length > 0) {
    md += `#### Validation\n\n`;
    for (const val of r.validation) {
      md += `- ${val}\n`;
    }
    md += `\n`;
  }

  // IaC snippets
  if (r.iacSnippets && r.iacSnippets.length > 0) {
    md += `#### Infrastructure as Code\n\n`;

    for (const snippet of r.iacSnippets) {
      md += `**${snippet.language}**: ${snippet.description}\n\n`;

      if (snippet.filePath) {
        md += `Suggested file: \`${snippet.filePath}\`\n\n`;
      }

      md += `\`\`\`${getLanguageForSyntax(snippet.language)}\n`;
      md += snippet.code;
      md += `\n\`\`\`\n\n`;
    }
  }

  // AWS Documentation
  if (r.awsDocs && r.awsDocs.length > 0) {
    md += `#### AWS Documentation\n\n`;
    for (const doc of r.awsDocs) {
      md += `- [${extractDocTitle(doc)}](${doc})\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;

  return md;
}

/**
 * Get syntax highlighting language for code blocks
 */
function getLanguageForSyntax(iacLanguage: string): string {
  if (iacLanguage.includes('typescript')) return 'typescript';
  if (iacLanguage.includes('python')) return 'python';
  if (iacLanguage.includes('cloudformation')) return 'yaml';
  if (iacLanguage.includes('terraform')) return 'hcl';
  return 'text';
}

/**
 * Extract document title from URL
 */
function extractDocTitle(url: string): string {
  const match = url.match(/\/([^\/]+)\.html$/);
  if (match) {
    return match[1]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return 'AWS Documentation';
}

/**
 * Generate console-friendly remediation summary
 */
export function printRemediationSummary(report: RemediationReport): void {
  console.log('\n📋 Remediation Guidance Summary\n');
  console.log(`Total findings: ${report.totalFindings}`);
  console.log(`  - With remediation guidance: ${report.findingsWithRemediation}`);
  console.log(`  - Without remediation: ${report.findingsWithoutRemediation}`);
  console.log(`\nTotal estimated effort: ${report.totalEstimatedEffort} hours\n`);

  console.log('Findings by priority:');
  console.log(`  🔴 Critical: ${report.criticalFindings.length}`);
  console.log(`  🟠 High: ${report.highFindings.length}`);
  console.log(`  🟡 Medium: ${report.mediumFindings.length}`);
  console.log(`  🟢 Low: ${report.lowFindings.length}\n`);

  if (report.criticalFindings.length > 0) {
    console.log('Critical remediations required:');
    for (const finding of report.criticalFindings.slice(0, 3)) {
      console.log(`  - ${finding.summary} (${finding.remediation.estimatedEffort}h)`);
    }
    if (report.criticalFindings.length > 3) {
      console.log(`  ... and ${report.criticalFindings.length - 3} more`);
    }
    console.log('');
  }
}

/**
 * Generate JSON remediation report
 */
export function generateRemediationJson(report: RemediationReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Save remediation report to file
 */
export function saveRemediationReport(
  report: RemediationReport,
  outputPath: string,
  format: 'markdown' | 'json' | 'both' = 'both'
): { markdownPath?: string; jsonPath?: string } {
  const fs = require('fs');
  const path = require('path');

  const result: { markdownPath?: string; jsonPath?: string } = {};

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const basePath = outputPath.replace(/\.(md|json)$/, '');

  // Save markdown
  if (format === 'markdown' || format === 'both') {
    const markdownPath = `${basePath}-remediation.md`;
    const markdown = generateRemediationMarkdown(report);
    fs.writeFileSync(markdownPath, markdown, 'utf-8');
    result.markdownPath = markdownPath;
    console.log(`✓ Saved remediation report: ${markdownPath}`);
  }

  // Save JSON
  if (format === 'json' || format === 'both') {
    const jsonPath = `${basePath}-remediation.json`;
    const json = generateRemediationJson(report);
    fs.writeFileSync(jsonPath, json, 'utf-8');
    result.jsonPath = jsonPath;
    console.log(`✓ Saved remediation data: ${jsonPath}`);
  }

  return result;
}
