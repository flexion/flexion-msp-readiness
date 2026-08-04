# MSP Documentation Templates

This directory contains comprehensive documentation templates for the 18 non-technical requirements in the AWS MSP Program.

## Overview

The AWS MSP Program includes 46 total requirements:
- **28 Technical Requirements**: Automated via AWS service collectors and evidence gathering
- **18 Non-Technical Requirements**: Require manual documentation (these templates)

## Template Categories

### Business (4 templates)
Documentation for business operations and growth:
- **BUS-001**: Company Overview - Company history, team, customers, AWS partnership
- **BUS-002**: MSP Practice Growth - Customer acquisition tracking, growth documentation
- **BUS-003**: Financial Planning - Budget, forecast, financial metrics and reviews
- **BUS-004**: Go-To-Market Process - Sales process, demand generation, enablement

### People (3 templates)
Documentation for personnel management:
- **PEO-001**: Personnel Onboarding - Onboarding checklist for new team members
- **PEO-002**: CCOE Charter - Cloud Center of Excellence structure and operations
- **PEO-003**: Personnel Offboarding - Secure offboarding process with access revocation

### Governance (6 templates)
Documentation for governance and compliance:
- **GOV-001**: Risk Register - Business risks and mitigation plans
- **GOV-002**: Customer Satisfaction - Feedback collection and improvement process
- **GOV-003**: Data Governance - Data ownership and customer offboarding procedures
- **GOV-004**: Operational Readiness - Readiness checklist for new customer onboarding
- **GOV-005**: Shared Responsibility Model - RACI matrix for Partner/Customer responsibilities
- **GOV-006**: Sustainability - Sustainability best practices and optimization

### Platform (5 templates)
Documentation for solution design and architecture:
- **PLAT-001**: Account Management - Account isolation policy and procedures
- **PLAT-002**: Solution Capabilities - Customer solution design documentation
- **PLAT-003**: NFR Documentation - Non-functional requirements template
- **PLAT-004**: Well-Architected Reviews - WAFR assessment and remediation
- **PLAT-005**: Service Expertise - AWS service breadth demonstration

## Using Templates

### Programmatic Access

Use the `TemplateLoader` utility to access templates:

```typescript
import { createTemplateLoader } from './src/utils/template-loader';

// Create loader
const loader = createTemplateLoader();

// List all templates
const templates = loader.listTemplates();

// Get templates by category
const businessTemplates = loader.getTemplatesByCategory('business');

// Load a specific template
const template = loader.loadTemplate('BUS-001');
console.log(template.content);

// Copy template to destination with variable substitution
loader.copyTemplate('BUS-001', './output/company-overview.md', {
  'Company Name': 'Acme Corp',
  'Your Company': 'Acme'
});
```

### Manual Usage

1. Navigate to the appropriate category directory
2. Open the template file (Markdown format)
3. Copy to your documentation location
4. Fill in the bracketed placeholders [like this]
5. Follow the inline guidance comments

## Template Structure

Each template follows a consistent structure:

```markdown
---
requirementId: REQ-ID
title: Requirement Title
category: category
description: Brief description
---

# Title

<!-- Instructions: Guidance on using this template -->

## Section 1
[Content with [placeholders] to fill in]

## Section 2
[More content with guidance]
```

### Frontmatter
- **requirementId**: MSP requirement ID (e.g., BUS-001)
- **title**: Short requirement title
- **category**: business | people | governance | platform
- **description**: Brief description of requirement

### Content Features
- **Guidance Comments**: `<!-- Instructions: ... -->` to explain sections
- **Placeholders**: `[Bracketed text]` to be replaced with your data
- **Examples**: Sample entries to illustrate expected content
- **Checklists**: `[ ]` for tracking completion
- **Tables**: Pre-formatted tables for structured data
- **Best Practices**: Inline notes about what AWS expects

## Template Quality Guidelines

These templates are designed to be:

1. **Helpful**: Provide clear guidance, not just empty shells
2. **Realistic**: Based on actual MSP requirements and real-world practices
3. **Professional**: Suitable for submission to AWS
4. **Complete**: Cover all aspects AWS expects to see
5. **Practical**: Include examples and concrete suggestions

## Customization

Templates are intentionally comprehensive. You may:
- Remove sections not applicable to your organization
- Add organization-specific sections
- Adjust placeholder names to match your terminology
- Simplify for smaller organizations
- Expand for larger, more complex operations

## Evidence Collection

After completing templates:

1. Save filled-in templates to your documentation repository
2. Generate PDFs for formal submission (if required)
3. Organize by category in evidence folders
4. Track completion status in the workspace model
5. Update regularly (quarterly or annually)

## Integration with MSP Readiness Tool

Templates are automatically discovered and integrated with:
- **Workspace Assessor**: Checks if templates are completed
- **Evidence Collector**: Links templates to evidence requirements
- **Dashboard Generator**: Shows completion status
- **Report Generator**: Includes template status in reports

## Validation

Run tests to validate template structure:

```bash
npm test -- template-loader
```

Validates:
- All 18 templates exist
- Frontmatter is correctly formatted
- Template index is accurate
- Files are readable

## Contributing

To add or update templates:

1. Create/edit template file in appropriate category directory
2. Update `template-index.json` with metadata
3. Follow existing template structure and style
4. Include comprehensive guidance comments
5. Test with `template-loader.test.ts`

## Version History

- **v1.0.0** (2026-08-04): Initial release with all 18 templates

## Support

For questions or issues with templates:
- Check inline guidance comments in templates
- Review MSP requirements in `src/data/msp-requirements.ts`
- Consult AWS MSP Program documentation
- Create issue in project repository
