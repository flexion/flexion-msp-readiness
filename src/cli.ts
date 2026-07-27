#!/usr/bin/env node

/**
 * MSP Readiness CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, printConfigSummary, ConfigError } from './config/loader';
import { scanDocumentation, printScanSummary } from './assessors/doc-scanner';
import { matchRequirements, calculateSummary } from './assessors/requirement-matcher';
import {
  generateProjectAssessment,
  generateMarkdownReport,
  saveReport,
} from './assessors/report-generator';

const program = new Command();

program
  .name('msp-readiness')
  .description('Automated AWS MSP Program readiness assessment and documentation generation')
  .version('0.1.0');

/**
 * Assess command - scan documentation and generate assessment report
 */
program
  .command('assess')
  .description('Assess MSP readiness by scanning documentation and AWS infrastructure')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('-o, --output <path>', 'Output path for report', './assessment-report')
  .option('--format <format>', 'Report format: markdown, json, or both', 'both')
  .action(async (options) => {
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

      // Match requirements
      spinner.text = 'Matching requirements...';
      spinner.start();
      const requirementAssessments = matchRequirements(
        docScan,
        config.assessment.skip_requirements
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
        | 'markdown'
        | 'json'
        | 'both';
      const savedFiles = await saveReport(assessment, options.output, reportFormat);
      spinner.succeed('Report saved');

      console.log(chalk.bold('\n📄 Reports generated:\n'));
      if (savedFiles.markdownPath) {
        console.log(chalk.cyan(`  📝 Markdown: ${savedFiles.markdownPath}`));
      }
      if (savedFiles.jsonPath) {
        console.log(chalk.cyan(`  📊 JSON:     ${savedFiles.jsonPath}`));
      }

      console.log(chalk.bold.green('\n✅ Assessment complete!\n'));
    } catch (error) {
      console.error(chalk.red('\n❌ Error during assessment:'));
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
  .action(async (options) => {
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
