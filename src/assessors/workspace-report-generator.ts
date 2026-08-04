/**
 * Workspace Report Generator
 *
 * Generate assessment reports for workspace completeness
 */

import * as fs from 'fs';
import { WorkspaceAssessment } from './workspace-assessor';

/**
 * Generate markdown report for workspace assessment
 */
export function generateWorkspaceReport(
  assessment: WorkspaceAssessment,
  projectName: string,
  mspVersion: string
): string {
  const { requirements, summary } = assessment;
  const lines: string[] = [];

  // Header
  lines.push('# MSP Workspace Assessment Report');
  lines.push('');
  lines.push(`**Project**: ${projectName}`);
  lines.push(`**Date**: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`**MSP Version**: ${mspVersion}`);
  lines.push(`**Assessment Mode**: Workspace`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(
    `Overall completion: ${summary.completionPercentage}% (${summary.complete}/${summary.total} requirements fully complete).`
  );
  lines.push(`${summary.inProgress} requirements in progress, ${summary.notStarted} not started.`);
  lines.push('');

  // Overall Status
  lines.push('## Overall Status');
  lines.push('');
  lines.push(`- ✅ **Complete**: ${summary.complete} requirements`);
  lines.push(`- 🚧 **In Progress**: ${summary.inProgress} requirements`);
  lines.push(`- ❌ **Not Started**: ${summary.notStarted} requirements`);
  lines.push('');

  // Complete Requirements
  const complete = requirements.filter(r => r.overallStatus === 'complete');
  if (complete.length > 0) {
    lines.push('## Complete Requirements');
    lines.push('');
    for (const req of complete) {
      lines.push(`### ✅ ${req.requirement.id}: ${req.requirement.name}`);
      lines.push('');
      lines.push(`**Status**: complete (${req.completionPercentage}%)`);
      lines.push(`**Priority**: ${req.requirement.priority}`);
      lines.push(`**Category**: ${req.requirement.category}`);
      lines.push(`**Automation**: ${req.automationType} (${req.automationCoverage}% coverage)`);
      lines.push('');
      lines.push(`**Description**: ${req.requirement.description}`);
      lines.push('');
      lines.push('**Completion Details**:');
      lines.push(`- ✓ Playbook: ${req.playbookPath} (status: ${req.playbookStatus})`);
      lines.push(`- ✓ Evidence: ${req.evidencePaths.length} file(s)`);
      for (const path of req.evidencePaths) {
        lines.push(`  - ${path}`);
      }
      if (req.documentQuality) {
        lines.push(`- ✓ Document Quality: ${req.documentQuality.score}/100`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  // In Progress Requirements
  const inProgress = requirements.filter(r => r.overallStatus === 'in-progress');
  if (inProgress.length > 0) {
    lines.push('## In Progress Requirements');
    lines.push('');
    for (const req of inProgress) {
      lines.push(`### 🚧 ${req.requirement.id}: ${req.requirement.name}`);
      lines.push('');
      lines.push(`**Status**: in-progress (${req.completionPercentage}%)`);
      lines.push(`**Priority**: ${req.requirement.priority}`);
      lines.push(`**Category**: ${req.requirement.category}`);
      lines.push(`**Automation**: ${req.automationType} (${req.automationCoverage}% coverage)`);
      lines.push('');
      lines.push(`**Description**: ${req.requirement.description}`);
      lines.push('');
      lines.push('**Completion Details**:');
      if (req.hasPlaybook) {
        lines.push(`- ✓ Playbook: ${req.playbookPath} (status: ${req.playbookStatus})`);
      } else {
        lines.push(`- ✗ Playbook: Not generated`);
        if (req.templateAvailable) {
          lines.push('  - Template available for generation');
        }
      }
      if (req.hasEvidence) {
        lines.push(`- ✓ Evidence: ${req.evidencePaths.length} file(s)`);
        for (const path of req.evidencePaths) {
          lines.push(`  - ${path}`);
        }
      } else {
        lines.push(`- ✗ Evidence: Missing`);
      }
      if (req.documentQuality) {
        lines.push(`- 📄 Document Quality: ${req.documentQuality.score}/100`);
        if (req.documentQuality.issues.length > 0) {
          lines.push(`  - Issues: ${req.documentQuality.issues.join(', ')}`);
        }
      }
      lines.push('');
      lines.push('**Next Steps**:');
      if (!req.hasPlaybook) {
        lines.push('- Generate playbook: `msp-readiness generate`');
      }
      if (!req.hasEvidence) {
        lines.push('- Collect evidence: `msp-readiness collect-evidence`');
      }
      if (req.manualStepsRequired.length > 0) {
        lines.push('- **Manual steps required**:');
        for (const step of req.manualStepsRequired) {
          lines.push(`  - ${step}`);
        }
      }
      if (req.hasPlaybook && req.hasEvidence && req.playbookStatus !== 'approved') {
        lines.push(`- Approve playbook: \`msp-readiness approve ${req.requirement.id}\``);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  // Not Started Requirements
  const notStarted = requirements.filter(r => r.overallStatus === 'not-started');
  if (notStarted.length > 0) {
    lines.push('## Not Started Requirements');
    lines.push('');
    for (const req of notStarted) {
      lines.push(`### ❌ ${req.requirement.id}: ${req.requirement.name}`);
      lines.push('');
      lines.push(`**Priority**: ${req.requirement.priority}`);
      lines.push(`**Category**: ${req.requirement.category}`);
      lines.push(`**Automation**: ${req.automationType} (${req.automationCoverage}% coverage)`);
      lines.push('');
      lines.push(`**Description**: ${req.requirement.description}`);
      lines.push('');
      lines.push('**Next Steps**:');
      if (req.automationType === 'full') {
        lines.push('- Automated evidence collection available: `msp-readiness collect-evidence`');
      } else if (req.automationType === 'manual') {
        lines.push('- Manual documentation required');
        if (req.templateAvailable) {
          lines.push('- Template available: `msp-readiness generate`');
        }
      } else {
        lines.push('- Mixed: automated + manual steps required');
        lines.push('- Generate playbook: `msp-readiness generate`');
        lines.push('- Collect evidence: `msp-readiness collect-evidence`');
      }
      if (req.manualStepsRequired.length > 0 && req.manualStepsRequired.length <= 3) {
        lines.push('- **Manual steps**:');
        for (const step of req.manualStepsRequired) {
          lines.push(`  - ${step}`);
        }
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  // Next Steps Summary
  lines.push('## Next Steps Summary');
  lines.push('');
  const needPlaybooks = requirements.filter(r => !r.hasPlaybook).length;
  const needEvidence = requirements.filter(r => r.hasPlaybook && !r.hasEvidence).length;
  const needApproval = requirements.filter(
    r => r.hasPlaybook && r.hasEvidence && (!r.playbookStatus || r.playbookStatus === 'draft')
  ).length;

  if (needPlaybooks > 0) {
    lines.push(`1. **Generate ${needPlaybooks} missing playbook(s)**: \`msp-readiness generate\``);
  }
  if (needEvidence > 0) {
    lines.push(
      `2. **Collect evidence for ${needEvidence} requirement(s)**: \`msp-readiness collect-evidence\``
    );
  }
  if (needApproval > 0) {
    const ids = requirements
      .filter(
        r => r.hasPlaybook && r.hasEvidence && (!r.playbookStatus || r.playbookStatus === 'draft')
      )
      .map(r => r.requirement.id)
      .join(',');
    lines.push(`3. **Approve ${needApproval} playbook(s)**: \`msp-readiness approve ${ids}\``);
  }

  if (needPlaybooks === 0 && needEvidence === 0 && needApproval === 0) {
    lines.push('🎉 All requirements are complete! Workspace is audit-ready.');
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Save workspace report to files
 */
export function saveWorkspaceReport(
  assessment: WorkspaceAssessment,
  projectName: string,
  mspVersion: string,
  outputPath: string,
  format: 'markdown' | 'json' | 'both' = 'both'
): { markdownPath?: string; jsonPath?: string } {
  const result: { markdownPath?: string; jsonPath?: string } = {};

  // Generate markdown
  if (format === 'markdown' || format === 'both') {
    const markdown = generateWorkspaceReport(assessment, projectName, mspVersion);
    const markdownPath = `${outputPath}.md`;
    fs.writeFileSync(markdownPath, markdown, 'utf-8');
    result.markdownPath = markdownPath;
  }

  // Generate JSON
  if (format === 'json' || format === 'both') {
    const json = {
      metadata: {
        project: projectName,
        date: new Date().toISOString().split('T')[0],
        mspVersion,
        assessmentMode: 'workspace',
      },
      summary: assessment.summary,
      requirements: assessment.requirements.map(r => ({
        id: r.requirement.id,
        name: r.requirement.name,
        category: r.requirement.category,
        priority: r.requirement.priority,
        description: r.requirement.description,
        status: r.overallStatus,
        completionPercentage: r.completionPercentage,
        hasPlaybook: r.hasPlaybook,
        playbookPath: r.playbookPath,
        playbookStatus: r.playbookStatus,
        hasEvidence: r.hasEvidence,
        evidencePaths: r.evidencePaths,
        automationType: r.automationType,
        automationCoverage: r.automationCoverage,
        manualStepsRequired: r.manualStepsRequired,
        templateAvailable: r.templateAvailable,
        documentQuality: r.documentQuality,
        validated: r.validated,
      })),
    };
    const jsonPath = `${outputPath}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf-8');
    result.jsonPath = jsonPath;
  }

  return result;
}
