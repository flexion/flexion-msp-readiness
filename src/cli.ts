#!/usr/bin/env node

/**
 * MSP Readiness CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import {
  loadConfig,
  printConfigSummary,
  ConfigError,
  isMultiAccountMode,
  getAccounts,
} from './config/loader';
import {
  assessAccount,
  aggregateMultiAccountAssessments,
  printMultiAccountAssessmentSummary,
  generateAccountComparisonReport,
} from './assessors/multi-account-assessor';
import {
  collectMultiAccountEvidence,
  printMultiAccountEvidenceSummary,
} from './collectors/multi-account-collector';
import { scanDocumentation, printScanSummary } from './assessors/doc-scanner';
import { parseCDKInfrastructure, printCDKSummary } from './assessors/cdk-parser';
import {
  matchRequirements,
  calculateSummary,
  AWSAnalysisResults,
} from './assessors/requirement-matcher';
import { analyzeAWSConfig, printAWSConfigSummary } from './assessors/aws-config-analyzer';
import { analyzeIAM, printIAMSummary } from './assessors/iam-evaluator';
import { analyzeSecurityHub, printSecurityHubSummary } from './assessors/security-hub-checker';
import {
  collectCloudTrailEvidence,
  saveCloudTrailEvidence,
  printCloudTrailEvidenceSummary,
} from './collectors/cloudtrail-collector';
import {
  collectConfigRulesEvidence,
  saveConfigRulesEvidence,
  printConfigRulesEvidenceSummary,
} from './collectors/config-collector';
import {
  collectBackupEvidence,
  saveBackupEvidence,
  printBackupEvidenceSummary,
} from './collectors/backup-collector';
import {
  collectInspectorEvidence,
  saveInspectorEvidence,
  printInspectorEvidenceSummary,
} from './collectors/inspector-collector';
import {
  generateManifest,
  saveManifest,
  printManifestSummary,
} from './collectors/manifest-generator';
import { EvidenceArtifact } from './types';
import {
  generatePlaybooks,
  identifyMissingPlaybooks,
  AVAILABLE_PLAYBOOKS,
  AVAILABLE_RUNBOOKS,
  printGenerationSummary,
} from './generators/playbook-generator';
import {
  buildEvidenceMatrix,
  saveEvidenceMatrix,
  printEvidenceMatrixSummary,
} from './generators/evidence-matrix';
import { aggregateDashboardData } from './dashboard/aggregator';
import { buildDashboard } from './dashboard/builder';
import {
  generateProjectAssessment,
  generateMarkdownReport,
  saveReport,
} from './assessors/report-generator';
import {
  exportToPDF,
  exportToCSV,
  exportAllCSVFormats,
  exportEmailSummary,
  exportToSARIF,
  isPuppeteerAvailable,
  getSARIFSummary,
  BrandingConfig,
} from './exporters';
import {
  loadAssessment,
  compareAssessments,
  filterChanges,
  printComparisonSummary,
  printDetailedChanges,
  saveComparisonReport,
  getExitCode,
} from './assessors/comparison';

const program = new Command();

program
  .name('msp-readiness')
  .description('Automated AWS MSP Program readiness assessment and documentation generation')
  .version('1.0.0');

/**
 * Assess command - scan documentation and generate assessment report
 */
program
  .command('assess')
  .description('Assess MSP readiness by scanning documentation and AWS infrastructure')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('-o, --output <path>', 'Output path for report', './assessment-report')
  .option('--format <format>', 'Report format: markdown, json, or both', 'both')
  .option('--skip-aws', 'Skip AWS infrastructure analysis')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n🔍 MSP Readiness Assessment\n'));

      // Load configuration
      const spinner = ora('Loading configuration...').start();
      let config;
      try {
        config = loadConfig(options.config);
        spinner.succeed('Configuration loaded');
        printConfigSummary(config);
      } catch (error) {
        spinner.fail('Configuration error');
        if (error instanceof ConfigError) {
          console.error(chalk.red('\n' + error.message + '\n'));
          process.exit(1);
        }
        throw error;
      }

      // Check if multi-account mode
      if (isMultiAccountMode(config)) {
        // Multi-account assessment
        const accounts = getAccounts(config);
        console.log(chalk.bold(`Running assessment for ${accounts.length} accounts...\n`));

        const accountAssessments = [];
        for (const account of accounts) {
          spinner.text = `Assessing ${account.name}...`;
          spinner.start();

          try {
            const assessment = await assessAccount(
              { name: account.name, profile: account.profile, region: account.region },
              config,
              options.skipAws
            );
            accountAssessments.push(assessment);
            spinner.succeed(`${account.name} assessed`);
          } catch (error) {
            spinner.fail(`${account.name} assessment failed`);
            console.log(
              chalk.yellow(`  ${error instanceof Error ? error.message : String(error)}`)
            );
          }
        }

        if (accountAssessments.length === 0) {
          console.log(chalk.red('\n❌ All account assessments failed\n'));
          process.exit(1);
        }

        // Aggregate results
        spinner.text = 'Aggregating results...';
        spinner.start();
        const multiAccountAssessment = aggregateMultiAccountAssessments(
          config.aws.accounts!,
          accountAssessments
        );
        spinner.succeed('Results aggregated');

        // Print summary
        printMultiAccountAssessmentSummary(multiAccountAssessment);

        // Save reports
        spinner.text = 'Saving reports...';
        spinner.start();
        const reportFormat = (options.format || config.output.report_format) as
          'markdown' | 'json' | 'both';

        // Save individual account reports
        for (const assessment of accountAssessments) {
          const accountOutput = `${options.output}-${assessment.accountName}`;
          await saveReport(assessment, accountOutput, reportFormat);
        }

        // Save aggregated report
        const fs = require('fs');
        fs.writeFileSync(
          `${options.output}-multi-account.json`,
          JSON.stringify(multiAccountAssessment, null, 2)
        );

        // Save comparison report
        const comparisonReport = generateAccountComparisonReport(multiAccountAssessment);
        fs.writeFileSync(`${options.output}-comparison.md`, comparisonReport);

        spinner.succeed('Reports saved');

        console.log(chalk.bold('\n📄 Reports generated:\n'));
        console.log(chalk.cyan(`  📊 Multi-account JSON: ${options.output}-multi-account.json`));
        console.log(chalk.cyan(`  📝 Comparison:         ${options.output}-comparison.md`));
        for (const assessment of accountAssessments) {
          console.log(
            chalk.cyan(
              `  📋 ${assessment.accountName}:          ${options.output}-${assessment.accountName}.json`
            )
          );
        }

        console.log(chalk.bold.green('\n✅ Multi-account assessment complete!\n'));
        return;
      }

      // Single account mode (original flow)
      // Scan documentation
      spinner.text = 'Scanning documentation...';
      spinner.start();
      const docScan = await scanDocumentation(config.project.docs_path);
      spinner.succeed(`Documentation scanned (${docScan.totalFiles} files)`);
      printScanSummary(docScan);

      // Parse CDK infrastructure code
      spinner.text = 'Parsing CDK infrastructure...';
      spinner.start();
      const cdkParse = await parseCDKInfrastructure(config.project.infra_path);
      spinner.succeed(`CDK infrastructure parsed (${cdkParse.totalFiles} files)`);
      printCDKSummary(cdkParse);

      // Analyze AWS infrastructure (optional)
      let awsAnalysis: AWSAnalysisResults | undefined;
      if (!options.skipAws) {
        try {
          spinner.text = 'Analyzing AWS infrastructure...';
          spinner.start();

          const [configAnalysis, iamAnalysis, securityHubAnalysis] = await Promise.all([
            analyzeAWSConfig(config.aws.region, config.aws.profile),
            analyzeIAM(config.aws.region, config.aws.profile),
            analyzeSecurityHub(config.aws.region, config.aws.profile),
          ]);

          awsAnalysis = { configAnalysis, iamAnalysis, securityHubAnalysis };
          spinner.succeed('AWS infrastructure analyzed');

          printAWSConfigSummary(configAnalysis);
          printIAMSummary(iamAnalysis);
          printSecurityHubSummary(securityHubAnalysis);
        } catch (error) {
          spinner.warn('AWS analysis failed - continuing with documentation only');
          console.log(chalk.yellow(`  ${error instanceof Error ? error.message : String(error)}`));
          console.log(chalk.gray('  Tip: Use --skip-aws to skip AWS analysis\n'));
        }
      }

      // Match requirements
      spinner.text = 'Matching requirements...';
      spinner.start();
      const requirementAssessments = matchRequirements(
        docScan,
        config.assessment.skip_requirements,
        awsAnalysis
      );
      spinner.succeed('Requirements matched');

      // Generate assessment
      spinner.text = 'Generating assessment...';
      spinner.start();
      const assessment = generateProjectAssessment(
        config.project.name,
        requirementAssessments,
        config.msp.version
      );
      spinner.succeed('Assessment complete');

      // Print summary
      const summary = calculateSummary(requirementAssessments);
      console.log(chalk.bold('\n📊 Assessment Summary:\n'));
      console.log(chalk.green(`✅ Addressed:      ${summary.addressed} requirements`));
      console.log(chalk.yellow(`⚠️  Partial:        ${summary.partial} requirements`));
      console.log(chalk.red(`❌ Gap:            ${summary.gap} requirements`));
      console.log(chalk.gray(`⬜ Not Applicable: ${summary.notApplicable} requirements`));

      if (summary.notStarted > 0) {
        console.log(chalk.gray(`🔲 Not Started:    ${summary.notStarted} requirements`));
      }

      const total = summary.addressed + summary.partial + summary.gap + summary.notApplicable;
      const completionPercent = Math.round((summary.addressed / total) * 100);
      console.log(
        chalk.bold(`\n📈 Overall Completion: ${completionPercent}% (${summary.addressed}/${total})`)
      );

      if (summary.totalEffort > 0) {
        console.log(chalk.bold(`⏱️  Estimated Effort: ${summary.totalEffort} hours\n`));
      }

      // Show critical gaps
      if (assessment.criticalGaps.length > 0) {
        console.log(chalk.bold.red(`\n🚨 Critical Gaps (${assessment.criticalGaps.length}):\n`));
        for (const gap of assessment.criticalGaps.slice(0, 5)) {
          const icon = gap.status === 'gap' ? '🔴' : '🟡';
          console.log(
            `${icon} ${chalk.bold(gap.requirement.id)}: ${gap.requirement.name} (${gap.estimatedEffort || 0}h)`
          );
        }
        if (assessment.criticalGaps.length > 5) {
          console.log(chalk.gray(`   ... and ${assessment.criticalGaps.length - 5} more\n`));
        }
      }

      // Save report
      spinner.text = 'Saving report...';
      spinner.start();
      const reportFormat = (options.format || config.output.report_format) as
        'markdown' | 'json' | 'both';
      const savedFiles = await saveReport(assessment, options.output, reportFormat);
      spinner.succeed('Report saved');

      console.log(chalk.bold('\n📄 Reports generated:\n'));
      if (savedFiles.markdownPath) {
        console.log(chalk.cyan(`  📝 Markdown: ${savedFiles.markdownPath}`));
      }
      if (savedFiles.jsonPath) {
        console.log(chalk.cyan(`  📊 JSON:     ${savedFiles.jsonPath}`));
      }
      if (savedFiles.remediationPath) {
        console.log(chalk.cyan(`  🔧 Remediation: ${savedFiles.remediationPath}`));
        console.log(
          chalk.gray(
            '     Contains step-by-step fixes, IaC code snippets, and AWS documentation links'
          )
        );
      }

      console.log(chalk.bold.green('\n✅ Assessment complete!\n'));
    } catch (error) {
      console.error(chalk.red('\n❌ Error during assessment:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Collect-evidence command - collect evidence from AWS
 */
program
  .command('collect-evidence')
  .description('Collect compliance evidence from AWS services')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n📦 Collecting MSP Evidence\n'));

      const spinner = ora('Loading configuration...').start();
      const config = loadConfig(options.config);
      spinner.succeed('Configuration loaded');
      printConfigSummary(config);

      const evidencePath = config.output.evidence_path;

      // Check if multi-account mode
      if (isMultiAccountMode(config)) {
        // Multi-account evidence collection
        const accounts = getAccounts(config);
        spinner.text = `Collecting evidence from ${accounts.length} accounts...`;
        spinner.start();

        const results = await collectMultiAccountEvidence(config.aws.accounts!, evidencePath);
        spinner.succeed('Multi-account evidence collected');

        printMultiAccountEvidenceSummary(results);

        // Generate per-account manifests
        for (const result of results) {
          if (result.artifacts.length > 0) {
            const manifest = generateManifest(result.artifacts);
            saveManifest(manifest, `${evidencePath}/${result.accountName}/MANIFEST.md`);
          }
        }

        console.log(chalk.bold.green(`\n✅ Multi-account evidence collection complete!\n`));
        console.log(chalk.cyan(`  Evidence directory: ${evidencePath}\n`));
        return;
      }

      // Single account mode (original flow)
      const artifacts: EvidenceArtifact[] = [];

      // Collect CloudTrail evidence
      spinner.text = 'Collecting CloudTrail evidence...';
      spinner.start();
      try {
        const cloudTrailEvidence = await collectCloudTrailEvidence(
          config.aws.region,
          config.aws.profile
        );
        const artifact = saveCloudTrailEvidence(
          cloudTrailEvidence,
          `${evidencePath}/cloudtrail-status.json`
        );
        artifacts.push(artifact);
        spinner.succeed('CloudTrail evidence collected');
        printCloudTrailEvidenceSummary(cloudTrailEvidence);
      } catch (error) {
        spinner.warn(
          `CloudTrail collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Collect Config rules evidence
      spinner.text = 'Collecting Config rules evidence...';
      spinner.start();
      try {
        const configEvidence = await collectConfigRulesEvidence(
          config.aws.region,
          config.aws.profile
        );
        const artifact = saveConfigRulesEvidence(
          configEvidence,
          `${evidencePath}/config-snapshot.json`
        );
        artifacts.push(artifact);
        spinner.succeed('Config rules evidence collected');
        printConfigRulesEvidenceSummary(configEvidence);
      } catch (error) {
        spinner.warn(
          `Config collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Collect Backup evidence
      spinner.text = 'Collecting Backup evidence...';
      spinner.start();
      try {
        const backupEvidence = await collectBackupEvidence(config.aws.region, config.aws.profile);
        const artifact = saveBackupEvidence(backupEvidence, `${evidencePath}/backup-status.json`);
        artifacts.push(artifact);
        spinner.succeed('Backup evidence collected');
        printBackupEvidenceSummary(backupEvidence);
      } catch (error) {
        spinner.warn(
          `Backup collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Collect Inspector evidence
      spinner.text = 'Collecting Inspector evidence...';
      spinner.start();
      try {
        const inspectorEvidence = await collectInspectorEvidence(
          config.aws.region,
          config.aws.profile
        );
        const artifact = saveInspectorEvidence(
          inspectorEvidence,
          `${evidencePath}/inspector-findings.json`
        );
        artifacts.push(artifact);
        spinner.succeed('Inspector evidence collected');
        printInspectorEvidenceSummary(inspectorEvidence);
      } catch (error) {
        spinner.warn(
          `Inspector collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Generate manifest
      spinner.text = 'Generating evidence manifest...';
      spinner.start();
      const manifest = generateManifest(artifacts);
      saveManifest(manifest, `${evidencePath}/MANIFEST.md`);
      spinner.succeed('Evidence manifest generated');
      printManifestSummary(manifest);

      console.log(chalk.bold.green(`\n✅ Evidence collection complete!\n`));
      console.log(chalk.cyan(`  Evidence directory: ${evidencePath}`));
      console.log(chalk.cyan(`  Manifest: ${evidencePath}/MANIFEST.md\n`));
    } catch (error) {
      console.error(chalk.red('\n❌ Error collecting evidence:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Generate command - generate playbooks, runbooks, and evidence matrix
 */
program
  .command('generate')
  .description('Generate missing playbooks, runbooks, and evidence matrix')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('--playbooks-only', 'Generate only playbooks')
  .option('--runbooks-only', 'Generate only runbooks')
  .option('--matrix-only', 'Generate only evidence matrix')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n📝 Generating MSP Documentation\n'));

      const spinner = ora('Loading configuration...').start();
      const config = loadConfig(options.config);
      spinner.succeed('Configuration loaded');

      const outputDir = config.output.playbooks_path;

      // Scan existing docs
      spinner.text = 'Scanning existing documentation...';
      spinner.start();
      const docScan = await scanDocumentation(config.project.docs_path);
      const existingDocs = docScan.files.map(f => f.relativePath);
      spinner.succeed(`Found ${docScan.totalFiles} existing files`);

      // Generate playbooks/runbooks
      if (!options.matrixOnly) {
        const includePlaybooks = !options.runbooksOnly;
        const includeRunbooks = !options.playbooksOnly;

        const missing = identifyMissingPlaybooks(existingDocs, includePlaybooks, includeRunbooks);

        if (missing.length === 0) {
          console.log(chalk.green('✓ All playbooks and runbooks already exist'));
        } else {
          spinner.text = `Generating ${missing.length} missing document(s)...`;
          spinner.start();

          const generated = await generatePlaybooks(config, missing, outputDir);
          spinner.succeed(`Generated ${generated.length} document(s)`);
          printGenerationSummary(generated);
        }
      }

      // Generate evidence matrix
      if (!options.playbooksOnly && !options.runbooksOnly) {
        spinner.text = 'Generating evidence matrix...';
        spinner.start();

        // Run quick assessment
        const assessments = matchRequirements(docScan, config.assessment.skip_requirements);
        const matrix = buildEvidenceMatrix(assessments, config.output.evidence_path);
        saveEvidenceMatrix(matrix, path.join(outputDir, 'evidence-matrix.md'));

        spinner.succeed('Evidence matrix generated');
        printEvidenceMatrixSummary(matrix);
      }

      console.log(chalk.bold.green(`\n✅ Generation complete!\n`));
      console.log(chalk.cyan(`  Output directory: ${outputDir}\n`));
    } catch (error) {
      console.error(chalk.red('\n❌ Error generating documentation:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Dashboard command - generate interactive HTML dashboard
 */
program
  .command('dashboard')
  .description('Generate interactive HTML compliance dashboard')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('-i, --input <path>', 'Path to assessment JSON', './assessment-report.json')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n📊 Building MSP Dashboard\n'));

      const spinner = ora('Loading configuration...').start();
      const config = loadConfig(options.config);
      spinner.succeed('Configuration loaded');

      // Load assessment
      spinner.text = 'Loading assessment data...';
      spinner.start();

      if (!require('fs').existsSync(options.input)) {
        spinner.fail('Assessment file not found');
        console.log(
          chalk.yellow('\n  Run "msp-readiness assess" first to generate assessment data.\n')
        );
        process.exit(1);
      }

      const assessment = JSON.parse(require('fs').readFileSync(options.input, 'utf-8'));
      spinner.succeed('Assessment loaded');

      // Aggregate data
      spinner.text = 'Aggregating dashboard data...';
      spinner.start();
      const dashboardData = aggregateDashboardData(assessment, config.output.evidence_path);
      spinner.succeed('Data aggregated');

      // Build dashboard
      spinner.text = 'Building HTML dashboard...';
      spinner.start();
      await buildDashboard(dashboardData, config.output.dashboard_path);
      spinner.succeed('Dashboard built');

      console.log(chalk.bold.green('\n✅ Dashboard complete!\n'));
      console.log(chalk.cyan(`  Dashboard: ${config.output.dashboard_path}`));
      console.log(chalk.cyan(`  Open with: open ${config.output.dashboard_path}\n`));
    } catch (error) {
      console.error(chalk.red('\n❌ Error building dashboard:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Diff command - compare two assessment runs
 */
program
  .command('diff')
  .description('Compare two assessment runs to show what changed')
  .option(
    '-b, --baseline <path>',
    'Path to baseline assessment JSON',
    './assessment-report-baseline.json'
  )
  .option('-c, --current <path>', 'Path to current assessment JSON', './assessment-report.json')
  .option('-o, --output <path>', 'Output path for comparison report', './assessment-comparison')
  .option('--format <format>', 'Report format: markdown, json, or both', 'both')
  .option('--only <filter>', 'Filter changes: improvements, regressions, or unchanged')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n🔍 MSP Assessment Comparison\n'));

      const spinner = ora('Loading assessments...').start();

      // Get paths with defaults
      const baselinePath = options.baseline || './assessment-report-baseline.json';
      const currentPath = options.current || './assessment-report.json';

      // Load baseline assessment
      let baseline;
      try {
        baseline = loadAssessment(baselinePath);
        spinner.text = 'Baseline assessment loaded...';
      } catch (error) {
        spinner.fail('Failed to load baseline assessment');
        console.error(chalk.red(`\n  ${error instanceof Error ? error.message : String(error)}`));
        console.log(
          chalk.yellow(
            '\n  Tip: Specify --baseline <path> to point to your baseline assessment JSON\n'
          )
        );
        process.exit(1);
      }

      // Load current assessment
      let current;
      try {
        current = loadAssessment(currentPath);
        spinner.succeed('Assessments loaded');
      } catch (error) {
        spinner.fail('Failed to load current assessment');
        console.error(chalk.red(`\n  ${error instanceof Error ? error.message : String(error)}`));
        console.log(
          chalk.yellow(
            '\n  Tip: Specify --current <path> to point to your current assessment JSON\n'
          )
        );
        process.exit(1);
      }

      // Validate assessments are for same project
      if (baseline.projectName !== current.projectName) {
        console.log(chalk.yellow('\n⚠️  Warning: Comparing assessments from different projects:'));
        console.log(`  Baseline: ${baseline.projectName}`);
        console.log(`  Current:  ${current.projectName}\n`);
      }

      // Compare assessments
      spinner.text = 'Comparing assessments...';
      spinner.start();
      const result = compareAssessments(baseline, current);
      spinner.succeed('Comparison complete');

      // Print summary
      printComparisonSummary(result);

      // Filter and print detailed changes
      const filter = options.only as 'improvements' | 'regressions' | 'unchanged' | undefined;

      if (filter) {
        const filtered = filterChanges(result, filter);
        const title =
          filter === 'improvements'
            ? '📈 Improvements'
            : filter === 'regressions'
              ? '📉 Regressions'
              : '➡️ Unchanged Requirements';
        printDetailedChanges(filtered, title);
      } else {
        // Show improvements and regressions
        const improvements = filterChanges(result, 'improvements');
        if (improvements.length > 0) {
          printDetailedChanges(improvements, '📈 Improvements');
        }

        const regressions = filterChanges(result, 'regressions');
        if (regressions.length > 0) {
          printDetailedChanges(regressions, '📉 Regressions');
        }

        // Show critical unchanged gaps
        const unchangedGaps = result.changes.filter(
          c =>
            c.direction === 'unchanged' &&
            (c.current.status === 'gap' || c.current.status === 'partial')
        );
        if (unchangedGaps.length > 0) {
          console.log(chalk.bold('\n⚠️  Critical Unchanged Gaps\n'));
          for (const gap of unchangedGaps.slice(0, 5)) {
            const icon = gap.current.status === 'gap' ? '🔴' : '🟡';
            console.log(`${icon} ${chalk.bold(gap.requirementId)}: ${gap.requirementName}`);
            console.log(`  Status: ${gap.current.status} (${gap.priority} priority)`);
            console.log(`  Findings: ${gap.current.findingsCount}`);
            console.log('');
          }
          if (unchangedGaps.length > 5) {
            console.log(chalk.gray(`   ... and ${unchangedGaps.length - 5} more\n`));
          }
        }
      }

      // Save report
      spinner.text = 'Saving comparison report...';
      spinner.start();
      const reportFormat = (options.format || 'both') as 'markdown' | 'json' | 'both';
      const outputPath = options.output || './assessment-comparison';
      const savedFiles = saveComparisonReport(result, outputPath, reportFormat);
      spinner.succeed('Comparison report saved');

      console.log(chalk.bold('\n📄 Reports generated:\n'));
      if (savedFiles.markdownPath) {
        console.log(chalk.cyan(`  📝 Markdown: ${savedFiles.markdownPath}`));
      }
      if (savedFiles.jsonPath) {
        console.log(chalk.cyan(`  📊 JSON:     ${savedFiles.jsonPath}`));
      }

      // Determine exit code
      const exitCode = getExitCode(result);
      if (exitCode === 1) {
        console.log(chalk.bold.red('\n❌ Compliance decreased - exiting with code 1 for CI/CD\n'));
      } else {
        console.log(chalk.bold.green('\n✅ Comparison complete!\n'));
      }

      process.exit(exitCode);
    } catch (error) {
      console.error(chalk.red('\n❌ Error during comparison:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Status command - show current assessment status
 */
program
  .command('status')
  .description('Show current MSP readiness status')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .action(async options => {
    try {
      const config = loadConfig(options.config);

      console.log(chalk.bold.blue('\n📊 MSP Readiness Status\n'));
      console.log(`Project: ${chalk.bold(config.project.name)}`);
      console.log(`Stage: ${chalk.bold(config.aws.stage)}`);
      console.log(`MSP Version: ${chalk.bold(config.msp.version)}`);
      console.log(`CIS IG Level: ${chalk.bold(config.msp.ig_level)}`);

      console.log(chalk.gray('\nRun "msp-readiness assess" for full assessment.\n'));
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(chalk.red('\n' + error.message + '\n'));
        process.exit(1);
      }
      throw error;
    }
  });

/**
 * Scan-iac command - scan CDK/Terraform code for security issues
 */
program
  .command('scan-iac')
  .description('Scan Infrastructure as Code (CDK/Terraform) for security issues')
  .option('--path <path>', 'Path to infrastructure code', './cdk')
  .option(
    '--severity <level>',
    'Minimum severity level to report (critical, high, medium, low, info)',
    'low'
  )
  .option('--sarif <path>', 'Output SARIF report for GitHub Security')
  .option('--json <path>', 'Output JSON report')
  .option('--fail-on-findings', 'Exit with code 1 if security issues found (for CI/CD)')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n🔍 IaC Security Scan\n'));

      const { scanCDKInfrastructure, convertToSARIF, saveSARIF } =
        await import('./scanners/iac-scanner');

      const spinner = ora('Scanning infrastructure code...').start();
      const scanResult = await scanCDKInfrastructure(
        options.path,
        options.severity as 'critical' | 'high' | 'medium' | 'low' | 'info'
      );
      spinner.succeed(`Scanned ${scanResult.totalFiles} files in ${scanResult.scanDuration}ms`);

      // Print summary
      console.log(chalk.bold('\n📊 Scan Results:\n'));
      console.log(`  Files scanned:     ${scanResult.totalFiles}`);
      console.log(`  Total findings:    ${scanResult.findings.length}`);

      if (scanResult.findings.length > 0) {
        console.log(chalk.bold('\n  By Severity:'));
        if (scanResult.findingsBySeverity.critical > 0) {
          console.log(chalk.red(`    🔴 Critical: ${scanResult.findingsBySeverity.critical}`));
        }
        if (scanResult.findingsBySeverity.high > 0) {
          console.log(chalk.red(`    🟠 High:     ${scanResult.findingsBySeverity.high}`));
        }
        if (scanResult.findingsBySeverity.medium > 0) {
          console.log(chalk.yellow(`    🟡 Medium:   ${scanResult.findingsBySeverity.medium}`));
        }
        if (scanResult.findingsBySeverity.low > 0) {
          console.log(chalk.blue(`    🔵 Low:      ${scanResult.findingsBySeverity.low}`));
        }
        if (scanResult.findingsBySeverity.info > 0) {
          console.log(chalk.gray(`    ⚪ Info:     ${scanResult.findingsBySeverity.info}`));
        }

        // Show top findings
        const topFindings = scanResult.findings
          .filter(f => f.severity === 'critical' || f.severity === 'high')
          .slice(0, 10);

        if (topFindings.length > 0) {
          console.log(chalk.bold('\n🚨 Top Security Issues:\n'));
          for (const finding of topFindings) {
            const icon = finding.severity === 'critical' ? '🔴' : '🟠';
            console.log(`${icon} ${chalk.bold(finding.id)}: ${finding.title}`);
            console.log(`   📍 ${chalk.gray(finding.file)}:${chalk.gray(finding.line)}`);
            console.log(`   ${chalk.dim(finding.description)}`);
            console.log(`   💡 ${chalk.cyan(finding.remediation)}`);
            console.log(`   🏷️  MSP: ${chalk.gray(finding.mspRequirements.join(', '))}\n`);
          }

          if (scanResult.findings.length > 10) {
            console.log(
              chalk.gray(`   ... and ${scanResult.findings.length - 10} more findings\n`)
            );
          }
        }
      } else {
        console.log(chalk.green('\n✅ No security issues found!\n'));
      }

      // Save SARIF output
      if (options.sarif) {
        spinner.text = 'Generating SARIF report...';
        spinner.start();
        const sarif = convertToSARIF(scanResult);
        saveSARIF(sarif, options.sarif);
        spinner.succeed(`SARIF report saved to ${options.sarif}`);
        console.log(
          chalk.cyan(
            `   Upload to GitHub Security: gh api repos/{owner}/{repo}/code-scanning/sarifs -F sarif=@${options.sarif}\n`
          )
        );
      }

      // Save JSON output
      if (options.json) {
        require('fs').writeFileSync(options.json, JSON.stringify(scanResult, null, 2), 'utf-8');
        console.log(chalk.cyan(`   JSON report saved to ${options.json}\n`));
      }

      // Exit with error code if findings and --fail-on-findings
      if (options.failOnFindings && scanResult.findings.length > 0) {
        console.log(
          chalk.red('❌ Scan failed: Security issues found. Fix issues before deployment.\n')
        );
        process.exit(1);
      }

      console.log(chalk.bold.green('✅ Scan complete!\n'));
    } catch (error) {
      console.error(chalk.red('\n❌ Error during IaC scan:'));
      console.error(error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
