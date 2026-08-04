/**
 * Workspace Assessor - Assess completeness of MSP workspace
 *
 * This assessor works in "self" mode, checking the msp-readiness
 * repo itself for completeness rather than an external project.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MSP_REQUIREMENTS } from '../data/msp-requirements';
import { MSPRequirement, ValidationResult } from '../types';
import { getDocumentStatus } from '../utils/frontmatter';
import { validatorRegistry } from '../validators/validator-registry';

export interface WorkspaceRequirementStatus {
  requirement: MSPRequirement;
  hasPlaybook: boolean;
  playbookPath?: string;
  playbookStatus?: 'draft' | 'in-progress' | 'approved' | 'complete';
  hasEvidence: boolean;
  evidencePaths: string[];
  validated?: boolean;
  validationResult?: ValidationResult;
  overallStatus: 'complete' | 'in-progress' | 'not-started';
  completionPercentage: number;
}

export interface WorkspaceAssessment {
  requirements: WorkspaceRequirementStatus[];
  summary: {
    total: number;
    complete: number;
    inProgress: number;
    notStarted: number;
    completionPercentage: number;
  };
}

/**
 * Assess the MSP workspace (this repo) for completeness
 */
export async function assessWorkspace(
  playbooksDir: string = './playbooks',
  evidenceDir: string = './evidence',
  validateEvidence: boolean = true
): Promise<WorkspaceAssessment> {
  const requirements: WorkspaceRequirementStatus[] = [];

  for (const req of MSP_REQUIREMENTS) {
    const status = await assessRequirement(req, playbooksDir, evidenceDir, validateEvidence);
    requirements.push(status);
  }

  const summary = calculateSummary(requirements);

  return { requirements, summary };
}

/**
 * Assess a single requirement for workspace completeness
 */
async function assessRequirement(
  requirement: MSPRequirement,
  playbooksDir: string,
  evidenceDir: string,
  validateEvidence: boolean
): Promise<WorkspaceRequirementStatus> {
  // Check for playbook
  const { hasPlaybook, playbookPath, playbookStatus } = checkPlaybook(
    requirement,
    playbooksDir
  );

  // Check for evidence
  const { hasEvidence, evidencePaths } = checkEvidence(requirement, evidenceDir);

  // Validate evidence if requested and available
  let validated: boolean | undefined;
  let validationResult: ValidationResult | undefined;

  if (validateEvidence && hasEvidence && evidencePaths.length > 0) {
    try {
      const result = await validatorRegistry.validate(requirement, evidencePaths);
      if (result !== null) {
        validationResult = result;
        validated = result.passed;
      }
    } catch (error) {
      console.warn(`Validation failed for ${requirement.id}: ${error}`);
      validated = undefined;
    }
  }

  // Calculate overall status and completion percentage
  let overallStatus: 'complete' | 'in-progress' | 'not-started';
  let completionPercentage: number;

  // New completion logic: must have playbook, evidence, validation passed, and be approved
  if (hasPlaybook && hasEvidence && validated === true && playbookStatus === 'approved') {
    overallStatus = 'complete';
    completionPercentage = 100;
  } else if (hasPlaybook || hasEvidence) {
    overallStatus = 'in-progress';
    // Calculate partial completion
    let score = 0;
    if (hasPlaybook) score += 40;           // Playbook: 40%
    if (hasEvidence) score += 30;           // Evidence: 30%
    if (validated === true) score += 20;    // Validation: 20%
    if (playbookStatus === 'approved') score += 10; // Approval: 10%
    completionPercentage = Math.min(score, 90); // Max 90% until fully complete
  } else {
    overallStatus = 'not-started';
    completionPercentage = 0;
  }

  return {
    requirement,
    hasPlaybook,
    playbookPath,
    playbookStatus,
    hasEvidence,
    evidencePaths,
    validated,
    validationResult,
    overallStatus,
    completionPercentage,
  };
}

/**
 * Check if playbook exists for requirement
 */
function checkPlaybook(
  requirement: MSPRequirement,
  playbooksDir: string
): {
  hasPlaybook: boolean;
  playbookPath?: string;
  playbookStatus?: 'draft' | 'in-progress' | 'approved' | 'complete';
} {
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

  const filename = playbookMap[requirement.id];
  if (!filename) {
    return { hasPlaybook: false };
  }

  const playbookPath = path.join(playbooksDir, filename);
  if (!fs.existsSync(playbookPath)) {
    return { hasPlaybook: false };
  }

  const playbookStatus = getDocumentStatus(playbookPath) || undefined;

  return {
    hasPlaybook: true,
    playbookPath,
    playbookStatus,
  };
}

/**
 * Check if evidence exists for requirement
 */
function checkEvidence(
  requirement: MSPRequirement,
  evidenceDir: string
): {
  hasEvidence: boolean;
  evidencePaths: string[];
} {
  if (!fs.existsSync(evidenceDir)) {
    return { hasEvidence: false, evidencePaths: [] };
  }

  // Check for evidence files matching requirement
  // Evidence files typically named: {service}-{type}.json
  const evidenceFiles = fs.readdirSync(evidenceDir);

  // Map requirement to expected evidence files
  const evidencePatterns: Record<string, RegExp[]> = {
    'SEC-003': [/config-.+\.json/, /cloudtrail-.+\.json/, /security-hub-.+\.json/],
    'SEC-004': [/iam-.+\.json/],
    'SECP-001': [/iam-.+\.json/],
    'SECP-002': [/public-resources\.json/],
    'SEC-007': [/inspector-.+\.json/],
    'SEC-008': [/inspector-.+\.json/, /security-hub-.+\.json/],
    'SEC-009': [/encryption-.+\.json/],
    'OPS-003': [/cloudwatch-.+\.json/],
    'OPS-004': [/cloudtrail-.+\.json/, /cloudwatch-.+\.json/],
    'OPS-005': [/backup-.+\.json/],
    'OPS-008': [/ssm-.+\.json/, /patch-.+\.json/],
    'OPS-011': [/availability-.+\.json/],
    'OPSP-001': [/process-templates\.json/, /git-history\.json/],
    'OPSP-002': [/process-templates\.json/, /git-history\.json/],
    'OPSP-003': [/process-templates\.json/, /git-history\.json/],
    'OPSP-005': [/process-templates\.json/],
    'OPS-006': [/process-templates\.json/, /git-history\.json/],
    'SEC-001': [/process-templates\.json/],
  };

  const patterns = evidencePatterns[requirement.id] || [];
  const matchingPaths: string[] = [];

  for (const file of evidenceFiles) {
    for (const pattern of patterns) {
      if (pattern.test(file)) {
        matchingPaths.push(path.join(evidenceDir, file));
      }
    }
  }

  return {
    hasEvidence: matchingPaths.length > 0,
    evidencePaths: matchingPaths,
  };
}

/**
 * Calculate summary statistics
 */
function calculateSummary(
  requirements: WorkspaceRequirementStatus[]
): WorkspaceAssessment['summary'] {
  const total = requirements.length;
  const complete = requirements.filter(r => r.overallStatus === 'complete').length;
  const inProgress = requirements.filter(r => r.overallStatus === 'in-progress').length;
  const notStarted = requirements.filter(r => r.overallStatus === 'not-started').length;

  // Calculate completion as percentage of requirements that are 100% complete
  const completionPercentage = Math.round((complete / total) * 100);

  return {
    total,
    complete,
    inProgress,
    notStarted,
    completionPercentage,
  };
}

/**
 * Print workspace assessment summary
 */
export function printWorkspaceAssessment(assessment: WorkspaceAssessment): void {
  const { summary, requirements } = assessment;

  console.log('\n📊 MSP Workspace Status\n');
  console.log(`Overall Completion: ${summary.completionPercentage}% (${summary.complete}/${summary.total})\n`);

  console.log(`✅ Complete:     ${summary.complete} requirements`);
  console.log(`🚧 In Progress:  ${summary.inProgress} requirements`);
  console.log(`❌ Not Started:  ${summary.notStarted} requirements\n`);

  // Show details for each category
  const complete = requirements.filter(r => r.overallStatus === 'complete');
  const inProgress = requirements.filter(r => r.overallStatus === 'in-progress');
  const notStarted = requirements.filter(r => r.overallStatus === 'not-started');

  if (complete.length > 0) {
    console.log('✅ Complete:');
    complete.forEach(r => {
      console.log(`  ${r.requirement.id}: ${r.requirement.name}`);
      console.log(`    ✓ Playbook: ${r.playbookStatus}`);
      console.log(`    ✓ Evidence: ${r.evidencePaths.length} file(s)`);
      console.log(`    ✓ Validation: ${r.validated ? 'passed' : 'n/a'}`);
    });
    console.log('');
  }

  if (inProgress.length > 0) {
    console.log('🚧 In Progress:');
    inProgress.forEach(r => {
      console.log(`  ${r.requirement.id}: ${r.requirement.name} (${r.completionPercentage}%)`);
      console.log(`    ${r.hasPlaybook ? '✓' : '✗'} Playbook${r.playbookStatus ? `: ${r.playbookStatus}` : ''}`);
      console.log(`    ${r.hasEvidence ? '✓' : '✗'} Evidence${r.hasEvidence ? `: ${r.evidencePaths.length} file(s)` : ''}`);
      if (r.validated !== undefined) {
        console.log(`    ${r.validated ? '✓' : '✗'} Validation: ${r.validated ? 'passed' : 'failed'}`);
        if (!r.validated && r.validationResult) {
          const failedChecks = r.validationResult.checks.filter(c => !c.passed);
          if (failedChecks.length > 0) {
            console.log(`      Failed: ${failedChecks.map(c => c.name).join(', ')}`);
          }
        }
      }
    });
    console.log('');
  }

  if (notStarted.length > 0 && notStarted.length <= 10) {
    console.log('❌ Not Started:');
    notStarted.forEach(r => {
      console.log(`  ${r.requirement.id}: ${r.requirement.name}`);
    });
    console.log('');
  } else if (notStarted.length > 10) {
    console.log(`❌ Not Started: ${notStarted.length} requirements`);
    console.log('Run "msp-readiness generate" to create missing playbooks\n');
  }
}
