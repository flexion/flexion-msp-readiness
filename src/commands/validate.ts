/**
 * Validate Command
 * Validate evidence quality and completeness
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config/loader';
import { assessWorkspace } from '../assessors/workspace-assessor';
import { MSP_REQUIREMENTS } from '../data/msp-requirements';
import { RequirementCategory, ValidationResult } from '../types';

interface ValidateOptions {
  config: string;
  requirement?: string;
  category?: RequirementCategory;
  all: boolean;
  strict?: boolean;
  format: 'text' | 'json' | 'html';
  output?: string;
}

interface ValidationReport {
  timestamp: Date;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    notValidated: number;
  };
  results: Array<{
    requirementId: string;
    requirementName: string;
    category: string;
    validationResult?: ValidationResult;
    status: 'passed' | 'failed' | 'warning' | 'not-validated';
  }>;
}

/**
 * Generate text format report
 */
function generateTextReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push(chalk.bold.blue('\n📋 Evidence Validation Report\n'));
  lines.push(`Generated: ${report.timestamp.toLocaleString()}\n`);

  // Summary
  lines.push(chalk.bold('Summary:'));
  lines.push(chalk.green(`  ✅ Passed:        ${report.summary.passed}`));
  lines.push(chalk.red(`  ❌ Failed:        ${report.summary.failed}`));
  lines.push(chalk.yellow(`  ⚠️  Warnings:      ${report.summary.warnings}`));
  lines.push(chalk.gray(`  ⬜ Not Validated: ${report.summary.notValidated}`));
  lines.push(chalk.bold(`  📊 Total:         ${report.summary.total}`));
  lines.push('');

  // Details by status
  const passed = report.results.filter(r => r.status === 'passed');
  const failed = report.results.filter(r => r.status === 'failed');
  const warnings = report.results.filter(r => r.status === 'warning');

  if (failed.length > 0) {
    lines.push(chalk.bold.red('❌ Failed Validations:\n'));
    for (const result of failed) {
      lines.push(chalk.red(`${result.requirementId}: ${result.requirementName}`));
      if (result.validationResult) {
        const criticalChecks = result.validationResult.checks.filter(
          c => !c.passed && c.severity === 'critical'
        );
        for (const check of criticalChecks.slice(0, 3)) {
          lines.push(chalk.gray(`  • ${check.name}: ${check.message || check.actual}`));
        }
      }
      lines.push('');
    }
  }

  if (warnings.length > 0) {
    lines.push(chalk.bold.yellow('⚠️  Warnings:\n'));
    for (const result of warnings) {
      lines.push(chalk.yellow(`${result.requirementId}: ${result.requirementName}`));
      if (result.validationResult) {
        const warningChecks = result.validationResult.checks.filter(
          c => !c.passed && c.severity !== 'critical'
        );
        for (const check of warningChecks.slice(0, 2)) {
          lines.push(chalk.gray(`  • ${check.name}: ${check.message || check.actual}`));
        }
      }
      lines.push('');
    }
  }

  if (passed.length > 0) {
    lines.push(chalk.bold.green('✅ Passed Validations:\n'));
    for (const result of passed) {
      lines.push(chalk.green(`${result.requirementId}: ${result.requirementName}`));
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate JSON format report
 */
function generateJsonReport(report: ValidationReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generate HTML format report
 */
function generateHtmlReport(report: ValidationReport): string {
  const timestamp = report.timestamp.toLocaleString();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MSP Evidence Validation Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 { color: #2c3e50; }
    h2 { color: #34495e; margin-top: 2rem; }
    .summary {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin: 1.5rem 0;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .summary-item {
      text-align: center;
      padding: 1rem;
      border-radius: 4px;
    }
    .summary-item.passed { background: #d4edda; color: #155724; }
    .summary-item.failed { background: #f8d7da; color: #721c24; }
    .summary-item.warning { background: #fff3cd; color: #856404; }
    .summary-item.not-validated { background: #e2e3e5; color: #383d41; }
    .summary-item .value { font-size: 2rem; font-weight: bold; }
    .summary-item .label { font-size: 0.9rem; }
    .results {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin: 1.5rem 0;
    }
    .requirement {
      padding: 1rem;
      margin: 0.5rem 0;
      border-left: 4px solid #ccc;
      background: #f9f9f9;
    }
    .requirement.passed { border-left-color: #28a745; }
    .requirement.failed { border-left-color: #dc3545; }
    .requirement.warning { border-left-color: #ffc107; }
    .requirement-header {
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .check {
      margin: 0.5rem 0;
      padding: 0.5rem;
      background: white;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    .check.failed { background: #fff5f5; }
    .timestamp {
      color: #6c757d;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <h1>📋 MSP Evidence Validation Report</h1>
  <p class="timestamp">Generated: ${timestamp}</p>

  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item passed">
        <div class="value">${report.summary.passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-item failed">
        <div class="value">${report.summary.failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="summary-item warning">
        <div class="value">${report.summary.warnings}</div>
        <div class="label">Warnings</div>
      </div>
      <div class="summary-item not-validated">
        <div class="value">${report.summary.notValidated}</div>
        <div class="label">Not Validated</div>
      </div>
    </div>
  </div>

  <div class="results">
    <h2>Validation Results</h2>
    ${report.results
      .map(
        result => `
      <div class="requirement ${result.status}">
        <div class="requirement-header">
          ${result.requirementId}: ${result.requirementName}
          <span style="float: right; color: #6c757d;">${result.category}</span>
        </div>
        ${
          result.validationResult
            ? `
          <div class="checks">
            ${result.validationResult.checks
              .filter(c => !c.passed)
              .map(
                check => `
              <div class="check ${check.passed ? '' : 'failed'}">
                <strong>${check.name}</strong>: ${check.message || check.actual}
                (Severity: ${check.severity})
              </div>
            `
              )
              .join('')}
          </div>
        `
            : '<div class="check">No validation performed</div>'
        }
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>`;

  return html;
}

/**
 * Execute validate command
 */
export async function executeValidate(options: ValidateOptions): Promise<void> {
  console.log(chalk.bold.blue('\n🔍 Validating MSP Evidence\n'));

  // Load configuration
  const spinner = ora('Loading configuration...').start();
  const config = loadConfig(options.config);
  spinner.succeed('Configuration loaded');

  // Run workspace assessment with validation
  spinner.text = 'Assessing workspace and validating evidence...';
  spinner.start();

  const assessment = await assessWorkspace(
    config.output.playbooks_path,
    config.output.evidence_path,
    true // Enable validation
  );

  spinner.succeed('Assessment and validation complete');

  // Filter requirements if needed
  let filteredRequirements = assessment.requirements;

  if (options.requirement) {
    filteredRequirements = filteredRequirements.filter(
      r => r.requirement.id === options.requirement
    );
    if (filteredRequirements.length === 0) {
      console.error(chalk.red(`\n❌ Requirement not found: ${options.requirement}\n`));
      process.exit(1);
    }
  } else if (options.category) {
    filteredRequirements = filteredRequirements.filter(
      r => r.requirement.category === options.category
    );
    if (filteredRequirements.length === 0) {
      console.error(chalk.red(`\n❌ No requirements found for category: ${options.category}\n`));
      process.exit(1);
    }
  }

  // Build validation report
  const report: ValidationReport = {
    timestamp: new Date(),
    summary: {
      total: filteredRequirements.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      notValidated: 0,
    },
    results: [],
  };

  for (const req of filteredRequirements) {
    let status: 'passed' | 'failed' | 'warning' | 'not-validated';

    if (req.validationResult) {
      if (req.validationResult.passed) {
        status = 'passed';
        report.summary.passed++;
      } else {
        const hasCritical = req.validationResult.checks.some(
          c => !c.passed && c.severity === 'critical'
        );
        if (hasCritical) {
          status = 'failed';
          report.summary.failed++;
        } else {
          status = 'warning';
          report.summary.warnings++;
        }
      }
    } else {
      status = 'not-validated';
      report.summary.notValidated++;
    }

    report.results.push({
      requirementId: req.requirement.id,
      requirementName: req.requirement.name,
      category: req.requirement.category,
      validationResult: req.validationResult,
      status,
    });
  }

  // Generate report in requested format
  let reportContent: string;
  let fileExtension: string;

  switch (options.format) {
    case 'json':
      reportContent = generateJsonReport(report);
      fileExtension = '.json';
      break;
    case 'html':
      reportContent = generateHtmlReport(report);
      fileExtension = '.html';
      break;
    default:
      reportContent = generateTextReport(report);
      fileExtension = '.txt';
  }

  // Output report
  if (options.output) {
    let outputPath = options.output;
    if (!path.extname(outputPath)) {
      outputPath += fileExtension;
    }
    fs.writeFileSync(outputPath, reportContent, 'utf-8');
    console.log(chalk.green(`\n✅ Validation report saved to ${outputPath}\n`));
  } else {
    console.log(reportContent);
  }

  // Exit with error code if needed
  const hasErrors = report.summary.failed > 0;
  const hasWarnings = report.summary.warnings > 0;

  if (hasErrors || (options.strict && hasWarnings)) {
    process.exit(1);
  }
}
