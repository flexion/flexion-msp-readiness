---
skill: msp-readiness
description: Automated AWS MSP Program readiness assessment, evidence collection, and documentation generation
triggers:
  - "msp"
  - "managed service provider"
  - "compliance assessment"
  - "aws msp program"
globs:
  - "docs/**/*.md"
  - "cdk/**/*.ts"
  - "*.yaml"
  - "README.md"
---

# MSP Readiness Assessment Skill

This skill automates the preparation for AWS Managed Service Provider (MSP) Program requirements by analyzing your project's documentation and AWS infrastructure, collecting evidence, generating missing documentation, and creating a compliance dashboard.

## Usage

```bash
# Full assessment and generation
/msp-readiness run

# Assessment only (no generation)
/msp-readiness assess

# Generate artifacts for specific requirements
/msp-readiness generate SECP-001 SECP-002

# Generate all missing artifacts
/msp-readiness generate --all

# Collect evidence from AWS
/msp-readiness collect-evidence

# Create/update dashboard
/msp-readiness dashboard

# Show current status
/msp-readiness status
```

## What This Skill Does

### 1. Assessment Phase
- Scans project documentation for existing MSP-related content
- Analyzes AWS infrastructure configuration via AWS SDK
- Maps existing controls to MSP requirements
- Identifies gaps and partial implementations
- Estimates effort required for each gap

### 2. Evidence Collection Phase
- Queries AWS Config for resource inventory and compliance
- Extracts CloudTrail log configuration and retention
- Pulls Security Hub and Inspector findings
- Verifies backup configurations
- Checks IAM policies and MFA enforcement
- Captures evidence artifacts as JSON/Markdown

### 3. Generation Phase
- Creates missing playbooks using proven templates
- Generates runbooks with project-specific AWS details
- Fills evidence matrices with collected data
- Populates self-assessment checklist responses
- All generated content is review-ready, not placeholder text

### 4. Dashboard Phase
- Aggregates all assessment data
- Creates interactive HTML dashboard showing:
  - Overall completion percentage
  - Status by category (Security, Operations, Support)
  - Critical gaps blocking MSP approval
  - Prioritized action list with effort estimates
  - Evidence inventory
  - Timeline projection

## Configuration

The skill looks for `config.yaml` in the project root. Copy from `config.example.yaml`:

```yaml
project:
  name: "Your Project"
  docs_path: "../your-project/docs/managed-service-provider"
  infra_path: "../your-project/cdk"

aws:
  profile: "default"
  region: "us-east-1"
  stage: "test"

output:
  evidence_path: "./evidence"
  playbooks_path: "./playbooks"
  dashboard_path: "./dashboard.html"
```

## Templates

The skill includes proven templates based on real MSP preparation work:

- **Playbooks**: Incident Response, Deployment, DR, Access Management, Vulnerability Management
- **Runbooks**: Step-by-step procedures for specific tasks
- **Evidence Matrices**: Pre-structured evidence collection tables
- **Self-Assessment**: Auto-populated checklist responses

Templates use Handlebars syntax and inject:
- Project name and AWS account details
- Actual AWS resource names and ARNs
- Current configuration values
- Collected evidence references

## AWS Permissions Required

The skill needs read-only access to assess infrastructure:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "config:Describe*",
        "config:Get*",
        "config:List*",
        "cloudtrail:Describe*",
        "cloudtrail:Get*",
        "cloudtrail:List*",
        "securityhub:Get*",
        "securityhub:List*",
        "inspector2:Get*",
        "inspector2:List*",
        "backup:Describe*",
        "backup:List*",
        "iam:Get*",
        "iam:List*",
        "s3:GetBucketPolicy",
        "s3:GetBucketVersioning",
        "s3:GetEncryptionConfiguration",
        "rds:Describe*",
        "ec2:Describe*",
        "cloudwatch:Describe*",
        "cloudwatch:Get*",
        "logs:Describe*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Output Structure

```
output/
├── evidence/
│   ├── config-snapshot.json
│   ├── cloudtrail-status.json
│   ├── security-hub-findings.json
│   ├── inspector-findings.json
│   ├── iam-summary.json
│   └── backup-status.json
├── playbooks/
│   ├── incident-response.md
│   ├── deployment-support.md
│   ├── disaster-recovery.md
│   └── vulnerability-management.md
├── assessment-report.md
├── evidence-matrix.md
├── self-assessment.md
└── dashboard.html
```

## Examples

### Assess a project

```
User: /msp-readiness assess

Claude: I'll assess the project's MSP readiness...

[Scans documentation in docs/managed-service-provider/]
[Analyzes AWS infrastructure via AWS SDK]
[Maps requirements to current state]

Assessment complete:
✅ Addressed: 8 requirements (40%)
⚠️  Partial: 7 requirements (35%)
❌ Gap: 4 requirements (20%)
⬜ N/A: 1 requirement (5%)

Critical gaps:
- SECP-001: Access Key Exposure Detection (12h)
- SECP-002: Public Resources Detection (10h)
- OPS-006: Change Management Playbook (8h)
- SEC-008: Vulnerability Remediation SLA (6h)

Total estimated effort: 36 hours

Full report saved to: assessment-report.md
```

### Generate missing artifacts

```
User: /msp-readiness generate --all

Claude: I'll generate the missing MSP artifacts...

Generating playbooks:
✓ Change Management Playbook (OPS-006)
✓ Vulnerability & Patch Management (OPS-008, SEC-008)
✓ Disaster Recovery expansion (OPSP-005)

Generating runbooks:
✓ Access Key Rotation (SECP-001)
✓ Public Resource Remediation (SECP-002)
✓ Emergency Patch Deployment (OPS-008)

Generating evidence matrices:
✓ Evidence Matrix (all requirements)
✓ Self-Assessment Checklist (pre-populated)

Generated 8 artifacts in ./playbooks/

Next steps:
1. Review generated playbooks for accuracy
2. Implement SECP-001/002 technical controls
3. Run /msp-readiness dashboard to see updated status
```

### Create dashboard

```
User: /msp-readiness dashboard

Claude: Creating MSP readiness dashboard...

✓ Aggregated assessment data
✓ Calculated completion metrics
✓ Identified critical path
✓ Generated timeline projection

Dashboard created: ./dashboard.html

Open in browser to view:
- Overall: 67% complete (20/30 requirements)
- Critical gaps: 4 remaining
- Estimated time to completion: 36 hours (5 days)
- Next milestone: Week 6 (SECP-002 completion)
```

## Integration with Existing Tools

This skill works alongside:
- **AWS Config**: Uses existing Config rules and conformance packs
- **Security Hub**: Reads findings, doesn't modify
- **Inspector**: Queries scan results
- **CDK/Terraform**: Reads IaC to understand deployed resources
- **Git**: Tracks changes to generated documentation

## Development Status

- [x] Phase 1: Foundation (types, requirements data)
- [ ] Phase 2: Core assessment engine
- [ ] Phase 3: Evidence collectors
- [ ] Phase 4: Content generators
- [ ] Phase 5: Dashboard builder
- [ ] Phase 6: Skill integration

See PLAN.md for detailed development roadmap.
