/**
 * Base Evidence Validator
 * Provides common utilities for validators
 */

import * as fs from 'fs';
import { EvidenceValidator, MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export abstract class BaseValidator implements EvidenceValidator {
  abstract validate(
    requirement: MSPRequirement,
    evidencePaths: string[]
  ): Promise<ValidationResult>;

  abstract getSupportedRequirements(): string[];

  /**
   * Load evidence JSON file
   */
  protected loadEvidenceFile(path: string): any {
    try {
      if (!fs.existsSync(path)) {
        throw new Error(`Evidence file not found: ${path}`);
      }
      const content = fs.readFileSync(path, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load evidence from ${path}: ${error}`);
    }
  }

  /**
   * Create a validation check
   */
  protected createCheck(
    name: string,
    passed: boolean,
    expected: string,
    actual: string,
    severity: 'critical' | 'high' | 'medium' | 'low' = 'high',
    message?: string
  ): ValidationCheck {
    return {
      name,
      passed,
      expected,
      actual,
      severity,
      message,
    };
  }

  /**
   * Create a validation result
   */
  protected createResult(
    requirementId: string,
    checks: ValidationCheck[],
    customSummary?: string
  ): ValidationResult {
    const passed = checks.every(c => c.passed);
    const failedChecks = checks.filter(c => !c.passed);

    let summary: string;
    if (customSummary) {
      summary = customSummary;
    } else if (passed) {
      summary = 'All validation checks passed';
    } else {
      const criticalFailed = failedChecks.filter(c => c.severity === 'critical').length;
      const highFailed = failedChecks.filter(c => c.severity === 'high').length;

      if (criticalFailed > 0) {
        summary = `${criticalFailed} critical check(s) failed, ${failedChecks.length - criticalFailed} other(s) failed`;
      } else if (highFailed > 0) {
        summary = `${highFailed} high-severity check(s) failed, ${failedChecks.length - highFailed} other(s) failed`;
      } else {
        summary = `${failedChecks.length} check(s) failed`;
      }
    }

    return {
      requirementId,
      passed,
      checks,
      summary,
      validatedAt: new Date(),
    };
  }

  /**
   * Validate that a value meets a minimum threshold
   */
  protected validateMinimum(
    value: number,
    minimum: number,
    name: string,
    severity: 'critical' | 'high' | 'medium' | 'low' = 'high'
  ): ValidationCheck {
    return this.createCheck(
      name,
      value >= minimum,
      `>= ${minimum}`,
      `${value}`,
      severity,
      value >= minimum ? undefined : `Value ${value} is below minimum ${minimum}`
    );
  }

  /**
   * Validate that a boolean value is true
   */
  protected validateEnabled(
    value: boolean,
    name: string,
    severity: 'critical' | 'high' | 'medium' | 'low' = 'high'
  ): ValidationCheck {
    return this.createCheck(
      name,
      value === true,
      'enabled',
      value ? 'enabled' : 'disabled',
      severity,
      value ? undefined : `${name} is not enabled`
    );
  }

  /**
   * Validate that a value exists (not undefined/null/empty)
   */
  protected validateExists(
    value: any,
    name: string,
    severity: 'critical' | 'high' | 'medium' | 'low' = 'high'
  ): ValidationCheck {
    const exists = value !== undefined && value !== null && value !== '';
    return this.createCheck(
      name,
      exists,
      'exists',
      exists ? 'found' : 'not found',
      severity,
      exists ? undefined : `${name} is missing`
    );
  }
}
