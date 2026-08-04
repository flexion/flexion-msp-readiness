/**
 * AWS Permission Checker - Pre-flight validation of required AWS permissions
 *
 * This module tests AWS API permissions before running assessments and collectors.
 * It provides clear error messages and generates IAM policy snippets for missing permissions.
 */

import {
  CloudTrailClient,
  DescribeTrailsCommand,
  GetTrailStatusCommand,
} from '@aws-sdk/client-cloudtrail';
import {
  ConfigServiceClient,
  DescribeConfigRulesCommand,
  DescribeComplianceByConfigRuleCommand,
} from '@aws-sdk/client-config-service';
import {
  SecurityHubClient,
  GetFindingsCommand,
  DescribeHubCommand,
} from '@aws-sdk/client-securityhub';
import {
  BackupClient,
  ListBackupVaultsCommand,
  ListBackupPlansCommand,
} from '@aws-sdk/client-backup';
import { Inspector2Client, ListFindingsCommand } from '@aws-sdk/client-inspector2';
import {
  IAMClient,
  GetAccountPasswordPolicyCommand,
  ListUsersCommand,
  ListMFADevicesCommand,
} from '@aws-sdk/client-iam';
import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  ListMetricsCommand,
} from '@aws-sdk/client-cloudwatch';
import chalk from 'chalk';

/**
 * Permission check result for a single action
 */
export interface PermissionCheckResult {
  service: string;
  action: string;
  allowed: boolean;
  error?: string;
  errorCode?: string;
  isServiceDisabled?: boolean; // Service exists but is disabled/not configured
}

/**
 * Overall permission check summary
 */
export interface PermissionCheckSummary {
  allChecked: number;
  allAllowed: number;
  accessDenied: number;
  serviceDisabled: number;
  otherErrors: number;
  results: PermissionCheckResult[];
  missingPermissions: string[]; // List of IAM actions needed
}

/**
 * Service-specific permission checks
 */
const PERMISSION_CHECKS = [
  {
    service: 'CloudTrail',
    action: 'cloudtrail:DescribeTrails',
    test: async (region: string, profile?: string) => {
      const client = new CloudTrailClient({ region, ...(profile && { profile }) });
      await client.send(new DescribeTrailsCommand({}));
    },
  },
  {
    service: 'CloudTrail',
    action: 'cloudtrail:GetTrailStatus',
    test: async (region: string, profile?: string) => {
      const client = new CloudTrailClient({ region, ...(profile && { profile }) });
      // Need a trail ARN - we'll use a dummy one to test permission
      // The error will tell us if it's permission vs not-found
      try {
        await client.send(new GetTrailStatusCommand({ Name: 'test-trail' }));
      } catch (error: any) {
        // TrailNotFoundException is OK - means we have permission but trail doesn't exist
        if (error.name === 'TrailNotFoundException') {
          return;
        }
        throw error;
      }
    },
  },
  {
    service: 'Config',
    action: 'config:DescribeConfigRules',
    test: async (region: string, profile?: string) => {
      const client = new ConfigServiceClient({ region, ...(profile && { profile }) });
      await client.send(new DescribeConfigRulesCommand({}));
    },
  },
  {
    service: 'Config',
    action: 'config:DescribeComplianceByConfigRule',
    test: async (region: string, profile?: string) => {
      const client = new ConfigServiceClient({ region, ...(profile && { profile }) });
      await client.send(new DescribeComplianceByConfigRuleCommand({}));
    },
  },
  {
    service: 'SecurityHub',
    action: 'securityhub:GetFindings',
    test: async (region: string, profile?: string) => {
      const client = new SecurityHubClient({ region, ...(profile && { profile }) });
      await client.send(new GetFindingsCommand({ MaxResults: 1 }));
    },
  },
  {
    service: 'SecurityHub',
    action: 'securityhub:DescribeHub',
    test: async (region: string, profile?: string) => {
      const client = new SecurityHubClient({ region, ...(profile && { profile }) });
      await client.send(new DescribeHubCommand({}));
    },
  },
  {
    service: 'Backup',
    action: 'backup:ListBackupVaults',
    test: async (region: string, profile?: string) => {
      const client = new BackupClient({ region, ...(profile && { profile }) });
      await client.send(new ListBackupVaultsCommand({}));
    },
  },
  {
    service: 'Backup',
    action: 'backup:ListBackupPlans',
    test: async (region: string, profile?: string) => {
      const client = new BackupClient({ region, ...(profile && { profile }) });
      await client.send(new ListBackupPlansCommand({}));
    },
  },
  {
    service: 'Inspector',
    action: 'inspector2:ListFindings',
    test: async (region: string, profile?: string) => {
      const client = new Inspector2Client({ region, ...(profile && { profile }) });
      await client.send(new ListFindingsCommand({ maxResults: 1 }));
    },
  },
  {
    service: 'IAM',
    action: 'iam:GetAccountPasswordPolicy',
    test: async (region: string, profile?: string) => {
      // IAM is global, but we accept region for consistency
      const client = new IAMClient({ region: 'us-east-1', ...(profile && { profile }) });
      try {
        await client.send(new GetAccountPasswordPolicyCommand({}));
      } catch (error: any) {
        // NoSuchEntity means no password policy configured - this is OK for permission check
        if (error.name === 'NoSuchEntity' || error.name === 'NoSuchEntityException') {
          return;
        }
        throw error;
      }
    },
  },
  {
    service: 'IAM',
    action: 'iam:ListUsers',
    test: async (region: string, profile?: string) => {
      const client = new IAMClient({ region: 'us-east-1', ...(profile && { profile }) });
      await client.send(new ListUsersCommand({ MaxItems: 1 }));
    },
  },
  {
    service: 'IAM',
    action: 'iam:ListMFADevices',
    test: async (region: string, profile?: string) => {
      const client = new IAMClient({ region: 'us-east-1', ...(profile && { profile }) });
      // This requires a user name, but empty list will test permission
      try {
        await client.send(new ListMFADevicesCommand({ MaxItems: 1 }));
      } catch (error: any) {
        // ValidationError for missing user is OK - we have permission
        if (error.name === 'ValidationError' || error.name === 'InvalidParameterValue') {
          return;
        }
        throw error;
      }
    },
  },
  {
    service: 'CloudWatch',
    action: 'cloudwatch:DescribeAlarms',
    test: async (region: string, profile?: string) => {
      const client = new CloudWatchClient({ region, ...(profile && { profile }) });
      await client.send(new DescribeAlarmsCommand({ MaxRecords: 1 }));
    },
  },
  {
    service: 'CloudWatch',
    action: 'cloudwatch:ListMetrics',
    test: async (region: string, profile?: string) => {
      const client = new CloudWatchClient({ region, ...(profile && { profile }) });
      await client.send(new ListMetricsCommand({}));
    },
  },
];

/**
 * Known error codes that indicate service is disabled/not configured (not a permission issue)
 */
const SERVICE_DISABLED_ERRORS = [
  'InvalidClientTokenId',
  'SubscriptionRequiredException',
  'NotSignedUpException',
  'OptInRequired',
  'ServiceNotEnabledException',
  'ResourceNotFoundException', // Security Hub not enabled
  'InvalidAccessException', // Security Hub not enabled
];

/**
 * Check if error indicates access denied (permission issue)
 */
function isAccessDenied(error: any): boolean {
  const errorName = error.name || '';
  const errorMessage = error.message || '';

  return (
    errorName === 'AccessDeniedException' ||
    errorName === 'UnauthorizedException' ||
    errorName === 'AccessDenied' ||
    errorMessage.includes('Access Denied') ||
    errorMessage.includes('not authorized')
  );
}

/**
 * Check if error indicates service is disabled/not configured
 */
function isServiceDisabled(error: any): boolean {
  const errorName = error.name || '';
  const errorMessage = error.message || '';

  return SERVICE_DISABLED_ERRORS.some(code => errorName === code || errorMessage.includes(code));
}

/**
 * Run a single permission check
 */
async function checkPermission(
  check: (typeof PERMISSION_CHECKS)[0],
  region: string,
  profile?: string
): Promise<PermissionCheckResult> {
  try {
    await check.test(region, profile);
    return {
      service: check.service,
      action: check.action,
      allowed: true,
    };
  } catch (error: any) {
    const errorCode = error.name || error.code || 'Unknown';
    const errorMessage = error.message || String(error);

    return {
      service: check.service,
      action: check.action,
      allowed: false,
      error: errorMessage,
      errorCode,
      isServiceDisabled: isServiceDisabled(error),
    };
  }
}

/**
 * Run all permission checks and return summary
 */
export async function checkAWSPermissions(
  region: string,
  profile?: string
): Promise<PermissionCheckSummary> {
  console.log(chalk.blue('\n🔐 Checking AWS permissions...\n'));

  const results: PermissionCheckResult[] = [];

  // Run checks in parallel for speed
  const checkPromises = PERMISSION_CHECKS.map(check => checkPermission(check, region, profile));

  const checkResults = await Promise.all(checkPromises);
  results.push(...checkResults);

  // Categorize results
  const allChecked = results.length;
  const allAllowed = results.filter(r => r.allowed).length;
  const accessDenied = results.filter(r => !r.allowed && !r.isServiceDisabled).length;
  const serviceDisabled = results.filter(r => r.isServiceDisabled).length;
  const otherErrors = results.filter(
    r => !r.allowed && !r.isServiceDisabled && !isAccessDenied(r as any)
  ).length;

  // Extract missing permissions
  const missingPermissions = results
    .filter(r => !r.allowed && !r.isServiceDisabled)
    .map(r => r.action);

  return {
    allChecked,
    allAllowed,
    accessDenied,
    serviceDisabled,
    otherErrors,
    results,
    missingPermissions,
  };
}

/**
 * Print permission check summary to console
 */
export function printPermissionSummary(summary: PermissionCheckSummary): void {
  console.log(chalk.bold('Permission Check Results:\n'));

  if (summary.allAllowed === summary.allChecked) {
    console.log(chalk.green(`✅ All ${summary.allChecked} permissions verified\n`));
    return;
  }

  console.log(
    chalk.yellow(`⚠️  ${summary.allAllowed}/${summary.allChecked} permissions available\n`)
  );

  if (summary.accessDenied > 0) {
    console.log(chalk.red(`❌ Access Denied: ${summary.accessDenied} permission(s)\n`));

    const deniedResults = summary.results.filter(r => !r.allowed && !r.isServiceDisabled);

    for (const result of deniedResults) {
      console.log(chalk.red(`   • ${result.service}: ${result.action}`));
      if (result.error) {
        console.log(chalk.gray(`     ${result.error}`));
      }
    }
    console.log();
  }

  if (summary.serviceDisabled > 0) {
    console.log(
      chalk.yellow(`⚠️  Service Disabled: ${summary.serviceDisabled} service(s) not configured\n`)
    );

    const disabledResults = summary.results.filter(r => r.isServiceDisabled);

    for (const result of disabledResults) {
      console.log(chalk.yellow(`   • ${result.service}: ${result.action}`));
      if (result.errorCode) {
        console.log(chalk.gray(`     ${result.errorCode}`));
      }
    }
    console.log();
    console.log(chalk.gray('   Note: Services disabled/not configured are not fatal errors.\n'));
  }
}

/**
 * Generate IAM policy JSON for missing permissions
 */
export function generateIAMPolicy(missingPermissions: string[]): string {
  if (missingPermissions.length === 0) {
    return 'No missing permissions - IAM policy not needed.';
  }

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: missingPermissions.sort(),
        Resource: '*',
      },
    ],
  };

  return JSON.stringify(policy, null, 2);
}

/**
 * Print IAM policy snippet for missing permissions
 */
export function printIAMPolicySnippet(summary: PermissionCheckSummary): void {
  if (summary.missingPermissions.length === 0) {
    return;
  }

  console.log(chalk.bold('\n📋 Required IAM Policy:\n'));
  console.log(chalk.gray('Add this policy to your IAM user/role:\n'));

  const policy = generateIAMPolicy(summary.missingPermissions);
  console.log(chalk.cyan(policy));
  console.log();
}

/**
 * Check if permission check passed (no access denied errors)
 */
export function hasRequiredPermissions(summary: PermissionCheckSummary): boolean {
  return summary.accessDenied === 0;
}

/**
 * Throw error if required permissions are missing
 */
export function ensureRequiredPermissions(summary: PermissionCheckSummary): void {
  if (!hasRequiredPermissions(summary)) {
    throw new Error(
      `Missing ${summary.accessDenied} required AWS permission(s). ` +
        `Run with --skip-permission-check to bypass this check.`
    );
  }
}
