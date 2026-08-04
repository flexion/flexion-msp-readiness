# Evidence Validation Framework

Comprehensive validation framework for MSP readiness evidence. Validates both document-based and AWS-collected evidence for completeness, accuracy, and compliance.

## Overview

The validation framework provides:

- **Document Validation**: Checks document existence, completeness, freshness, required sections, frontmatter, and quality markers
- **AWS Evidence Validation**: Validates AWS-collected evidence for collection success, permissions, currency, schema compliance, and service-specific thresholds
- **Cross-Requirement Validation**: Ensures consistency across related requirements, checks for conflicts, and validates references
- **Validation Reporting**: Generates comprehensive reports in multiple formats (Markdown, JSON, HTML)
- **Configurable Rules**: Extensible rule system for custom validation logic

## Quick Start

### Document Validation

```typescript
import { validateDocument, getDefaultDocumentRequirements } from './validators';

const requirement: MSPRequirement = {
  id: 'SEC-001',
  name: 'Security Policies',
  category: 'security',
  priority: 'critical',
  // ...
};

const docRequirements = getDefaultDocumentRequirements(requirement, 'policy');
const result = await validateDocument('/path/to/policy.md', docRequirements, requirement);

console.log(`Valid: ${result.valid}, Score: ${result.score}/100`);
result.issues.forEach(issue => {
  console.log(`- ${issue.message}: ${issue.recommendation}`);
});
```

### AWS Evidence Validation

```typescript
import { validateAWSEvidence } from './validators';

const evidence: EvidenceArtifact = {
  type: 'aws-snapshot',
  path: '/evidence/config.json',
  description: 'AWS Config rules',
  requirementIds: ['SEC-003'],
  collectedAt: new Date(),
  metadata: {
    collectionStatus: 'success',
    configRules: [/* ... */],
  },
};

const result = await validateAWSEvidence(evidence, requirement);
console.log(`Passed: ${result.passed}, Score: ${result.score}/100`);
```

### Cross-Requirement Validation

```typescript
import { validateCrossRequirements } from './validators';

const assessments: RequirementAssessment[] = [/* ... */];
const result = await validateCrossRequirements(assessments);

console.log(result.summary);
result.conflicts.forEach(conflict => {
  console.log(`- ${conflict.message}`);
});
```

### Generate Validation Report

```typescript
import { generateValidationReport, formatReportAsMarkdown } from './validators';

const validationResults: ValidationResult[] = [/* ... */];
const report = generateValidationReport(validationResults, crossValidation);

// Output as markdown
const markdown = formatReportAsMarkdown(report);
fs.writeFileSync('validation-report.md', markdown);

// Output as HTML
const html = formatReportAsHTML(report);
fs.writeFileSync('validation-report.html', html);
```

## Document Validation

### Validation Checks

Document validation performs the following checks:

1. **Document Exists** (Critical): File must exist at the specified path
2. **Has Content** (Critical): Document must not be empty
3. **Minimum Length** (High): Document must meet minimum word count for type
4. **Freshness** (Medium): Document must be updated recently based on priority
5. **Required Sections** (High): Markdown documents must have required headers
6. **YAML Frontmatter** (Medium): Markdown documents should have metadata frontmatter
7. **No TODO Markers** (Low): Production documents should not have TODO/FIXME markers

### Document Types

Different document types have different validation requirements:

| Type | Min Words | Required Sections |
|------|-----------|------------------|
| Policy | 500 | Purpose, Scope, Controls, Compliance |
| Playbook | 500 | Overview, Procedures, Responsibilities, Escalation |
| Runbook | 300 | Prerequisites, Steps, Validation, Rollback |
| Checklist | 200 | Overview, Checklist |
| Template | 100 | (none) |

### Freshness Requirements

Based on requirement priority:

- **Critical**: < 6 months old
- **High**: < 12 months old
- **Medium/Low**: < 18 months old

### Example Document with Frontmatter

```markdown
---
title: Incident Response Playbook
requirementId: OPSP-001
category: operations
version: 1.2
lastReviewed: 2026-08-01
---

# Incident Response Playbook

## Overview
This playbook defines procedures for responding to security incidents.

## Procedures
...
```

## AWS Evidence Validation

### Core Checks

1. **Collection Success** (Critical): Evidence must be collected without errors
2. **No Permission Errors** (Critical): AWS permissions must be sufficient
3. **Current** (Medium): Evidence should be < 7 days old
4. **Not Expired** (High): Evidence must not be past expiration date
5. **Metadata Present** (Medium): Evidence should include metadata

### Service-Specific Validation

#### AWS Config
- **Active Rules**: At least one Config rule must be in ACTIVE state
- Validates rule state and configuration

#### CloudTrail
- **Multi-Region Logging**: Trails must be multi-region and actively logging
- Validates trail configuration and status

#### GuardDuty
- **Enabled Detectors**: At least one GuardDuty detector must be enabled
- Validates detector status

#### AWS Backup
- **Vaults Configured**: Backup vaults must exist
- **Plans Configured**: Backup plans must exist
- Validates backup configuration completeness

#### IAM
- **MFA Enforcement**: ≥ 90% of IAM users must have MFA enabled
- Validates IAM security best practices

#### Security Hub
- **Security Score**: Score must be ≥ 80/100
- Validates overall security posture

### Evidence Scoring

Evidence receives a score from 0-100 based on:
- Collection success: -50 points for failure
- Permission errors: -40 points
- Stale evidence (>7 days): -10 points
- Expired evidence: -30 points
- Missing metadata: -5 points
- Service-specific failures: -15 to -20 points

## Cross-Requirement Validation

### Consistency Checks

1. **Security Requirements**: SEC-003 (Account Config) must be addressed if SEC-004 (IAM) is addressed
2. **IAM Requirements**: SEC-006 (Role-Based Access) must be addressed if SEC-004 (IAM) is addressed
3. **MFA Requirements**: SEC-007 (MFA) should be addressed if SEC-004 (IAM) is addressed
4. **Monitoring/Logging**: SEC-009 (Logging) should be addressed if OPS-010 (Monitoring) is addressed
5. **Backup/DR**: OPS-015 (DR) should have backup evidence
6. **Offboarding/IAM**: PEO-003 (Offboarding) should be consistent with SEC-004 (IAM)

### Reference Validation

- Checks that all document references exist
- Validates markdown links within findings
- Ignores external URLs
- Reports missing references

### CIS Controls Consistency

For requirements sharing CIS Controls:
- If one requirement is addressed, related requirements should be too
- Prevents partial implementation of security controls

## Validation Rules

### Rule Categories

- **document**: Rules for document-based evidence
- **aws**: Rules for AWS-collected evidence
- **cross-requirement**: Rules for requirement consistency

### Rule Severities

- **error**: Critical issues that must be fixed
- **warning**: Important issues that should be addressed
- **info**: Informational findings

### Built-in Rules

| Rule ID | Name | Category | Severity |
|---------|------|----------|----------|
| DOC-001 | Document exists | document | error |
| DOC-002 | Document is complete | document | error |
| DOC-003 | Document is current | document | warning |
| AWS-001 | AWS evidence collected | aws | error |
| AWS-002 | AWS evidence is valid | aws | error |
| AWS-003 | AWS evidence is current | aws | warning |
| CROSS-001 | Related requirements consistent | cross-requirement | warning |

### Custom Rules

You can define custom validation rules:

```typescript
const customRule: ValidationRule = {
  id: 'CUSTOM-001',
  name: 'Custom validation',
  category: 'document',
  severity: 'warning',
  check: async (context: ValidationContext): Promise<ValidationCheck> => {
    // Custom validation logic
    return {
      name: 'Custom check',
      passed: true,
      expected: 'custom requirement',
      actual: 'met',
      severity: 'low',
      rule: 'CUSTOM-001',
    };
  },
};

// Execute rules
const rules = [customRule];
const checks = await executeRules(rules, context);
```

## Validation Reports

### Report Formats

#### Markdown
Human-readable format for documentation:
- Summary statistics
- Issues grouped by severity
- Top recommendations
- Detailed results by requirement

#### JSON
Machine-readable format for automation:
- Complete validation data
- Programmatic access to all results
- Integration with other tools

#### HTML
Visual format for dashboards:
- Styled presentation
- Color-coded severity levels
- Interactive tables
- Score visualization

### Report Contents

Every report includes:
- **Overall Score**: 0-100 aggregated quality score
- **Check Statistics**: Total, passed, failed counts
- **Issues by Severity**: Critical, high, medium, low
- **Recommendations**: Prioritized action items
- **Detailed Results**: Per-requirement breakdown

### Example Report Output

```
Validation Score: 85.3/100 (92.5% checks passed)
Total Checks: 120 (111 passed, 9 failed)
Critical Issues: 0 - No immediate action required
High Priority Issues: 3 - Address soon
Medium Priority Issues: 6 - Plan for remediation

Assessment: GOOD - No critical or high priority issues found
```

## Integration

### With Assessment Engine

```typescript
import { assessRequirement } from './assessors';
import { validateAWSEvidence, validateDocument } from './validators';

const assessment = await assessRequirement(requirement, config);

// Validate collected evidence
for (const evidence of assessment.evidence) {
  let result;
  if (evidence.type === 'aws-snapshot') {
    result = await validateAWSEvidence(evidence, requirement);
  } else if (evidence.type === 'document') {
    const docType = determineDocumentType(evidence.path);
    const reqs = getDefaultDocumentRequirements(requirement, docType);
    result = await validateDocument(evidence.path, reqs, requirement);
  }
  
  if (result && !result.passed) {
    console.warn(`Evidence validation failed for ${requirement.id}`);
  }
}
```

### With CLI

```bash
# Validate evidence for all requirements
npm run dev -- validate

# Validate specific requirement
npm run dev -- validate --requirement SEC-003

# Generate validation report
npm run dev -- validate --report validation-report.html
```

### With Dashboard

The validation framework integrates with the MSP dashboard to show:
- Evidence quality scores
- Validation status indicators
- Failed check summaries
- Remediation recommendations

## Best Practices

1. **Run validation after evidence collection**: Ensures evidence quality before assessment
2. **Address critical issues first**: Focus on errors before warnings
3. **Keep documents fresh**: Update documentation regularly
4. **Use frontmatter**: Include metadata in all markdown documents
5. **Follow naming conventions**: Use descriptive file names that indicate document type
6. **Remove TODOs**: Clean up placeholder content before production
7. **Monitor cross-requirement consistency**: Fix related requirements together
8. **Re-collect stale evidence**: Refresh AWS evidence weekly

## API Reference

See individual module documentation:
- `document-validator.ts` - Document validation functions
- `aws-evidence-validator.ts` - AWS evidence validation
- `cross-validator.ts` - Cross-requirement validation
- `validation-rules.ts` - Rule definitions and execution
- `validation-reporter.ts` - Report generation and formatting
