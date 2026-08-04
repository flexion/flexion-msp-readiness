/**
 * Document Validator
 * Validates document-based evidence for completeness, freshness, and quality
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  DocumentValidationResult,
  ValidationCheck,
  ValidationIssue,
  MSPRequirement,
  RequirementPriority,
} from '../types';

export interface DocumentRequirements {
  requiredSections?: string[]; // Header sections that must be present
  minimumLength?: number; // Minimum word count
  maximumAge?: number; // Maximum age in months
  requireFrontmatter?: boolean; // Must have YAML frontmatter
  allowTodos?: boolean; // Allow TODO/FIXME markers
}

/**
 * Validate a document file against requirements
 */
export async function validateDocument(
  filePath: string,
  requirements: DocumentRequirements,
  requirement?: MSPRequirement
): Promise<DocumentValidationResult> {
  const checks: ValidationCheck[] = [];
  const issues: ValidationIssue[] = [];
  let score = 100; // Start with perfect score, deduct for issues

  // Check 1: File exists
  const exists = fs.existsSync(filePath);
  checks.push({
    name: 'Document exists',
    passed: exists,
    expected: 'file exists',
    actual: exists ? 'found' : 'not found',
    severity: 'critical',
    rule: 'DOC-001',
    location: filePath,
  });

  if (!exists) {
    score = 0;
    issues.push({
      type: 'missing',
      severity: 'error',
      message: `Required document not found: ${filePath}`,
      recommendation: 'Create the missing document or run msp-readiness generate to create from template',
      affectedRequirements: requirement ? [requirement.id] : [],
      location: filePath,
    });

    return {
      valid: false,
      score,
      checks,
      issues,
      filePath,
      metadata: { exists: false },
    };
  }

  // Get file stats
  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Check 2: File is not empty
  const hasContent = content.trim().length > 0;
  checks.push({
    name: 'Document has content',
    passed: hasContent,
    expected: 'non-empty file',
    actual: hasContent ? `${content.length} characters` : 'empty',
    severity: 'critical',
    rule: 'DOC-002',
    location: filePath,
  });

  if (!hasContent) {
    score -= 50;
    issues.push({
      type: 'incomplete',
      severity: 'error',
      message: 'Document is empty',
      recommendation: 'Add content to the document',
      affectedRequirements: requirement ? [requirement.id] : [],
      location: filePath,
    });
  }

  // Check 3: Minimum content length
  if (requirements.minimumLength && hasContent) {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const meetsMinLength = wordCount >= requirements.minimumLength;

    checks.push({
      name: 'Minimum content length',
      passed: meetsMinLength,
      expected: `>= ${requirements.minimumLength} words`,
      actual: `${wordCount} words`,
      severity: 'high',
      rule: 'DOC-003',
      location: filePath,
    });

    if (!meetsMinLength) {
      score -= 15;
      issues.push({
        type: 'incomplete',
        severity: 'warning',
        message: `Document is too short (${wordCount} words, expected ${requirements.minimumLength}+)`,
        recommendation: 'Expand the document with more detailed content',
        affectedRequirements: requirement ? [requirement.id] : [],
        location: filePath,
      });
    }
  }

  // Check 4: Freshness (maximum age)
  if (requirements.maximumAge) {
    const ageInMonths = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const isFresh = ageInMonths <= requirements.maximumAge;

    checks.push({
      name: 'Document freshness',
      passed: isFresh,
      expected: `<= ${requirements.maximumAge} months old`,
      actual: `${ageInMonths.toFixed(1)} months old`,
      severity: 'medium',
      rule: 'DOC-004',
      location: filePath,
    });

    if (!isFresh) {
      score -= 10;
      issues.push({
        type: 'stale',
        severity: 'warning',
        message: `Document is outdated (last modified ${ageInMonths.toFixed(1)} months ago)`,
        recommendation: 'Review and update the document to ensure it reflects current practices',
        affectedRequirements: requirement ? [requirement.id] : [],
        location: filePath,
      });
    }
  }

  // Check 5: Required sections (for markdown files)
  let hasRequiredSections = true;
  if (
    requirements.requiredSections &&
    requirements.requiredSections.length > 0 &&
    filePath.endsWith('.md')
  ) {
    const missingSections: string[] = [];

    for (const section of requirements.requiredSections) {
      // Check for section headers (# Section or ## Section)
      const sectionRegex = new RegExp(`^#{1,6}\\s+${section}`, 'im');
      const hasSectionHeader = sectionRegex.test(content);

      if (!hasSectionHeader) {
        missingSections.push(section);
        hasRequiredSections = false;
      }
    }

    checks.push({
      name: 'Required sections present',
      passed: hasRequiredSections,
      expected: `sections: ${requirements.requiredSections.join(', ')}`,
      actual: hasRequiredSections
        ? 'all sections present'
        : `missing: ${missingSections.join(', ')}`,
      severity: 'high',
      rule: 'DOC-005',
      location: filePath,
    });

    if (!hasRequiredSections) {
      score -= 20;
      issues.push({
        type: 'incomplete',
        severity: 'error',
        message: `Document is missing required sections: ${missingSections.join(', ')}`,
        recommendation: `Add the missing sections: ${missingSections.join(', ')}`,
        affectedRequirements: requirement ? [requirement.id] : [],
        location: filePath,
      });
    }
  }

  // Check 6: Frontmatter (for markdown files)
  let hasFrontmatter = false;
  if (requirements.requireFrontmatter && filePath.endsWith('.md')) {
    hasFrontmatter = content.startsWith('---\n') && content.includes('\n---\n', 4);

    checks.push({
      name: 'YAML frontmatter present',
      passed: hasFrontmatter,
      expected: 'YAML frontmatter',
      actual: hasFrontmatter ? 'found' : 'not found',
      severity: 'medium',
      rule: 'DOC-006',
      location: filePath,
    });

    if (!hasFrontmatter) {
      score -= 10;
      issues.push({
        type: 'incomplete',
        severity: 'warning',
        message: 'Document missing YAML frontmatter',
        recommendation:
          'Add YAML frontmatter with metadata (title, category, requirementId, etc.)',
        affectedRequirements: requirement ? [requirement.id] : [],
        location: filePath,
      });
    }
  }

  // Check 7: TODO/FIXME markers
  if (!requirements.allowTodos) {
    const todoRegex = /\b(TODO|FIXME|XXX|HACK)\b/gi;
    const todoMatches = content.match(todoRegex);
    const hasTodos = todoMatches && todoMatches.length > 0;

    checks.push({
      name: 'No TODO markers',
      passed: !hasTodos,
      expected: 'no TODO/FIXME markers',
      actual: hasTodos ? `${todoMatches.length} markers found` : 'none',
      severity: 'low',
      rule: 'DOC-007',
      location: filePath,
    });

    if (hasTodos) {
      score -= 5;
      issues.push({
        type: 'incomplete',
        severity: 'warning',
        message: `Document contains ${todoMatches.length} TODO/FIXME markers`,
        recommendation: 'Complete all TODO items or remove them if not applicable',
        affectedRequirements: requirement ? [requirement.id] : [],
        location: filePath,
      });
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  const valid = checks.every(c => c.passed || c.severity === 'low' || c.severity === 'medium');

  return {
    valid,
    score,
    checks,
    issues,
    filePath,
    metadata: {
      exists: true,
      size: stats.size,
      lastModified: stats.mtime,
      lineCount,
      hasRequiredSections,
      hasFrontmatter,
    },
  };
}

/**
 * Get default document requirements based on requirement priority
 */
export function getDefaultDocumentRequirements(
  requirement: MSPRequirement,
  docType: 'policy' | 'playbook' | 'runbook' | 'checklist' | 'template'
): DocumentRequirements {
  // Determine maximum age based on priority
  let maximumAge: number;
  switch (requirement.priority) {
    case 'critical':
      maximumAge = 6; // 6 months
      break;
    case 'high':
      maximumAge = 12; // 12 months
      break;
    default:
      maximumAge = 18; // 18 months
  }

  // Determine minimum length based on document type
  let minimumLength: number;
  let requiredSections: string[];

  switch (docType) {
    case 'policy':
      minimumLength = 500;
      requiredSections = ['Purpose', 'Scope', 'Controls', 'Compliance'];
      break;
    case 'playbook':
      minimumLength = 500;
      requiredSections = ['Overview', 'Procedures', 'Responsibilities', 'Escalation'];
      break;
    case 'runbook':
      minimumLength = 300;
      requiredSections = ['Prerequisites', 'Steps', 'Validation', 'Rollback'];
      break;
    case 'checklist':
      minimumLength = 200;
      requiredSections = ['Overview', 'Checklist'];
      break;
    case 'template':
      minimumLength = 100;
      requiredSections = [];
      break;
  }

  return {
    requiredSections,
    minimumLength,
    maximumAge,
    requireFrontmatter: true,
    allowTodos: false,
  };
}

/**
 * Determine document type from file path
 */
export function determineDocumentType(
  filePath: string
): 'policy' | 'playbook' | 'runbook' | 'checklist' | 'template' {
  const fileName = path.basename(filePath).toLowerCase();

  // Check for template first (more specific)
  if (fileName.includes('template')) {
    return 'template';
  } else if (fileName.includes('policy') || fileName.includes('policies')) {
    return 'policy';
  } else if (fileName.includes('playbook')) {
    return 'playbook';
  } else if (fileName.includes('runbook')) {
    return 'runbook';
  } else if (fileName.includes('checklist')) {
    return 'checklist';
  }

  // Default based on file location
  if (filePath.includes('/templates/')) {
    return 'template';
  } else if (filePath.includes('/policies/')) {
    return 'policy';
  } else if (filePath.includes('/playbooks/')) {
    return 'playbook';
  } else if (filePath.includes('/runbooks/')) {
    return 'runbook';
  }

  return 'playbook'; // Default
}
