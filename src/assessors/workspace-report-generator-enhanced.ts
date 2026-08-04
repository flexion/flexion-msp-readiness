/**
 * Enhanced Workspace Report Generator
 *
 * Generate comprehensive assessment reports with:
 * - Category grouping
 * - Automation indicators
 * - Multiple output formats (Markdown, HTML, JSON)
 * - Manual evidence checklists
 * - Gap remediation plans
 */

import * as fs from 'fs';
import { WorkspaceAssessment, WorkspaceRequirementStatus } from './workspace-assessor';
import { RequirementCategory, AutomationType } from '../types';
import { getAutomationType } from '../data/msp-requirements';

export interface ReportGenerationOptions {
  format: 'markdown' | 'html' | 'json';
  includeSummary: boolean;
  includeDetails: boolean;
  includeChecklist: boolean;
  includeRemediationPlan: boolean;
  groupBy: 'category' | 'priority' | 'automation' | 'status';
}

export const DEFAULT_REPORT_OPTIONS: ReportGenerationOptions = {
  format: 'markdown',
  includeSummary: true,
  includeDetails: true,
  includeChecklist: true,
  includeRemediationPlan: true,
  groupBy: 'category',
};

interface CategorySummary {
  category: RequirementCategory;
  categoryLabel: string;
  categoryIcon: string;
  total: number;
  complete: number;
  inProgress: number;
  notStarted: number;
  completionPercentage: number;
}

/**
 * Generate enhanced workspace report
 */
export function generateEnhancedWorkspaceReport(
  assessment: WorkspaceAssessment,
  projectName: string,
  options: Partial<ReportGenerationOptions> = {}
): string {
  const opts = { ...DEFAULT_REPORT_OPTIONS, ...options };

  switch (opts.format) {
    case 'markdown':
      return generateMarkdownReport(assessment, projectName, opts);
    case 'html':
      return generateHTMLReport(assessment, projectName, opts);
    case 'json':
      return generateJSONReport(assessment, projectName, opts);
    default:
      throw new Error(`Unsupported format: ${opts.format}`);
  }
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(
  assessment: WorkspaceAssessment,
  projectName: string,
  options: ReportGenerationOptions
): string {
  const lines: string[] = [];
  const { requirements, summary } = assessment;

  // Header
  lines.push('# MSP Readiness Assessment Report');
  lines.push('');
  lines.push(`**Generated**: ${new Date().toLocaleString()}`);
  lines.push(`**Project**: ${projectName}`);
  lines.push(`**Overall Completion**: ${summary.completionPercentage}% (${summary.complete}/${summary.total} requirements)`);
  lines.push('');

  // Executive Summary
  if (options.includeSummary) {
    lines.push(...generateExecutiveSummary(assessment));
  }

  // Details by category
  if (options.includeDetails) {
    lines.push(...generateDetailsByCategory(assessment));
  }

  // Manual Evidence Checklist
  if (options.includeChecklist) {
    lines.push(...generateManualChecklist(requirements));
  }

  // Gap Remediation Plan
  if (options.includeRemediationPlan) {
    lines.push(...generateRemediationPlan(assessment));
  }

  // Appendices
  lines.push(...generateAppendices(assessment));

  return lines.join('\n');
}

/**
 * Generate Executive Summary section
 */
function generateExecutiveSummary(assessment: WorkspaceAssessment): string[] {
  const lines: string[] = [];
  const { requirements, summary } = assessment;

  lines.push('## Executive Summary');
  lines.push('');

  // Completion by Category
  const categorySummaries = calculateCategorySummaries(requirements);
  lines.push('### Completion by Category');
  for (const catSummary of categorySummaries) {
    lines.push(
      `- ${catSummary.categoryIcon} ${catSummary.categoryLabel}: ${catSummary.completionPercentage}% (${catSummary.complete}/${catSummary.total})`
    );
  }
  lines.push('');

  // Automation Coverage
  const automationSummary = calculateAutomationSummary(requirements);
  lines.push('### Automation Coverage');
  lines.push(`- ${getAutomationIndicator('full')}: ${automationSummary.full} requirements (${Math.round((automationSummary.full / summary.total) * 100)}%)`);
  lines.push(`- ${getAutomationIndicator('partial')}: ${automationSummary.partial} requirements (${Math.round((automationSummary.partial / summary.total) * 100)}%)`);
  lines.push(`- ${getAutomationIndicator('manual')}: ${automationSummary.manual} requirements (${Math.round((automationSummary.manual / summary.total) * 100)}%)`);
  lines.push('');

  // Priority Gaps
  const priorityGaps = calculatePriorityGaps(requirements);
  lines.push('### Priority Gaps');
  lines.push(`- ${getPriorityIndicator('critical')}: ${priorityGaps.critical} gaps`);
  lines.push(`- ${getPriorityIndicator('high')}: ${priorityGaps.high} gaps`);
  lines.push(`- ${getPriorityIndicator('medium')}: ${priorityGaps.medium} gaps`);
  lines.push('');
  lines.push('---');
  lines.push('');

  return lines;
}

/**
 * Generate details grouped by category
 */
function generateDetailsByCategory(assessment: WorkspaceAssessment): string[] {
  const lines: string[] = [];
  const { requirements } = assessment;

  const categorySummaries = calculateCategorySummaries(requirements);

  for (const catSummary of categorySummaries) {
    const categoryReqs = requirements.filter(r => r.requirement.category === catSummary.category);

    lines.push(`## ${catSummary.categoryLabel} Requirements (${catSummary.total})`);
    lines.push('');

    for (const req of categoryReqs) {
      lines.push(...generateRequirementDetail(req));
    }
  }

  return lines;
}

/**
 * Generate detail for single requirement
 */
function generateRequirementDetail(req: WorkspaceRequirementStatus): string[] {
  const lines: string[] = [];
  const automationType = getAutomationType(req.requirement);
  const statusIcon = getStatusIndicator(req.overallStatus);

  lines.push(`### ${statusIcon} ${req.requirement.id}: ${req.requirement.name}`);
  lines.push(
    `**Status**: ${req.overallStatus} | **Automation**: ${getAutomationIndicator(automationType)} | **Confidence**: ${req.completionPercentage}%`
  );
  lines.push('');

  // Evidence collected
  if (req.hasEvidence) {
    lines.push('**Evidence Collected**:');
    for (const evidencePath of req.evidencePaths) {
      const filename = evidencePath.split('/').pop();
      lines.push(`- ✅ ${filename}`);
    }
    lines.push('');
  }

  // Quality Score (if validated)
  if (req.validated !== undefined && req.validationResult) {
    const qualityScore = calculateQualityScore(req);
    lines.push(`**Quality Score**: ${qualityScore}/100`);
    const passedChecks = req.validationResult.checks.filter(c => c.passed).length;
    const totalChecks = req.validationResult.checks.length;
    lines.push(`- ✅ ${passedChecks}/${totalChecks} validation checks passed`);

    if (!req.validated) {
      const failedChecks = req.validationResult.checks.filter(c => !c.passed);
      for (const check of failedChecks) {
        lines.push(`- ⚠️  ${check.name}: ${check.message || 'Failed'}`);
      }
    }
    lines.push('');
  }

  // Manual steps for incomplete requirements
  if (req.overallStatus !== 'complete') {
    lines.push('**Next Steps**:');
    if (!req.hasPlaybook) {
      lines.push('1. Generate playbook: `msp-readiness generate`');
    }
    if (!req.hasEvidence && automationType === 'manual') {
      lines.push('2. Provide manual evidence (see checklist below)');
      lines.push(`   - Template: \`templates/${req.requirement.category}/${req.requirement.id.toLowerCase()}.md\``);
      lines.push(`   - Save to: \`docs/msp/${req.requirement.category}/${req.requirement.id.toLowerCase()}.md\``);
      lines.push(`   - Estimated effort: ${req.requirement.estimatedHours || 4} hours`);
    } else if (!req.hasEvidence) {
      lines.push('2. Collect evidence: `msp-readiness collect-evidence`');
    }
    if (req.hasPlaybook && req.hasEvidence && req.playbookStatus !== 'approved') {
      lines.push(`3. Approve playbook: \`msp-readiness approve ${req.requirement.id}\``);
    }
    lines.push('');
  } else {
    lines.push('**Next Steps**: None - requirement complete');
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines;
}

/**
 * Generate manual evidence checklist
 */
function generateManualChecklist(requirements: WorkspaceRequirementStatus[]): string[] {
  const lines: string[] = [];

  const manualReqs = requirements.filter(
    r => getAutomationType(r.requirement) === 'manual' && r.overallStatus !== 'complete'
  );

  if (manualReqs.length === 0) {
    return lines;
  }

  lines.push('## Manual Evidence Checklist');
  lines.push('');
  lines.push(`Requirements needing human submission (${manualReqs.length} total):`);
  lines.push('');

  // Group by priority
  const criticalManual = manualReqs.filter(r => r.requirement.priority === 'critical');
  const highManual = manualReqs.filter(r => r.requirement.priority === 'high');
  const mediumManual = manualReqs.filter(r => r.requirement.priority === 'medium');

  if (criticalManual.length > 0) {
    lines.push('### Critical Priority');
    for (const req of criticalManual) {
      lines.push(`- [ ] **${req.requirement.id}**: ${req.requirement.name}`);
      lines.push(`  - Template: \`templates/${req.requirement.category}/${req.requirement.id.toLowerCase()}.md\``);
      lines.push(`  - Save to: \`docs/msp/${req.requirement.category}/${req.requirement.id.toLowerCase()}.md\``);
      lines.push(`  - Effort: ${req.requirement.estimatedHours || 4} hours`);
      lines.push('');
    }
  }

  if (highManual.length > 0) {
    lines.push('### High Priority');
    for (const req of highManual) {
      lines.push(`- [ ] **${req.requirement.id}**: ${req.requirement.name}`);
      lines.push(`  - Template: \`templates/${req.requirement.category}/${req.requirement.id.toLowerCase()}.md\``);
      lines.push(`  - Save to: \`docs/msp/${req.requirement.category}/${req.requirement.id.toLowerCase()}.md\``);
      lines.push(`  - Effort: ${req.requirement.estimatedHours || 4} hours`);
      lines.push('');
    }
  }

  if (mediumManual.length > 0) {
    lines.push('### Medium Priority');
    for (const req of mediumManual) {
      lines.push(`- [ ] **${req.requirement.id}**: ${req.requirement.name}`);
      lines.push(`  - Template: \`templates/${req.requirement.category}/${req.requirement.id.toLowerCase()}.md\``);
      lines.push(`  - Save to: \`docs/msp/${req.requirement.category}/${req.requirement.id.toLowerCase()}.md\``);
      lines.push(`  - Effort: ${req.requirement.estimatedHours || 4} hours`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');

  return lines;
}

/**
 * Generate gap remediation plan
 */
function generateRemediationPlan(assessment: WorkspaceAssessment): string[] {
  const lines: string[] = [];
  const { requirements } = assessment;

  const gaps = requirements.filter(r => r.overallStatus !== 'complete');
  if (gaps.length === 0) {
    return lines;
  }

  lines.push('## Gap Remediation Plan');
  lines.push('');

  // Group by priority
  const criticalGaps = gaps.filter(r => r.requirement.priority === 'critical');
  const highGaps = gaps.filter(r => r.requirement.priority === 'high');
  const mediumGaps = gaps.filter(r => r.requirement.priority === 'medium');

  if (criticalGaps.length > 0) {
    lines.push('### Phase 1: Critical Gaps (Week 1)');
    criticalGaps.forEach((req, index) => {
      lines.push(`${index + 1}. **${req.requirement.id}** - ${req.requirement.name} (${req.requirement.estimatedHours || 4}h)`);
      if (!req.hasPlaybook) {
        lines.push('   - Generate playbook from template');
      }
      if (!req.hasEvidence) {
        if (getAutomationType(req.requirement) === 'manual') {
          lines.push('   - Document manual evidence');
        } else {
          lines.push('   - Collect AWS evidence');
        }
      }
      if (req.hasPlaybook && req.playbookStatus !== 'approved') {
        lines.push('   - Review and approve playbook');
      }
      lines.push('');
    });
  }

  if (highGaps.length > 0) {
    lines.push('### Phase 2: High Priority Gaps (Week 2-3)');
    highGaps.forEach((req, index) => {
      lines.push(`${index + 1}. **${req.requirement.id}** - ${req.requirement.name} (${req.requirement.estimatedHours || 4}h)`);
      if (!req.hasPlaybook) {
        lines.push('   - Generate playbook from template');
      }
      if (!req.hasEvidence) {
        if (getAutomationType(req.requirement) === 'manual') {
          lines.push('   - Document manual evidence');
        } else {
          lines.push('   - Collect AWS evidence');
        }
      }
      lines.push('');
    });
  }

  if (mediumGaps.length > 0) {
    lines.push('### Phase 3: Medium Priority Gaps (Week 4+)');
    mediumGaps.forEach((req, index) => {
      lines.push(`${index + 1}. **${req.requirement.id}** - ${req.requirement.name} (${req.requirement.estimatedHours || 4}h)`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines;
}

/**
 * Generate appendices
 */
function generateAppendices(assessment: WorkspaceAssessment): string[] {
  const lines: string[] = [];
  const { requirements } = assessment;

  lines.push('## Appendices');
  lines.push('');

  // Evidence artifacts collected
  lines.push('### A. Evidence Artifacts Collected');
  const totalEvidence = requirements.reduce((sum, r) => sum + r.evidencePaths.length, 0);
  const awsEvidence = requirements.filter(r => r.hasEvidence && getAutomationType(r.requirement) !== 'manual').length;
  const docEvidence = requirements.filter(r => r.hasEvidence && getAutomationType(r.requirement) === 'manual').length;
  const validated = requirements.filter(r => r.validated === true).length;

  lines.push(`- ${totalEvidence} total evidence files`);
  lines.push(`- ${awsEvidence} AWS evidence collections`);
  lines.push(`- ${docEvidence} documentation files`);
  lines.push(`- ${validated} validation reports`);
  lines.push('');

  // Validation summary
  lines.push('### B. Validation Summary');
  const validatedReqs = requirements.filter(r => r.validationResult);
  if (validatedReqs.length > 0) {
    const avgQuality = Math.round(
      validatedReqs.reduce((sum, r) => sum + calculateQualityScore(r), 0) / validatedReqs.length
    );
    const totalChecks = validatedReqs.reduce((sum, r) => sum + (r.validationResult?.checks.length || 0), 0);
    const failedChecks = validatedReqs.reduce(
      (sum, r) => sum + (r.validationResult?.checks.filter(c => !c.passed).length || 0),
      0
    );

    lines.push(`- Requirements validated: ${validatedReqs.length}`);
    lines.push(`- Average quality score: ${avgQuality}/100`);
    lines.push(`- Validation checks: ${totalChecks - failedChecks}/${totalChecks} passed`);
    if (failedChecks > 0) {
      lines.push(`- Issues identified: ${failedChecks} warnings/errors`);
    }
  } else {
    lines.push('- No validation performed yet');
  }
  lines.push('');

  // Next assessment
  lines.push('### C. Next Assessment');
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 14);
  lines.push(`Recommended re-assessment: ${nextDate.toISOString().split('T')[0]} (2 weeks)`);
  lines.push('');

  return lines;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(
  assessment: WorkspaceAssessment,
  projectName: string,
  options: ReportGenerationOptions
): string {
  const { requirements, summary } = assessment;
  const categorySummaries = calculateCategorySummaries(requirements);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MSP Readiness Assessment - ${projectName}</title>
  <style>
    ${getHTMLStyles()}
  </style>
</head>
<body>
  <div class="header">
    <h1>MSP Readiness Assessment Report</h1>
    <div class="metadata">
      <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
      <div><strong>Project:</strong> ${projectName}</div>
      <div><strong>Overall Completion:</strong> ${summary.completionPercentage}% (${summary.complete}/${summary.total} requirements)</div>
    </div>
  </div>

  <div class="filters">
    <button onclick="filterByCategory('all')" class="active">All Categories</button>
    ${categorySummaries.map(cat => `<button onclick="filterByCategory('${cat.category}')">${cat.categoryIcon} ${cat.categoryLabel}</button>`).join('\n    ')}
    <button onclick="filterByStatus('all')" class="active">All Status</button>
    <button onclick="filterByStatus('complete')">Complete</button>
    <button onclick="filterByStatus('in-progress')">In Progress</button>
    <button onclick="filterByStatus('not-started')">Not Started</button>
  </div>

  <div class="summary-grid">
    ${categorySummaries.map(cat => renderCategorySummaryCard(cat)).join('\n    ')}
  </div>

  ${categorySummaries.map(cat => renderCategorySection(cat, requirements)).join('\n  ')}

  <script>
    ${getHTMLScripts()}
  </script>
</body>
</html>`;
}

/**
 * Get HTML styles
 */
function getHTMLStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f7fa;
      color: #2d3748;
      line-height: 1.6;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    .metadata {
      display: flex;
      justify-content: center;
      gap: 2rem;
      font-size: 0.95rem;
      opacity: 0.95;
    }
    .filters {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 2rem;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .filters button {
      padding: 0.5rem 1rem;
      border: 2px solid #e2e8f0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .filters button:hover {
      border-color: #667eea;
      background: #f7fafc;
    }
    .filters button.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    .summary-grid {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 2rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    .summary-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .summary-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    }
    .summary-card h3 {
      font-size: 1rem;
      color: #4a5568;
      margin-bottom: 1rem;
    }
    .summary-card .percentage {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 0.5rem;
    }
    .summary-card .details {
      font-size: 0.9rem;
      color: #718096;
    }
    .progress-bar {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 1rem;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
    }
    .category-section {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .category-section h2 {
      font-size: 1.8rem;
      margin-bottom: 1.5rem;
      color: #2d3748;
      border-bottom: 3px solid #667eea;
      padding-bottom: 0.5rem;
    }
    .requirement {
      padding: 1.5rem;
      margin: 1.5rem 0;
      border-left: 4px solid #e2e8f0;
      border-radius: 0 8px 8px 0;
      background: #f7fafc;
      transition: all 0.2s;
    }
    .requirement:hover {
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .requirement.complete {
      border-left-color: #48bb78;
    }
    .requirement.in-progress {
      border-left-color: #ed8936;
    }
    .requirement.not-started {
      border-left-color: #f56565;
    }
    .requirement h3 {
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
      color: #2d3748;
    }
    .requirement .meta {
      display: flex;
      gap: 1rem;
      margin: 0.5rem 0;
      font-size: 0.9rem;
      color: #718096;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .badge.automated {
      background: #e6fffa;
      color: #234e52;
    }
    .badge.partial-automated {
      background: #fefcbf;
      color: #744210;
    }
    .badge.manual {
      background: #fff5f5;
      color: #742a2a;
    }
    .evidence-list {
      list-style: none;
      margin: 1rem 0;
    }
    .evidence-list li {
      padding: 0.5rem 0;
      color: #4a5568;
    }
    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8rem;
      }
      .metadata {
        flex-direction: column;
        gap: 0.5rem;
      }
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

/**
 * Get HTML scripts
 */
function getHTMLScripts(): string {
  return `
    function filterByCategory(category) {
      const sections = document.querySelectorAll('.category-section');
      sections.forEach(section => {
        if (category === 'all' || section.dataset.category === category) {
          section.style.display = 'block';
        } else {
          section.style.display = 'none';
        }
      });

      // Update active button
      const buttons = document.querySelectorAll('.filters button');
      buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(category.toLowerCase()) ||
            (category === 'all' && btn.textContent === 'All Categories')) {
          btn.classList.add('active');
        } else if (!btn.textContent.includes('Status') && !btn.textContent.includes('Complete') &&
                   !btn.textContent.includes('Progress') && !btn.textContent.includes('Started')) {
          btn.classList.remove('active');
        }
      });
    }

    function filterByStatus(status) {
      const requirements = document.querySelectorAll('.requirement');
      requirements.forEach(req => {
        if (status === 'all' || req.dataset.status === status) {
          req.style.display = 'block';
        } else {
          req.style.display = 'none';
        }
      });

      // Update active button
      const buttons = document.querySelectorAll('.filters button');
      buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(status.toLowerCase()) ||
            (status === 'all' && btn.textContent === 'All Status')) {
          btn.classList.add('active');
        } else if (btn.textContent.includes('Status') || btn.textContent.includes('Complete') ||
                   btn.textContent.includes('Progress') || btn.textContent.includes('Started')) {
          btn.classList.remove('active');
        }
      });
    }
  `;
}

/**
 * Render category summary card
 */
function renderCategorySummaryCard(cat: CategorySummary): string {
  return `
    <div class="summary-card">
      <h3>${cat.categoryIcon} ${cat.categoryLabel}</h3>
      <div class="percentage">${cat.completionPercentage}%</div>
      <div class="details">${cat.complete}/${cat.total} complete</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${cat.completionPercentage}%"></div>
      </div>
    </div>
  `;
}

/**
 * Render category section
 */
function renderCategorySection(cat: CategorySummary, requirements: WorkspaceRequirementStatus[]): string {
  const categoryReqs = requirements.filter(r => r.requirement.category === cat.category);

  return `
  <div class="category-section" data-category="${cat.category}">
    <h2>${cat.categoryIcon} ${cat.categoryLabel} (${cat.total})</h2>
    ${categoryReqs.map(req => renderRequirementHTML(req)).join('\n    ')}
  </div>
  `;
}

/**
 * Render requirement in HTML
 */
function renderRequirementHTML(req: WorkspaceRequirementStatus): string {
  const automationType = getAutomationType(req.requirement);
  const statusIcon = getStatusIndicator(req.overallStatus);

  return `
    <div class="requirement ${req.overallStatus}" data-status="${req.overallStatus}">
      <h3>${statusIcon} ${req.requirement.id}: ${req.requirement.name}</h3>
      <div class="meta">
        <span><strong>Status:</strong> ${req.overallStatus}</span>
        <span>${getAutomationBadge(automationType)}</span>
        <span><strong>Completion:</strong> ${req.completionPercentage}%</span>
      </div>
      ${req.hasEvidence ? `
      <div>
        <strong>Evidence:</strong>
        <ul class="evidence-list">
          ${req.evidencePaths.map(p => `<li>✅ ${p.split('/').pop()}</li>`).join('\n          ')}
        </ul>
      </div>
      ` : ''}
      ${req.validated !== undefined ? `
      <div>
        <strong>Validation:</strong> ${req.validated ? '✅ Passed' : '❌ Failed'}
        ${req.validationResult ? ` (${calculateQualityScore(req)}/100)` : ''}
      </div>
      ` : ''}
    </div>
  `;
}

/**
 * Generate JSON report
 */
function generateJSONReport(
  assessment: WorkspaceAssessment,
  projectName: string,
  options: ReportGenerationOptions
): string {
  const { requirements, summary } = assessment;
  const categorySummaries = calculateCategorySummaries(requirements);
  const automationSummary = calculateAutomationSummary(requirements);
  const priorityGaps = calculatePriorityGaps(requirements);

  const report = {
    metadata: {
      generated: new Date().toISOString(),
      project: projectName,
      reportVersion: '2.0',
    },
    summary: {
      overall: summary,
      byCategory: categorySummaries.map(cat => ({
        category: cat.category,
        label: cat.categoryLabel,
        total: cat.total,
        complete: cat.complete,
        inProgress: cat.inProgress,
        notStarted: cat.notStarted,
        completionPercentage: cat.completionPercentage,
      })),
      automation: automationSummary,
      priorityGaps,
    },
    requirements: requirements.map(req => ({
      id: req.requirement.id,
      name: req.requirement.name,
      category: req.requirement.category,
      priority: req.requirement.priority,
      description: req.requirement.description,
      automationType: getAutomationType(req.requirement),
      status: req.overallStatus,
      completionPercentage: req.completionPercentage,
      hasPlaybook: req.hasPlaybook,
      playbookPath: req.playbookPath,
      playbookStatus: req.playbookStatus,
      hasEvidence: req.hasEvidence,
      evidencePaths: req.evidencePaths,
      validated: req.validated,
      validationResult: req.validationResult,
      qualityScore: req.validationResult ? calculateQualityScore(req) : null,
    })),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Calculate category summaries
 */
function calculateCategorySummaries(requirements: WorkspaceRequirementStatus[]): CategorySummary[] {
  const categories: RequirementCategory[] = ['business', 'people', 'governance', 'platform', 'security', 'operations'];
  const categoryLabels: Record<RequirementCategory, string> = {
    business: 'Business',
    people: 'People',
    governance: 'Governance',
    platform: 'Platform',
    security: 'Security',
    operations: 'Operations',
  };
  const categoryIcons: Record<RequirementCategory, string> = {
    business: '🏢',
    people: '👥',
    governance: '⚖️',
    platform: '🔧',
    security: '🔒',
    operations: '🔄',
  };

  return categories.map(category => {
    const categoryReqs = requirements.filter(r => r.requirement.category === category);
    const complete = categoryReqs.filter(r => r.overallStatus === 'complete').length;
    const inProgress = categoryReqs.filter(r => r.overallStatus === 'in-progress').length;
    const notStarted = categoryReqs.filter(r => r.overallStatus === 'not-started').length;
    const completionPercentage = categoryReqs.length > 0 ? Math.round((complete / categoryReqs.length) * 100) : 0;

    return {
      category,
      categoryLabel: categoryLabels[category],
      categoryIcon: categoryIcons[category],
      total: categoryReqs.length,
      complete,
      inProgress,
      notStarted,
      completionPercentage,
    };
  });
}

/**
 * Calculate automation summary
 */
function calculateAutomationSummary(requirements: WorkspaceRequirementStatus[]): {
  full: number;
  partial: number;
  manual: number;
} {
  return {
    full: requirements.filter(r => getAutomationType(r.requirement) === 'full').length,
    partial: requirements.filter(r => getAutomationType(r.requirement) === 'partial').length,
    manual: requirements.filter(r => getAutomationType(r.requirement) === 'manual').length,
  };
}

/**
 * Calculate priority gaps
 */
function calculatePriorityGaps(requirements: WorkspaceRequirementStatus[]): {
  critical: number;
  high: number;
  medium: number;
} {
  const gaps = requirements.filter(r => r.overallStatus !== 'complete');
  return {
    critical: gaps.filter(r => r.requirement.priority === 'critical').length,
    high: gaps.filter(r => r.requirement.priority === 'high').length,
    medium: gaps.filter(r => r.requirement.priority === 'medium').length,
  };
}

/**
 * Calculate quality score for a requirement
 */
function calculateQualityScore(req: WorkspaceRequirementStatus): number {
  if (!req.validationResult) {
    return 0;
  }

  const { checks } = req.validationResult;
  if (checks.length === 0) {
    return 100;
  }

  const passedChecks = checks.filter(c => c.passed).length;
  return Math.round((passedChecks / checks.length) * 100);
}

/**
 * Get status indicator
 */
function getStatusIndicator(status: 'complete' | 'in-progress' | 'not-started'): string {
  switch (status) {
    case 'complete':
      return '✅';
    case 'in-progress':
      return '🚧';
    case 'not-started':
      return '❌';
    default:
      return '🔍';
  }
}

/**
 * Get automation indicator
 */
function getAutomationIndicator(automationType: AutomationType): string {
  switch (automationType) {
    case 'full':
      return '✅ Fully Automated';
    case 'partial':
      return '🔄 Partially Automated';
    case 'manual':
      return '📋 Manual Submission Required';
  }
}

/**
 * Get automation badge (for HTML)
 */
function getAutomationBadge(automationType: AutomationType): string {
  switch (automationType) {
    case 'full':
      return '<span class="badge automated">Fully Automated</span>';
    case 'partial':
      return '<span class="badge partial-automated">Partially Automated</span>';
    case 'manual':
      return '<span class="badge manual">Manual Required</span>';
  }
}

/**
 * Get priority indicator
 */
function getPriorityIndicator(priority: 'critical' | 'high' | 'medium'): string {
  switch (priority) {
    case 'critical':
      return '🔴 Critical';
    case 'high':
      return '🟠 High';
    case 'medium':
      return '🟡 Medium';
  }
}

/**
 * Save enhanced report to file
 */
export function saveEnhancedReport(
  assessment: WorkspaceAssessment,
  projectName: string,
  outputPath: string,
  options: Partial<ReportGenerationOptions> = {}
): { path: string; format: string } {
  const opts = { ...DEFAULT_REPORT_OPTIONS, ...options };
  const report = generateEnhancedWorkspaceReport(assessment, projectName, opts);

  const extension = opts.format === 'json' ? '.json' : opts.format === 'html' ? '.html' : '.md';
  const fullPath = outputPath.endsWith(extension) ? outputPath : `${outputPath}${extension}`;

  fs.writeFileSync(fullPath, report, 'utf-8');

  return { path: fullPath, format: opts.format };
}
