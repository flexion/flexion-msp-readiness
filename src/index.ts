/**
 * Flexion MSP Readiness Automation
 *
 * Main entry point for the library
 */

// Export types
export * from './types';

// Export MSP requirements data
export * from './data/msp-requirements';

// Assessors (Phase 2)
// export * from './assessors/doc-scanner';
// export * from './assessors/aws-config-analyzer';
// export * from './assessors/iam-evaluator';
// export * from './assessors/security-hub-checker';
// export * from './assessors/requirement-matcher';

// Collectors (Phase 3)
// export * from './collectors/cloudtrail-collector';
// export * from './collectors/config-collector';
// export * from './collectors/backup-collector';
// export * from './collectors/inspector-collector';
// export * from './collectors/iam-collector';

// Generators (Phase 4)
// export * from './generators/playbook-generator';
// export * from './generators/runbook-generator';
// export * from './generators/evidence-matrix';
// export * from './generators/self-assessment';

// Dashboard (Phase 5)
// export * from './dashboard/builder';

// Version
export const VERSION = '0.1.0';
