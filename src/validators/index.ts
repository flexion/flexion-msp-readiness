/**
 * Validators Module
 * Evidence validation framework for MSP requirements
 */

// Core validators
export { BaseValidator } from './base-validator';
export { ValidatorRegistry, validatorRegistry } from './validator-registry';

// Specific validators
export { LoggingValidator } from './logging-validator';
export { IAMValidator } from './iam-validator';
export { BackupValidator } from './backup-validator';
export { MonitoringValidator } from './monitoring-validator';
export { PatchManagementValidator } from './patch-management-validator';
export { EncryptionValidator } from './encryption-validator';
export { PublicResourcesValidator } from './public-resources-validator';
export { AvailabilityValidator } from './availability-validator';
export { VulnerabilityValidator } from './vulnerability-validator';
export { AWSConfigValidator } from './aws-config-validator';
export { ProcessValidator } from './process-validator';

// Comprehensive validation framework
export {
  validateDocument,
  getDefaultDocumentRequirements,
  determineDocumentType,
  type DocumentRequirements,
} from './document-validator';

export { validateAWSEvidence } from './aws-evidence-validator';

export {
  validateCrossRequirements,
} from './cross-validator';

export {
  VALIDATION_RULES,
  getRulesByCategory,
  getRulesBySeverity,
  getApplicableRules,
  executeRules,
  getRule,
} from './validation-rules';

export {
  generateValidationReport,
  formatReportAsMarkdown,
  formatReportAsJSON,
  formatReportAsHTML,
} from './validation-reporter';
