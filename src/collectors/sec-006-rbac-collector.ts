/**
 * SEC-006: Role-Based Access Control (RBAC) Evidence Collector
 * Collects evidence of IAM role structure and least privilege implementation
 */

import {
  IAMClient,
  ListRolesCommand,
  GetRoleCommand,
  ListAttachedRolePoliciesCommand,
  ListRolePoliciesCommand,
  GetRolePolicyCommand,
  SimulatePrincipalPolicyCommand,
} from '@aws-sdk/client-iam';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface RBACEvidence {
  roles: RoleDetail[];
  roleSeparation: RoleSeparationAnalysis;
  trustRelationships: TrustRelationship[];
  summary: {
    totalRoles: number;
    adminRoles: number;
    developerRoles: number;
    readOnlyRoles: number;
    serviceRoles: number;
    rolesWithWildcardPermissions: number;
    rolesWithCrossTrust: number;
    compliant: boolean;
  };
}

export interface RoleDetail {
  name: string;
  arn: string;
  path: string;
  createdAt?: Date;
  assumeRolePolicyDocument: any;
  attachedPolicies: string[];
  inlinePolicies: string[];
  roleType: 'admin' | 'developer' | 'read-only' | 'service' | 'other';
  hasWildcardPermissions: boolean;
  permissionIssues: string[];
}

export interface RoleSeparationAnalysis {
  hasAdminRoles: boolean;
  hasDeveloperRoles: boolean;
  hasReadOnlyRoles: boolean;
  rolesByType: Record<string, number>;
  separationScore: number; // 0-100
}

export interface TrustRelationship {
  roleName: string;
  trustedPrincipals: string[];
  allowsCrossAccount: boolean;
  allowsAssumeRole: boolean;
  externalId?: string;
}

/**
 * Collect RBAC evidence
 */
export async function collectRBACEvidence(
  region: string
): Promise<RBACEvidence> {
  const iamClient = new IAMClient({ region });

  try {
    // Get all IAM roles
    const roles = await listAllRoles(iamClient);

    // Analyze trust relationships
    const trustRelationships = roles.map(role => analyzeTrustRelationship(role));

    // Analyze role separation
    const roleSeparation = analyzeRoleSeparation(roles);

    const summary = {
      totalRoles: roles.length,
      adminRoles: roles.filter(r => r.roleType === 'admin').length,
      developerRoles: roles.filter(r => r.roleType === 'developer').length,
      readOnlyRoles: roles.filter(r => r.roleType === 'read-only').length,
      serviceRoles: roles.filter(r => r.roleType === 'service').length,
      rolesWithWildcardPermissions: roles.filter(r => r.hasWildcardPermissions).length,
      rolesWithCrossTrust: trustRelationships.filter(t => t.allowsCrossAccount).length,
      compliant:
        roleSeparation.hasAdminRoles &&
        roleSeparation.hasDeveloperRoles &&
        roleSeparation.hasReadOnlyRoles &&
        roleSeparation.separationScore >= 70,
    };

    return {
      roles,
      roleSeparation,
      trustRelationships,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect RBAC evidence: ${error}`);
    return {
      roles: [],
      roleSeparation: {
        hasAdminRoles: false,
        hasDeveloperRoles: false,
        hasReadOnlyRoles: false,
        rolesByType: {},
        separationScore: 0,
      },
      trustRelationships: [],
      summary: {
        totalRoles: 0,
        adminRoles: 0,
        developerRoles: 0,
        readOnlyRoles: 0,
        serviceRoles: 0,
        rolesWithWildcardPermissions: 0,
        rolesWithCrossTrust: 0,
        compliant: false,
      },
    };
  }
}

/**
 * List all IAM roles with detailed information
 */
async function listAllRoles(client: IAMClient): Promise<RoleDetail[]> {
  const roles: RoleDetail[] = [];

  try {
    let marker: string | undefined;
    do {
      const response = await client.send(
        new ListRolesCommand({ Marker: marker })
      );

      for (const role of response.Roles ?? []) {
        if (!role.RoleName || !role.Arn) continue;

        // Get attached managed policies
        const attachedPolicies: string[] = [];
        try {
          const attachedResponse = await client.send(
            new ListAttachedRolePoliciesCommand({ RoleName: role.RoleName })
          );
          attachedPolicies.push(
            ...(attachedResponse.AttachedPolicies ?? []).map(p => p.PolicyName ?? '')
          );
        } catch (error) {
          // Might not have permission
        }

        // Get inline policies
        const inlinePolicies: string[] = [];
        try {
          const inlineResponse = await client.send(
            new ListRolePoliciesCommand({ RoleName: role.RoleName })
          );
          inlinePolicies.push(...(inlineResponse.PolicyNames ?? []));
        } catch (error) {
          // Might not have permission
        }

        // Determine role type
        const roleType = determineRoleType(role.RoleName, attachedPolicies, inlinePolicies);

        // Check for wildcard permissions
        const hasWildcardPermissions = checkWildcardPermissions(
          role.AssumeRolePolicyDocument,
          attachedPolicies,
          inlinePolicies
        );

        // Identify permission issues
        const permissionIssues: string[] = [];
        if (hasWildcardPermissions) {
          permissionIssues.push('Role has wildcard (*) permissions');
        }
        if (attachedPolicies.some(p => p.includes('AdministratorAccess'))) {
          permissionIssues.push('Role has full administrator access');
        }

        roles.push({
          name: role.RoleName,
          arn: role.Arn,
          path: role.Path ?? '/',
          createdAt: role.CreateDate,
          assumeRolePolicyDocument: role.AssumeRolePolicyDocument,
          attachedPolicies,
          inlinePolicies,
          roleType,
          hasWildcardPermissions,
          permissionIssues,
        });
      }

      marker = response.Marker;
    } while (marker);
  } catch (error) {
    console.error(`Failed to list IAM roles: ${error}`);
  }

  return roles;
}

/**
 * Determine role type based on name and policies
 */
function determineRoleType(
  roleName: string,
  attachedPolicies: string[],
  inlinePolicies: string[]
): 'admin' | 'developer' | 'read-only' | 'service' | 'other' {
  const lowerName = roleName.toLowerCase();
  const allPolicies = [...attachedPolicies, ...inlinePolicies].join(' ').toLowerCase();

  // Check for service roles
  if (lowerName.includes('service') || lowerName.includes('aws')) {
    return 'service';
  }

  // Check for admin roles
  if (
    lowerName.includes('admin') ||
    allPolicies.includes('administratoraccess') ||
    allPolicies.includes('poweruser')
  ) {
    return 'admin';
  }

  // Check for read-only roles
  if (
    lowerName.includes('readonly') ||
    lowerName.includes('read-only') ||
    lowerName.includes('viewer') ||
    allPolicies.includes('readonlyaccess')
  ) {
    return 'read-only';
  }

  // Check for developer roles
  if (
    lowerName.includes('developer') ||
    lowerName.includes('dev') ||
    lowerName.includes('engineer')
  ) {
    return 'developer';
  }

  return 'other';
}

/**
 * Check if role has wildcard permissions
 */
function checkWildcardPermissions(
  assumeRolePolicy: any,
  attachedPolicies: string[],
  inlinePolicies: string[]
): boolean {
  // Check attached policies for known wildcard patterns
  const hasWildcardPolicy = attachedPolicies.some(
    p =>
      p.includes('AdministratorAccess') ||
      p.includes('PowerUserAccess') ||
      p.includes('*')
  );

  if (hasWildcardPolicy) return true;

  // Check assume role policy
  try {
    const policyDoc =
      typeof assumeRolePolicy === 'string'
        ? JSON.parse(decodeURIComponent(assumeRolePolicy))
        : assumeRolePolicy;

    const policyStr = JSON.stringify(policyDoc);
    if (policyStr.includes('"Action":"*"') || policyStr.includes('"Resource":"*"')) {
      return true;
    }
  } catch (error) {
    // Could not parse policy
  }

  return false;
}

/**
 * Analyze trust relationship for a role
 */
function analyzeTrustRelationship(role: RoleDetail): TrustRelationship {
  const trustedPrincipals: string[] = [];
  let allowsCrossAccount = false;
  let allowsAssumeRole = false;
  let externalId: string | undefined;

  try {
    const policyDoc =
      typeof role.assumeRolePolicyDocument === 'string'
        ? JSON.parse(decodeURIComponent(role.assumeRolePolicyDocument))
        : role.assumeRolePolicyDocument;

    for (const statement of policyDoc.Statement ?? []) {
      if (statement.Effect === 'Allow' && statement.Action === 'sts:AssumeRole') {
        allowsAssumeRole = true;

        const principal = statement.Principal;
        if (principal) {
          // Check for AWS account principals
          if (principal.AWS) {
            const accounts = Array.isArray(principal.AWS) ? principal.AWS : [principal.AWS];
            trustedPrincipals.push(...accounts);

            // Check if cross-account
            allowsCrossAccount = accounts.some((acc: string) => !acc.includes(role.arn.split(':')[4]));
          }

          // Check for service principals
          if (principal.Service) {
            const services = Array.isArray(principal.Service)
              ? principal.Service
              : [principal.Service];
            trustedPrincipals.push(...services);
          }
        }

        // Check for external ID
        if (statement.Condition?.StringEquals?.['sts:ExternalId']) {
          externalId = statement.Condition.StringEquals['sts:ExternalId'];
        }
      }
    }
  } catch (error) {
    // Could not parse trust policy
  }

  return {
    roleName: role.name,
    trustedPrincipals,
    allowsCrossAccount,
    allowsAssumeRole,
    externalId,
  };
}

/**
 * Analyze role separation
 */
function analyzeRoleSeparation(roles: RoleDetail[]): RoleSeparationAnalysis {
  const rolesByType: Record<string, number> = {
    admin: 0,
    developer: 0,
    'read-only': 0,
    service: 0,
    other: 0,
  };

  for (const role of roles) {
    rolesByType[role.roleType]++;
  }

  const hasAdminRoles = rolesByType.admin > 0;
  const hasDeveloperRoles = rolesByType.developer > 0;
  const hasReadOnlyRoles = rolesByType['read-only'] > 0;

  // Calculate separation score (0-100)
  let score = 0;
  if (hasAdminRoles) score += 30;
  if (hasDeveloperRoles) score += 30;
  if (hasReadOnlyRoles) score += 30;

  // Bonus points for good distribution
  const total = roles.length - rolesByType.service;
  if (total > 0) {
    const adminRatio = rolesByType.admin / total;
    if (adminRatio < 0.2) score += 10; // Less than 20% admin roles is good
  }

  return {
    hasAdminRoles,
    hasDeveloperRoles,
    hasReadOnlyRoles,
    rolesByType,
    separationScore: Math.min(score, 100),
  };
}

/**
 * Save RBAC evidence to file
 */
export function saveSEC006Evidence(
  evidence: RBACEvidence,
  outputPath: string
): EvidenceArtifact {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save evidence as JSON
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'IAM role-based access control (RBAC) configuration and analysis',
    requirementIds: ['SEC-006'],
    collectedAt: new Date(),
    metadata: {
      totalRoles: evidence.summary.totalRoles,
      separationScore: evidence.roleSeparation.separationScore,
      compliant: evidence.summary.compliant,
    },
  };
}
