/**
 * Process Validator - OPSP-001, OPSP-002, OPSP-003, OPSP-005, OPS-006, SEC-001
 * Validates process documentation and procedures
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class ProcessValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['OPSP-001', 'OPSP-002', 'OPSP-003', 'OPSP-005', 'OPS-006', 'SEC-001'];
  }

  async validate(requirement: MSPRequirement, evidencePaths: string[]): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      const processPath = evidencePaths.find(p => p.includes('process-templates'));
      const gitHistoryPath = evidencePaths.find(p => p.includes('git-history'));

      if (!processPath) {
        throw new Error('Process templates evidence file not found');
      }

      const evidence = this.loadEvidenceFile(processPath);

      // Check that documentation exists for this requirement
      const hasDoc = evidence.existingDocuments?.some(
        (doc: any) => doc.requirementId === requirement.id && doc.found
      );

      checks.push(
        this.createCheck(
          'Process documentation exists',
          hasDoc,
          'documentation found',
          hasDoc ? 'documentation found' : 'documentation missing',
          'critical',
          !hasDoc ? `Create ${this.getRequirementDocumentName(requirement.id)}` : undefined
        )
      );

      // For OPS-006 (Change Management), check Git history
      if (requirement.id === 'OPS-006' && gitHistoryPath) {
        try {
          const gitHistory = this.loadEvidenceFile(gitHistoryPath);

          checks.push(
            this.validateMinimum(
              gitHistory.recentCommits?.length || 0,
              10,
              'Recent commits (change tracking)',
              'medium'
            )
          );

          checks.push(
            this.validateMinimum(
              gitHistory.contributors?.length || 0,
              1,
              'Contributors tracked',
              'low'
            )
          );
        } catch {
          checks.push(
            this.createCheck(
              'Git history available',
              false,
              'git history found',
              'git history not found',
              'medium',
              'Git version control provides evidence of change management'
            )
          );
        }
      }

      // Check for template generation recommendations
      const needsTemplate = evidence.templates?.some(
        (t: any) => t.requirementId === requirement.id
      );

      if (needsTemplate && !hasDoc) {
        checks.push(
          this.createCheck(
            'Template generated',
            false,
            'documentation complete',
            'template needed',
            'high',
            'Run "msp-readiness generate" to create missing documentation'
          )
        );
      }
    } catch (error) {
      checks.push(
        this.createCheck(
          'Evidence file validation',
          false,
          'valid evidence file',
          'error loading evidence',
          'critical',
          `Failed to validate evidence: ${error}`
        )
      );
    }

    return this.createResult(requirement.id, checks);
  }

  private getRequirementDocumentName(requirementId: string): string {
    const docNames: Record<string, string> = {
      'OPSP-001': 'incident response playbook',
      'OPSP-002': 'problem management procedures',
      'OPSP-003': 'deployment risk management playbook',
      'OPSP-005': 'service continuity/DR test documentation',
      'OPS-006': 'change management procedures',
      'SEC-001': 'security policies and CIS mapping',
    };
    return docNames[requirementId] || 'process documentation';
  }
}
