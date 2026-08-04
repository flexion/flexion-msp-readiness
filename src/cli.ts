#!/usr/bin/env node

/**
 * MSP Readiness CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { loadConfig, printConfigSummary, ConfigError } from './config/loader';
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
  saveAssessmentToHistory,
  listHistoricalAssessments,
  loadAssessment,
  compareAssessments,
  analyzeTrend,
  exportHistoryToCSV,
  exportComparisonToCSV,
  cleanupOldAssessments,
  getBaselineAssessment,
  getMostRecentAssessment,
} from './utils/history-manager';

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

      // Save to history
      const historyPath = path.join(process.cwd(), '.msp-history');
      const historyFile = saveAssessmentToHistory(assessment, historyPath);
      console.log(chalk.cyan(`  📜 History:  ${historyFile}`));

      // Cleanup old assessments
      const deletedCount = cleanupOldAssessments(historyPath, 10);
      if (deletedCount > 0) {
        console.log(chalk.gray(`  🗑️  Cleaned up ${deletedCount} old assessment(s)`));
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

      const artifacts: EvidenceArtifact[] = [];
      const evidencePath = config.output.evidence_path;

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
      const historyPath = path.join(process.cwd(), '.msp-history');
      const dashboardData = aggregateDashboardData(
        assessment,
        config.output.evidence_path,
        historyPath
      );
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
 * Compare command - compare two assessments
 */
program
  .command('compare')
  .description('Compare baseline and current assessments to track progress')
  .option('--baseline <path>', 'Path to baseline assessment (default: oldest in history)')
  .option('--current <path>', 'Path to current assessment (default: most recent in history)')
  .option('--history <path>', 'Path to history directory', './.msp-history')
  .option('--csv <path>', 'Export comparison to CSV')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n📊 Assessment Comparison\n'));

      const spinner = ora('Loading assessments...').start();

      let baseline, current;

      if (options.baseline && options.current) {
        // Load specific files
        baseline = loadAssessment(options.baseline);
        current = loadAssessment(options.current);
      } else {
        // Load from history
        baseline = getBaselineAssessment(options.history);
        current = getMostRecentAssessment(options.history);

        if (!baseline || !current) {
          spinner.fail('Not enough history');
          console.log(
            chalk.yellow(
              '\n  Need at least 2 assessments in history. Run "msp-readiness assess" multiple times.\n'
            )
          );
          process.exit(1);
        }
      }

      spinner.succeed('Assessments loaded');

      // Compare
      spinner.text = 'Comparing assessments...';
      spinner.start();
      const comparison = compareAssessments(baseline, current);
      spinner.succeed('Comparison complete');

      // Print results
      console.log(chalk.bold('\n📈 Progress Summary:\n'));
      console.log(`Baseline: ${chalk.cyan(baseline.assessmentDate.toLocaleDateString())}`);
      console.log(`Current:  ${chalk.cyan(current.assessmentDate.toLocaleDateString())}`);
      console.log(`Time span: ${chalk.cyan(comparison.summary.timeSpan + ' days')}\n`);

      console.log(chalk.green(`✅ Improved:   ${comparison.summary.totalImproved} requirements`));
      console.log(chalk.red(`❌ Regressed:  ${comparison.summary.totalRegressed} requirements`));
      console.log(
        chalk.gray(`⚪ Unchanged:  ${comparison.summary.totalUnchanged} requirements`)
      );

      if (comparison.newRequirements.length > 0) {
        console.log(
          chalk.blue(`🆕 New:        ${comparison.newRequirements.length} requirements`)
        );
      }

      const netChange = comparison.summary.netChange;
      const netChangeText =
        netChange > 0
          ? chalk.green(`+${netChange}`)
          : netChange < 0
            ? chalk.red(`${netChange}`)
            : chalk.gray('0');
      console.log(`\nNet change: ${netChangeText} requirements\n`);

      // Show improved requirements
      if (comparison.improved.length > 0) {
        console.log(chalk.bold.green(`\n🎉 Improved Requirements:\n`));
        comparison.improved.slice(0, 10).forEach(ra => {
          const baselineRA = baseline.requirementAssessments.find(
            bra => bra.requirement.id === ra.requirement.id
          );
          console.log(
            `  ${chalk.green('↑')} ${chalk.bold(ra.requirement.id)}: ${ra.requirement.name}`
          );
          console.log(`     ${baselineRA?.status} → ${chalk.green(ra.status)}`);
        });
        if (comparison.improved.length > 10) {
          console.log(chalk.gray(`   ... and ${comparison.improved.length - 10} more\n`));
        }
      }

      // Show regressed requirements
      if (comparison.regressed.length > 0) {
        console.log(chalk.bold.red(`\n⚠️  Regressed Requirements:\n`));
        comparison.regressed.forEach(ra => {
          const baselineRA = baseline.requirementAssessments.find(
            bra => bra.requirement.id === ra.requirement.id
          );
          console.log(
            `  ${chalk.red('↓')} ${chalk.bold(ra.requirement.id)}: ${ra.requirement.name}`
          );
          console.log(`     ${baselineRA?.status} → ${chalk.red(ra.status)}`);
        });
      }

      // Export to CSV if requested
      if (options.csv) {
        spinner.text = 'Exporting to CSV...';
        spinner.start();
        exportComparisonToCSV(comparison, options.csv);
        spinner.succeed('CSV exported');
        console.log(chalk.cyan(`\n📊 Comparison exported to: ${options.csv}\n`));
      }

      console.log(chalk.bold.green('\n✅ Comparison complete!\n'));
    } catch (error) {
      console.error(chalk.red('\n❌ Error comparing assessments:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * History command - show assessment history and trends
 */
program
  .command('history')
  .description('Show assessment history and compliance trends')
  .option('--history <path>', 'Path to history directory', './.msp-history')
  .option('--csv <path>', 'Export history to CSV')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n📜 Assessment History\n'));

      const spinner = ora('Loading history...').start();
      const files = listHistoricalAssessments(options.history);

      if (files.length === 0) {
        spinner.fail('No history found');
        console.log(
          chalk.yellow('\n  No historical assessments found. Run "msp-readiness assess" first.\n')
        );
        process.exit(1);
      }

      spinner.succeed(`Found ${files.length} assessment(s)`);

      // Show recent assessments
      console.log(chalk.bold('\n📅 Recent Assessments:\n'));
      files.slice(0, 10).forEach((file, index) => {
        const assessment = loadAssessment(path.join(options.history, file));
        const total =
          assessment.overallStatus.addressed +
          assessment.overallStatus.partial +
          assessment.overallStatus.gap +
          assessment.overallStatus.notApplicable;
        const completionPercent = Math.round((assessment.overallStatus.addressed / total) * 100);

        const dateStr = assessment.assessmentDate.toLocaleDateString();
        const timeStr = assessment.assessmentDate.toLocaleTimeString();

        console.log(
          `${index === 0 ? '📍' : '  '} ${chalk.cyan(dateStr)} ${chalk.gray(timeStr)} - ${chalk.bold(completionPercent + '%')} complete`
        );
        console.log(
          `     ✅ ${assessment.overallStatus.addressed} | ⚠️  ${assessment.overallStatus.partial} | ❌ ${assessment.overallStatus.gap}`
        );
      });

      if (files.length > 10) {
        console.log(chalk.gray(`   ... and ${files.length - 10} more\n`));
      }

      // Analyze trend
      if (files.length >= 2) {
        spinner.text = 'Analyzing trends...';
        spinner.start();
        const trendData = analyzeTrend(options.history);
        spinner.succeed('Trend analysis complete');

        console.log(chalk.bold('\n📈 Trend Analysis:\n'));

        const trendIcon =
          trendData.trend.direction === 'improving'
            ? '📈'
            : trendData.trend.direction === 'declining'
              ? '📉'
              : '➡️';
        const trendColor =
          trendData.trend.direction === 'improving'
            ? chalk.green
            : trendData.trend.direction === 'declining'
              ? chalk.red
              : chalk.yellow;

        console.log(`${trendIcon} Direction: ${trendColor(trendData.trend.direction)}`);
        console.log(
          `📊 Average change: ${trendData.trend.averageChangePerWeek.toFixed(2)}% per week`
        );

        if (trendData.trend.projectedCompletion) {
          console.log(
            `🎯 Projected 100% completion: ${chalk.cyan(trendData.trend.projectedCompletion.toLocaleDateString())}`
          );
        }

        // Show chart (simple text-based)
        console.log(chalk.bold('\n📊 Completion Trend:\n'));
        trendData.assessments.forEach(a => {
          const percent = a.summary.completionPercent;
          const barLength = Math.floor(percent / 2); // Scale to 50 chars max
          const bar = '█'.repeat(barLength);
          const dateStr = a.date.toLocaleDateString();
          console.log(`${dateStr.padEnd(12)} ${bar} ${percent}%`);
        });
      }

      // Export to CSV if requested
      if (options.csv) {
        spinner.text = 'Exporting to CSV...';
        spinner.start();
        exportHistoryToCSV(options.history, options.csv);
        spinner.succeed('CSV exported');
        console.log(chalk.cyan(`\n📊 History exported to: ${options.csv}\n`));
      }

      console.log(chalk.bold.green('\n✅ History loaded!\n'));
    } catch (error) {
      console.error(chalk.red('\n❌ Error loading history:'));
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

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
