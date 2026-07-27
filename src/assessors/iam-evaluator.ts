/**
 * IAM Evaluator - analyzes IAM configuration and access controls
 */

import {
  IAMClient,
  ListUsersCommand,
  ListMFADevicesCommand,
  GetAccountSummaryCommand,
  ListAccessKeysCommand,
  GetCredentialReportCommand,
  GenerateCredentialReportCommand,
  GetAccountPasswordPolicyCommand,
} from '@aws-sdk/client-iam';
import { AssessmentFinding } from '../types';

export interface IAMAnalysis {
  timestamp: Date;
  accountSummary: IAMAccountSummary;
  mfaStatus: MFAStatus;
  passwordPolicy: PasswordPolicyStatus;
  accessKeys: AccessKeyAnalysis;
  findings: AssessmentFinding[];
}

export interface IAMAccountSummary {
  users: number;
  usersWithMFA: number;
  accessKeys: number;
  mfaDevices: number;
  accountMFAEnabled: boolean;
}

export interface MFAStatus {
  totalUsers: number;
  usersWithMFA: number;
  mfaPercentage: number;
  rootMFAEnabled: boolean;
}

export interface PasswordPolicyStatus {
  exists: boolean;
  minimumPasswordLength?: number;
  requireSymbols?: boolean;
  requireNumbers?: boolean;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  maxPasswordAge?: number;
}

export interface AccessKeyAnalysis {
  totalKeys: number;
  keysOlderThan90Days: number;
  oldestKeyAgeDays: number;
}

/**
 * Analyze IAM configuration
 */
export async function analyzeIAM(
  region: string,
  profile: string
): Promise<IAMAnalysis> {
  const timestamp = new Date();
  const findings: AssessmentFinding[] = [];

  try {
    // Initialize IAM client (IAM is global, but we still need a region)
    const clientConfig = { region };
    const iamClient = new IAMClient(clientConfig);

    // Get account summary
    const accountSummary = await getAccountSummary(iamClient, findings);

    // Check MFA status
    const mfaStatus = await checkMFAStatus(iamClient, accountSummary, findings);

    // Check password policy
    const passwordPolicy = await checkPasswordPolicy(iamClient, findings);

    // Analyze access keys
    const accessKeys = await analyzeAccessKeys(iamClient, findings);

    // Analyze overall IAM security posture
    analyzeSecurityPosture(accountSummary, mfaStatus, passwordPolicy, accessKeys, findings);

    return {
      timestamp,
      accountSummary,
      mfaStatus,
      passwordPolicy,
      accessKeys,
      findings,
    };
  } catch (error) {
    findings.push({
      type: 'iam',
      source: 'AWS SDK',
      summary: `Failed to analyze IAM: ${error instanceof Error ? error.message : String(error)}`,
      supportive: false,
      timestamp: new Date(),
    });

    return {
      timestamp,
      accountSummary: {
        users: 0,
        usersWithMFA: 0,
        accessKeys: 0,
        mfaDevices: 0,
        accountMFAEnabled: false,
      },
      mfaStatus: {
        totalUsers: 0,
        usersWithMFA: 0,
        mfaPercentage: 0,
        rootMFAEnabled: false,
      },
      passwordPolicy: { exists: false },
      accessKeys: {
        totalKeys: 0,
        keysOlderThan90Days: 0,
        oldestKeyAgeDays: 0,
      },
      findings,
    };
  }
}

/**
 * Get IAM account summary
 */
async function getAccountSummary(
  client: IAMClient,
  findings: AssessmentFinding[]
): Promise<IAMAccountSummary> {
  try {
    const response = await client.send(new GetAccountSummaryCommand({}));
    const summaryMap = response.SummaryMap as any ?? {};

    const accountSummary: IAMAccountSummary = {
      users: summaryMap.Users ?? 0,
      usersWithMFA: summaryMap.AccountMFAEnabled ?? 0,
      accessKeys: summaryMap.AccessKeysPresent ?? 0,
      mfaDevices: summaryMap.MFADevices ?? 0,
      accountMFAEnabled: (summaryMap.AccountMFAEnabled ?? 0) === 1,
    };

    findings.push({
      type: 'iam',
      source: 'IAM Account Summary',
      summary: `${accountSummary.users} IAM user(s), ${accountSummary.usersWithMFA} with MFA`,
      supportive: true,
      timestamp: new Date(),
    });

    return accountSummary;
  } catch (error) {
    findings.push({
      type: 'iam',
      source: 'IAM Account Summary',
      summary: `Failed to retrieve account summary: ${error instanceof Error ? error.message : String(error)}`,
      supportive: false,
      timestamp: new Date(),
    });

    return {
      users: 0,
      usersWithMFA: 0,
      accessKeys: 0,
      mfaDevices: 0,
      accountMFAEnabled: false,
    };
  }
}

/**
 * Check MFA status
 */
async function checkMFAStatus(
  client: IAMClient,
  accountSummary: IAMAccountSummary,
  findings: AssessmentFinding[]
): Promise<MFAStatus> {
  const mfaPercentage =
    accountSummary.users > 0
      ? Math.round((accountSummary.usersWithMFA / accountSummary.users) * 100)
      : 0;

  const mfaStatus: MFAStatus = {
    totalUsers: accountSummary.users,
    usersWithMFA: accountSummary.usersWithMFA,
    mfaPercentage,
    rootMFAEnabled: accountSummary.accountMFAEnabled,
  };

  // Check root MFA
  if (accountSummary.accountMFAEnabled) {
    findings.push({
      type: 'iam',
      source: 'MFA Analysis',
      summary: 'Root account MFA is enabled',
      supportive: true,
      timestamp: new Date(),
    });
  } else {
    findings.push({
      type: 'iam',
      source: 'MFA Analysis',
      summary: 'Root account MFA is NOT enabled - critical security gap (SEC-004)',
      details: 'Root account should always have MFA enabled',
      supportive: false,
      timestamp: new Date(),
    });
  }

  // Check user MFA coverage
  if (mfaPercentage === 100 && accountSummary.users > 0) {
    findings.push({
      type: 'iam',
      source: 'MFA Analysis',
      summary: `100% of IAM users have MFA enabled (${accountSummary.usersWithMFA}/${accountSummary.users})`,
      supportive: true,
      timestamp: new Date(),
    });
  } else if (mfaPercentage >= 80) {
    findings.push({
      type: 'iam',
      source: 'MFA Analysis',
      summary: `${mfaPercentage}% of IAM users have MFA - some users missing MFA (SEC-004)`,
      details: `${accountSummary.users - accountSummary.usersWithMFA} user(s) without MFA`,
      supportive: false,
      timestamp: new Date(),
    });
  } else if (accountSummary.users > 0) {
    findings.push({
      type: 'iam',
      source: 'MFA Analysis',
      summary: `Only ${mfaPercentage}% of IAM users have MFA - gap for SEC-004`,
      details: `${accountSummary.users - accountSummary.usersWithMFA} user(s) without MFA`,
      supportive: false,
      timestamp: new Date(),
    });
  }

  return mfaStatus;
}

/**
 * Check password policy
 */
async function checkPasswordPolicy(
  client: IAMClient,
  findings: AssessmentFinding[]
): Promise<PasswordPolicyStatus> {
  try {
    const response = await client.send(new GetAccountPasswordPolicyCommand({}));
    const policy = response.PasswordPolicy;

    if (!policy) {
      findings.push({
        type: 'iam',
        source: 'Password Policy',
        summary: 'No password policy configured - gap for SEC-004',
        details: 'AWS recommends setting a strong password policy',
        supportive: false,
        timestamp: new Date(),
      });

      return { exists: false };
    }

    const passwordPolicy: PasswordPolicyStatus = {
      exists: true,
      minimumPasswordLength: policy.MinimumPasswordLength,
      requireSymbols: policy.RequireSymbols,
      requireNumbers: policy.RequireNumbers,
      requireUppercase: policy.RequireUppercaseCharacters,
      requireLowercase: policy.RequireLowercaseCharacters,
      maxPasswordAge: policy.MaxPasswordAge,
    };

    // Check if policy is strong
    const isStrong =
      (policy.MinimumPasswordLength ?? 0) >= 14 &&
      policy.RequireSymbols &&
      policy.RequireNumbers &&
      policy.RequireUppercaseCharacters &&
      policy.RequireLowercaseCharacters;

    if (isStrong) {
      findings.push({
        type: 'iam',
        source: 'Password Policy',
        summary: 'Strong password policy configured',
        details: `Min length: ${policy.MinimumPasswordLength}, requires symbols/numbers/upper/lower`,
        supportive: true,
        timestamp: new Date(),
      });
    } else {
      findings.push({
        type: 'iam',
        source: 'Password Policy',
        summary: 'Password policy exists but could be strengthened (SEC-004)',
        details: `Consider: 14+ chars, symbols, numbers, upper/lower case required`,
        supportive: false,
        timestamp: new Date(),
      });
    }

    return passwordPolicy;
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchEntityException') {
      findings.push({
        type: 'iam',
        source: 'Password Policy',
        summary: 'No password policy configured - gap for SEC-004',
        supportive: false,
        timestamp: new Date(),
      });

      return { exists: false };
    }

    findings.push({
      type: 'iam',
      source: 'Password Policy',
      summary: `Failed to retrieve password policy: ${error instanceof Error ? error.message : String(error)}`,
      supportive: false,
      timestamp: new Date(),
    });

    return { exists: false };
  }
}

/**
 * Analyze access keys
 */
async function analyzeAccessKeys(
  client: IAMClient,
  findings: AssessmentFinding[]
): Promise<AccessKeyAnalysis> {
  try {
    const usersResponse = await client.send(new ListUsersCommand({}));
    const users = usersResponse.Users ?? [];

    let totalKeys = 0;
    let keysOlderThan90Days = 0;
    let oldestKeyAgeDays = 0;

    const now = new Date();

    for (const user of users) {
      if (!user.UserName) continue;

      try {
        const keysResponse = await client.send(
          new ListAccessKeysCommand({ UserName: user.UserName })
        );

        const keys = keysResponse.AccessKeyMetadata ?? [];
        totalKeys += keys.length;

        for (const key of keys) {
          if (!key.CreateDate) continue;

          const ageDays = Math.floor(
            (now.getTime() - key.CreateDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (ageDays > oldestKeyAgeDays) {
            oldestKeyAgeDays = ageDays;
          }

          if (ageDays > 90) {
            keysOlderThan90Days++;
          }
        }
      } catch {
        // Skip users we can't check keys for
      }
    }

    if (keysOlderThan90Days > 0) {
      findings.push({
        type: 'iam',
        source: 'Access Key Analysis',
        summary: `${keysOlderThan90Days} access key(s) older than 90 days - gap for SECP-001`,
        details: `Oldest key: ${oldestKeyAgeDays} days. Recommend key rotation every 90 days.`,
        supportive: false,
        timestamp: new Date(),
      });
    } else if (totalKeys > 0) {
      findings.push({
        type: 'iam',
        source: 'Access Key Analysis',
        summary: `All ${totalKeys} access key(s) are less than 90 days old`,
        supportive: true,
        timestamp: new Date(),
      });
    }

    return {
      totalKeys,
      keysOlderThan90Days,
      oldestKeyAgeDays,
    };
  } catch (error) {
    findings.push({
      type: 'iam',
      source: 'Access Key Analysis',
      summary: `Failed to analyze access keys: ${error instanceof Error ? error.message : String(error)}`,
      supportive: false,
      timestamp: new Date(),
    });

    return {
      totalKeys: 0,
      keysOlderThan90Days: 0,
      oldestKeyAgeDays: 0,
    };
  }
}

/**
 * Analyze overall security posture
 */
function analyzeSecurityPosture(
  accountSummary: IAMAccountSummary,
  mfaStatus: MFAStatus,
  passwordPolicy: PasswordPolicyStatus,
  accessKeys: AccessKeyAnalysis,
  findings: AssessmentFinding[]
): void {
  // SEC-004: Identity and Access Management
  const sec004Score =
    (mfaStatus.rootMFAEnabled ? 0.25 : 0) +
    (mfaStatus.mfaPercentage / 100) * 0.25 +
    (passwordPolicy.exists ? 0.25 : 0) +
    (accessKeys.keysOlderThan90Days === 0 && accessKeys.totalKeys > 0 ? 0.25 : 0);

  if (sec004Score >= 0.8) {
    findings.push({
      type: 'iam',
      source: 'SEC-004 Analysis',
      summary: 'Strong IAM security posture',
      details: 'MFA enforced, password policy set, access keys managed',
      supportive: true,
      timestamp: new Date(),
    });
  } else if (sec004Score >= 0.5) {
    findings.push({
      type: 'iam',
      source: 'SEC-004 Analysis',
      summary: 'Moderate IAM security - some gaps present',
      details: 'Review MFA coverage, password policy, and access key rotation',
      supportive: false,
      timestamp: new Date(),
    });
  } else {
    findings.push({
      type: 'iam',
      source: 'SEC-004 Analysis',
      summary: 'Weak IAM security posture - multiple gaps for SEC-004',
      details: 'Critical: Enable root MFA, enforce user MFA, set password policy',
      supportive: false,
      timestamp: new Date(),
    });
  }

  // SECP-001: Access Key Exposure Detection
  if (accessKeys.keysOlderThan90Days > 0) {
    findings.push({
      type: 'iam',
      source: 'SECP-001 Analysis',
      summary: `Old access keys present - implement key rotation (SECP-001)`,
      details: `${accessKeys.keysOlderThan90Days} key(s) older than 90 days`,
      supportive: false,
      timestamp: new Date(),
    });
  }
}

/**
 * Print IAM analysis summary
 */
export function printIAMSummary(analysis: IAMAnalysis): void {
  console.log(`IAM analysis complete:`);
  console.log(`  Total users: ${analysis.accountSummary.users}`);
  console.log(
    `  MFA coverage: ${analysis.mfaStatus.mfaPercentage}% (${analysis.mfaStatus.usersWithMFA}/${analysis.mfaStatus.totalUsers})`
  );
  console.log(`  Root MFA: ${analysis.mfaStatus.rootMFAEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Password policy: ${analysis.passwordPolicy.exists ? 'Configured' : 'Not configured'}`);
  console.log(`  Access keys: ${analysis.accessKeys.totalKeys} total, ${analysis.accessKeys.keysOlderThan90Days} >90 days`);
  console.log(`  Findings: ${analysis.findings.length}`);
  console.log('');
}
