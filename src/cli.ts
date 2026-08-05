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
import { generateWorkspaceDashboard } from './dashboard/workspace-dashboard';
import {
  saveWorkspaceReport,
  saveEnhancedWorkspaceReport,
} from './assessors/workspace-report-generator';
import { buildCompliancePackage } from './utils/compliance-package-builder';
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
  generatePlaybookForRequirement,
  generateAllRequirementPlaybooks,
  identifyMissingPlaybooks,
  AVAILABLE_PLAYBOOKS,
  AVAILABLE_RUNBOOKS,
  printGenerationSummary,
} from './generators/playbook-generator';
import { DocumentCompleter } from './generators/document-completer.js';
import {
  prepareGenerationBatch,
  outputInteractiveContext,
  generateDocumentTemplate,
} from './generators/ai-document-generator.js';
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
import { executeGenerateTemplates } from './commands/generate-templates';
import { executeValidate } from './commands/validate';
import { executeGaps } from './commands/gaps';
import { executeExport } from './commands/export';

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
  .option('--category <category>', 'Assess specific category only')
  .option('--automated-only', 'Only run automated checks (skip manual docs)')
  .option('--manual-only', 'Only check manual documentation')
  .option('--show-automation', 'Show automation coverage for each requirement')
  .option('--interactive-ai', 'Output project context for AI-powered document generation')
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
      const assessmentMode =
        options.self || config.assessment.mode === 'self' ? 'self' : 'external';

      if (assessmentMode === 'self') {
        // Self-assessment: Assess workspace completeness
        console.log(chalk.cyan('Mode: Self-assessment (workspace)\n'));

        const workspaceAssessment = await assessWorkspace(
          config.output.playbooks_path,
          config.output.evidence_path,
          true, // Enable evidence validation
          config.project.docs_path // Check docs/msp for auto-completed documents
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
            console.error(
              chalk.red('\n⚠️  Cannot proceed with AWS analysis due to environment errors.\n')
            );
            console.error(
              chalk.yellow('Tip: Use --skip-aws to run assessment without AWS analysis.\n')
            );
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

      // Auto-generate playbooks if configured
      if (config.assessment.auto_generate_docs) {
        spinner.text = 'Generating playbooks...';
        spinner.start();
        try {
          const playbooksPath = config.output.playbooks_path;
          const generated = await generateAllRequirementPlaybooks(
            config,
            playbooksPath
          );
          spinner.succeed(`Generated ${generated.length} playbook(s)`);
          console.log(chalk.cyan(`  📖 Playbooks: ${playbooksPath}/\n`));
        } catch (error) {
          spinner.warn('Playbook generation skipped');
          console.log(chalk.yellow(`     Run 'msp-readiness generate --all' to generate playbooks\n`));
        }
      }

      // Interactive AI Mode: Output project context for Claude to generate docs
      if (options.interactiveAi) {
        spinner.text = 'Preparing project context for AI generation...';
        spinner.start();

        try {
          const completer = new DocumentCompleter(config);
          const context = await completer.extractProjectContext();

          // Import MSP requirements
          const { MSP_REQUIREMENTS } = await import('./data/msp-requirements.js');

          // Identify requirements that could benefit from AI generation
          // (not already completed, not fully automated)
          const requirementsNeedingDocs = MSP_REQUIREMENTS.filter(req => {
            // Check if already has completed doc
            const assessment = requirementAssessments.find(a => a.requirement.id === req.id);
            return assessment && assessment.status !== 'addressed';
          });

          const batch = prepareGenerationBatch(
            MSP_REQUIREMENTS,
            context,
            requirementsNeedingDocs
          );

          spinner.succeed('Project context prepared');

          // Output formatted context
          console.log('\n' + outputInteractiveContext(batch));

          console.log(chalk.bold.cyan('📝 Next Step: Generate Documents'));
          console.log(chalk.gray('\nI (Claude) can now write these documents. For each requirement, I will:'));
          console.log(chalk.gray('  1. Use the project context above'));
          console.log(chalk.gray('  2. Write comprehensive, project-specific documentation'));
          console.log(chalk.gray('  3. Save to docs/msp/{category}/{requirement-id}.md'));
          console.log(chalk.gray('\nWould you like me to proceed with document generation?\n'));

          // Store context for use in follow-up commands
          const fs = await import('fs/promises');
          await fs.writeFile(
            '.msp-context.json',
            JSON.stringify({ batch, context }, null, 2),
            'utf-8'
          );
          console.log(chalk.gray('💾 Context saved to .msp-context.json for reference\n'));

        } catch (error) {
          spinner.fail('Failed to prepare context');
          console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        }

        return; // Exit after interactive mode
      }

      // Auto-complete documentation if configured (legacy template mode)
      if (config.assessment.auto_generate_docs && !options.interactiveAi) {
        spinner.text = 'Auto-completing documentation...';
        spinner.start();
        try {
          const completer = new DocumentCompleter(config);
          const context = await completer.extractProjectContext();

          console.log(
            chalk.cyan(`\n  🔍 Scanned project: ${context.awsServices.length} AWS services, ${context.cdkStacks.length} CDK stacks\n`)
          );

          // Import MSP requirements
          const { MSP_REQUIREMENTS } = await import('./data/msp-requirements.js');
          const docsPath = config.project.docs_path;

          let completedCount = 0;
          for (const req of MSP_REQUIREMENTS) {
            const content = await completer.generateCompletedDocument(req, context);
            if (content) {
              // Determine save path based on category
              const categoryPath = path.join(docsPath, req.category);
              const filename = `${req.id.toLowerCase()}-${req.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
              const fullPath = path.join(categoryPath, filename);

              // Ensure directory exists
              const fs = await import('fs/promises');
              await fs.mkdir(categoryPath, { recursive: true });

              // Write completed document
              await fs.writeFile(fullPath, content, 'utf-8');
              completedCount++;
            }
          }

          spinner.succeed(`Auto-completed ${completedCount} document(s)`);
          console.log(chalk.cyan(`  📝 Documents: ${docsPath}/\n`));
        } catch (error) {
          spinner.warn('Document auto-completion skipped');
          console.log(
            chalk.yellow(
              `     ${error instanceof Error ? error.message : 'Unknown error'}\n`
            )
          );
        }
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
        console.error(
          chalk.red('\n⚠️  Cannot proceed with evidence collection due to environment errors.\n')
        );
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
  .option('-r, --requirement <id>', 'Generate playbook for specific requirement ID (e.g., BUS-001)')
  .option('--all', 'Generate playbooks for all 46 requirements')
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

      // Generate specific requirement playbook
      if (options.requirement) {
        spinner.text = `Generating playbook for ${options.requirement}...`;
        spinner.start();

        const generateOptions = {
          force: options.force,
          dryRun: options.dryRun,
        };

        const playbook = await generatePlaybookForRequirement(
          config,
          options.requirement,
          outputDir,
          generateOptions
        );

        if (playbook) {
          spinner.succeed(`Generated playbook for ${options.requirement}`);
          console.log(chalk.cyan(`\n  Type: ${playbook.mode}`));
          console.log(chalk.cyan(`  Automation: ${playbook.automationType} (${playbook.automationPercentage}%)`));
          console.log(chalk.cyan(`  Output: ${playbook.path}\n`));
        } else {
          spinner.fail(`Failed to generate playbook for ${options.requirement}`);
        }
        return;
      }

      // Generate all requirement playbooks
      if (options.all) {
        spinner.text = 'Generating playbooks for all 46 requirements...';
        spinner.start();

        const generateOptions = {
          force: options.force,
          dryRun: options.dryRun,
        };

        const generated = await generateAllRequirementPlaybooks(config, outputDir, generateOptions);
        spinner.succeed(`Generated ${generated.length} playbook(s)`);
        printGenerationSummary(generated);

        console.log(chalk.bold.green(`\n✅ Generation complete!\n`));
        console.log(chalk.cyan(`  Output directory: ${outputDir}\n`));
        return;
      }

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
          false // Skip validation for dashboard generation (faster)
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
        true // Enable validation
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
 * Enhanced report command - generate comprehensive reports with category grouping
 */
program
  .command('report')
  .description('Generate enhanced MSP readiness assessment report')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option(
    '-f, --format <format>',
    'Output format: markdown, html, json, or all',
    'markdown'
  )
  .option('-o, --output <path>', 'Output path (without extension)', './msp-assessment-report')
  .option('--no-summary', 'Exclude executive summary')
  .option('--no-details', 'Exclude requirement details')
  .option('--no-checklist', 'Exclude manual evidence checklist')
  .option('--no-remediation', 'Exclude gap remediation plan')
  .action(async options => {
    try {
      const config = loadConfig(options.config);
      const spinner = ora('Generating enhanced report...').start();

      // Assess workspace
      const assessment = await assessWorkspace(
        config.output.playbooks_path,
        config.output.evidence_path,
        true
      );

      // Determine formats to generate
      const formats = options.format === 'all' ? ['markdown', 'html', 'json'] : [options.format];

      console.log(chalk.bold.blue('\n📝 Generating Enhanced Reports\n'));

      for (const format of formats) {
        spinner.text = `Generating ${format.toUpperCase()} report...`;

        const result = saveEnhancedWorkspaceReport(assessment, config.project.name, options.output, {
          format: format as 'markdown' | 'html' | 'json',
          includeSummary: options.summary !== false,
          includeDetails: options.details !== false,
          includeChecklist: options.checklist !== false,
          includeRemediationPlan: options.remediation !== false,
          groupBy: 'category',
        });

        spinner.succeed(`${format.toUpperCase()} report generated: ${chalk.green(result.path)}`);
      }

      console.log(
        chalk.gray('\nView the HTML report in your browser for an interactive experience.')
      );
      console.log(
        chalk.gray('Use the JSON report for programmatic access to assessment data.\n')
      );
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(chalk.red('\n' + error.message + '\n'));
        process.exit(1);
      }
      throw error;
    }
  });

/**
 * Package command - build complete compliance package
 */
program
  .command('package')
  .description('Build complete MSP compliance package for audit submission')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('--format <format>', 'Package format: directory or zip', 'directory')
  .option('--no-playbooks', 'Exclude playbooks')
  .option('--no-evidence', 'Exclude evidence')
  .option('--no-reports', 'Exclude reports')
  .option('--templates', 'Include templates for manual requirements')
  .action(async options => {
    try {
      const config = loadConfig(options.config);
      const spinner = ora('Building compliance package...').start();

      console.log(chalk.bold.blue('\n📦 Building MSP Compliance Package\n'));

      // Assess workspace
      spinner.text = 'Assessing workspace...';
      const assessment = await assessWorkspace(
        config.output.playbooks_path,
        config.output.evidence_path,
        true
      );
      spinner.succeed('Workspace assessed');

      // Build package
      spinner.text = 'Building package structure...';
      spinner.start();

      const packagePath = await buildCompliancePackage(config, assessment, options.output, {
        format: options.format,
        includePlaybooks: options.playbooks !== false,
        includeEvidence: options.evidence !== false,
        includeReports: options.reports !== false,
        includeTemplates: options.templates === true,
      });

      spinner.succeed(`Package built: ${chalk.green(packagePath)}`);

      console.log(chalk.gray('\nPackage contents:'));
      console.log(chalk.gray('  - Executive summary and detailed reports'));
      console.log(chalk.gray('  - Operational playbooks'));
      console.log(chalk.gray('  - AWS evidence artifacts'));
      console.log(chalk.gray('  - Requirement matrix (CSV)'));
      console.log(chalk.gray('  - README with usage instructions'));

      if (options.format === 'zip') {
        console.log(
          chalk.yellow(
            '\nNote: ZIP creation requires manual step. Run: zip -r msp-compliance-package.zip msp-compliance-package/'
          )
        );
      }

      console.log(chalk.gray('\nReady for audit submission!\n'));
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

        updateDocumentStatus(playbookPath, 'approved');
        console.log(chalk.green(`✓ Approved: ${reqId}`));
        approved++;
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

/**
 * Generate-templates command - generate document templates for non-technical requirements
 */
program
  .command('generate-templates')
  .description('Generate document templates for non-technical requirements')
  .option('-r, --requirement <id>', 'Generate template for specific requirement')
  .option(
    '-c, --category <category>',
    'Generate templates for category (business, people, governance)'
  )
  .option('-o, --output <path>', 'Output directory', './docs/msp')
  .option('--all', 'Generate all templates')
  .option('--force', 'Overwrite existing files')
  .action(async options => {
    try {
      await executeGenerateTemplates(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error generating templates:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Validate command - validate evidence quality and completeness
 */
program
  .command('validate')
  .description('Validate evidence quality and completeness')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('-r, --requirement <id>', 'Validate specific requirement')
  .option('--category <category>', 'Validate category')
  .option('--all', 'Validate all evidence', true)
  .option('--strict', 'Fail on warnings (not just errors)')
  .option('-f, --format <type>', 'Output format (text|json|html)', 'text')
  .option('-o, --output <path>', 'Save report to file')
  .action(async options => {
    try {
      await executeValidate(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error validating evidence:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Gaps command - analyze compliance gaps
 */
program
  .command('gaps')
  .description('Analyze compliance gaps')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('--by-priority', 'Sort by priority')
  .option('--by-effort', 'Sort by estimated effort')
  .option('--by-automation', 'Sort by automation potential')
  .option('--category <category>', 'Show gaps for category')
  .option('--automated-only', 'Only show automatable gaps')
  .option('-f, --format <type>', 'Output format (text|json|csv)', 'text')
  .action(async options => {
    try {
      await executeGaps(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error analyzing gaps:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Export command - export MSP compliance package
 */
program
  .command('export')
  .description('Export MSP compliance package')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('-f, --format <type>', 'Export format (html|pdf|zip)', 'zip')
  .option('-o, --output <path>', 'Output location', './msp-compliance-package')
  .option('--include-evidence', 'Include evidence files', true)
  .option('--include-playbooks', 'Include playbooks', true)
  .action(async options => {
    try {
      await executeExport(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error exporting package:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * AI Generate command - Generate documents using saved context
 */
program
  .command('ai-generate')
  .description('Generate MSP documents using AI from saved project context')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('--context <path>', 'Path to saved context file', '.msp-context.json')
  .option('--requirement <id>', 'Generate specific requirement only')
  .option('--category <category>', 'Generate all requirements in category')
  .option('--dry-run', 'Show what would be generated without writing files')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n🤖 MSP AI Document Generator\n'));

      // Load saved context
      const fs = await import('fs/promises');
      let contextData;
      try {
        const contextFile = await fs.readFile(options.context, 'utf-8');
        contextData = JSON.parse(contextFile);
      } catch (error) {
        console.error(chalk.red('❌ Context file not found.'));
        console.log(chalk.yellow('\n💡 Run with --interactive-ai flag first to generate context:\n'));
        console.log(chalk.cyan('   msp-readiness assess --interactive-ai\n'));
        process.exit(1);
      }

      const { batch, context } = contextData;
      const config = loadConfig(options.config);

      console.log(chalk.cyan(`📊 Loaded context for: ${context.projectName}`));
      console.log(chalk.gray(`   ${batch.requests.length} requirements ready for generation\n`));

      // Filter requirements if specified
      let requestsToGenerate = batch.requests;
      if (options.requirement) {
        requestsToGenerate = batch.requests.filter(
          (r: any) => r.requirement.id === options.requirement
        );
        if (requestsToGenerate.length === 0) {
          console.error(chalk.red(`❌ Requirement ${options.requirement} not found in context`));
          process.exit(1);
        }
      } else if (options.category) {
        requestsToGenerate = batch.requests.filter(
          (r: any) => r.requirement.category === options.category
        );
        if (requestsToGenerate.length === 0) {
          console.error(chalk.red(`❌ No requirements found in category ${options.category}`));
          process.exit(1);
        }
      }

      console.log(chalk.bold('📝 Ready to generate documents:\n'));
      for (const { requirement } of requestsToGenerate) {
        console.log(chalk.cyan(`   • ${requirement.id}: ${requirement.name}`));
      }
      console.log('');

      if (options.dryRun) {
        console.log(chalk.yellow('🔍 Dry run mode - no files will be written\n'));

        // Show template for first requirement
        console.log(chalk.bold('Sample template structure:\n'));
        console.log(chalk.gray('─'.repeat(80)));
        console.log(generateDocumentTemplate(requestsToGenerate[0].requirement));
        console.log(chalk.gray('─'.repeat(80)));
        console.log('');
      } else {
        console.log(chalk.bold.yellow('⚠️  This command prepares the context, but document generation'));
        console.log(chalk.yellow('   happens interactively with Claude in the conversation.\n'));

        console.log(chalk.cyan('📋 To generate documents:'));
        console.log(chalk.gray('   1. Review the requirements above'));
        console.log(chalk.gray('   2. Ask Claude to generate them'));
        console.log(chalk.gray('   3. Claude will use the project context and write each document\n'));

        console.log(chalk.bold('Example prompt:\n'));
        console.log(chalk.gray('   "Generate the BUS-001 document using the context"'));
        console.log(chalk.gray('   "Write all business category documents"\n'));
      }

      console.log(chalk.green('✅ Ready for interactive AI generation\n'));

    } catch (error) {
      console.error(chalk.red('\n❌ Error:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Prerequisites command - assess MSP Prerequisites (pre-audit requirements)
 */
program
  .command('prerequisites')
  .description('Assess MSP Prerequisites (requirements that must be met before ISSI audit)')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('-o, --output <path>', 'Output path for report', './prerequisite-assessment-report')
  .option('--format <format>', 'Report format: markdown, json, or both', 'both')
  .option('--interactive-ai', 'Output context for AI-powered prerequisite documentation')
  .action(async options => {
    try {
      console.log(chalk.bold.blue('\n📋 MSP Prerequisites Assessment\n'));

      // Load configuration
      const spinner = ora('Loading configuration...').start();
      let config;
      try {
        config = loadConfig(options.config);
        spinner.succeed('Configuration loaded');
      } catch (error) {
        spinner.fail('Configuration error');
        if (error instanceof ConfigError) {
          console.error(chalk.red('\n' + error.message + '\n'));
          process.exit(1);
        }
        throw error;
      }

      // Import prerequisite assessor
      const { PrerequisiteAssessor, formatPrerequisiteReport } = await import(
        './assessors/prerequisite-assessor'
      );
      const { MSP_PREREQUISITES } = await import('./data/msp-prerequisites');

      // Run assessment
      spinner.text = 'Assessing prerequisites...';
      spinner.start();
      const assessor = new PrerequisiteAssessor(config);
      const assessment = await assessor.assess();
      spinner.succeed('Prerequisites assessed');

      console.log(chalk.bold('\n📊 Assessment Summary:\n'));
      console.log(`Total Prerequisites:     ${assessment.summary.total}`);
      console.log(
        chalk.green(`✅ Met:                    ${assessment.summary.met}`)
      );
      console.log(
        chalk.yellow(`⚠️  Partial:                ${assessment.summary.partial}`)
      );
      console.log(
        chalk.red(`❌ Not Met:                ${assessment.summary.notMet}`)
      );
      console.log(
        chalk.cyan(`📈 Overall Completion:     ${assessment.summary.completionPercentage}%`)
      );
      console.log(
        chalk.gray(`⏱️  Estimated Effort:       ${assessment.summary.totalEffortHours}h`)
      );

      console.log(chalk.bold('\n📂 By Category:\n'));
      Object.keys(assessment.byCategory)
        .sort()
        .forEach(cat => {
          const stats = assessment.byCategory[cat];
          console.log(
            `  ${cat.padEnd(15)} ${stats.completionPercentage}% (${stats.met}/${stats.total}) ` +
              `[Met: ${stats.met}, Partial: ${stats.partial}, Not Met: ${stats.notMet}]`
          );
        });

      // Handle interactive AI mode
      if (options.interactiveAi) {
        console.log(chalk.bold.cyan('\n🤖 AI-Powered Generation Mode\n'));
        console.log(
          chalk.gray('================================================================================')
        );
        console.log(
          chalk.bold.cyan('📊 MSP PREREQUISITES - INTERACTIVE AI GENERATION MODE')
        );
        console.log(
          chalk.gray('================================================================================\n')
        );

        // Import AI generation utilities
        const { DocumentCompleter } = await import('./generators/document-completer');
        const completer = new DocumentCompleter(config);
        const projectContext = await completer.extractProjectContext();

        // Find prerequisites that need documentation
        const prereqsNeedingDocs = assessment.prerequisites.filter(
          p => p.status === 'not-met' || p.status === 'partial'
        );

        console.log(chalk.green(`✅ Project Analysis Complete\n`));
        console.log(
          chalk.yellow(
            `Found ${prereqsNeedingDocs.length} prerequisites ready for AI-powered documentation.`
          )
        );
        console.log(
          chalk.gray(`Estimated time savings: ${assessment.summary.totalEffortHours} hours\n`)
        );

        // Output project context
        console.log(chalk.bold.white('PROJECT CONTEXT'));
        console.log(
          chalk.gray('--------------------------------------------------------------------------------\n')
        );

        console.log(chalk.bold(`# Project: ${projectContext.projectName}\n`));
        console.log(chalk.gray('**Technology Stack**'));
        console.log(`Runtime: ${projectContext.runtime || 'Unknown'}`);
        console.log(`AWS Services (${projectContext.awsServices.length}): ${projectContext.awsServices.join(', ')}`);
        console.log(`\nCDK Stacks: ${projectContext.cdkStacks.length}`);
        const totalTeamMembers = projectContext.teams.reduce((sum, t) => sum + t.members.length, 0);
        console.log(`Team Members: ${totalTeamMembers}\n`);

        // Output prerequisites needing documentation
        console.log(chalk.bold.white('\nPREREQUISITES NEEDING DOCUMENTATION'));
        console.log(
          chalk.gray('--------------------------------------------------------------------------------\n')
        );

        prereqsNeedingDocs.forEach(prereq => {
          console.log(chalk.bold.cyan(`${prereq.prerequisite.id}: ${prereq.prerequisite.name}`));
          console.log(chalk.gray(`Category: ${prereq.prerequisite.category}`));
          console.log(chalk.gray(`Status: ${prereq.status} (${prereq.confidence}% confidence)`));
          console.log(chalk.gray(`Estimated Effort: ${prereq.estimatedEffort}h\n`));
        });

        // Save context for AI generation
        const contextPath = path.join(process.cwd(), '.msp-prerequisites-context.json');
        const fs = await import('fs');
        fs.writeFileSync(
          contextPath,
          JSON.stringify(
            {
              projectContext,
              assessment,
              prerequisitesNeedingDocs: prereqsNeedingDocs,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        console.log(
          chalk.green(`\n💾 Context saved to ${chalk.cyan('.msp-prerequisites-context.json')}\n`)
        );
        console.log(chalk.bold.yellow('NEXT STEPS'));
        console.log(
          chalk.gray('--------------------------------------------------------------------------------\n')
        );
        console.log(
          chalk.white(
            '1. Use Claude to generate prerequisite documentation for each requirement'
          )
        );
        console.log(
          chalk.white('2. Save documents to docs/msp/prerequisites/{prereq-id}.md')
        );
        console.log(chalk.white('3. Re-run assessment to verify completion\n'));

        console.log(chalk.bold('Example Claude prompt:\n'));
        console.log(
          chalk.gray(
            '   "Launch parallel agents to generate all prerequisite documentation'
          )
        );
        console.log(chalk.gray('    using .msp-prerequisites-context.json"\n'));

        return;
      }

      // Generate reports
      const reportFormat = (options.format || 'both') as 'markdown' | 'json' | 'both';
      const reportPath = options.output || './prerequisite-assessment-report';

      const fs = await import('fs');
      const savePaths: string[] = [];

      if (reportFormat === 'markdown' || reportFormat === 'both') {
        const markdownPath = `${reportPath}.md`;
        const markdownContent = formatPrerequisiteReport(assessment);
        fs.writeFileSync(markdownPath, markdownContent);
        savePaths.push(markdownPath);
      }

      if (reportFormat === 'json' || reportFormat === 'both') {
        const jsonPath = `${reportPath}.json`;
        fs.writeFileSync(jsonPath, JSON.stringify(assessment, null, 2));
        savePaths.push(jsonPath);
      }

      console.log(chalk.bold('\n📄 Reports generated:\n'));
      savePaths.forEach(p => {
        console.log(chalk.cyan(`  ${p}`));
      });
      console.log('');
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'));
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
