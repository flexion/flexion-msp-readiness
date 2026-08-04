/**
 * IAM Evidence Collector
 * Collects evidence for SEC-004 and SECP-001
 */

import {
  IAMClient,
  ListUsersCommand,
  ListRolesCommand,
  GetAccountPasswordPolicyCommand,
  ListMFADevicesCommand,
  GetUserCommand,
  ListAccessKeysCommand,
} from '@aws-sdk/client-iam';
import {
  AccessAnalyzerClient,
  ListFindingsCommand,
  ListAnalyzersCommand,
} from '@aws-sdk/client-accessanalyzer';
import { HealthClient, DescribeEventsCommand } from '@aws-sdk/client-health';
import { EvidenceArtifact } from '../types';

export interface IAMEvidence {
  users: UserInfo[];
  roles: RoleInfo[];
  passwordPolicy: PasswordPolicyInfo;
  accessAnalyzerFindings: AccessAnalyzerFinding[];
  healthEvents: HealthEvent[];
  summary: {
    totalUsers: number;
    usersWithMFA: number;
    usersWithoutMFA: number;
    totalRoles: number;
    totalAccessKeys: number;
    activeAccessKeys: number;
    exposedKeys: number;
    accessAnalyzerFindings: number;
  };
}

export interface UserInfo {
  userName: string;
  userId: string;
  arn: string;
  createDate: string;
  passwordLastUsed?: string;
  hasMFA: boolean;
  accessKeys: AccessKeyInfo[];
}

export interface AccessKeyInfo {
  accessKeyId: string;
  status: string;
  createDate: string;
  lastUsedDate?: string;
}

export interface RoleInfo {
  roleName: string;
  roleId: string;
  arn: string;
  createDate: string;
  description?: string;
}

export interface PasswordPolicyInfo {
  minimumPasswordLength?: number;
  requireSymbols?: boolean;
  requireNumbers?: boolean;
  requireUppercaseCharacters?: boolean;
  requireLowercaseCharacters?: boolean;
  allowUsersToChangePassword?: boolean;
  expirePasswords?: boolean;
  maxPasswordAge?: number;
  passwordReusePrevention?: number;
  hardExpiry?: boolean;
}

export interface AccessAnalyzerFinding {
  id: string;
  resourceType: string;
  resourceArn: string;
  status: string;
  createdAt: string;
  principal?: string;
}

export interface HealthEvent {
  eventTypeCode: string;
  eventArn: string;
  service: string;
  eventDescription: string;
  startTime: string;
  endTime?: string;
}

/**
 * Collect IAM evidence
 */
export async function collectIAMEvidence(region: string, profile: string): Promise<IAMEvidence> {
  const iamClient = new IAMClient({ region });
  const accessAnalyzerClient = new AccessAnalyzerClient({ region });
  const healthClient = new HealthClient({ region: 'us-east-1' }); // Health API is global, only available in us-east-1

  const users: UserInfo[] = [];
  const roles: RoleInfo[] = [];
  let passwordPolicy: PasswordPolicyInfo = {};
  const accessAnalyzerFindings: AccessAnalyzerFinding[] = [];
  const healthEvents: HealthEvent[] = [];

  try {
    // Collect users with MFA status
    const usersResponse = await iamClient.send(new ListUsersCommand({}));

    for (const user of usersResponse.Users ?? []) {
      if (!user.UserName) continue;

      // Check MFA devices
      let hasMFA = false;
      try {
        const mfaResponse = await iamClient.send(
          new ListMFADevicesCommand({ UserName: user.UserName })
        );
        hasMFA = (mfaResponse.MFADevices?.length ?? 0) > 0;
      } catch {
        // User might not have MFA
      }

      // Get user details
      let passwordLastUsed: string | undefined;
      try {
        const userResponse = await iamClient.send(
          new GetUserCommand({ UserName: user.UserName })
        );
        passwordLastUsed = userResponse.User?.PasswordLastUsed?.toISOString();
      } catch {
        // User might not have a password
      }

      // Get access keys
      const accessKeys: AccessKeyInfo[] = [];
      try {
        const keysResponse = await iamClient.send(
          new ListAccessKeysCommand({ UserName: user.UserName })
        );
        for (const key of keysResponse.AccessKeyMetadata ?? []) {
          accessKeys.push({
            accessKeyId: key.AccessKeyId ?? 'unknown',
            status: key.Status ?? 'unknown',
            createDate: key.CreateDate?.toISOString() ?? 'unknown',
          });
        }
      } catch {
        // Access keys might not be accessible
      }

      users.push({
        userName: user.UserName,
        userId: user.UserId ?? 'unknown',
        arn: user.Arn ?? 'unknown',
        createDate: user.CreateDate?.toISOString() ?? 'unknown',
        passwordLastUsed,
        hasMFA,
        accessKeys,
      });
    }

    // Collect roles
    const rolesResponse = await iamClient.send(new ListRolesCommand({}));
    for (const role of rolesResponse.Roles ?? []) {
      roles.push({
        roleName: role.RoleName ?? 'unknown',
        roleId: role.RoleId ?? 'unknown',
        arn: role.Arn ?? 'unknown',
        createDate: role.CreateDate?.toISOString() ?? 'unknown',
        description: role.Description,
      });
    }

    // Get password policy
    try {
      const policyResponse = await iamClient.send(new GetAccountPasswordPolicyCommand({}));
      passwordPolicy = {
        minimumPasswordLength: policyResponse.PasswordPolicy?.MinimumPasswordLength,
        requireSymbols: policyResponse.PasswordPolicy?.RequireSymbols,
        requireNumbers: policyResponse.PasswordPolicy?.RequireNumbers,
        requireUppercaseCharacters: policyResponse.PasswordPolicy?.RequireUppercaseCharacters,
        requireLowercaseCharacters: policyResponse.PasswordPolicy?.RequireLowercaseCharacters,
        allowUsersToChangePassword: policyResponse.PasswordPolicy?.AllowUsersToChangePassword,
        expirePasswords: policyResponse.PasswordPolicy?.ExpirePasswords,
        maxPasswordAge: policyResponse.PasswordPolicy?.MaxPasswordAge,
        passwordReusePrevention: policyResponse.PasswordPolicy?.PasswordReusePrevention,
        hardExpiry: policyResponse.PasswordPolicy?.HardExpiry,
      };
    } catch (error) {
      console.error('Failed to get password policy (might not be set)');
    }

    // Collect Access Analyzer findings
    try {
      const analyzersResponse = await accessAnalyzerClient.send(new ListAnalyzersCommand({}));

      for (const analyzer of analyzersResponse.analyzers ?? []) {
        if (!analyzer.arn) continue;

        const findingsResponse = await accessAnalyzerClient.send(
          new ListFindingsCommand({
            analyzerArn: analyzer.arn,
            filter: { status: { eq: ['ACTIVE'] } },
          })
        );

        for (const finding of findingsResponse.findings ?? []) {
          accessAnalyzerFindings.push({
            id: finding.id ?? 'unknown',
            resourceType: finding.resourceType ?? 'unknown',
            resourceArn: finding.resource ?? 'unknown',
            status: finding.status ?? 'unknown',
            createdAt: finding.createdAt?.toISOString() ?? 'unknown',
            principal: finding.principal?.AWS,
          });
        }
      }
    } catch (error) {
      console.error('Failed to collect Access Analyzer findings (might not be enabled)');
    }

    // Collect AWS Health events for exposed keys (SECP-001)
    try {
      const eventsResponse = await healthClient.send(
        new DescribeEventsCommand({
          filter: {
            eventTypeCategories: ['issue'],
            services: ['IAM'],
          },
        })
      );

      for (const event of eventsResponse.events ?? []) {
        if (event.eventTypeCode?.includes('AWS_IAM_ACCESS_KEY_')) {
          healthEvents.push({
            eventTypeCode: event.eventTypeCode ?? 'unknown',
            eventArn: event.arn ?? 'unknown',
            service: event.service ?? 'IAM',
            eventDescription: event.eventTypeCode ?? 'Exposed access key',
            startTime: event.startTime?.toISOString() ?? 'unknown',
            endTime: event.endTime?.toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Failed to collect Health events (might need us-east-1 or Business support plan)');
    }

    const totalAccessKeys = users.reduce((sum, u) => sum + u.accessKeys.length, 0);
    const activeAccessKeys = users.reduce(
      (sum, u) => sum + u.accessKeys.filter(k => k.status === 'Active').length,
      0
    );

    const summary = {
      totalUsers: users.length,
      usersWithMFA: users.filter(u => u.hasMFA).length,
      usersWithoutMFA: users.filter(u => !u.hasMFA).length,
      totalRoles: roles.length,
      totalAccessKeys,
      activeAccessKeys,
      exposedKeys: healthEvents.length,
      accessAnalyzerFindings: accessAnalyzerFindings.length,
    };

    return {
      users,
      roles,
      passwordPolicy,
      accessAnalyzerFindings,
      healthEvents,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect IAM evidence: ${error}`);
    return {
      users: [],
      roles: [],
      passwordPolicy: {},
      accessAnalyzerFindings: [],
      healthEvents: [],
      summary: {
        totalUsers: 0,
        usersWithMFA: 0,
        usersWithoutMFA: 0,
        totalRoles: 0,
        totalAccessKeys: 0,
        activeAccessKeys: 0,
        exposedKeys: 0,
        accessAnalyzerFindings: 0,
      },
    };
  }
}

/**
 * Save IAM evidence to file
 */
export function saveIAMEvidence(evidence: IAMEvidence, outputPath: string): EvidenceArtifact {
  const fs = require('fs');
  const path = require('path');

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'IAM users, roles, password policy, and security findings',
    requirementIds: ['SEC-004', 'SECP-001'],
    collectedAt: new Date(),
    metadata: {
      totalUsers: evidence.summary.totalUsers,
      usersWithMFA: evidence.summary.usersWithMFA,
      exposedKeys: evidence.summary.exposedKeys,
    },
  };
}

/**
 * Print IAM evidence summary
 */
export function printIAMEvidenceSummary(evidence: IAMEvidence): void {
  console.log('IAM Evidence:');
  console.log(`  Total users: ${evidence.summary.totalUsers}`);
  console.log(`  Users with MFA: ${evidence.summary.usersWithMFA}`);
  console.log(`  Users without MFA: ${evidence.summary.usersWithoutMFA}`);
  console.log(`  Total roles: ${evidence.summary.totalRoles}`);
  console.log(`  Active access keys: ${evidence.summary.activeAccessKeys}`);
  console.log(`  Exposed keys (Health): ${evidence.summary.exposedKeys}`);
  console.log(`  Access Analyzer findings: ${evidence.summary.accessAnalyzerFindings}`);
  console.log('');
}
