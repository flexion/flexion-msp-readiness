# Quick Start Guide

## What Is This?

This tool automates 80% of AWS MSP Program readiness preparation. Instead of spending weeks manually:
- Mapping documentation to requirements
- Collecting evidence from AWS services
- Writing playbooks and runbooks
- Creating compliance dashboards

...this tool does it in hours.

## Installation

```bash
cd ~/repos/flexion-msp-readiness
npm install
npm run build
```

## Configuration

Create `config.yaml` from the example:

```bash
cp config.example.yaml config.yaml
```

Edit `config.yaml` to point to your project:

```yaml
project:
  name: "Compliance Concierge"
  docs_path: "../fipco-infra/docs/managed-service-provider"
  infra_path: "../fipco-infra/cdk"

aws:
  profile: "default"      # Your AWS profile
  region: "us-east-1"
  stage: "test"
```

## Basic Usage

### 1. Run Assessment

```bash
npm run dev -- assess
```

This will:
- Scan your documentation
- Analyze AWS infrastructure
- Map to MSP requirements
- Generate `assessment-report.md`

Example output:
```
✅ Addressed: 8 requirements (40%)
⚠️  Partial: 7 requirements (35%)
❌ Gap: 4 requirements (20%)

Critical gaps:
- SECP-001: Access Key Exposure (12h)
- SECP-002: Public Resources (10h)
- OPS-006: Change Management (8h)
```

### 2. Collect Evidence

```bash
npm run dev -- collect-evidence
```

Gathers evidence from:
- AWS Config (resource inventory)
- CloudTrail (audit logs)
- Security Hub (findings)
- Inspector (vulnerabilities)
- Backup (recovery points)
- IAM (access controls)

Output: `evidence/` directory with JSON snapshots

### 3. Generate Documentation

```bash
npm run dev -- generate --all
```

Creates missing:
- Playbooks (Incident Response, Deployment, DR)
- Runbooks (step-by-step procedures)
- Evidence matrices
- Self-assessment checklist

Output: `playbooks/` directory

### 4. Create Dashboard

```bash
npm run dev -- dashboard
```

Generates `dashboard.html` showing:
- Overall completion %
- Status by category
- Critical gaps
- Action priorities
- Timeline

Open in browser: `open dashboard.html`

### 5. Full Pipeline

Run everything at once:

```bash
npm run dev -- run --stage test
```

## Using as a Claude Skill

From your project directory:

```bash
cd ~/repos/fipco-infra
claude

# In Claude:
/msp-readiness assess
/msp-readiness generate --all
/msp-readiness dashboard
```

## Development Status

**Current**: Phase 1 complete (foundation)

**Next**: Phase 2 (core assessment engine)

See [PLAN.md](PLAN.md) for detailed roadmap.

## Testing on fipco-infra

The tool was designed to automate the MSP work in `fipco-infra`. Test it there:

```bash
# Create config pointing to fipco-infra
cat > config.yaml <<EOF
project:
  name: "Compliance Concierge"
  docs_path: "../fipco-infra/docs/managed-service-provider"
  infra_path: "../fipco-infra/cdk"
aws:
  profile: "default"
  region: "us-east-1"
  stage: "test"
output:
  evidence_path: "./evidence"
  playbooks_path: "./playbooks"
  dashboard_path: "./dashboard.html"
EOF

# Run assessment
npm run dev -- assess

# Expected: Should find ~8 addressed, ~7 partial, ~4 gaps
```

## Project Structure

```
flexion-msp-readiness/
├── src/
│   ├── assessors/      # Scan docs & AWS (Phase 2)
│   ├── collectors/     # Gather evidence (Phase 3)
│   ├── generators/     # Create docs (Phase 4)
│   └── dashboard/      # Build dashboard (Phase 5)
├── templates/          # Playbook/runbook templates
├── PLAN.md            # Development roadmap
├── README.md          # Project overview
└── CLAUDE.md          # Claude Code guidance
```

## Key Concepts

### Requirements
20 MSP requirements across 3 categories:
- **Security** (9): SECP-001, SECP-002, SEC-001, etc.
- **Operations** (7): OPS-003, OPS-004, OPSP-001, etc.
- **Support** (4): OPSP-002, OPSP-003, etc.

### Status Levels
- ✅ **Addressed**: Documentation + AWS evidence present
- ⚠️ **Partial**: Incomplete documentation or AWS config
- ❌ **Gap**: Missing documentation and/or AWS controls
- ⬜ **N/A**: Not applicable to this project

### Evidence Types
- **Documents**: Playbooks, runbooks, procedures
- **AWS Snapshots**: Config exports, CloudTrail status
- **Log Excerpts**: CloudWatch, Security Hub findings
- **Screenshots**: Dashboard captures (manual)

## Development Workflow

1. **Build**: `npm run build`
2. **Watch**: `npm run watch` (auto-rebuild)
3. **Test**: `npm test`
4. **Lint**: `npm run lint:fix`
5. **Format**: `npm run format`

## Next Steps

1. **Implement Phase 2** (core assessment)
   - Start with config loader
   - Then documentation scanner
   - Test on fipco-infra docs

2. **Iterate incrementally**
   - Each module delivers value independently
   - Test after each addition
   - Refine based on real usage

3. **Add AWS analysis**
   - Config analyzer
   - IAM evaluator
   - Security Hub checker

See [PLAN.md](PLAN.md) for detailed tasks.

## Getting Help

- **Architecture**: See [CLAUDE.md](CLAUDE.md)
- **Development Plan**: See [PLAN.md](PLAN.md)
- **Project Overview**: See [README.md](README.md)
- **Skill Usage**: See [.claude/skills/msp-readiness.md](.claude/skills/msp-readiness.md)

## Example: Addressing SECP-002

SECP-002 requires detection of public resources. The tool will:

1. **Assess**: Check for Config rules for public S3, RDS, etc.
2. **Collect**: Export Config rule compliance status
3. **Generate**: Create "Public Resource Detection" runbook
4. **Dashboard**: Show SECP-002 status and next actions

If missing, it tells you:
- ❌ SECP-002: Public Resources Detection
- AWS Config rules not enabled
- Estimated effort: 10 hours
- Next: Deploy Config rules for s3-bucket-public-read-prohibited, etc.
