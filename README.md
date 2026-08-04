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
             └── Dashboard (visualize status)
                 ├── Requirement Coverage Map
                 ├── Evidence Completeness
                 ├── Gap Analysis View
                 └── Effort Estimates
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

### 4. Compliance Dashboard

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

## AWS Permissions

### Required Permissions

The MSP readiness tool requires read-only AWS permissions to assess your infrastructure and collect evidence. All permissions are non-destructive.

#### Permission Check Command

Before running an assessment, you can validate your AWS permissions:

```bash
# Check all required permissions
msp-readiness check-permissions

# Generate IAM policy for missing permissions
msp-readiness check-permissions --generate-policy
```

The tool will automatically check permissions before running `assess` or `collect-evidence` commands. You can skip this check with `--skip-permission-check`.

#### Required IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudtrail:DescribeTrails",
        "cloudtrail:GetTrailStatus",
        "config:DescribeConfigRules",
        "config:DescribeComplianceByConfigRule",
        "securityhub:GetFindings",
        "securityhub:DescribeHub",
        "backup:ListBackupVaults",
        "backup:ListBackupPlans",
        "inspector2:ListFindings",
        "iam:GetAccountPasswordPolicy",
        "iam:ListUsers",
        "iam:ListMFADevices",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Permission Categories

| Category | Services | Purpose |
|----------|----------|---------|
| **Security Monitoring** | Security Hub, Inspector | Collect security findings and vulnerabilities |
| **Compliance** | Config, CloudTrail | Verify configuration compliance and audit logging |
| **Backup & Recovery** | Backup | Validate backup plans and recovery points |
| **Identity & Access** | IAM | Check password policies and MFA usage |
| **Monitoring** | CloudWatch | Verify alarm configurations |

#### Service-Specific Notes

- **IAM**: Permissions are global (us-east-1), but work across all regions
- **Security Hub**: Must be enabled in the target region
- **Inspector**: Must be activated for the AWS account
- **Config**: Must have a configuration recorder set up

#### Handling Missing Permissions

If you don't have all permissions:

1. **Run permission check first**:
   ```bash
   msp-readiness check-permissions --generate-policy
   ```

2. **Request IAM policy from your AWS admin**:
   - Copy the generated policy JSON
   - Attach to your IAM user/role

3. **Skip permission check (not recommended)**:
   ```bash
   msp-readiness assess --skip-permission-check
   ```

4. **Skip AWS analysis entirely**:
   ```bash
   msp-readiness assess --skip-aws
   ```

The tool gracefully handles missing permissions by:
- Distinguishing between "access denied" and "service disabled"
- Continuing with available data
- Clearly reporting what was skipped
- Generating partial assessments

#### Error Types

| Error Type | Meaning | Solution |
|------------|---------|----------|
| **AccessDeniedException** | IAM policy missing permission | Add permission to IAM policy |
| **InvalidClientTokenId** | Invalid AWS credentials | Check `aws configure` |
| **ResourceNotFoundException** | Service not enabled (e.g., Security Hub) | Enable service or skip with `--skip-aws` |
| **SubscriptionRequiredException** | Service requires subscription (e.g., Inspector) | Subscribe to service or document as N/A |

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

