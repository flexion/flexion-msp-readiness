/**
 * Auto-approval logic for playbooks
 * Promotes playbooks from draft/in-progress to approved when validation passes
 */

import * as fs from 'fs';
import { ValidationResult } from '../types';
import { parseFrontmatter, addFrontmatter, DocumentMetadata } from './frontmatter';

export interface AutoApprovalResult {
  approved: boolean;
  previousStatus: string;
  newStatus: string;
  reason: string;
  validationPassed: boolean;
  criticalFailures?: string[];
}

/**
 * Determine if a playbook should be auto-approved based on validation results
 */
export function shouldAutoApprove(
  hasPlaybook: boolean,
  hasEvidence: boolean,
  validationResult?: ValidationResult | null,
  currentStatus?: string
): boolean {
  // Must have playbook and evidence
  if (!hasPlaybook || !hasEvidence) {
    return false;
  }

  // Must have validation result
  if (!validationResult) {
    return false;
  }

  // Validation must have passed
  if (!validationResult.passed) {
    return false;
  }

  // Don't auto-approve if already approved or manually managed
  if (currentStatus === 'approved' || currentStatus === 'complete') {
    return false;
  }

  return true;
}

/**
 * Auto-approve a playbook by updating its frontmatter
 */
export function autoApprovePlaybook(
  playbookPath: string,
  validationResult: ValidationResult
): AutoApprovalResult {
  if (!fs.existsSync(playbookPath)) {
    throw new Error(`Playbook not found: ${playbookPath}`);
  }

  const content = fs.readFileSync(playbookPath, 'utf-8');
  const { metadata, body } = parseFrontmatter(content);

  if (!metadata) {
    throw new Error(`Playbook has no frontmatter: ${playbookPath}`);
  }

  const previousStatus = metadata.status;
  const validationPassed = validationResult.passed;

  let newStatus: DocumentMetadata['status'];
  let reason: string;
  let approved = false;

  if (validationPassed) {
    // Validation passed - auto-approve
    newStatus = 'approved';
    reason = 'Validation passed all compliance checks';
    approved = true;

    // Update metadata with approval info
    metadata.status = 'approved';
    metadata.approved_at = new Date().toISOString();
    metadata.approval_method = 'auto';
    metadata.validation_passed = true;
    metadata.last_validated = validationResult.validatedAt.toISOString();
    metadata.remediation_required = false;

    // Clear any previous validation failures
    delete metadata.validation_failures;
  } else {
    // Validation failed - mark for remediation
    const criticalFailures = validationResult.checks
      .filter(c => !c.passed && c.severity === 'critical')
      .map(c => c.name);

    if (criticalFailures.length > 0) {
      newStatus = 'needs-remediation';
      reason = `${criticalFailures.length} critical validation check(s) failed`;
    } else {
      newStatus = 'in-progress';
      reason = 'Validation checks failed (non-critical)';
    }

    metadata.status = newStatus;
    metadata.validation_passed = false;
    metadata.last_validated = validationResult.validatedAt.toISOString();
    metadata.validation_failures = validationResult.checks.filter(c => !c.passed).map(c => c.name);
    metadata.remediation_required = true;

    // Clear approval metadata if previously approved
    delete metadata.approved_at;
    delete metadata.approval_method;
  }

  // Write updated document
  const updatedContent = addFrontmatter(body, metadata);
  fs.writeFileSync(playbookPath, updatedContent, 'utf-8');

  return {
    approved,
    previousStatus,
    newStatus,
    reason,
    validationPassed,
    criticalFailures: validationPassed ? undefined : metadata.validation_failures,
  };
}

/**
 * Manually approve a playbook (for override cases)
 */
export function manuallyApprovePlaybook(playbookPath: string): AutoApprovalResult {
  if (!fs.existsSync(playbookPath)) {
    throw new Error(`Playbook not found: ${playbookPath}`);
  }

  const content = fs.readFileSync(playbookPath, 'utf-8');
  const { metadata, body } = parseFrontmatter(content);

  if (!metadata) {
    throw new Error(`Playbook has no frontmatter: ${playbookPath}`);
  }

  const previousStatus = metadata.status;

  // Update metadata with manual approval
  metadata.status = 'approved';
  metadata.approved_at = new Date().toISOString();
  metadata.approval_method = 'manual';
  metadata.remediation_required = false;

  // Keep validation status if present
  // (manual approval can override validation failures)

  // Write updated document
  const updatedContent = addFrontmatter(body, metadata);
  fs.writeFileSync(playbookPath, updatedContent, 'utf-8');

  return {
    approved: true,
    previousStatus,
    newStatus: 'approved',
    reason: 'Manually approved',
    validationPassed: metadata.validation_passed ?? false,
  };
}

/**
 * Mark a playbook as needing remediation
 */
export function markForRemediation(playbookPath: string, reason: string): AutoApprovalResult {
  if (!fs.existsSync(playbookPath)) {
    throw new Error(`Playbook not found: ${playbookPath}`);
  }

  const content = fs.readFileSync(playbookPath, 'utf-8');
  const { metadata, body } = parseFrontmatter(content);

  if (!metadata) {
    throw new Error(`Playbook has no frontmatter: ${playbookPath}`);
  }

  const previousStatus = metadata.status;

  // Update metadata
  metadata.status = 'needs-remediation';
  metadata.remediation_required = true;
  metadata.validation_failures = [reason];

  // Clear approval if previously approved
  delete metadata.approved_at;
  delete metadata.approval_method;

  // Write updated document
  const updatedContent = addFrontmatter(body, metadata);
  fs.writeFileSync(playbookPath, updatedContent, 'utf-8');

  return {
    approved: false,
    previousStatus,
    newStatus: 'needs-remediation',
    reason,
    validationPassed: false,
  };
}
