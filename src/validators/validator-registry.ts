/**
 * Validator Registry
 * Manages all evidence validators
 */

import { EvidenceValidator, MSPRequirement, ValidationResult } from '../types';
import { LoggingValidator } from './logging-validator';
import { IAMValidator } from './iam-validator';

export class ValidatorRegistry {
  private validators: Map<string, EvidenceValidator> = new Map();

  constructor() {
    this.registerDefaultValidators();
  }

  /**
   * Register default validators
   */
  private registerDefaultValidators(): void {
    this.register(new LoggingValidator());
    this.register(new IAMValidator());
    // Add more validators as they're implemented
  }

  /**
   * Register a validator
   */
  register(validator: EvidenceValidator): void {
    for (const reqId of validator.getSupportedRequirements()) {
      this.validators.set(reqId, validator);
    }
  }

  /**
   * Get validator for a requirement
   */
  getValidator(requirementId: string): EvidenceValidator | undefined {
    return this.validators.get(requirementId);
  }

  /**
   * Check if a validator exists for a requirement
   */
  hasValidator(requirementId: string): boolean {
    return this.validators.has(requirementId);
  }

  /**
   * Get all registered requirement IDs
   */
  getSupportedRequirements(): string[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Validate evidence for a requirement
   */
  async validate(
    requirement: MSPRequirement,
    evidencePaths: string[]
  ): Promise<ValidationResult | null> {
    const validator = this.getValidator(requirement.id);
    if (!validator) {
      return null;
    }

    try {
      return await validator.validate(requirement, evidencePaths);
    } catch (error) {
      console.error(`Validation failed for ${requirement.id}: ${error}`);
      return {
        requirementId: requirement.id,
        passed: false,
        checks: [
          {
            name: 'Validation execution',
            passed: false,
            expected: 'successful validation',
            actual: 'validation error',
            severity: 'critical',
            message: `Validator error: ${error}`,
          },
        ],
        summary: `Validation failed: ${error}`,
        validatedAt: new Date(),
      };
    }
  }
}

// Export singleton instance
export const validatorRegistry = new ValidatorRegistry();
