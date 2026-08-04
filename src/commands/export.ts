/**
 * Export Command
 * Export MSP compliance package for audit submission
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config/loader';
import { assessWorkspace } from '../assessors/workspace-assessor';

interface ExportOptions {
  config: string;
  format: 'html' | 'pdf' | 'zip';
  output: string;
  includeEvidence: boolean;
  includePlaybooks: boolean;
}

/**
 * Copy directory recursively
 */
function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(assessment: any, config: any): string {
  const timestamp = new Date().toLocaleString();
  const completionPercentage = assessment.summary.completionPercentage;

  return `# MSP Compliance Package - Executive Summary

**Project**: ${config.project.name}
**Organization**: ${config.msp.organization.name}
**Generated**: ${timestamp}
**MSP Version**: ${config.msp.version}
**CIS IG Level**: ${config.msp.ig_level}

## Compliance Status

- **Overall Completion**: ${completionPercentage}%
- **Complete Requirements**: ${assessment.summary.complete}
- **In Progress**: ${assessment.summary.inProgress}
- **Not Started**: ${assessment.summary.notStarted}
- **Total Requirements**: ${assessment.summary.total}

## Requirements Breakdown

### By Category

${Object.entries(
  assessment.requirements.reduce((acc: any, req: any) => {
    if (!acc[req.requirement.category]) {
      acc[req.requirement.category] = { complete: 0, total: 0 };
    }
    acc[req.requirement.category].total++;
    if (req.overallStatus === 'complete') {
      acc[req.requirement.category].complete++;
    }
    return acc;
  }, {})
)
  .map(
    ([category, stats]: [string, any]) =>
      `- **${category}**: ${stats.complete}/${stats.total} complete (${Math.round((stats.complete / stats.total) * 100)}%)`
  )
  .join('\n')}

### By Priority

${Object.entries(
  assessment.requirements.reduce((acc: any, req: any) => {
    if (!acc[req.requirement.priority]) {
      acc[req.requirement.priority] = { complete: 0, total: 0 };
    }
    acc[req.requirement.priority].total++;
    if (req.overallStatus === 'complete') {
      acc[req.requirement.priority].complete++;
    }
    return acc;
  }, {})
)
  .map(
    ([priority, stats]: [string, any]) =>
      `- **${priority}**: ${stats.complete}/${stats.total} complete`
  )
  .join('\n')}

## Complete Requirements

${assessment.requirements
  .filter((r: any) => r.overallStatus === 'complete')
  .map((r: any) => `- ✅ **${r.requirement.id}**: ${r.requirement.name}`)
  .join('\n')}

## Remaining Gaps

${assessment.requirements
  .filter((r: any) => r.overallStatus !== 'complete')
  .map(
    (r: any) =>
      `- ⚠️ **${r.requirement.id}**: ${r.requirement.name} (${r.completionPercentage}% complete)`
  )
  .join('\n')}

---

*This package was generated automatically by MSP Readiness Automation*
`;
}

/**
 * Generate requirements matrix
 */
function generateRequirementsMatrix(assessment: any): string {
  return `# MSP Requirements Matrix

| ID | Name | Category | Priority | Status | Completion | Playbook | Evidence | Validated | Approved |
|----|------|----------|----------|--------|------------|----------|----------|-----------|----------|
${assessment.requirements
  .map(
    (r: any) =>
      `| ${r.requirement.id} | ${r.requirement.name} | ${r.requirement.category} | ${r.requirement.priority} | ${r.overallStatus} | ${r.completionPercentage}% | ${r.hasPlaybook ? '✅' : '❌'} | ${r.hasEvidence ? '✅' : '❌'} | ${r.validated === true ? '✅' : r.validated === false ? '❌' : '-'} | ${r.playbookStatus === 'approved' ? '✅' : '❌'} |`
  )
  .join('\n')}

## Legend

- **Status**: complete, in-progress, not-started
- **Completion**: Percentage of requirement completion (100% = fully complete)
- **Playbook**: Documentation exists
- **Evidence**: Evidence artifacts collected
- **Validated**: Evidence passed validation checks
- **Approved**: Playbook approved for audit

---

*Generated: ${new Date().toLocaleString()}*
`;
}

/**
 * Build compliance package as ZIP
 */
async function buildZipPackage(
  assessment: any,
  config: any,
  options: ExportOptions
): Promise<void> {
  const packageDir = path.join(options.output, 'msp-compliance-package');

  // Create package directory
  if (fs.existsSync(packageDir)) {
    fs.rmSync(packageDir, { recursive: true });
  }
  fs.mkdirSync(packageDir, { recursive: true });

  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(assessment, config);
  fs.writeFileSync(path.join(packageDir, 'EXECUTIVE-SUMMARY.md'), executiveSummary);

  // Generate requirements matrix
  const requirementsMatrix = generateRequirementsMatrix(assessment);
  fs.writeFileSync(path.join(packageDir, 'REQUIREMENTS-MATRIX.md'), requirementsMatrix);

  // Copy playbooks if requested
  if (options.includePlaybooks) {
    const playbooksDir = path.join(packageDir, 'playbooks');
    if (fs.existsSync(config.output.playbooks_path)) {
      copyDirectory(config.output.playbooks_path, playbooksDir);
    }
  }

  // Copy evidence if requested
  if (options.includeEvidence) {
    const evidenceDir = path.join(packageDir, 'evidence');
    if (fs.existsSync(config.output.evidence_path)) {
      copyDirectory(config.output.evidence_path, evidenceDir);
    }
  }

  // Create README
  const readme = `# MSP Compliance Package

This package contains all documentation and evidence for AWS MSP Program compliance.

## Contents

- **EXECUTIVE-SUMMARY.md**: High-level overview of compliance status
- **REQUIREMENTS-MATRIX.md**: Detailed matrix of all requirements
${options.includePlaybooks ? '- **playbooks/**: Process documentation and playbooks\n' : ''}${options.includeEvidence ? '- **evidence/**: Evidence artifacts from AWS infrastructure\n' : ''}

## Package Information

- **Generated**: ${new Date().toLocaleString()}
- **Project**: ${config.project.name}
- **Organization**: ${config.msp.organization.name}
- **MSP Version**: ${config.msp.version}
- **Overall Completion**: ${assessment.summary.completionPercentage}%

## Next Steps

1. Review executive summary for compliance status
2. Examine requirements matrix for gaps
3. Review playbooks for process documentation
4. Validate evidence artifacts

For questions, contact: ${config.msp.organization.contact}
`;

  fs.writeFileSync(path.join(packageDir, 'README.md'), readme);

  console.log(chalk.green(`\n✅ Package created at: ${packageDir}\n`));
}

/**
 * Build compliance package as HTML
 */
async function buildHtmlPackage(
  assessment: any,
  config: any,
  options: ExportOptions
): Promise<void> {
  // Ensure output directory exists
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true });
  }

  const htmlPath = path.join(options.output, 'msp-compliance-report.html');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MSP Compliance Package - ${config.project.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 { color: #2c3e50; }
    h2 { color: #34495e; margin-top: 2rem; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .summary {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin: 1.5rem 0;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .stat {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      color: #6c757d;
      margin-top: 0.5rem;
    }
    table {
      width: 100%;
      background: white;
      border-collapse: collapse;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background: #667eea;
      color: white;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e9ecef;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .status-complete { color: #28a745; font-weight: bold; }
    .status-in-progress { color: #ffc107; font-weight: bold; }
    .status-not-started { color: #dc3545; font-weight: bold; }
    .footer {
      margin-top: 3rem;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      text-align: center;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 MSP Compliance Package</h1>
    <p><strong>Project:</strong> ${config.project.name}</p>
    <p><strong>Organization:</strong> ${config.msp.organization.name}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${assessment.summary.completionPercentage}%</div>
      <div class="stat-label">Overall Completion</div>
    </div>
    <div class="stat">
      <div class="stat-value">${assessment.summary.complete}</div>
      <div class="stat-label">Complete</div>
    </div>
    <div class="stat">
      <div class="stat-value">${assessment.summary.inProgress}</div>
      <div class="stat-label">In Progress</div>
    </div>
    <div class="stat">
      <div class="stat-value">${assessment.summary.notStarted}</div>
      <div class="stat-label">Not Started</div>
    </div>
  </div>

  <div class="summary">
    <h2>Requirements Matrix</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Category</th>
          <th>Status</th>
          <th>Completion</th>
          <th>Validated</th>
        </tr>
      </thead>
      <tbody>
        ${assessment.requirements
          .map(
            (r: any) => `
          <tr>
            <td><strong>${r.requirement.id}</strong></td>
            <td>${r.requirement.name}</td>
            <td>${r.requirement.category}</td>
            <td class="status-${r.overallStatus.replace('-', '')}">${r.overallStatus}</td>
            <td>${r.completionPercentage}%</td>
            <td>${r.validated === true ? '✅' : r.validated === false ? '❌' : '-'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p><strong>MSP Version:</strong> ${config.msp.version} | <strong>CIS IG Level:</strong> ${config.msp.ig_level}</p>
    <p>Generated by MSP Readiness Automation</p>
  </div>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(chalk.green(`\n✅ HTML report created at: ${htmlPath}\n`));
}

/**
 * Execute export command
 */
export async function executeExport(options: ExportOptions): Promise<void> {
  console.log(chalk.bold.blue('\n📦 Building MSP Compliance Package\n'));

  // Load configuration
  const spinner = ora('Loading configuration...').start();
  const config = loadConfig(options.config);
  spinner.succeed('Configuration loaded');

  // Run workspace assessment
  spinner.text = 'Assessing workspace...';
  spinner.start();

  const assessment = await assessWorkspace(
    config.output.playbooks_path,
    config.output.evidence_path,
    true // Enable validation
  );

  spinner.succeed('Assessment complete');

  // Build package based on format
  spinner.text = 'Building compliance package...';
  spinner.start();

  switch (options.format) {
    case 'html':
      await buildHtmlPackage(assessment, config, options);
      break;
    case 'pdf':
      console.log(chalk.yellow('\n⚠️  PDF export not yet implemented. Using HTML format instead.'));
      await buildHtmlPackage(assessment, config, options);
      break;
    default:
      await buildZipPackage(assessment, config, options);
  }

  spinner.succeed('Package built successfully');

  console.log(chalk.bold.green('\n✅ Compliance package export complete!\n'));
}
