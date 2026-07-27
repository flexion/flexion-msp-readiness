# MSP Readiness Skill Usage Guide

This guide explains how to use the MSP Readiness skill with Claude Code to automate AWS MSP Program preparation.

## Overview

The MSP Readiness skill is a Claude Code skill that automates the preparation for AWS Managed Service Provider (MSP) Program requirements. It helps you:

- **Assess** current compliance status by scanning documentation and AWS infrastructure
- **Collect** compliance evidence from AWS services automatically
- **Generate** missing playbooks, runbooks, and documentation from proven templates
- **Visualize** readiness with an interactive HTML dashboard

## Installation

### 1. Clone and Build

```bash
cd ~/repos
git clone <repository-url> flexion-msp-readiness
cd flexion-msp-readiness
npm install
npm run build
```

### 2. Link for Global Access

```bash
npm link
```

Now `msp-readiness` command is available globally.

### 3. Verify Installation

```bash
msp-readiness --version
```

## Configuration

### Create Configuration File

In your target project root, create `config.yaml`:

```bash
cd /path/to/your/project
cp ~/repos/flexion-msp-readiness/config.example.yaml ./config.yaml
```

### Edit Configuration

```yaml
project:
  name: "Your Project Name"
  organization: "Your Organization"
  docs_path: "./docs"  # Path to documentation
  infra_path: "./cdk"  # Path to infrastructure code

aws:
  region: "us-east-1"
  profile: "default"   # AWS CLI profile
  stage: "prod"        # Environment: test, staging, uat, prod

msp:
  version: "2026-feb-aug"  # MSP Program checklist version
  ig_level: 1              # CIS Implementation Group Level (1, 2, or 3)

output:
  evidence_path: "./evidence"
  playbooks_path: "./docs/playbooks"
  report_format: "both"    # markdown, json, or both
  dashboard_path: "./dashboard.html"

assessment:
  skip_requirements: []    # Optional: requirement IDs to skip
```

### Configure AWS Credentials

The tool uses AWS SDK default credential chain:

```bash
# Option 1: AWS CLI configuration
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1

# Option 3: Use specific profile
export AWS_PROFILE=your-profile
```

## Usage Workflows

### Workflow 1: Quick Assessment

Get a quick view of your current MSP readiness:

```bash
cd /path/to/your/project
msp-readiness status
```

Output:
```
📊 MSP Readiness Status

Project: Your Project
Stage: prod
MSP Version: 2026-feb-aug
CIS IG Level: 1

Run "msp-readiness assess" for full assessment.
```

### Workflow 2: Full Assessment

Run a comprehensive assessment of documentation and AWS infrastructure:

```bash
msp-readiness assess
```

This will:
1. Load configuration
2. Scan documentation directory for MSP content
3. Analyze AWS infrastructure (Config, CloudTrail, IAM, Security Hub)
4. Match requirements to current state
5. Generate assessment report

Output files:
- `assessment-report.md` - Human-readable report
- `assessment-report.json` - Machine-readable data

Example output:
```
🔍 MSP Readiness Assessment

✓ Configuration loaded
✓ Documentation scanned (57 files)
✓ AWS infrastructure analyzed

📊 Assessment Summary:

✅ Addressed:      12 requirements
⚠️  Partial:        5 requirements
❌ Gap:            3 requirements
⬜ Not Applicable: 0 requirements

📈 Overall Completion: 60% (12/20)
⏱️  Estimated Effort: 36 hours

🚨 Critical Gaps (3):

🔴 SECP-001: Access Key Exposure Detection (12h)
🔴 SECP-002: Public Resources Detection (10h)
🟡 OPS-006: Change Management Playbook (8h)

📄 Reports generated:

  📝 Markdown: ./assessment-report.md
  📊 JSON:     ./assessment-report.json

✅ Assessment complete!
```

### Workflow 3: Skip AWS Analysis

If you don't have AWS credentials or want to assess documentation only:

```bash
msp-readiness assess --skip-aws
```

This will assess only local documentation without connecting to AWS.

### Workflow 4: Collect Evidence

Collect compliance evidence from AWS services:

```bash
msp-readiness collect-evidence
```

This will:
1. Query CloudTrail configuration
2. Collect AWS Config rules and compliance
3. Get AWS Backup vault and plan status
4. Retrieve Inspector vulnerability findings
5. Save JSON snapshots to evidence directory
6. Generate evidence manifest

Output:
```
📦 Collecting MSP Evidence

✓ Configuration loaded
✓ CloudTrail evidence collected
✓ Config rules evidence collected
✓ Backup evidence collected
✓ Inspector evidence collected
✓ Evidence manifest generated

✅ Evidence collection complete!

  Evidence directory: ./evidence
  Manifest: ./evidence/MANIFEST.md
```

Files created:
- `evidence/cloudtrail-status.json`
- `evidence/config-snapshot.json`
- `evidence/backup-status.json`
- `evidence/inspector-findings.json`
- `evidence/MANIFEST.md`

### Workflow 5: Generate Documentation

Generate missing playbooks, runbooks, and evidence matrices:

```bash
msp-readiness generate
```

This will:
1. Scan existing documentation
2. Identify missing playbooks and runbooks
3. Generate from templates with project-specific details
4. Create evidence matrix linking requirements to evidence

Output:
```
📝 Generating MSP Documentation

✓ Configuration loaded
✓ Found 45 existing files

Generating 4 missing document(s)...

✓ Generated change-management.md (OPS-006)
✓ Generated vulnerability-management.md (SEC-008)
✓ Generated access-key-rotation.md (SECP-001)
✓ Generated evidence-matrix.md (ALL)

✓ Evidence matrix generated

✅ Generation complete!

  Output directory: ./docs/playbooks
```

#### Generate Specific Types

```bash
# Generate only playbooks
msp-readiness generate --playbooks-only

# Generate only runbooks
msp-readiness generate --runbooks-only

# Generate only evidence matrix
msp-readiness generate --matrix-only
```

### Workflow 6: Build Dashboard

Create an interactive HTML dashboard:

```bash
msp-readiness dashboard
```

Prerequisites: Must run `assess` first to generate `assessment-report.json`.

This will:
1. Load assessment JSON
2. Aggregate data by category
3. Identify critical path
4. Build responsive HTML dashboard

Output:
```
📊 Building MSP Dashboard

✓ Configuration loaded
✓ Assessment loaded
✓ Data aggregated
✓ Dashboard built

✅ Dashboard complete!

  Dashboard: ./dashboard.html
  Open with: open ./dashboard.html
```

Open in browser to view:
- Overall completion percentage
- Category breakdown (Security, Operations, Support)
- Critical gaps with effort estimates
- All requirements table (sortable)
- Evidence inventory

### Workflow 7: Complete End-to-End

Run all commands in sequence:

```bash
# 1. Assess current state
msp-readiness assess

# 2. Collect AWS evidence
msp-readiness collect-evidence

# 3. Generate missing docs
msp-readiness generate

# 4. Build dashboard
msp-readiness dashboard

# 5. Open dashboard
open dashboard.html
```

## Claude Code Integration

### Using with Claude Code

When working in Claude Code, you can ask Claude to help with MSP readiness:

**Example prompts:**

> "Check our MSP readiness"

Claude will run `msp-readiness assess` and interpret the results for you.

> "What MSP gaps do we have?"

Claude will read the assessment report and summarize critical gaps.

> "Generate the missing MSP playbooks"

Claude will run `msp-readiness generate` and show you what was created.

> "Collect evidence for MSP audit"

Claude will run `msp-readiness collect-evidence` and explain the evidence collected.

> "Show me the compliance dashboard"

Claude will run `msp-readiness dashboard` and may open it in a browser.

### Skill Invocation

Claude Code can invoke the skill automatically when you ask MSP-related questions. The skill is triggered by keywords like:

- "msp"
- "managed service provider"
- "compliance assessment"
- "aws msp program"

### Skill Commands

The skill provides these commands:

```
/msp-readiness run              # Full assessment and generation
/msp-readiness assess           # Assessment only
/msp-readiness collect-evidence # Collect evidence from AWS
/msp-readiness generate         # Generate missing artifacts
/msp-readiness dashboard        # Build dashboard
/msp-readiness status           # Show current status
```

## Common Scenarios

### Scenario 1: Initial MSP Assessment

You're starting MSP preparation and want to understand current state.

```bash
# 1. Create config
cp ~/repos/flexion-msp-readiness/config.example.yaml ./config.yaml
vim config.yaml  # Edit with your project details

# 2. Run assessment
msp-readiness assess

# 3. Review report
less assessment-report.md

# 4. Build dashboard for stakeholders
msp-readiness dashboard
open dashboard.html
```

### Scenario 2: Preparing for MSP Audit

MSP audit is approaching and you need to collect evidence.

```bash
# 1. Collect fresh evidence
msp-readiness collect-evidence

# 2. Review evidence manifest
cat evidence/MANIFEST.md

# 3. Verify evidence files
ls -lh evidence/

# 4. Share with auditors
tar -czf msp-evidence-$(date +%Y%m%d).tar.gz evidence/
```

### Scenario 3: Closing MSP Gaps

You've identified gaps and need to generate documentation.

```bash
# 1. Check what's missing
msp-readiness assess | grep "Gap:"

# 2. Generate missing content
msp-readiness generate

# 3. Review generated files
ls -lh docs/playbooks/

# 4. Customize generated content
vim docs/playbooks/change-management.md

# 5. Re-assess to verify
msp-readiness assess

# 6. Update dashboard
msp-readiness dashboard
```

### Scenario 4: Continuous Monitoring

You want to track MSP readiness over time.

```bash
# Create a monitoring script
cat > monitor-msp.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="./msp-reports/$DATE"

mkdir -p "$REPORT_DIR"

# Run assessment
msp-readiness assess --output "$REPORT_DIR/assessment-report"

# Collect evidence
msp-readiness collect-evidence

# Copy evidence
cp -r evidence "$REPORT_DIR/"

# Build dashboard
msp-readiness dashboard --input "$REPORT_DIR/assessment-report.json"
cp dashboard.html "$REPORT_DIR/"

echo "✅ MSP monitoring complete: $REPORT_DIR"
EOF

chmod +x monitor-msp.sh

# Run weekly via cron
crontab -e
# Add: 0 9 * * 1 /path/to/monitor-msp.sh
```

### Scenario 5: Multi-Environment Assessment

You have multiple environments (test, staging, prod) and need to assess each.

```bash
# Create environment-specific configs
cp config.yaml config-test.yaml
cp config.yaml config-staging.yaml
cp config.yaml config-prod.yaml

# Edit each config with appropriate aws.stage and docs_path

# Assess each environment
for env in test staging prod; do
  echo "Assessing $env..."
  msp-readiness assess --config "config-$env.yaml" --output "assessment-$env"
done

# Compare results
diff assessment-test.md assessment-prod.md
```

## Troubleshooting

### Problem: AWS Permission Errors

**Symptom:** "Access Denied" or "UnauthorizedOperation" errors

**Solution:**

1. Check AWS credentials:
   ```bash
   aws sts get-caller-identity
   ```

2. Verify IAM permissions (see Required Permissions below)

3. Use `--skip-aws` flag to skip AWS analysis:
   ```bash
   msp-readiness assess --skip-aws
   ```

### Problem: Configuration Not Found

**Symptom:** "Configuration file not found: config.yaml"

**Solution:**

1. Create config file:
   ```bash
   cp ~/repos/flexion-msp-readiness/config.example.yaml ./config.yaml
   ```

2. Or specify config path:
   ```bash
   msp-readiness assess --config /path/to/config.yaml
   ```

### Problem: No Requirements Found

**Symptom:** Assessment shows 0 requirements covered

**Solution:**

1. Check `docs_path` in config.yaml points to correct directory
2. Verify documentation files use MSP requirement IDs (e.g., SEC-001, SECP-002)
3. Ensure files are in Markdown format (.md)

### Problem: Dashboard Not Building

**Symptom:** "Assessment file not found"

**Solution:**

1. Run assessment first:
   ```bash
   msp-readiness assess
   ```

2. Check that `assessment-report.json` exists:
   ```bash
   ls -lh assessment-report.json
   ```

3. Specify correct input path:
   ```bash
   msp-readiness dashboard --input ./path/to/assessment-report.json
   ```

## Required AWS Permissions

The tool requires read-only permissions for these AWS services:

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
        "securityhub:Describe*",
        "inspector2:Get*",
        "inspector2:List*",
        "backup:Describe*",
        "backup:List*",
        "iam:Get*",
        "iam:List*",
        "s3:GetBucket*"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach this policy to your IAM user or role.

## Tips and Best Practices

### 1. Regular Assessments

Run assessments regularly to track progress:

```bash
# Weekly assessment
msp-readiness assess
```

### 2. Version Control

Commit generated documentation to version control:

```bash
git add docs/playbooks/*.md evidence/MANIFEST.md
git commit -m "Update MSP documentation"
```

### 3. Team Collaboration

Share dashboard with team members:

```bash
# Upload to S3
aws s3 cp dashboard.html s3://your-bucket/msp-dashboard.html --acl public-read

# Share URL
echo "Dashboard: https://your-bucket.s3.amazonaws.com/msp-dashboard.html"
```

### 4. Customize Generated Content

Review and customize generated playbooks:

1. Generate from template
2. Review and edit for your organization
3. Add specific procedures, contacts, tools
4. Commit to version control

### 5. Evidence Retention

Keep evidence snapshots for audit trail:

```bash
# Archive evidence with date
tar -czf evidence-$(date +%Y%m%d).tar.gz evidence/

# Store in S3
aws s3 cp evidence-$(date +%Y%m%d).tar.gz s3://your-bucket/msp-evidence/
```

## Advanced Usage

### Custom Requirement Skip List

Skip requirements that don't apply to your organization:

```yaml
# config.yaml
assessment:
  skip_requirements:
    - "SUP-003"  # 24/7 support not required
    - "OPSP-007" # Not using this optional requirement
```

### Output Format Options

Choose report format:

```bash
# Markdown only
msp-readiness assess --format markdown

# JSON only
msp-readiness assess --format json

# Both (default)
msp-readiness assess --format both
```

### Custom Output Paths

Specify custom output locations:

```bash
# Custom report path
msp-readiness assess --output ./reports/msp-assessment-$(date +%Y%m%d)

# Custom dashboard input
msp-readiness dashboard --input ./reports/msp-assessment-20260727.json
```

## Support and Resources

- **Documentation**: See README.md, ARCHITECTURE.md, DEVELOPMENT.md
- **Issues**: Report bugs or request features via GitHub issues
- **AWS MSP Program**: https://aws.amazon.com/partners/programs/msp/
- **CIS Controls**: https://www.cisecurity.org/controls

## Changelog

See CHANGELOG.md for version history and release notes.
