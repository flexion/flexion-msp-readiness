/**
 * Workspace Assessor - Assess completeness of MSP workspace
 *
 * This assessor works in "self" mode, checking the msp-readiness
 * repo itself for completeness rather than an external project.
 *
 * Enhanced to handle mixed technical/non-technical requirements with
 * intelligent automation type detection and document quality assessment.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MSP_REQUIREMENTS } from '../data/msp-requirements';
import { MSPRequirement, ValidationResult, AutomationType, DocumentQualityScore } from '../types';
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
  automationType: AutomationType;
  automationCoverage: number;
  manualStepsRequired: string[];
  templateAvailable: boolean;
  documentQuality?: DocumentQualityScore;
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
 * Determine the automation type for a requirement
 */
function determineAutomationType(requirement: MSPRequirement): AutomationType {
  const hasAWSServices = requirement.awsServices && requirement.awsServices.length > 0;
  const hasProcessEvidence = requirement.evidenceRequired.some(
    e =>
      e.includes('documentation') ||
      e.includes('policy') ||
      e.includes('procedure') ||
      e.includes('checklist') ||
      e.includes('template') ||
      e.includes('presentation') ||
      e.includes('process') ||
      e.includes('charter') ||
      e.includes('matrix') ||
      e.includes('report')
  );

  if (hasAWSServices && !hasProcessEvidence) return 'full';
  if (!hasAWSServices && hasProcessEvidence) return 'manual';
  return 'partial';
}

/**
 * Calculate automation coverage percentage
 */
function calculateAutomationCoverage(requirement: MSPRequirement): number {
  const totalEvidence = requirement.evidenceRequired.length;
  if (totalEvidence === 0) return 0;

  // Count how many evidence items can be automatically collected
  const awsEvidence = requirement.awsServices?.length || 0;
  const autoCollectableCount = requirement.evidenceRequired.filter(
    e =>
      // These can be automatically collected
      !e.includes('documentation') &&
      !e.includes('policy') &&
      !e.includes('procedure') &&
      !e.includes('presentation') &&
      !e.includes('charter') &&
      !e.includes('contract') &&
      !e.includes('report')
  ).length;

  // Use whichever is higher - AWS services count or auto-collectable evidence
  const automatedItems = Math.max(awsEvidence, autoCollectableCount);
  return Math.round((automatedItems / totalEvidence) * 100);
}

/**
 * Generate manual steps guidance for missing evidence
 */
function getManualSteps(requirement: MSPRequirement, collectedEvidence: string[]): string[] {
  const steps: string[] = [];

  // Check what evidence is still needed
  for (const evidenceType of requirement.evidenceRequired) {
    const found = collectedEvidence.some(path =>
      path.toLowerCase().includes(evidenceType.toLowerCase().replace(/[^a-z0-9]/g, '-'))
    );

    if (!found) {
      // Provide guidance for missing evidence
      steps.push(getMissingEvidenceGuidance(requirement.id, evidenceType));
    }
  }

  return steps;
}

/**
 * Get specific guidance for missing evidence types
 */
function getMissingEvidenceGuidance(requirementId: string, evidenceType: string): string {
  // Evidence-type specific guidance
  const guidanceMap: Record<string, string> = {
    'company-overview-presentation':
      'Create company overview using template: templates/business/company-overview.md',
    'customer-portfolio-summary':
      'Document customer portfolio with case studies: templates/business/customer-portfolio.md',
    'customer-contracts': 'Gather recent customer contracts/addenda showing MSP growth',
    'growth-documentation': 'Document new customer acquisitions in last 18 months',
    'financial-reports': 'Provide financial planning reports and forecasts',
    'budget-forecasts': 'Include budget planning documentation',
    'financial-policies': 'Document financial planning and review policies',
    'gtm-process-documentation': 'Document go-to-market process: templates/business/gtm-process.md',
    'sales-enablement-materials': 'Gather sales training and enablement materials',
    'onboarding-checklists':
      'Create onboarding checklist: templates/people/onboarding-checklist.md',
    'training-plans': 'Document training curriculum and plans',
    'onboarding-records': 'Provide recent onboarding records (anonymized)',
    'ccoe-charter': 'Create CCOE charter: templates/people/ccoe-charter.md',
    'organization-structure': 'Document CCOE organization structure',
    'operational-process': 'Document CCOE operational processes',
    'offboarding-checklists':
      'Create offboarding checklist: templates/people/offboarding-checklist.md',
    'access-revocation-records': 'Provide recent access revocation records',
    'security-certifications': 'Document security-related offboarding steps',
    'risk-analysis': 'Create risk register: templates/governance/risk-register.md',
    'mitigation-plans': 'Document risk mitigation strategies',
    'risk-monitoring-process': 'Define risk monitoring and review process',
    'customer-feedback-process':
      'Document customer satisfaction process: templates/governance/customer-feedback.md',
    'satisfaction-reports': 'Provide recent customer satisfaction reports',
    'feedback-resolution-process': 'Document feedback resolution workflow',
    'customer-contract-template': 'Provide customer contract template with offboarding terms',
    'offboarding-procedures': 'Document customer offboarding procedures',
    'data-transfer-process': 'Define data transfer/return process',
    'operational-readiness-checklist':
      'Create operational readiness checklist: templates/governance/ops-readiness.md',
    'ops-team-documentation': 'Document operations team capabilities',
    'raci-matrix': 'Create RACI matrix: templates/governance/raci-matrix.md',
    'customer-onboarding-documentation': 'Document customer onboarding process',
    'sustainability-examples': 'Provide sustainability optimization examples',
    'optimization-documentation': 'Document cost/sustainability optimization practices',
  };

  return guidanceMap[evidenceType] || `Provide documentation for: ${evidenceType}`;
}

/**
 * Assess document quality from validation results
 */
function assessDocumentQuality(
  evidencePaths: string[],
  validationResult?: ValidationResult
): DocumentQualityScore | undefined {
  // Only assess quality if we have document evidence
  const hasDocEvidence = evidencePaths.some(
    p => p.includes('process-templates') || p.endsWith('.md') || p.includes('documentation')
  );

  if (!hasDocEvidence || !validationResult) return undefined;

  const score = validationResult.score || (validationResult.passed ? 100 : 50);
  const issues =
    validationResult.issues?.map(i => i.message) ||
    validationResult.checks.filter(c => !c.passed).map(c => c.message || c.name);

  const hasIssues = validationResult.issues !== undefined;

  return {
    score,
    hasRequiredSections: hasIssues
      ? !validationResult.issues!.some(i => i.type === 'missing-sections')
      : true,
    isFresh: hasIssues ? !validationResult.issues!.some(i => i.type === 'stale') : true,
    meetsLengthRequirement: hasIssues
      ? !validationResult.issues!.some(i => i.type === 'incomplete')
      : true,
    issues,
  };
}

/**
 * Check if template is available for this requirement
 */
function checkTemplateAvailable(
  requirementId: string,
  templatesDir: string = './templates'
): boolean {
  // Map requirement IDs to template paths
  const templateMap: Record<string, string> = {
    'BUS-001': 'business/company-overview.md',
    'BUS-002': 'business/customer-portfolio.md',
    'BUS-003': 'business/financial-planning.md',
    'BUS-004': 'business/gtm-process.md',
    'PEO-001': 'people/onboarding-checklist.md',
    'PEO-002': 'people/ccoe-charter.md',
    'PEO-003': 'people/offboarding-checklist.md',
    'GOV-001': 'governance/risk-register.md',
    'GOV-002': 'governance/customer-feedback.md',
    'GOV-003': 'governance/customer-offboarding.md',
    'GOV-004': 'governance/ops-readiness.md',
    'GOV-005': 'governance/raci-matrix.md',
    'GOV-006': 'governance/sustainability.md',
    // Add more mappings as templates are created
  };

  const templatePath = templateMap[requirementId];
  if (!templatePath) return false;

  const fullPath = path.join(templatesDir, templatePath);
  return fs.existsSync(fullPath);
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
  // Determine automation characteristics
  const automationType = determineAutomationType(requirement);
  const automationCoverage = calculateAutomationCoverage(requirement);

  // Check for playbook
  const { hasPlaybook, playbookPath, playbookStatus } = checkPlaybook(requirement, playbooksDir);

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

  // Calculate overall status and completion percentage based on automation type
  let overallStatus: 'complete' | 'in-progress' | 'not-started';
  let completionPercentage: number;

  if (automationType === 'full') {
    // Fully automated (AWS-only): evidence collection = compliance
    if (hasEvidence && validated === true && hasPlaybook && playbookStatus === 'approved') {
      overallStatus = 'complete';
      completionPercentage = 100;
    } else if (hasEvidence || hasPlaybook) {
      overallStatus = 'in-progress';
      let score = 0;
      if (hasPlaybook) score += 40;
      if (hasEvidence) score += 40;
      if (validated === true) score += 10;
      if (playbookStatus === 'approved') score += 10;
      completionPercentage = Math.min(score, 90);
    } else {
      overallStatus = 'not-started';
      completionPercentage = 0;
    }
  } else if (automationType === 'manual') {
    // Manual (document-only): check document quality
    if (hasPlaybook && hasEvidence && validated === true && playbookStatus === 'approved') {
      overallStatus = 'complete';
      completionPercentage = 100;
    } else if (hasPlaybook || hasEvidence) {
      overallStatus = 'in-progress';
      let score = 0;
      if (hasPlaybook) score += 40;
      if (hasEvidence) score += 30;
      if (validated === true) score += 20;
      if (playbookStatus === 'approved') score += 10;
      completionPercentage = Math.min(score, 90);
    } else {
      overallStatus = 'not-started';
      completionPercentage = 0;
    }
  } else {
    // Mixed: combine AWS + document assessment
    if (hasPlaybook && hasEvidence && validated === true && playbookStatus === 'approved') {
      overallStatus = 'complete';
      completionPercentage = 100;
    } else if (hasPlaybook || hasEvidence) {
      overallStatus = 'in-progress';
      let score = 0;
      if (hasPlaybook) score += 35;
      if (hasEvidence) score += 35;
      if (validated === true) score += 20;
      if (playbookStatus === 'approved') score += 10;
      completionPercentage = Math.min(score, 90);
    } else {
      overallStatus = 'not-started';
      completionPercentage = 0;
    }
  }

  // Generate manual steps guidance
  const manualStepsRequired = getManualSteps(requirement, evidencePaths);

  // Check template availability
  const templateAvailable = checkTemplateAvailable(requirement.id);

  // Assess document quality if applicable
  const documentQuality = assessDocumentQuality(evidencePaths, validationResult);

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
    automationType,
    automationCoverage,
    manualStepsRequired,
    templateAvailable,
    documentQuality,
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

  const playbookStatus = (getDocumentStatus(playbookPath) || undefined) as
    'draft' | 'in-progress' | 'approved' | 'complete' | undefined;

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
  console.log(
    `Overall Completion: ${summary.completionPercentage}% (${summary.complete}/${summary.total})\n`
  );

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
      console.log(`    Automation: ${r.automationType} (${r.automationCoverage}% coverage)`);
      console.log(
        `    ${r.hasPlaybook ? '✓' : '✗'} Playbook${r.playbookStatus ? `: ${r.playbookStatus}` : ''}`
      );
      console.log(
        `    ${r.hasEvidence ? '✓' : '✗'} Evidence${r.hasEvidence ? `: ${r.evidencePaths.length} file(s)` : ''}`
      );
      if (r.validated !== undefined) {
        console.log(
          `    ${r.validated ? '✓' : '✗'} Validation: ${r.validated ? 'passed' : 'failed'}`
        );
        if (!r.validated && r.validationResult) {
          const failedChecks = r.validationResult.checks.filter(c => !c.passed);
          if (failedChecks.length > 0) {
            console.log(`      Failed: ${failedChecks.map(c => c.name).join(', ')}`);
          }
        }
      }
      if (r.documentQuality) {
        console.log(`    📄 Document Quality: ${r.documentQuality.score}/100`);
      }
      if (r.manualStepsRequired.length > 0) {
        console.log(`    ⚠️  Manual steps needed: ${r.manualStepsRequired.length}`);
        if (r.manualStepsRequired.length <= 3) {
          r.manualStepsRequired.forEach(step => {
            console.log(`      - ${step}`);
          });
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
