# Claude Code Integration Guide

This document explains how to use the MSP Readiness tool as a Claude Code skill.

## How It Works

The MSP Readiness tool is designed to be invoked by Claude Code when you ask questions about AWS MSP Program readiness. The skill is automatically triggered by keywords like "MSP", "compliance", or "managed service provider".

## Setup

### 1. Install the Tool

```bash
cd ~/repos/flexion-msp-readiness
npm install
npm run build
npm link  # Makes msp-readiness globally available
```

### 2. Verify Installation

```bash
# Check that the command works
msp-readiness --version

# Check that the skill helper works
~/repos/flexion-msp-readiness/bin/msp-skill help
```

### 3. Skill File Location

The skill definition is at `.claude/skills/msp-readiness.md`. Claude Code will automatically detect and load it when:
- You're in a project that references this repository
- You ask questions related to MSP readiness

## Using the Skill

### Natural Language Invocation

Simply ask Claude Code questions about MSP readiness:

**Example 1: Initial Assessment**
```
You: "Can you check our MSP readiness?"

Claude: I'll run an MSP readiness assessment for you.
[Runs: ~/repos/flexion-msp-readiness/bin/msp-skill assess]
[Parses: assessment-report.md]

Based on the assessment:
- Overall completion: 60% (12/20 requirements)
- Critical gaps: 3 requirements
- Estimated effort: 36 hours

Critical gaps:
1. SECP-001: Access Key Exposure Detection (12h)
2. SECP-002: Public Resources Detection (10h)
3. OPS-006: Change Management Playbook (8h)

Would you like me to generate the missing documentation?
```

**Example 2: Evidence Collection**
```
You: "Collect evidence for our MSP audit"

Claude: I'll collect compliance evidence from your AWS account.
[Runs: ~/repos/flexion-msp-readiness/bin/msp-skill collect-evidence]

Evidence collected:
- CloudTrail: 2 trails configured, multi-region enabled
- AWS Config: 45 rules, 89% compliant
- AWS Backup: 3 vaults, 5 plans
- Inspector: 12 findings (2 high, 10 medium)

Evidence saved to: ./evidence/
Manifest: ./evidence/MANIFEST.md
```

**Example 3: Generate Documentation**
```
You: "Generate the missing MSP playbooks"

Claude: I'll generate the missing playbooks and runbooks.
[Runs: ~/repos/flexion-msp-readiness/bin/msp-skill generate]

Generated 4 documents:
- change-management.md (OPS-006)
- vulnerability-management.md (SEC-008)
- access-key-rotation.md (SECP-001)
- evidence-matrix.md (ALL)

These have been customized with your project details.
Please review and update as needed.
```

**Example 4: Dashboard**
```
You: "Show me the compliance dashboard"

Claude: I'll build an interactive dashboard.
[Checks: assessment-report.json exists]
[Runs: ~/repos/flexion-msp-readiness/bin/msp-skill dashboard]

Dashboard created: ./dashboard.html

Key metrics:
- Security: 75% complete (6/8 requirements)
- Operations: 50% complete (4/8 requirements)
- Support: 100% complete (2/2 requirements)

Opening dashboard in your browser...
```

**Example 5: Complete Workflow**
```
You: "Run the complete MSP readiness workflow"

Claude: I'll run the full workflow: assess, collect, generate, and dashboard.
[Runs: ~/repos/flexion-msp-readiness/bin/msp-skill full]

Completed:
✓ Assessment (60% complete, 3 critical gaps)
✓ Evidence collection (4 services, 127 resources)
✓ Documentation generation (4 new documents)
✓ Dashboard creation (dashboard.html)

Next steps:
1. Review assessment-report.md for detailed findings
2. Customize generated playbooks in docs/playbooks/
3. Address the 3 critical gaps (36h estimated effort)
4. Share dashboard.html with stakeholders
```

## What Claude Code Should Do

When the skill is invoked, Claude Code should:

### 1. Pre-Flight Checks

```bash
# Check if tool is available
which msp-readiness || which ~/repos/flexion-msp-readiness/bin/msp-skill

# Check if config.yaml exists in current directory
if [ ! -f config.yaml ]; then
  # Offer to create from template
  cp ~/repos/flexion-msp-readiness/config.example.yaml ./config.yaml
  # Prompt user to edit with project details
fi
```

### 2. Run Appropriate Command

Based on user intent:

| User Intent | Command |
|-------------|---------|
| "Check readiness" / "Assess" | `msp-skill assess` |
| "Collect evidence" | `msp-skill collect-evidence` |
| "Generate docs" / "Create playbooks" | `msp-skill generate` |
| "Show dashboard" | `msp-skill dashboard` |
| "Full workflow" / "Complete assessment" | `msp-skill full` |
| "What's the status?" | `msp-skill status` |

### 3. Parse Results

**For assess:**
- Read `assessment-report.md` or `assessment-report.json`
- Extract: overall completion %, critical gaps, effort estimates
- Summarize top 3-5 critical gaps
- Suggest next actions

**For collect-evidence:**
- Read `evidence/MANIFEST.md`
- Count evidence files collected
- Highlight any collection failures
- Note evidence expiration dates

**For generate:**
- List generated files
- Note which requirements they address
- Suggest reviewing and customizing
- Offer to re-run assessment

**For dashboard:**
- Note `dashboard.html` location
- Optionally display key metrics from JSON
- Suggest opening in browser

### 4. Present to User

Format as:
1. What was done (command that ran)
2. Key findings (metrics, gaps, files generated)
3. Next steps (recommendations)

Avoid:
- Raw command output dumps
- Long file content listings
- Technical jargon without explanation

## Configuration Management

Claude Code should help manage `config.yaml`:

### Initial Setup

```yaml
# When creating config.yaml, use sensible defaults:
project:
  name: "${PROJECT_NAME}"  # From git config or directory name
  organization: "${ORG_NAME}"  # Prompt user
  docs_path: "./docs"
  infra_path: "./cdk"  # Or ./terraform, ./infrastructure

aws:
  region: "${AWS_DEFAULT_REGION:-us-east-1}"
  profile: "${AWS_PROFILE:-default}"
  stage: "test"  # Or staging, uat, prod

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

### Validation

Before running commands, check:
- `docs_path` exists
- AWS credentials configured (for non-`--skip-aws` commands)
- Output directories are writable

## Error Handling

Common errors Claude Code should handle gracefully:

### AWS Credentials Missing

```
Error: Unable to locate credentials
Solution: Run 'aws configure' or use --skip-aws flag
Action: Offer to re-run with --skip-aws
```

### Config File Invalid

```
Error: Configuration invalid
Solution: Check config.yaml syntax and required fields
Action: Show example config or re-create from template
```

### Tool Not Built

```
Error: dist/cli.js not found
Solution: Run 'npm run build' in flexion-msp-readiness repo
Action: Auto-build if possible
```

### Assessment JSON Missing (for dashboard)

```
Error: assessment-report.json not found
Solution: Run 'msp-readiness assess' first
Action: Offer to run assess then dashboard
```

## Best Practices

### 1. Context-Aware Invocation

Don't run all commands every time. Based on user intent:
- First time: suggest `msp-skill assess` to understand current state
- After assessment: suggest addressing gaps or collecting evidence
- Before audit: suggest `msp-skill collect-evidence`
- For stakeholders: suggest `msp-skill dashboard`

### 2. Incremental Workflow

Guide users through the workflow step-by-step:
1. Assess (understand current state)
2. Review gaps (prioritize work)
3. Generate docs (fill gaps)
4. Collect evidence (prove compliance)
5. Dashboard (visualize and share)

### 3. Explain Findings

Don't just show numbers. Explain:
- What "60% complete" means (12 of 20 requirements addressed)
- Why gaps are critical (impact on MSP approval)
- What effort estimates represent (hours to implement)
- What to do next (concrete actions)

### 4. File Management

Help users understand generated files:
- `assessment-report.md` - Human-readable, review this first
- `assessment-report.json` - For dashboard, don't need to read
- `evidence/*.json` - For auditors, point-in-time snapshots
- `docs/playbooks/*.md` - Review and customize before committing

## Testing the Skill

To verify the skill works:

```bash
# 1. Start in a test directory
cd /tmp/msp-test
mkdir -p docs

# 2. Ask Claude Code:
"Check our MSP readiness"

# 3. Expected behavior:
# - Claude detects no config.yaml
# - Offers to create one
# - Runs assessment with --skip-aws (no credentials in /tmp)
# - Shows summary of gaps (all requirements will be gaps with no docs)

# 4. Ask Claude Code:
"Generate the missing playbooks"

# 5. Expected behavior:
# - Runs msp-skill generate
# - Creates docs/playbooks/ directory
# - Generates 4-7 playbook files
# - Lists what was created

# 6. Ask Claude Code:
"Show me the dashboard"

# 7. Expected behavior:
# - Checks for assessment-report.json
# - If missing, offers to run assess first
# - Runs dashboard command
# - Notes dashboard.html location
```

## Integration with Existing Projects

When using in a real project like fipco-infra:

1. **Create config.yaml in project root**
   ```bash
   cd ~/repos/fipco-infra
   cp ~/repos/flexion-msp-readiness/config.example.yaml ./config.yaml
   # Edit with actual paths:
   #   docs_path: "./docs/managed-service-provider"
   #   infra_path: "./cdk"
   ```

2. **Run from project directory**
   Claude Code should `cd` to the project directory before running commands

3. **Commit generated files**
   Generated playbooks and evidence matrix should be git-committed:
   ```bash
   git add docs/playbooks/*.md evidence/MANIFEST.md
   git commit -m "Add MSP compliance documentation"
   ```

4. **Ignore transient files**
   Add to `.gitignore`:
   ```
   assessment-report.json
   assessment-report.md
   dashboard.html
   evidence/*.json
   ```

## Troubleshooting

| Issue | Claude Code Action |
|-------|-------------------|
| Command not found | Check if tool is installed, offer to build |
| Permission denied | Check file is executable (`chmod +x`) |
| AWS errors | Suggest `--skip-aws` or check credentials |
| Config errors | Validate config.yaml, show example |
| No output files | Check command exit code, show stderr |
| Stale assessment | Note last run time, offer to re-run |

## Resources

- Full documentation: `~/repos/flexion-msp-readiness/README.md`
- Architecture details: `~/repos/flexion-msp-readiness/ARCHITECTURE.md`
- Development guide: `~/repos/flexion-msp-readiness/DEVELOPMENT.md`
- User guide: `~/repos/flexion-msp-readiness/SKILL-USAGE.md`

## Skill File Reference

The skill is defined in `.claude/skills/msp-readiness.md` with:
- Trigger keywords for auto-invocation
- Command descriptions
- Error handling guidance
- Integration notes

Claude Code should read this file to understand:
- When to invoke the skill
- What commands are available
- How to interpret results
- What to suggest to users
