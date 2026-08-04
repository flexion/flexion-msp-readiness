/**
 * Validator Registry
 * Manages all evidence validators
 */

import { EvidenceValidator, MSPRequirement, ValidationResult } from '../types';
import { LoggingValidator } from './logging-validator';
import { IAMValidator } from './iam-validator';
import { BackupValidator } from './backup-validator';
import { MonitoringValidator } from './monitoring-validator';
import { PatchManagementValidator } from './patch-management-validator';
import { EncryptionValidator } from './encryption-validator';
import { PublicResourcesValidator } from './public-resources-validator';
import { AvailabilityValidator } from './availability-validator';
import { VulnerabilityValidator } from './vulnerability-validator';
import { AWSConfigValidator } from './aws-config-validator';
import { ProcessValidator } from './process-validator';

export class ValidatorRegistry {
  private validators: Map<string, EvidenceValidator> = new Map();

  constructor() {
    this.registerDefaultValidators();
  }

  /**
   * Register default validators
   */
  private registerDefaultValidators(): void {
    // Core AWS service validators
    this.register(new LoggingValidator()); // OPS-004
    this.register(new BackupValidator()); // OPS-005
    this.register(new MonitoringValidator()); // OPS-003
    this.register(new PatchManagementValidator()); // OPS-008
    this.register(new AvailabilityValidator()); // OPS-011

    // Security validators
    this.register(new IAMValidator()); // SEC-004, SECP-001
    this.register(new EncryptionValidator()); // SEC-009
    this.register(new PublicResourcesValidator()); // SECP-002
    this.register(new VulnerabilityValidator()); // SEC-007, SEC-008
    this.register(new AWSConfigValidator()); // SEC-003

    // Process validators
    this.register(new ProcessValidator()); // OPSP-001, OPSP-002, OPSP-003, OPSP-005, OPS-006, SEC-001
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
