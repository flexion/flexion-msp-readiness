/**
 * Workspace Dashboard Generator
 *
 * Generate a text-based dashboard showing workspace completeness
 */

import { WorkspaceAssessment } from '../assessors/workspace-assessor';
import { Config } from '../types';

export function generateWorkspaceDashboard(
  assessment: WorkspaceAssessment,
  config: Config
): string {
  const { requirements, summary } = assessment;
  const lines: string[] = [];

  // Header
  lines.push('# MSP Workspace Dashboard');
  lines.push('');
  lines.push(`**Project**: ${config.project.name}`);
  lines.push(`**Generated**: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`**MSP Version**: ${config.msp.version}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Overall Status
  lines.push('## Overall Status');
  lines.push('');
  lines.push(
    `**Completion**: ${summary.completionPercentage}% (${summary.complete}/${summary.total})`
  );
  lines.push('');
  lines.push('| Status | Count | Percentage |');
  lines.push('|--------|-------|------------|');
  lines.push(
    `| ✅ Complete | ${summary.complete} | ${Math.round((summary.complete / summary.total) * 100)}% |`
  );
  lines.push(
    `| 🚧 In Progress | ${summary.inProgress} | ${Math.round((summary.inProgress / summary.total) * 100)}% |`
  );
  lines.push(
    `| ❌ Not Started | ${summary.notStarted} | ${Math.round((summary.notStarted / summary.total) * 100)}% |`
  );
  lines.push('');

  // Progress bar
  const progressBarLength = 50;
  const completeChars = Math.round((summary.complete / summary.total) * progressBarLength);
  const inProgressChars = Math.round((summary.inProgress / summary.total) * progressBarLength);
  const notStartedChars = progressBarLength - completeChars - inProgressChars;

  lines.push('```');
  lines.push(
    '█'.repeat(completeChars) +
      '▓'.repeat(inProgressChars) +
      '░'.repeat(Math.max(0, notStartedChars))
  );
  lines.push('```');
  lines.push('');

  // Complete Requirements
  const complete = requirements.filter(r => r.overallStatus === 'complete');
  if (complete.length > 0) {
    lines.push('## ✅ Complete Requirements');
    lines.push('');
    lines.push('| ID | Name | Playbook Status | Evidence |');
    lines.push('|----|------|-----------------|----------|');
    for (const req of complete) {
      lines.push(
        `| ${req.requirement.id} | ${req.requirement.name} | ${req.playbookStatus} | ${req.evidencePaths.length} file(s) |`
      );
    }
    lines.push('');
  }

  // In Progress Requirements
  const inProgress = requirements.filter(r => r.overallStatus === 'in-progress');
  if (inProgress.length > 0) {
    lines.push('## 🚧 In Progress Requirements');
    lines.push('');
    lines.push('| ID | Name | Completion | Playbook | Evidence |');
    lines.push('|----|------|------------|----------|----------|');
    for (const req of inProgress) {
      const playbookStatus = req.hasPlaybook ? `✓ ${req.playbookStatus || 'draft'}` : '✗ Missing';
      const evidenceStatus = req.hasEvidence
        ? `✓ ${req.evidencePaths.length} file(s)`
        : '✗ Missing';
      lines.push(
        `| ${req.requirement.id} | ${req.requirement.name} | ${req.completionPercentage}% | ${playbookStatus} | ${evidenceStatus} |`
      );
    }
    lines.push('');
  }

  // Not Started Requirements
  const notStarted = requirements.filter(r => r.overallStatus === 'not-started');
  if (notStarted.length > 0) {
    lines.push('## ❌ Not Started Requirements');
    lines.push('');
    lines.push('| ID | Name | Priority |');
    lines.push('|----|------|----------|');
    for (const req of notStarted) {
      lines.push(
        `| ${req.requirement.id} | ${req.requirement.name} | ${req.requirement.priority} |`
      );
    }
    lines.push('');
  }

  // Next Steps
  lines.push('## Next Steps');
  lines.push('');

  if (notStarted.length > 0) {
    lines.push(`1. **Generate missing playbooks**: \`msp-readiness generate\``);
  }

  const needEvidence = requirements.filter(r => r.hasPlaybook && !r.hasEvidence);
  if (needEvidence.length > 0) {
    lines.push(
      `2. **Collect evidence for ${needEvidence.length} requirements**: \`msp-readiness collect-evidence\``
    );
  }

  const needApproval = requirements.filter(
    r =>
      r.hasPlaybook &&
      r.hasEvidence &&
      (!r.playbookStatus || r.playbookStatus === 'draft' || r.playbookStatus === 'in-progress')
  );
  if (needApproval.length > 0) {
    const ids = needApproval.map(r => r.requirement.id).join(',');
    lines.push(`3. **Approve ${needApproval.length} playbooks**: \`msp-readiness approve ${ids}\``);
  }

  lines.push('');

  // Categories Breakdown
  lines.push('## By Category');
  lines.push('');

  const byCategory: Record<string, typeof requirements> = {
    security: [],
    operations: [],
    support: [],
  };

  for (const req of requirements) {
    byCategory[req.requirement.category].push(req);
  }

  for (const [category, reqs] of Object.entries(byCategory)) {
    if (reqs.length === 0) continue;

    const catComplete = reqs.filter(r => r.overallStatus === 'complete').length;
    const catPercent = Math.round((catComplete / reqs.length) * 100);

    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    lines.push('');
    lines.push(`**Completion**: ${catPercent}% (${catComplete}/${reqs.length})`);
    lines.push('');
  }

  return lines.join('\n');
}
