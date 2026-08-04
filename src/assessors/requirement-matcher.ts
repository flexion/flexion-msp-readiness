/**
 * Requirement matcher - matches documentation findings to MSP requirements
 */

import {
  RequirementAssessment,
  RequirementStatus,
  AssessmentFinding,
  MSPRequirement,
} from '../types';
import { DocScanResult } from './doc-scanner';
import { MSP_REQUIREMENTS } from '../data/msp-requirements';
import { AWSConfigAnalysis } from './aws-config-analyzer';
import { IAMAnalysis } from './iam-evaluator';
import { SecurityHubAnalysis } from './security-hub-checker';

export interface AWSAnalysisResults {
  configAnalysis?: AWSConfigAnalysis;
  iamAnalysis?: IAMAnalysis;
  securityHubAnalysis?: SecurityHubAnalysis;
}

/**
 * Match documentation scan results to MSP requirements
 */
export function matchRequirements(
  docScan: DocScanResult,
  skipRequirements: string[] = [],
  awsAnalysis?: AWSAnalysisResults
): RequirementAssessment[] {
  const assessments: RequirementAssessment[] = [];

  for (const requirement of MSP_REQUIREMENTS) {
    // Check if requirement should be skipped
    if (skipRequirements.includes(requirement.id)) {
      assessments.push(createNotApplicableAssessment(requirement));
      continue;
    }

    // Assess based on documentation and AWS
    const assessment = assessRequirement(requirement, docScan, awsAnalysis);
    assessments.push(assessment);
  }

  return assessments;
}

/**
 * Assess a single requirement based on documentation
 */
function assessRequirement(
  requirement: MSPRequirement,
  docScan: DocScanResult,
  awsAnalysis?: AWSAnalysisResults
): RequirementAssessment {
  const findings: AssessmentFinding[] = [];
  const gaps: string[] = [];
  const recommendations: string[] = [];

  // Add AWS findings if available
  if (awsAnalysis) {
    if (awsAnalysis.configAnalysis) {
      findings.push(...awsAnalysis.configAnalysis.findings);
    }
    if (awsAnalysis.iamAnalysis) {
      findings.push(...awsAnalysis.iamAnalysis.findings);
    }
    if (awsAnalysis.securityHubAnalysis) {
      findings.push(...awsAnalysis.securityHubAnalysis.findings);
    }
  }

  // Check for mentions of this requirement
  const mentions = docScan.requirementMentions.get(requirement.id) || [];
  const strongMentions = mentions.filter(m => m.type === 'strong');
  const weakMentions = mentions.filter(m => m.type === 'weak');

  // Add findings for mentions
  for (const mention of strongMentions) {
    findings.push({
      type: 'documentation',
      source: mention.file,
      summary: `Strong reference in ${mention.file}:${mention.line}`,
      details: mention.context,
      supportive: true,
      timestamp: new Date(),
    });
  }

  // Check for playbook/runbook presence based on requirement category
  const hasPlaybook = checkForPlaybook(requirement, docScan);
  const hasEvidence = checkForEvidence(requirement, docScan);
  const hasAssessment = checkForAssessmentEntry(requirement, docScan);

  if (hasPlaybook) {
    findings.push({
      type: 'documentation',
      source: 'Playbook analysis',
      summary: `Relevant playbook found for ${requirement.category} requirement`,
      supportive: true,
      timestamp: new Date(),
    });
  }

  if (hasEvidence) {
    findings.push({
      type: 'documentation',
      source: 'Evidence analysis',
      summary: `Evidence documentation found for ${requirement.id}`,
      supportive: true,
      timestamp: new Date(),
    });
  }

  if (hasAssessment) {
    findings.push({
      type: 'documentation',
      source: 'Self-assessment',
      summary: `Self-assessment entry found for ${requirement.id}`,
      supportive: true,
      timestamp: new Date(),
    });
  }

  // Determine status and confidence
  const { status, confidence } = determineStatus(
    requirement,
    strongMentions.length,
    weakMentions.length,
    hasPlaybook,
    hasEvidence,
    hasAssessment
  );

  // Generate gaps and recommendations based on status
  if (status === 'gap') {
    gaps.push('No documentation found for this requirement');
    gaps.push('No evidence artifacts present');
    recommendations.push(`Create playbook/procedure for ${requirement.name}`);
    recommendations.push(`Document how ${requirement.description}`);
    recommendations.push(
      `Collect evidence from AWS services: ${requirement.awsServices?.join(', ') || 'N/A'}`
    );
  } else if (status === 'partial') {
    if (!hasPlaybook && requirement.category === 'operations') {
      gaps.push('Missing operational playbook');
      recommendations.push(`Create operational playbook for ${requirement.name}`);
    }
    if (!hasEvidence) {
      gaps.push('Missing evidence artifacts');
      recommendations.push(`Collect evidence: ${requirement.evidenceRequired.join(', ')}`);
    }
    if (strongMentions.length === 0) {
      gaps.push('No dedicated section/document for this requirement');
      recommendations.push('Create dedicated documentation section');
    }
  }

  // Estimate effort
  const estimatedEffort =
    status === 'gap'
      ? requirement.estimatedHours || 8
      : status === 'partial'
        ? Math.ceil((requirement.estimatedHours || 8) / 2)
        : 0;

  return {
    requirement,
    status,
    confidence,
    findings,
    evidence: [], // Will be populated in Phase 3
    gaps,
    recommendations,
    estimatedEffort,
    automationType: 'manual', // Default for requirement matcher
    automationCoverage: 0,
    manualStepsRequired: [],
    templateAvailable: false,
  };
}

/**
 * Determine requirement status based on findings
 */
function determineStatus(
  requirement: MSPRequirement,
  strongMentions: number,
  weakMentions: number,
  hasPlaybook: boolean,
  hasEvidence: boolean,
  hasAssessment: boolean
): { status: RequirementStatus; confidence: number } {
  // Calculate documentation score (0-1)
  let docScore = 0;

  if (strongMentions > 0) docScore += 0.4;
  if (strongMentions >= 3) docScore += 0.2;
  if (weakMentions > 5) docScore += 0.2;
  if (hasPlaybook) docScore += 0.1;
  if (hasEvidence) docScore += 0.05;
  if (hasAssessment) docScore += 0.05;

  docScore = Math.min(docScore, 1.0);

  // Determine status
  let status: RequirementStatus;
  let confidence: number;

  if (docScore >= 0.7) {
    status = 'addressed';
    confidence = docScore;
  } else if (docScore >= 0.3) {
    status = 'partial';
    confidence = docScore;
  } else if (docScore > 0) {
    status = 'partial';
    confidence = 0.3;
  } else {
    status = 'gap';
    confidence = 1.0; // High confidence in gap
  }

  return { status, confidence };
}

/**
 * Check if relevant playbook exists
 */
function checkForPlaybook(requirement: MSPRequirement, docScan: DocScanResult): boolean {
  const playbookKeywords: Record<string, string[]> = {
    'OPSP-001': ['incident', 'response'],
    'OPSP-002': ['problem', 'post-incident'],
    'OPSP-003': ['deployment', 'change'],
    'OPSP-005': ['disaster', 'recovery', 'continuity'],
    'OPS-006': ['change', 'deployment'],
    'OPS-008': ['patch', 'vulnerability'],
    'SEC-010': ['incident', 'security'],
  };

  const keywords = playbookKeywords[requirement.id];
  if (!keywords) return false;

  return docScan.playbooksFound.some(playbook =>
    keywords.some(keyword => playbook.toLowerCase().includes(keyword))
  );
}

/**
 * Check if evidence documentation exists
 */
function checkForEvidence(requirement: MSPRequirement, docScan: DocScanResult): boolean {
  // Check if any evidence files mention this requirement
  const evidenceFiles = docScan.files.filter(f => f.type === 'evidence');

  for (const file of evidenceFiles) {
    if (file.content.includes(requirement.id)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if self-assessment entry exists
 */
function checkForAssessmentEntry(requirement: MSPRequirement, docScan: DocScanResult): boolean {
  const assessmentFiles = docScan.files.filter(f => f.type === 'assessment');

  for (const file of assessmentFiles) {
    if (file.content.includes(requirement.id)) {
      return true;
    }
  }

  return false;
}

/**
 * Create not-applicable assessment
 */
function createNotApplicableAssessment(requirement: MSPRequirement): RequirementAssessment {
  return {
    requirement,
    status: 'not-applicable',
    confidence: 1.0,
    findings: [
      {
        type: 'manual',
        source: 'Configuration',
        summary: 'Marked as not applicable in configuration',
        supportive: true,
        timestamp: new Date(),
      },
    ],
    evidence: [],
    gaps: [],
    recommendations: [],
    estimatedEffort: 0,
    automationType: 'manual',
    automationCoverage: 0,
    manualStepsRequired: [],
    templateAvailable: false,
  };
}

/**
 * Calculate summary statistics
 */
export function calculateSummary(assessments: RequirementAssessment[]): {
  addressed: number;
  partial: number;
  gap: number;
  notApplicable: number;
  notStarted: number;
  totalEffort: number;
} {
  const summary = {
    addressed: 0,
    partial: 0,
    gap: 0,
    notApplicable: 0,
    notStarted: 0,
    totalEffort: 0,
  };

  for (const assessment of assessments) {
    switch (assessment.status) {
      case 'addressed':
        summary.addressed++;
        break;
      case 'partial':
        summary.partial++;
        summary.totalEffort += assessment.estimatedEffort || 0;
        break;
      case 'gap':
        summary.gap++;
        summary.totalEffort += assessment.estimatedEffort || 0;
        break;
      case 'not-applicable':
        summary.notApplicable++;
        break;
      case 'not-started':
        summary.notStarted++;
        summary.totalEffort += assessment.estimatedEffort || 0;
        break;
    }
  }

  return summary;
}

/**
 * Get critical gaps (high/critical priority gaps)
 */
export function getCriticalGaps(assessments: RequirementAssessment[]): RequirementAssessment[] {
  return assessments
    .filter(
      a =>
        (a.status === 'gap' || a.status === 'partial') &&
        (a.requirement.priority === 'critical' || a.requirement.priority === 'high')
    )
    .sort((a, b) => {
      // Sort by priority first (critical > high)
      if (a.requirement.priority !== b.requirement.priority) {
        return a.requirement.priority === 'critical' ? -1 : 1;
      }
      // Then by effort (lower effort first for quick wins)
      return (a.estimatedEffort || 0) - (b.estimatedEffort || 0);
    });
}
