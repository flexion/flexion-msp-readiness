---
skill: msp-readiness
description: Automated AWS MSP Program readiness assessment, evidence collection, and documentation generation
---

# MSP Readiness Assessment Skill

Automates AWS Managed Service Provider (MSP) Program preparation by analyzing documentation and AWS infrastructure, collecting evidence, generating missing documentation, and creating a compliance dashboard.

## How to Invoke

When the user asks about MSP readiness, compliance, or AWS MSP Program requirements, Claude Code will automatically invoke this skill. You can also explicitly invoke it.

**User prompts that trigger this skill:**
- "Check our MSP readiness"
- "What do we need for AWS MSP certification?"
- "Run an MSP compliance assessment"
- "Collect evidence for MSP audit"
- "Show me the compliance dashboard"

## What This Skill Does

This skill runs the `msp-readiness` CLI tool from the flexion-msp-readiness repository. It provides these capabilities:

### Commands Available

1. **assess** - Full assessment of documentation and AWS infrastructure
2. **collect-evidence** - Gather compliance evidence from AWS services
3. **generate** - Create missing playbooks and runbooks
4. **dashboard** - Build interactive HTML dashboard
5. **status** - Quick status summary

## Skill Implementation

When invoked, Claude Code should:

1. **Check Prerequisites**
   ```bash
   # Verify msp-readiness is installed
   which msp-readiness || echo "Tool not found"
   
   # Check if config.yaml exists in current directory
   test -f config.yaml || echo "No config.yaml found"
   ```

2. **Run Appropriate Command**

   For assessment requests:
   ```bash
   cd /path/to/project
   msp-readiness assess --config config.yaml
   ```

   For evidence collection:
   ```bash
   msp-readiness collect-evidence --config config.yaml
   ```

   For content generation:
   ```bash
   msp-readiness generate --config config.yaml
   ```

   For dashboard:
   ```bash
   msp-readiness dashboard --config config.yaml
   ```

3. **Parse and Present Results**
   - Read the generated report files (assessment-report.md, assessment-report.json)
   - Summarize key findings for the user
   - Highlight critical gaps and estimated effort
   - Suggest next steps

## Example Usage Flow

**User:** "Check our MSP readiness"

**Claude Code Actions:**
1. Check if config.yaml exists, if not help create it
2. Run `msp-readiness assess`
3. Parse assessment-report.md
4. Present summary:
   - Overall completion percentage
   - Critical gaps (requirement IDs and effort)
   - Recommendations for next steps
5. Offer to run evidence collection or generate missing docs

**User:** "Generate the missing documentation"

**Claude Code Actions:**
1. Run `msp-readiness generate`
2. Show list of generated files
3. Suggest reviewing and customizing the generated content
4. Offer to re-run assessment to see updated status

**User:** "Show me the dashboard"

**Claude Code Actions:**
1. Check if assessment-report.json exists
2. If not, run `msp-readiness assess` first
3. Run `msp-readiness dashboard`
4. Note the dashboard.html location
5. Optionally open in browser or display key metrics

## Configuration

The skill expects a `config.yaml` file in the project root. If it doesn't exist, help the user create one:

```yaml
project:
  name: "Project Name"
  organization: "Organization"
  docs_path: "./docs"
  infra_path: "./cdk"

aws:
  region: "us-east-1"
  profile: "default"
  stage: "prod"

msp:
  version: "2026-feb-aug"
  ig_level: 1

output:
  evidence_path: "./evidence"
  playbooks_path: "./docs/playbooks"
  report_format: "both"
  dashboard_path: "./dashboard.html"

assessment:
  skip_requirements: []
```

## Tool Location

The msp-readiness CLI is located at:
- Repository: `~/repos/flexion-msp-readiness`
- Binary: Should be globally available via `npm link` or at `~/repos/flexion-msp-readiness/bin/msp-readiness`

If not installed globally:
```bash
cd ~/repos/flexion-msp-readiness && npm run dev -- assess --config /path/to/project/config.yaml
```

## Error Handling

Common issues and solutions:

- **Tool not found**: Run `cd ~/repos/flexion-msp-readiness && npm link`
- **No config.yaml**: Help user create one from config.example.yaml
- **AWS credentials**: Check `aws configure` or suggest `--skip-aws` flag
- **No assessment file**: Run `assess` before `dashboard`

## Output Files

The tool generates these files (paths configurable in config.yaml):

- `assessment-report.md` - Human-readable report
- `assessment-report.json` - Machine-readable data
- `evidence/*.json` - AWS service snapshots
- `evidence/MANIFEST.md` - Evidence inventory
- `docs/playbooks/*.md` - Generated playbooks/runbooks
- `dashboard.html` - Interactive dashboard

## Integration Notes

- The skill is **read-only** for AWS (no modifications)
- Requires AWS credentials configured (uses default credential chain)
- Can run with `--skip-aws` for documentation-only assessment
- Generates files in the project directory (git-committable)

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
- [x] Phase 2: Core assessment engine
- [x] Phase 3: Evidence collectors
- [x] Phase 4: Content generators
- [x] Phase 5: Dashboard builder
- [x] Phase 6: Skill integration

See PLAN.md for detailed development roadmap.
