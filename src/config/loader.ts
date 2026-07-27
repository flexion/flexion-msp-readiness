/**
 * Configuration loader and validator
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { Config } from '../types';
import { logger, createError, ErrorCodes } from '../util/logger';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Load configuration from file
 */
export function loadConfig(configPath: string = 'config.yaml'): Config {
  logger.debug('Loading configuration', { configPath });

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    const error = createError(
      ErrorCodes.CONFIG_NOT_FOUND,
      `Configuration file not found: ${configPath}`
    );
    logger.error('Configuration file not found', error);
    throw new ConfigError(error.toString());
  }

  // Read and parse YAML
  let rawConfig: any;
  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    rawConfig = yaml.parse(fileContent);
  } catch (error) {
    const wrappedError = createError(
      ErrorCodes.CONFIG_INVALID,
      `Failed to parse configuration file: ${error instanceof Error ? error.message : String(error)}`,
      error as Error
    );
    logger.error('Configuration parsing failed', wrappedError);
    throw new ConfigError(wrappedError.toString());
  }

  // Validate and apply defaults
  const config = validateAndApplyDefaults(rawConfig, configPath);
  logger.debug('Configuration loaded successfully', { projectName: config.project.name });

  return config;
}

/**
 * Validate configuration and apply defaults
 */
function validateAndApplyDefaults(raw: any, configPath: string): Config {
  if (!raw || typeof raw !== 'object') {
    throw new ConfigError('Configuration must be an object');
  }

  // Validate project section
  if (!raw.project || typeof raw.project !== 'object') {
    throw new ConfigError('Missing required section: project');
  }
  if (!raw.project.name) {
    throw new ConfigError('Missing required field: project.name');
  }
  if (!raw.project.docs_path) {
    throw new ConfigError('Missing required field: project.docs_path');
  }
  if (!raw.project.infra_path) {
    throw new ConfigError('Missing required field: project.infra_path');
  }

  // Validate AWS section
  if (!raw.aws || typeof raw.aws !== 'object') {
    throw new ConfigError('Missing required section: aws');
  }
  if (!raw.aws.profile) {
    throw new ConfigError('Missing required field: aws.profile');
  }
  if (!raw.aws.region) {
    throw new ConfigError('Missing required field: aws.region');
  }
  if (!raw.aws.stage) {
    throw new ConfigError('Missing required field: aws.stage');
  }

  // Validate MSP section
  if (!raw.msp || typeof raw.msp !== 'object') {
    throw new ConfigError('Missing required section: msp');
  }

  // Validate output section
  if (!raw.output || typeof raw.output !== 'object') {
    throw new ConfigError('Missing required section: output');
  }

  // Validate assessment section
  if (!raw.assessment || typeof raw.assessment !== 'object') {
    throw new ConfigError('Missing required section: assessment');
  }

  // Resolve paths relative to config file location
  const configDir = path.dirname(path.resolve(configPath));
  const docsPath = path.resolve(configDir, raw.project.docs_path);
  const infraPath = path.resolve(configDir, raw.project.infra_path);
  const evidencePath = path.resolve(configDir, raw.output.evidence_path || './evidence');
  const playbooksPath = path.resolve(configDir, raw.output.playbooks_path || './playbooks');
  const dashboardPath = path.resolve(configDir, raw.output.dashboard_path || './dashboard.html');

  // Validate that critical paths exist
  if (!fs.existsSync(docsPath)) {
    throw new ConfigError(
      `Documentation path does not exist: ${docsPath}\n` +
        `Configured as: project.docs_path = "${raw.project.docs_path}"\n` +
        `Check your config.yaml file.`
    );
  }

  if (!fs.existsSync(infraPath)) {
    throw new ConfigError(
      `Infrastructure path does not exist: ${infraPath}\n` +
        `Configured as: project.infra_path = "${raw.project.infra_path}"\n` +
        `Check your config.yaml file.`
    );
  }

  // Build validated config with defaults
  const config: Config = {
    project: {
      name: raw.project.name,
      docs_path: docsPath,
      infra_path: infraPath,
      repo_url: raw.project.repo_url,
    },
    aws: {
      profile: raw.aws.profile,
      region: raw.aws.region,
      stage: raw.aws.stage,
      additional_regions: raw.aws.additional_regions || [],
    },
    msp: {
      version: raw.msp.version || 'Feb2026-Aug2026',
      ig_level: raw.msp.ig_level || 1,
      organization: raw.msp.organization || {
        name: raw.project.name,
        contact: 'not-configured@example.com',
      },
    },
    output: {
      evidence_path: evidencePath,
      playbooks_path: playbooksPath,
      dashboard_path: dashboardPath,
      report_format: raw.output.report_format || 'both',
    },
    assessment: {
      skip_requirements: raw.assessment.skip_requirements || [],
      custom_priorities: raw.assessment.custom_priorities || {},
      include_recommended: raw.assessment.include_recommended !== false,
      auto_collect_evidence: raw.assessment.auto_collect_evidence !== false,
      auto_generate_docs: raw.assessment.auto_generate_docs !== false,
    },
    templates: raw.templates
      ? {
          custom_templates_path: raw.templates.custom_templates_path,
          variables: raw.templates.variables || {},
        }
      : {
          custom_templates_path: undefined,
          variables: {},
        },
  };

  return config;
}

/**
 * Validate AWS credentials are configured
 */
export async function validateAWSCredentials(profile: string): Promise<void> {
  // Check if AWS credentials file exists
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const credentialsPath = path.join(homeDir, '.aws', 'credentials');
  const configPathAws = path.join(homeDir, '.aws', 'config');

  if (!fs.existsSync(credentialsPath) && !fs.existsSync(configPathAws)) {
    throw new ConfigError(
      `AWS credentials not found.\n` +
        `Expected credentials at: ${credentialsPath}\n` +
        `Or config at: ${configPathAws}\n` +
        `Run 'aws configure' to set up AWS credentials.`
    );
  }

  // Check if the specified profile exists
  if (profile !== 'default') {
    const credContent = fs.existsSync(credentialsPath)
      ? fs.readFileSync(credentialsPath, 'utf-8')
      : '';
    const configContent = fs.existsSync(configPathAws)
      ? fs.readFileSync(configPathAws, 'utf-8')
      : '';

    const hasProfile =
      credContent.includes(`[${profile}]`) || configContent.includes(`[profile ${profile}]`);

    if (!hasProfile) {
      throw new ConfigError(
        `AWS profile "${profile}" not found in credentials or config.\n` +
          `Available profiles can be listed with: aws configure list-profiles`
      );
    }
  }
}

/**
 * Print configuration summary
 */
export function printConfigSummary(config: Config): void {
  console.log('Configuration loaded:');
  console.log(`  Project: ${config.project.name}`);
  console.log(`  Docs: ${config.project.docs_path}`);
  console.log(`  Infrastructure: ${config.project.infra_path}`);
  console.log(`  AWS Profile: ${config.aws.profile}`);
  console.log(`  AWS Region: ${config.aws.region}`);
  console.log(`  Stage: ${config.aws.stage}`);
  console.log(`  MSP Version: ${config.msp.version}`);
  console.log(`  CIS IG Level: ${config.msp.ig_level}`);
  console.log('');
}
