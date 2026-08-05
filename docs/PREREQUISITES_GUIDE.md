# MSP Prerequisites Guide

## Overview

**MSP Prerequisites** are requirements that must be met **BEFORE** the technical validation (ISSI audit). These are distinct from the 46 technical validation requirements and focus on:

- Business processes and maturity
- Team structure and training
- Governance frameworks
- Foundational security practices
- Operational readiness

## Prerequisites vs Technical Requirements

| Aspect | Prerequisites (BUSP, PEOP, GOVP, etc.) | Technical Requirements (SEC, OPS, etc.) |
|--------|----------------------------------------|-----------------------------------------|
| **When** | Before ISSI audit | During ISSI audit |
| **Focus** | Business maturity, processes | Technical implementation, AWS config |
| **Count** | 15 requirements | 46 requirements |
| **Evidence** | Documents, policies, case studies | AWS configs, code, infrastructure |
| **Categories** | Business (3), People (1), Governance (3), Platform (1), Security (2), Operations (5) | Security (9), Operations (7), Support (4) |

## The 15 MSP Prerequisites

### Business (3)
- **BUSP-001**: Web Presence - Public MSP practice landing page
- **BUSP-002**: Sales and Marketing Accreditations - AWS Partner training
- **BUSP-003**: Customer Case Studies - ≥4 case studies (2 public, 2 private)

### People (1)
- **PEOP-001**: Personnel Skills - Training and continuous learning strategy

### Governance (3)
- **GOVP-001**: Supplier Management - Vendor selection and evaluation
- **GOVP-002**: Operations Improvement - Continuous improvement processes
- **GOVP-003**: Sustainability Commitment - Long-term sustainability vision

### Platform (1)
- **PLATP-001**: Expert Design Review - AWS certified architects review all projects

### Security (2)
- **SECP-001**: Access Key Exposure Detection - Automated monitoring for exposed credentials
- **SECP-002**: Public Resources - Prevent unintentional public exposure

### Operations (5)
- **OPSP-001**: Incident Management - IT and Security incident processes
- **OPSP-002**: Problem Management - Root cause analysis and prevention
- **OPSP-003**: Deployment Risk Management - Change management and rollback
- **OPSP-004**: Cloud Financial Management - FinOps and cost optimization
- **OPSP-005**: Service Continuity - Business continuity and disaster recovery

## Assessment Commands

### Basic Assessment

Check your current prerequisite completion:

```bash
msp-readiness prerequisites

# Outputs:
# - Overall completion percentage
# - Status for each prerequisite (met/partial/not-met)
# - Breakdown by category
# - Estimated effort to complete
# - Markdown and JSON reports
```

### AI-Powered Generation

Generate prerequisite documentation using AI:

```bash
msp-readiness prerequisites --interactive-ai

# Outputs:
# - Project context analysis
# - List of prerequisites needing docs
# - Saves context to .msp-prerequisites-context.json
# - Ready for Claude to generate documentation
```

## AI-Powered Documentation Generation

### Step 1: Run Interactive Assessment

```bash
cd your-project/
msp-readiness prerequisites --interactive-ai
```

This will:
- Analyze your project (package.json, README, infrastructure)
- Check existing prerequisite documentation
- Output project context
- Save context to `.msp-prerequisites-context.json`

### Step 2: Generate with Claude

In Claude Code conversation:

```
Launch parallel agents to generate MSP prerequisite documentation
for all 15 requirements using the context from .msp-prerequisites-context.json.

Each document should be 1,500-2,500 words and saved to:
docs/msp/prerequisites/{prereq-id}.md

Use frontmatter format:
---
prerequisite_id: BUSP-001
title: Web Presence
category: business
status: met
generated_at: 2026-08-05
ai_generated: true
---
```

### Step 3: Verify Results

```bash
msp-readiness prerequisites
```

Expected result: 100% completion with all prerequisites documented.

## Document Structure

Each prerequisite document should have:

### Frontmatter

```yaml
---
prerequisite_id: BUSP-001
title: Web Presence
category: business
status: met | partial | not-met
generated_at: 2026-08-05T12:00:00Z
ai_generated: true
reviewed_by: "Team Lead Name"
review_date: 2026-08-05
---
```

### Content Sections

1. **Overview** - What this prerequisite requires
2. **Current Implementation** - How you meet this requirement
3. **Evidence** - Specific artifacts, URLs, documents
4. **Validation** - How to verify compliance
5. **Maintenance** - Keeping this requirement met over time

### Example: BUSP-001 Web Presence

```markdown
---
prerequisite_id: BUSP-001
title: Web Presence
category: business
status: met
---

# Web Presence

## Overview

This prerequisite requires a public landing page describing our AWS MSP practice,
including case studies and differentiated expertise.

## Current Implementation

**Landing Page**: https://example.com/aws-msp

Our landing page covers:
- AWS managed services offerings
- Security and compliance capabilities
- 24/7 operations and support
- Links to 4 customer case studies
- AWS Partner competencies and certifications

## Evidence

- Landing Page URL: https://example.com/aws-msp
- Case Study 1: https://example.com/case-studies/customer-a
- Case Study 2: https://example.com/case-studies/customer-b
- Analytics: 1,200 monthly visitors, avg 3:45 time on page

## Validation

AWS auditors can verify:
✅ Landing page is publicly accessible
✅ Describes managed services practice
✅ Links to case studies
✅ Shows AWS partnership details

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Marketing Team
**Last Updated**: 2026-08-05

Quarterly review checklist:
- [ ] Landing page content is current
- [ ] Case studies are up-to-date
- [ ] Links are valid
- [ ] SEO and analytics reviewed
```

## Integration with Technical Requirements

Some prerequisites directly relate to technical requirements:

| Prerequisite | Related Technical Requirement |
|--------------|------------------------------|
| SECP-001 (Access Key Detection) | SEC-005 (Identity and Access Management) |
| SECP-002 (Public Resources) | SEC-003 (AWS Account Configuration) |
| OPSP-001 (Incident Management) | OPS-001 (Event Management) |
| OPSP-005 (Service Continuity) | OPS-015 (Disaster Recovery) |

When documenting prerequisites, reference the related technical playbooks.

## Completion Timeline

Typical timeline for prerequisite documentation:

- **Business** (3 prerequisites): 8-12 hours
  - Requires marketing materials, case studies, growth metrics
  
- **People** (1 prerequisite): 4-6 hours
  - Training records, learning events, certification tracking
  
- **Governance** (3 prerequisites): 12-16 hours
  - Policy documents, supplier evaluation, improvement processes
  
- **Platform** (1 prerequisite): 4-6 hours
  - Design review policy, certified architect roster
  
- **Security** (2 prerequisites): 8-12 hours
  - Automated monitoring setup, public resource scanning
  
- **Operations** (5 prerequisites): 20-30 hours
  - Incident/problem management, deployment processes, FinOps, DR

**Total**: 56-82 hours (manual approach)
**With AI**: 3-5 hours (99% time reduction)

## Evidence Requirements

### Document-Based Evidence

Most prerequisites require policy documents:

- **Format**: Markdown, PDF, or DOCX
- **Location**: `docs/msp/prerequisites/`
- **Naming**: `{prereq-id}.md` (e.g., `busp-001.md`)
- **Metadata**: Frontmatter with status, dates, ownership

### Artifact-Based Evidence

Some require specific artifacts:

- **BUSP-001**: Public website URL
- **BUSP-002**: Training certificates (PDF, screenshots)
- **BUSP-003**: Case studies (public links + private PDFs)
- **PLATP-001**: Design review checklist template

### Process-Based Evidence

Operations prerequisites need process evidence:

- **OPSP-001**: Incident ticket examples, escalation logs
- **OPSP-002**: Problem analysis reports
- **OPSP-003**: Change management approval records
- **OPSP-004**: Cost optimization initiatives
- **OPSP-005**: DR test reports

## Best Practices

### 1. Start with Business Prerequisites

Business prerequisites (BUSP-*) are easiest to complete first:
- Often rely on existing marketing materials
- Don't require technical implementation
- Show business maturity to AWS

### 2. Leverage Existing Documentation

Before creating new documents:
- Check existing policies and procedures
- Review HR onboarding/training materials
- Gather past customer case studies
- Collect certification records

### 3. Connect Prerequisites to Technical Requirements

When documenting prerequisites:
- Reference related technical playbooks
- Show how prerequisite supports technical implementation
- Link to evidence collected during technical validation

### 4. Keep Evidence Current

Prerequisites are not one-time:
- **BUSP-003**: New case studies every audit cycle
- **PEOP-001**: Ongoing training events
- **GOVP-002**: Quarterly improvement reviews

Schedule recurring reviews to maintain compliance.

### 5. Use AI Generation Wisely

AI is excellent for:
- Structuring documentation
- Providing comprehensive templates
- Ensuring consistent format

But human review is critical for:
- Accurate business metrics
- Correct URLs and links
- Current team structure
- Real case study details

## Troubleshooting

### Low Completion Percentage

**Problem**: Prerequisites assessment shows 0% or low completion.

**Solution**:
1. Check document location: `docs/msp/prerequisites/{prereq-id}.md`
2. Verify frontmatter includes `status: met` or `status: completed`
3. Ensure prerequisite ID matches exactly (case-sensitive)

### Partial Status Not Updating

**Problem**: Prerequisite stuck at "partial" despite completing work.

**Solution**:
1. Update frontmatter: Change `status: partial` → `status: met`
2. Add review metadata:
   ```yaml
   reviewed_by: "Your Name"
   review_date: 2026-08-05
   ```
3. Re-run assessment: `msp-readiness prerequisites`

### Missing Evidence

**Problem**: Auditor requests evidence not documented.

**Solution**:
1. Add evidence section to prerequisite document
2. Include specific artifacts:
   - File paths: `evidence/training-certificates/2026-q2.pdf`
   - URLs: `https://example.com/aws-msp`
   - Screenshots: `evidence/screenshots/supplier-evaluation.png`
3. Create evidence manifest:
   ```bash
   msp-readiness collect-evidence --prerequisites
   ```

## Next Steps

1. **Run Assessment**:
   ```bash
   msp-readiness prerequisites --interactive-ai
   ```

2. **Generate Documentation** (via Claude):
   - Launch parallel agents for all 15 prerequisites
   - Review and customize generated documents
   - Add project-specific details

3. **Collect Evidence**:
   - Gather case studies, training records, policies
   - Store in `evidence/prerequisites/`
   - Link from prerequisite documents

4. **Verify Completion**:
   ```bash
   msp-readiness prerequisites
   ```

5. **Proceed to Technical Validation**:
   ```bash
   msp-readiness assess
   ```

---

**Questions?** See the main [README.md](../README.md) or [AI_GENERATION_GUIDE.md](./AI_GENERATION_GUIDE.md) for more details on the AI-powered workflow.
