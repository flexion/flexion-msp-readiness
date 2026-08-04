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
import { validateAWSEnvironment, printAWSEnvValidation } from './utils/aws-env-validator';
import { assessWorkspace, printWorkspaceAssessment } from './assessors/workspace-assessor';
import { updateDocumentStatus } from './utils/frontmatter';
import { manuallyApprovePlaybook, markForRemediation } from './utils/auto-approval';
import { generateWorkspaceDashboard } from './dashboard/workspace-dashboard';
import { saveWorkspaceReport } from './assessors/workspace-report-generator';
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
  collectCloudWatchEvidence,
  saveCloudWatchEvidence,
  printCloudWatchEvidenceSummary,
} from './collectors/cloudwatch-collector';
import {
  collectSSMEvidence,
  saveSSMEvidence,
  printSSMEvidenceSummary,
} from './collectors/ssm-collector';
import {
  collectIAMEvidence,
  saveIAMEvidence,
  printIAMEvidenceSummary,
} from './collectors/iam-collector';
import {
  collectPublicResourcesEvidence,
  savePublicResourcesEvidence,
  printPublicResourcesEvidenceSummary,
} from './collectors/public-resources-collector';
import {
  collectEncryptionEvidence,
  saveEncryptionEvidence,
  printEncryptionEvidenceSummary,
} from './collectors/encryption-collector';
import {
  collectAvailabilityEvidence,
  saveAvailabilityEvidence,
  printAvailabilityEvidenceSummary,
} from './collectors/availability-collector';
import {
  collectProcessTemplatesEvidence,
  generateGitHistorySummary,
  saveProcessTemplatesEvidence,
  printProcessTemplatesEvidenceSummary,
} from './collectors/process-templates-collector';
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
  .option('--self', 'Assess workspace (this repo) instead of external project')
  .option('--no-auto-approve', 'Disable auto-approval of playbooks (keep manual workflow)')
  .option('--no-validation', 'Skip evidence validation (faster but less accurate)')
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

      // Check if using self-assessment mode
      const assessmentMode = options.self || config.assessment.mode === 'self' ? 'self' : 'external';

      if (assessmentMode === 'self') {
        // Self-assessment: Assess workspace completeness
        console.log(chalk.cyan('Mode: Self-assessment (workspace)\n'));

        const workspaceAssessment = await assessWorkspace(
          config.output.playbooks_path,
          config.output.evidence_path,
          options.validation !== false, // Enable validation unless --no-validation
          options.autoApprove !== false  // Enable auto-approval unless --no-auto-approve
        );

        printWorkspaceAssessment(workspaceAssessment);

        // Save workspace report
        const reportFormat = (options.format || config.output.report_format) as
          'markdown' | 'json' | 'both';
        const savedFiles = saveWorkspaceReport(
          workspaceAssessment,
          config.project.name,
          config.msp.version,
          options.output,
          reportFormat
        );

        console.log(chalk.bold('\n📄 Reports generated:\n'));
        if (savedFiles.markdownPath) {
          console.log(chalk.cyan(`  📝 Markdown: ${savedFiles.markdownPath}`));
        }
        if (savedFiles.jsonPath) {
          console.log(chalk.cyan(`  📊 JSON:     ${savedFiles.jsonPath}`));
        }

        console.log(chalk.gray('\nFor full AWS analysis, run without --self flag.\n'));
        return;
      }

      // External mode: Continue with normal assessment
      console.log(chalk.cyan('Mode: External project assessment\n'));

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
          // Validate AWS environment before making API calls
          const envValidation = validateAWSEnvironment(config.aws.profile);
          printAWSEnvValidation(envValidation, false);

          if (!envValidation.isValid) {
            console.error(chalk.red('\n⚠️  Cannot proceed with AWS analysis due to environment errors.\n'));
            console.error(chalk.yellow('Tip: Use --skip-aws to run assessment without AWS analysis.\n'));
            process.exit(1);
          }

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

      // Validate AWS environment before making API calls
      const envValidation = validateAWSEnvironment(config.aws.profile);
      printAWSEnvValidation(envValidation, false);

      if (!envValidation.isValid) {
        console.error(chalk.red('\n⚠️  Cannot proceed with evidence collection due to environment errors.\n'));
        process.exit(1);
      }

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

      // Collect CloudWatch evidence (OPS-003)
      spinner.text = 'Collecting CloudWatch evidence...';
      spinner.start();
      try {
        const cloudwatchEvidence = await collectCloudWatchEvidence(
          config.aws.region,
          config.aws.profile
        );
        const artifact = saveCloudWatchEvidence(
          cloudwatchEvidence,
          `${evidencePath}/cloudwatch-monitoring.json`
        );
        artifacts.push(artifact);
        spinner.succeed('CloudWatch evidence collected');
        printCloudWatchEvidenceSummary(cloudwatchEvidence);
      } catch (error) {
        spinner.warn(
          `CloudWatch collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Collect SSM evidence (OPS-008)
      spinner.text = 'Collecting Systems Manager evidence...';
      spinner.start();
      try {
        const ssmEvidence = await collectSSMEvidence(config.aws.region, config.aws.profile);
        const artifact = saveSSMEvidence(ssmEvidence, `${evidencePath}/ssm-patch-compliance.json`);
        artifacts.push(artifact);
        spinner.succeed('Systems Manager evidence collected');
        printSSMEvidenceSummary(ssmEvidence);
      } catch (error) {
        spinner.warn(
          `SSM collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Collect IAM evidence (SEC-004, SECP-001)
      spinner.text = 'Collecting IAM evidence...';
      spinner.start();
      try {
        const iamEvidence = await collectIAMEvidence(config.aws.region, config.aws.profile);
        const artifact = saveIAMEvidence(iamEvidence, `${evidencePath}/iam-users-roles.json`);
        artifacts.push(artifact);
        spinner.succeed('IAM evidence collected');
        printIAMEvidenceSummary(iamEvidence);
      } catch (error) {
        spinner.warn(
          `IAM collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Collect public resources evidence (SECP-002)
      spinner.text = 'Collecting public resources evidence...';
      spinner.start();
      try {
        const publicResourcesEvidence = await collectPublicResourcesEvidence(
          config.aws.region,
          config.aws.profile
        );
        const artifact = savePublicResourcesEvidence(
          publicResourcesEvidence,
          `${evidencePath}/public-resources.json`
        );
        artifacts.push(artifact);
        spinner.succeed('Public resources evidence collected');
        printPublicResourcesEvidenceSummary(publicResourcesEvidence);
      } catch (error) {
        spinner.warn(
          `Public resources collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Collect encryption evidence (SEC-009)
      spinner.text = 'Collecting encryption evidence...';
      spinner.start();
      try {
        const encryptionEvidence = await collectEncryptionEvidence(
          config.aws.region,
          config.aws.profile
        );
        const artifact = saveEncryptionEvidence(
          encryptionEvidence,
          `${evidencePath}/encryption-status.json`
        );
        artifacts.push(artifact);
        spinner.succeed('Encryption evidence collected');
        printEncryptionEvidenceSummary(encryptionEvidence);
      } catch (error) {
        spinner.warn(
          `Encryption collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Collect availability evidence (OPS-011)
      spinner.text = 'Collecting availability management evidence...';
      spinner.start();
      try {
        const availabilityEvidence = await collectAvailabilityEvidence(
          config.aws.region,
          config.aws.profile
        );
        const artifact = saveAvailabilityEvidence(
          availabilityEvidence,
          `${evidencePath}/availability-config.json`
        );
        artifacts.push(artifact);
        spinner.succeed('Availability management evidence collected');
        printAvailabilityEvidenceSummary(availabilityEvidence);
      } catch (error) {
        spinner.warn(
          `Availability collection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Collect process templates evidence (OPSP-001, OPSP-002, OPSP-003, OPSP-005, OPS-006, SEC-001)
      spinner.text = 'Collecting process templates evidence...';
      spinner.start();
      try {
        const processTemplatesEvidence = await collectProcessTemplatesEvidence(
          process.cwd(),
          config.output.playbooks_path
        );
        const artifact = saveProcessTemplatesEvidence(
          processTemplatesEvidence,
          `${evidencePath}/process-templates.json`
        );
        artifacts.push(artifact);

        // Generate Git history summary for change management
        generateGitHistorySummary(process.cwd(), `${evidencePath}/git-history.json`);

        spinner.succeed('Process templates evidence collected');
        printProcessTemplatesEvidenceSummary(processTemplatesEvidence);
      } catch (error) {
        spinner.warn(
          `Process templates collection failed: ${error instanceof Error ? error.message : String(error)}`
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
  .option('--force', 'Overwrite user-modified files')
  .option('--dry-run', 'Show what would be generated without writing files')
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

          const generateOptions = {
            force: options.force,
            dryRun: options.dryRun,
          };

          const generated = await generatePlaybooks(config, missing, outputDir, generateOptions);
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
  .option('--workspace', 'Generate workspace dashboard instead of project dashboard')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n📊 Building MSP Dashboard\n'));

      const spinner = ora('Loading configuration...').start();
      const config = loadConfig(options.config);
      spinner.succeed('Configuration loaded');

      // Check if workspace mode
      if (options.workspace || config.assessment.mode === 'self') {
        // Generate workspace text dashboard
        console.log(chalk.cyan('Mode: Workspace dashboard\n'));

        const workspaceAssessment = await assessWorkspace(
          config.output.playbooks_path,
          config.output.evidence_path,
          false, // Skip validation for dashboard generation (faster)
          false  // Skip auto-approval for dashboard
        );

        // Create detailed text dashboard
        const dashboardPath = config.output.dashboard_path.replace('.html', '-workspace.md');
        const dashboardContent = generateWorkspaceDashboard(workspaceAssessment, config);

        require('fs').writeFileSync(dashboardPath, dashboardContent, 'utf-8');

        console.log(chalk.bold.green('\n✅ Workspace dashboard complete!\n'));
        console.log(chalk.cyan(`  Dashboard: ${dashboardPath}\n`));

        return;
      }

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
 * Status command - show workspace completeness status
 */
program
  .command('status')
  .description('Show MSP workspace completeness status')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .action(async options => {
    try {
      const config = loadConfig(options.config);

      console.log(chalk.bold.blue('\n📊 MSP Readiness Status\n'));
      console.log(`Project: ${chalk.bold(config.project.name)}`);
      console.log(`Stage: ${chalk.bold(config.aws.stage)}`);
      console.log(`MSP Version: ${chalk.bold(config.msp.version)}`);
      console.log(`CIS IG Level: ${chalk.bold(config.msp.ig_level)}`);

      // Assess workspace completeness
      const assessment = await assessWorkspace(
        config.output.playbooks_path,
        config.output.evidence_path,
        true,  // Enable validation
        false  // Don't auto-approve in status command
      );

      printWorkspaceAssessment(assessment);

      console.log(chalk.gray('\nRun "msp-readiness assess" for full AWS assessment.\n'));
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(chalk.red('\n' + error.message + '\n'));
        process.exit(1);
      }
      throw error;
    }
  });

/**
 * Approve command - mark requirements as approved for audit
 */
program
  .command('approve <requirement-ids>')
  .description('Mark playbooks as approved for audit (comma-separated list)')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .action(async (ids, options) => {
    try {
      const config = loadConfig(options.config);
      const requirementIds = ids.split(',').map((id: string) => id.trim());

      console.log(chalk.bold.blue('\n✅ Approving Playbooks\n'));

      // Map requirement IDs to playbook filenames
      const playbookMap: Record<string, string> = {
        'OPSP-001': 'incident-response.md',
        'SEC-010': 'incident-response.md',
        'OPS-006': 'change-management.md',
        'OPSP-003': 'change-management.md',
        'OPS-003': 'monitoring-alerting.md',
        'OPS-005': 'backup-recovery.md',
        'OPS-008': 'patch-management.md',
        'SEC-008': 'vulnerability-remediation.md',
        'SEC-009': 'data-protection.md',
        'SEC-001': 'security-policies.md',
        'SEC-003': 'aws-account-config.md',
        'SEC-004': 'iam-management.md',
        'OPSP-002': 'problem-management.md',
        'OPSP-005': 'service-continuity.md',
        'OPS-004': 'logging.md',
        'OPS-011': 'availability-management.md',
        'SEC-007': 'vulnerability-scanning.md',
        'SECP-001': 'access-key-rotation.md',
        'SECP-002': 'public-resources.md',
      };

      let approved = 0;
      let notFound = 0;

      for (const reqId of requirementIds) {
        const filename = playbookMap[reqId];
        if (!filename) {
          console.log(chalk.yellow(`⚠ Unknown requirement: ${reqId}`));
          notFound++;
          continue;
        }

        const playbookPath = path.join(config.output.playbooks_path, filename);
        if (!require('fs').existsSync(playbookPath)) {
          console.log(chalk.yellow(`⚠ Playbook not found: ${reqId} (${filename})`));
          notFound++;
          continue;
        }

        try {
          const result = manuallyApprovePlaybook(playbookPath);
          console.log(chalk.green(`✓ Approved: ${reqId} (manual)`));
          if (result.validationPassed === false) {
            console.log(chalk.yellow(`  ⚠️  Note: Validation previously failed, manual override applied`));
          }
          approved++;
        } catch (error) {
          console.log(chalk.red(`✗ Failed to approve ${reqId}: ${error}`));
          notFound++;
        }
      }

      console.log(chalk.bold.green(`\n✅ Approved ${approved} playbook(s)`));
      if (notFound > 0) {
        console.log(chalk.yellow(`⚠️  ${notFound} not found or unknown\n`));
      }
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
