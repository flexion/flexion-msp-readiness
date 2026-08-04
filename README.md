# Flexion MSP Readiness Automation

A Claude Code skill and toolkit for automating AWS MSP Program readiness assessment, evidence collection, playbook generation, and compliance dashboard creation.

## Overview

This tool automates the process of preparing for AWS Managed Service Provider (MSP) Program requirements by:

1. **Assessing** existing project documentation and AWS infrastructure against MSP requirements
2. **Collecting** evidence from AWS services (Config, CloudTrail, Security Hub, Inspector, etc.)
3. **Generating** required playbooks, runbooks, and documentation
4. **Creating** a real-time compliance dashboard showing readiness status

### What Problem Does This Solve?

Manual MSP readiness preparation is time-consuming and error-prone:
- Hours spent mapping existing controls to MSP requirements
- Manual evidence collection from multiple AWS services
- Repetitive playbook/runbook authoring following similar patterns
- No single view of overall readiness status
- Risk of missing requirements or inconsistent documentation

This tool automates 80% of the preparation work, allowing teams to focus on gaps and decision-making.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Claude Code Skill                          │
│                     (msp-readiness)                             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├── Assessors (analyze current state)
             │   ├── Documentation Scanner
             │   ├── AWS Config Analyzer
             │   ├── IAM Policy Evaluator
             │   └── Security Hub Inspector
             │
             ├── Collectors (gather evidence)
             │   ├── CloudTrail Evidence
             │   ├── Config Rules Evidence
             │   ├── Backup Verification
             │   └── Security Findings
             │
             ├── Generators (create artifacts)
             │   ├── Playbook Generator
             │   ├── Runbook Generator
             │   ├── Evidence Matrix Builder
             │   └── Self-Assessment Filler
             │
             ├── Dashboard (visualize status)
             │   ├── Requirement Coverage Map
             │   ├── Evidence Completeness
             │   ├── Gap Analysis View
             │   └── Effort Estimates
             │
             └── Monitoring (continuous compliance)
                 ├── Scheduled Assessments
                 ├── Drift Detection
                 ├── Slack/Email Notifications
                 └── CloudWatch Metrics
```

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/flexion/flexion-msp-readiness.git
cd flexion-msp-readiness

# Install dependencies
npm install

# Set up AWS credentials
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1

# Initialize configuration
cp config.example.yaml config.yaml
# Edit config.yaml with your project paths
```

### Using as a Claude Code Skill

The tool is designed to be invoked by Claude Code when you ask about MSP readiness:

```bash
# In Claude Code, simply ask:
"Check our MSP readiness"
"What do we need for AWS MSP certification?"
"Collect evidence for our MSP audit"
"Show me the compliance dashboard"

# Claude Code will automatically:
# 1. Check if config.yaml exists (create from template if needed)
# 2. Run the appropriate msp-readiness command
# 3. Parse and summarize the results
# 4. Suggest next steps
```

The skill helper script makes it easy for Claude to invoke:

```bash
# Claude Code will run commands like:
~/repos/flexion-msp-readiness/bin/msp-skill assess
~/repos/flexion-msp-readiness/bin/msp-skill collect-evidence
~/repos/flexion-msp-readiness/bin/msp-skill generate
~/repos/flexion-msp-readiness/bin/msp-skill dashboard
~/repos/flexion-msp-readiness/bin/msp-skill full  # Complete workflow
```

### Using Directly (CLI)

You can also use the tool directly from the command line:

```bash
# Link for global access
cd ~/repos/flexion-msp-readiness
npm link

# Now use from any project directory
cd /path/to/your/project
msp-readiness assess
msp-readiness collect-evidence
msp-readiness generate
msp-readiness dashboard
msp-readiness diff --baseline old.json --current new.json

# Or use the skill helper
~/repos/flexion-msp-readiness/bin/msp-skill full
```

## Features

### 1. Automated Assessment

Scans your project for:
- Existing documentation (README, CLAUDE.md, docs/)
- AWS infrastructure state (via AWS SDK)
- Current security controls (Security Hub, Config)
- Existing playbooks and runbooks
- Evidence artifacts

Outputs:
- Requirement coverage matrix
- Gap analysis with priorities
- Implementation effort estimates
- Compliance percentage by category

### 2. Evidence Collection

Automatically collects evidence for MSP requirements:

| Requirement | Evidence Source | Automation |
|-------------|----------------|------------|
| SECP-001 | AWS Health Events | CloudWatch Events subscription |
| SECP-002 | AWS Config Rules | Config rule deployment + findings |
| SEC-003 | AWS Config | Resource inventory snapshots |
| SEC-007 | Inspector | Vulnerability scan results |
| OPS-004 | CloudTrail | Log retention verification |
| OPS-005 | AWS Backup | Backup job status + test restores |

### 3. Playbook & Runbook Generation

Generates documentation using templates and project-specific context:

- **Playbooks**: High-level operational procedures (Incident Response, Deployment, DR)
- **Runbooks**: Step-by-step technical procedures
- **Evidence matrices**: Pre-populated with collected evidence
- **Self-assessment**: Auto-filled checklist responses

All generated content is:
- Based on proven templates (from fipco-infra MSP work)
- Customized with actual AWS resource details
- CIS Controls v8 aligned
- Ready for review (not requiring rewrite)

### 4. Assessment Comparison

Compare two assessment runs to track improvements and validate remediation efforts:

```bash
# Compare baseline with current assessment
msp-readiness diff \
  --baseline assessment-2026-01-01.json \
  --current assessment-2026-02-01.json

# Filter for specific changes
msp-readiness diff --only improvements
msp-readiness diff --only regressions

# CI/CD integration - exits with code 1 if compliance decreases
msp-readiness diff --baseline baseline.json --current current.json
```

Features:
- **Show compliance changes**: Percentage point increase/decrease
- **Track improvements**: Requirements that moved from gap → partial → addressed
- **Detect regressions**: Requirements that lost compliance
- **Explain changes**: Specific reasons for each status change (new findings, evidence, etc.)
- **CI/CD integration**: Exit code 1 if compliance drops (blocks deployments)
- **Multiple formats**: JSON and markdown reports

Example output:
```
📊 Assessment Comparison

Baseline:
  Date: 2026-01-01
  Compliance: 50%

Current:
  Date: 2026-02-01
  Compliance: 65%

📈 Compliance Change: +15%

📝 Changes Summary:
✅ Improved:   5 requirements
❌ Regressed:  0 requirements
➡️  Unchanged: 14 requirements

📈 Improvements:
📈 OPSP-001: Incident Management
  Status: gap → addressed
  Confidence: 50% → 90%
  Reason: Status changed from 'gap' to 'addressed'; Confidence increased by 40%; 2 new findings added; 1 new evidence artifact
```

### 5. Compliance Dashboard

Interactive HTML dashboard showing:

```
┌───────────────────────────────────────────────────────┐
│  MSP Readiness Dashboard - Project: fipco-infra       │
│  Overall Completion: 67% (20/30 requirements)         │
├───────────────────────────────────────────────────────┤
│  ✅ Addressed (8)  ⚠️  Partial (7)  ❌ Gap (4)  ⬜ N/A (11) │
├───────────────────────────────────────────────────────┤
│  By Category:                                         │
│  Security:       ████████░░ 80% (12/15)              │
│  Operations:     ██████░░░░ 60% (6/10)               │
│  Support:        ███░░░░░░░ 30% (2/5)                │
├───────────────────────────────────────────────────────┤
│  Critical Gaps (blocking MSP approval):               │
│  🔴 SECP-001: Access Key Exposure Detection           │
│  🔴 SECP-002: Public Resource Detection               │
│  🔴 OPS-006: Change Management Playbook               │
│  🔴 SEC-008: Vulnerability Remediation SLA            │
├───────────────────────────────────────────────────────┤
│  Next Actions:                                        │
│  1. Deploy Config rules (SECP-002) - 8h              │
│  2. Create Change Management playbook - 6h           │
│  3. Document vuln remediation SLA - 2h               │
├───────────────────────────────────────────────────────┤
│  Evidence Status:                                     │
│  📊 12 evidence files collected                       │
```

### 5. Automated Drift Detection & Monitoring

**NEW**: Continuous compliance monitoring with automated alerts:

- **Scheduled Assessments**: Run assessments on a cron schedule (e.g., daily at 9 AM)
- **Drift Detection**: Compare current state against baseline to detect compliance changes
- **Smart Notifications**: Slack/email alerts when compliance drops or new gaps appear
- **CloudWatch Metrics**: Publish compliance metrics to AWS CloudWatch for dashboards
- **Historical Tracking**: Store assessment history to track compliance trends over time
- **Alert Deduplication**: Prevent notification spam from repeated issues

**Quick Start:**

```bash
# Create baseline
msp-readiness assess
msp-readiness drift --save-baseline

# Detect drift
msp-readiness drift

# Run monitoring cycle
msp-readiness monitor

# View compliance history
msp-readiness history

# Start continuous monitoring daemon
node dist/monitoring/daemon.js config.yaml
```

**Configuration:**

```yaml
monitoring:
  enabled: true
  schedule: "0 9 * * *"  # Daily at 9 AM

notifications:
  slack:
    webhook_url: "https://hooks.slack.com/..."
    alert_on:
      compliance_drop: 5  # Alert if drops by 5%
      new_gaps: true
  
  cloudwatch:
    enabled: true
    namespace: "MSP/Readiness"
```

See [Monitoring README](src/monitoring/README.md) for full documentation
│  📝 8 playbooks/runbooks generated                    │
│  ⏱️  Last updated: 2026-07-27 14:23 UTC              │
└───────────────────────────────────────────────────────┘
```

## Configuration

Edit `config.yaml` to customize:

```yaml
project:
  name: "Compliance Concierge"
  docs_path: "../fipco-infra/docs/managed-service-provider"
  cdk_path: "../fipco-infra/cdk"
  
aws:
  profile: "default"
  region: "us-east-1"
  stage: "test"
  
msp:
  version: "Feb2026-Aug2026"
  ig_level: 1  # CIS IG1
  
output:
  evidence_path: "./evidence"
  playbooks_path: "./playbooks"
  dashboard_path: "./dashboard.html"
  
assessment:
  skip_requirements: []  # Optional: skip N/A requirements
  custom_priorities: {}  # Optional: override priority levels
```

## Troubleshooting

### AWS Authentication Issues

The tool includes **automatic AWS environment validation** that checks for common credential problems before running any AWS operations.

#### Multiple Credential Sources Warning

If you see:
```
⚠️  AWS Environment Warnings:

  ! Multiple credential sources detected: Both AWS_PROFILE and static 
    credentials (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) are set.
```

**Fix**: The tool will provide the exact commands needed:
```bash
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN
export AWS_PROFILE=your-profile-name
```

#### Profile Mismatch Error

If you see:
```
❌ AWS_PROFILE mismatch: Expected "AWSAdministratorAccess-688672519222" 
   but found "ClaudeCodeAccess"
```

**Fix**: Set the correct profile:
```bash
export AWS_PROFILE=AWSAdministratorAccess-688672519222
aws sso login --profile AWSAdministratorAccess-688672519222
```

#### Missing Credentials Error

If you see:
```
❌ No AWS credentials configured
```

**Fix**: Configure AWS SSO:
```bash
export AWS_PROFILE=your-profile-name
aws sso login
```

#### Detailed Troubleshooting

See the comprehensive troubleshooting guides:
- **[AWS-LOGIN-GUIDE.md](AWS-LOGIN-GUIDE.md)** - How to login to the correct AWS account
- **[AWS-PERMISSIONS-GUIDE.md](AWS-PERMISSIONS-GUIDE.md)** - Required IAM permissions

### Permission Errors

If you see `AccessDeniedException` errors, you're missing required AWS permissions. The tool needs read-only access to:

- CloudTrail (cloudtrail:DescribeTrails)
- AWS Config (config:DescribeConfigRules, config:DescribeConformancePacks)
- AWS Backup (backup:ListBackupVaults, backup:ListBackupPlans)
- Amazon Inspector (inspector2:ListFindings)
- Security Hub (securityhub:GetFindings, securityhub:DescribeHub)
- IAM (iam:GetAccountPasswordPolicy, iam:ListUsers)
- CloudWatch (cloudwatch:DescribeAlarms, logs:DescribeLogGroups)
- Systems Manager (ssm:DescribeInstanceInformation)

**Fix**: Attach the AWS `SecurityAudit` managed policy or see [AWS-PERMISSIONS-GUIDE.md](AWS-PERMISSIONS-GUIDE.md) for detailed instructions.

### Build Issues

If `npm run build` fails:
```bash
# Clean and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Project Structure

```
flexion-msp-readiness/
├── .claude/
│   └── skills/
│       └── msp-readiness.md      # Main Claude Code skill
├── src/
│   ├── assessors/                # Assessment modules
│   │   ├── doc-scanner.ts
│   │   ├── aws-config-analyzer.ts
│   │   ├── iam-evaluator.ts
│   │   └── security-hub-checker.ts
│   ├── collectors/               # Evidence collection
│   │   ├── cloudtrail-collector.ts
│   │   ├── config-collector.ts
│   │   ├── backup-collector.ts
│   │   └── inspector-collector.ts
│   ├── generators/               # Content generation
│   │   ├── playbook-generator.ts
│   │   ├── runbook-generator.ts
│   │   ├── evidence-matrix.ts
│   │   └── self-assessment.ts
│   ├── dashboard/                # Dashboard creation
│   │   ├── builder.ts
│   │   ├── templates/
│   │   └── assets/
│   └── cli.ts                    # CLI entry point
├── templates/                    # Document templates
│   ├── playbooks/
│   ├── runbooks/
│   └── evidence/
├── docs/                         # Project documentation
│   ├── DEVELOPMENT.md
│   ├── ARCHITECTURE.md
│   └── SKILL-USAGE.md
├── examples/                     # Example outputs
│   └── fipco-infra-assessment/
├── tests/
├── package.json
├── tsconfig.json
├── config.example.yaml
└── README.md
```

## Development Status

### Phase 1: Foundation ✅ (Current)
- [x] Repository structure
- [x] README and documentation
- [x] TypeScript setup
- [x] Configuration system
- [x] MSP requirements data model

### Phase 2: Core Assessment (In Progress)
- [ ] Documentation scanner
- [ ] AWS Config analyzer
- [ ] Requirement matcher
- [ ] Gap analyzer
- [ ] Effort estimator

### Phase 3: Evidence Collection
- [ ] CloudTrail collector
- [ ] Config rules collector
- [ ] Security Hub collector
- [ ] Backup verification
- [ ] Evidence file generator

### Phase 4: Content Generation
- [ ] Playbook templates
- [ ] Runbook templates
- [ ] Template renderer
- [ ] Context injection
- [ ] Validation

### Phase 5: Dashboard
- [ ] Data aggregator
- [ ] HTML/CSS dashboard
- [ ] Interactive features
- [ ] Export functionality

### Phase 6: Claude Skill
- [ ] Skill definition
- [ ] Conversation flow
- [ ] Error handling
- [ ] User prompts
- [ ] Final integration

## Contributing

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for development setup, architecture decisions, and contribution guidelines.

## License

MIT License - see LICENSE file for details.

## Credits

Based on the MSP readiness work for Compliance Concierge (Flexion/FIPCO), specifically:
- AWS MSP Program Self-Assessment Checklist (Feb 2026 - Aug 2026)
- CIS Controls v8 Cloud Companion Guide
- Operations & Security Playbook patterns

## Documentation

### For Users
- **README.md** (this file) - Overview and usage
- **config.example.yaml** - Configuration template

### For Developers
- **[SETUP.md](SETUP.md)** - Environment setup and prerequisites ⭐ Start here
- **[CLAUDE.md](CLAUDE.md)** - Architecture and development guidelines
- **[WORKFLOW.md](WORKFLOW.md)** - Git workflow and PR process
- **[TESTING.md](TESTING.md)** - Testing procedures and checklist
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute, definition of done
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions
- **[PROJECT_ROADMAP.md](PROJECT_ROADMAP.md)** - Development roadmap with all issues

### Quick Start for Developers

```bash
# 1. Setup environment
See SETUP.md for complete setup instructions

# 2. Pick an issue from "Ready" column
https://github.com/orgs/flexion/projects/53

# 3. Start working
./scripts/move-issue.sh <issue-number> in-progress
git checkout -b feature/issue-<number>-description

# 4. Make changes, test, commit

# 5. Create PR and move to review
git push -u origin feature/issue-<number>-description
gh pr create
./scripts/move-issue.sh <issue-number> in-review
```

See [WORKFLOW.md](WORKFLOW.md) for detailed workflow.

## Project Status

**Current Status**: Phase 1 in progress

- ✅ Issue #7 complete: fipco-infra integration with CDK parser
- 🔄 6 Phase 1 issues ready to start (176 hours)
- 📋 6 Phase 2-3 issues in backlog (112 hours)

**Project Board**: https://github.com/orgs/flexion/projects/53

**Recommended Next**: Issue #5 (Fix Build Process - 4h quick win)

