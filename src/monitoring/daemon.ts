#!/usr/bin/env node

/**
 * Monitoring daemon - runs scheduled assessments
 */

import * as cron from 'node-cron';
import * as path from 'path';
import { loadConfig } from '../config/loader';
import { scanDocumentation } from '../assessors/doc-scanner';
import { parseCDKInfrastructure } from '../assessors/cdk-parser';
import { matchRequirements, AWSAnalysisResults } from '../assessors/requirement-matcher';
import { analyzeAWSConfig } from '../assessors/aws-config-analyzer';
import { analyzeIAM } from '../assessors/iam-evaluator';
import { analyzeSecurityHub } from '../assessors/security-hub-checker';
import { generateProjectAssessment } from '../assessors/report-generator';
import { runScheduledAssessment } from './scheduler';

/**
 * Start monitoring daemon
 */
export async function startMonitoringDaemon(configPath: string): Promise<void> {
  console.log('🔄 Starting MSP Readiness Monitoring Daemon...\n');

  // Load config
  const config = loadConfig(configPath);

  if (!config.monitoring?.enabled) {
    console.error('Error: Monitoring is not enabled in config');
    process.exit(1);
  }

  const schedule = config.monitoring.schedule;

  // Validate cron expression
  if (!cron.validate(schedule)) {
    console.error(`Error: Invalid cron expression: ${schedule}`);
    process.exit(1);
  }

  console.log(`Project: ${config.project.name}`);
  console.log(`Schedule: ${schedule}`);
  console.log(`Notifications: ${config.notifications ? 'Enabled' : 'Disabled'}`);
  console.log();

  // Schedule task
  const task = cron.schedule(schedule, async () => {
    console.log(`\n[${new Date().toISOString()}] Running scheduled assessment...\n`);

    try {
      await runMonitoringCycle(config);
      console.log(`\n[${new Date().toISOString()}] Scheduled assessment complete\n`);
    } catch (error) {
      console.error(`\n[${new Date().toISOString()}] Scheduled assessment failed:`, error);
    }
  });

  console.log('✅ Daemon started. Press Ctrl+C to stop.\n');
  console.log('Next run:', getNextRun(schedule));
  console.log();

  // Run initial assessment if requested
  if (process.argv.includes('--run-now')) {
    console.log('Running initial assessment...\n');
    await runMonitoringCycle(config);
    console.log('\nInitial assessment complete\n');
  }

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping monitoring daemon...');
    task.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Stopping monitoring daemon...');
    task.stop();
    process.exit(0);
  });
}

/**
 * Run a complete monitoring cycle
 */
async function runMonitoringCycle(config: any): Promise<void> {
  // Scan documentation
  const docScan = await scanDocumentation(config.project.docs_path);
  console.log(`  ✓ Documentation scanned (${docScan.totalFiles} files)`);

  // Parse CDK infrastructure
  const cdkParse = await parseCDKInfrastructure(config.project.infra_path);
  console.log(`  ✓ CDK infrastructure parsed (${cdkParse.totalFiles} files)`);

  // Analyze AWS infrastructure
  let awsAnalysis: AWSAnalysisResults | undefined;
  try {
    const [configAnalysis, iamAnalysis, securityHubAnalysis] = await Promise.all([
      analyzeAWSConfig(config.aws.region, config.aws.profile),
      analyzeIAM(config.aws.region, config.aws.profile),
      analyzeSecurityHub(config.aws.region, config.aws.profile),
    ]);
    awsAnalysis = { configAnalysis, iamAnalysis, securityHubAnalysis };
    console.log('  ✓ AWS infrastructure analyzed');
  } catch (error) {
    console.log('  ⚠ AWS analysis failed - continuing with documentation only');
  }

  // Match requirements
  const requirementAssessments = matchRequirements(
    docScan,
    config.assessment.skip_requirements,
    awsAnalysis
  );

  // Generate assessment
  const assessment = generateProjectAssessment(
    config.project.name,
    requirementAssessments,
    config.msp.version
  );

  console.log('  ✓ Assessment generated');

  // Run scheduled assessment (drift detection, notifications, etc.)
  await runScheduledAssessment(assessment, config);
}

/**
 * Get next scheduled run time
 */
function getNextRun(schedule: string): string {
  // Simple approximation - for production use a proper cron parser
  const parts = schedule.split(' ');
  if (parts.length === 5) {
    const [minute, hour] = parts;
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }
  return schedule;
}

// Run if called directly
if (require.main === module) {
  const configPath = process.argv[2] || 'config.yaml';
  startMonitoringDaemon(configPath).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
