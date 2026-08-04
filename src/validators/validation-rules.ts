/**
 * Validation Rules
 * Configurable validation rules for different requirement types
 */

import {
  ValidationRule,
  ValidationCheck,
  ValidationContext,
  RequirementCategory,
} from '../types';
import {
  validateDocument,
  getDefaultDocumentRequirements,
  determineDocumentType,
} from './document-validator';
import { validateAWSEvidence } from './aws-evidence-validator';

/**
 * Standard validation rules by category
 */
export const VALIDATION_RULES: ValidationRule[] = [
  // Document rules
  {
    id: 'DOC-001',
    name: 'Document exists',
    category: 'document',
    severity: 'error',
    check: async (context: ValidationContext): Promise<ValidationCheck> => {
      const docEvidence = context.evidence.find(e => e.type === 'document');
      const exists = docEvidence !== undefined;

      return {
        name: 'Document exists',
        passed: exists,
        expected: 'documentation present',
        actual: exists ? 'found' : 'not found',
        severity: 'critical',
        rule: 'DOC-001',
        location: docEvidence?.path,
      };
    },
  },
  {
    id: 'DOC-002',
    name: 'Document is complete',
    category: 'document',
    severity: 'error',
    check: async (context: ValidationContext): Promise<ValidationCheck> => {
      const docEvidence = context.evidence.find(e => e.type === 'document');

      if (!docEvidence) {
        return {
          name: 'Document completeness',
          passed: false,
          expected: 'complete documentation',
          actual: 'no document',
          severity: 'critical',
          rule: 'DOC-002',
        };
      }

      const docType = determineDocumentType(docEvidence.path);
      const requirements = getDefaultDocumentRequirements(
        context.requirement,
        docType
      );

      const result = await validateDocument(
        docEvidence.path,
        requirements,
        context.requirement
      );

      return {
        name: 'Document completeness',
        passed: result.valid,
        expected: 'complete documentation',
        actual: `${result.score}% complete`,
        severity: result.score < 50 ? 'critical' : 'high',
        rule: 'DOC-002',
        location: docEvidence.path,
        message: result.issues.map(i => i.message).join('; '),
      };
    },
  },
  {
    id: 'DOC-003',
    name: 'Document is current',
    category: 'document',
    severity: 'warning',
    check: async (context: ValidationContext): Promise<ValidationCheck> => {
      const docEvidence = context.evidence.find(e => e.type === 'document');

      if (!docEvidence) {
        return {
          name: 'Document freshness',
          passed: false,
          expected: 'current documentation',
          actual: 'no document',
          severity: 'high',
          rule: 'DOC-003',
        };
      }

      const docType = determineDocumentType(docEvidence.path);
      const requirements = getDefaultDocumentRequirements(
        context.requirement,
        docType
      );

      const result = await validateDocument(
        docEvidence.path,
        requirements,
        context.requirement
      );

      const freshnessCheck = result.checks.find(c =>
        c.name.includes('freshness')
      );

      if (!freshnessCheck) {
        return {
          name: 'Document freshness',
          passed: true,
          expected: 'current',
          actual: 'current',
          severity: 'low',
          rule: 'DOC-003',
          location: docEvidence.path,
        };
      }

      return {
        ...freshnessCheck,
        rule: 'DOC-003',
      };
    },
  },

  // AWS evidence rules
  {
    id: 'AWS-001',
    name: 'AWS evidence collected',
    category: 'aws',
    severity: 'error',
    check: async (context: ValidationContext): Promise<ValidationCheck> => {
      const awsEvidence = context.evidence.find(
        e => e.type === 'aws-snapshot'
      );
      const exists = awsEvidence !== undefined;

      return {
        name: 'AWS evidence collected',
        passed: exists,
        expected: 'AWS evidence present',
        actual: exists ? 'collected' : 'not collected',
        severity: 'critical',
        rule: 'AWS-001',
        location: awsEvidence?.path,
      };
    },
  },
  {
    id: 'AWS-002',
    name: 'AWS evidence is valid',
    category: 'aws',
    severity: 'error',
    check: async (context: ValidationContext): Promise<ValidationCheck> => {
      const awsEvidence = context.evidence.find(
        e => e.type === 'aws-snapshot'
      );

      if (!awsEvidence) {
        return {
          name: 'AWS evidence validity',
          passed: false,
          expected: 'valid AWS evidence',
          actual: 'no evidence',
          severity: 'critical',
          rule: 'AWS-002',
        };
      }

      const result = await validateAWSEvidence(
        awsEvidence,
        context.requirement
      );

      return {
        name: 'AWS evidence validity',
        passed: result.passed,
        expected: 'valid evidence',
        actual: result.passed ? 'valid' : 'invalid',
        severity: result.passed ? 'low' : 'critical',
        rule: 'AWS-002',
        location: awsEvidence.path,
        message: result.summary,
      };
    },
  },
  {
    id: 'AWS-003',
    name: 'AWS evidence is current',
    category: 'aws',
    severity: 'warning',
    check: async (context: ValidationContext): Promise<ValidationCheck> => {
      const awsEvidence = context.evidence.find(
        e => e.type === 'aws-snapshot'
      );

      if (!awsEvidence) {
        return {
          name: 'AWS evidence freshness',
          passed: false,
          expected: 'current evidence',
          actual: 'no evidence',
          severity: 'high',
          rule: 'AWS-003',
        };
      }

      const ageMs = Date.now() - new Date(awsEvidence.collectedAt).getTime();
      const daysOld = ageMs / (1000 * 60 * 60 * 24);
      const isCurrent = daysOld <= 7;

      return {
        name: 'AWS evidence freshness',
        passed: isCurrent,
        expected: '<= 7 days old',
        actual: `${daysOld.toFixed(1)} days old`,
        severity: isCurrent ? 'low' : 'medium',
        rule: 'AWS-003',
        location: awsEvidence.path,
      };
    },
  },

  // Cross-requirement rules
  {
    id: 'CROSS-001',
    name: 'Related requirements consistent',
    category: 'cross-requirement',
    severity: 'warning',
    check: async (context: ValidationContext): Promise<ValidationCheck> => {
      // This would check that related requirements don't have conflicting evidence
      // For now, we'll just mark as passed - this is a placeholder for future implementation
      return {
        name: 'Cross-requirement consistency',
        passed: true,
        expected: 'consistent evidence',
        actual: 'consistent',
        severity: 'low',
        rule: 'CROSS-001',
      };
    },
  },
];

/**
 * Get rules by category
 */
export function getRulesByCategory(
  category: 'document' | 'aws' | 'cross-requirement'
): ValidationRule[] {
  return VALIDATION_RULES.filter(r => r.category === category);
}

/**
 * Get rules by severity
 */
export function getRulesBySeverity(
  severity: 'error' | 'warning' | 'info'
): ValidationRule[] {
  return VALIDATION_RULES.filter(r => r.severity === severity);
}

/**
 * Get applicable rules for a requirement
 */
export function getApplicableRules(
  requirementCategory: RequirementCategory,
  hasAWSServices: boolean
): ValidationRule[] {
  const rules: ValidationRule[] = [];

  // All requirements need document rules
  rules.push(...getRulesByCategory('document'));

  // Requirements with AWS services need AWS rules
  if (hasAWSServices) {
    rules.push(...getRulesByCategory('aws'));
  }

  // Always check cross-requirement rules
  rules.push(...getRulesByCategory('cross-requirement'));

  return rules;
}

/**
 * Execute validation rules
 */
export async function executeRules(
  rules: ValidationRule[],
  context: ValidationContext
): Promise<ValidationCheck[]> {
  const checks: ValidationCheck[] = [];

  for (const rule of rules) {
    try {
      const check = await rule.check(context);
      checks.push(check);
    } catch (error) {
      // If a rule fails to execute, create a failed check
      checks.push({
        name: rule.name,
        passed: false,
        expected: 'rule execution',
        actual: 'error',
        severity: 'critical',
        rule: rule.id,
        message: `Rule execution failed: ${error}`,
      });
    }
  }

  return checks;
}

/**
 * Get rule by ID
 */
export function getRule(id: string): ValidationRule | undefined {
  return VALIDATION_RULES.find(r => r.id === id);
}
