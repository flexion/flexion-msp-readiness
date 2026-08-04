# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## 🚀 Quick Start for New Sessions

**Working on an issue? Use this script to update status:**

```bash
./scripts/move-issue.sh <issue-number> <status>
# Status: backlog, ready, in-progress, in-review, done
```

**Example workflow**:
```bash
# Start issue #5
./scripts/move-issue.sh 5 in-progress
git checkout -b feature/issue-5-description

# Complete and create PR
git push -u origin feature/issue-5-description
gh pr create
./scripts/move-issue.sh 5 in-review
```

**Project Board**: https://github.com/orgs/flexion/projects/53  
**Full Workflow**: See [WORKFLOW.md](WORKFLOW.md) or GitHub Project Management section below

---

## 🎯 North Star: The MSP Readiness Skill

**CRITICAL**: This entire project exists to build the **msp-readiness Claude Code skill**.

### The End Goal

A user runs this from their project directory:
```bash
/msp-readiness assess
```

And gets:
- ✅ Complete assessment of their MSP readiness
- ✅ Generated playbooks for all 19 requirements
- ✅ Generated runbooks with specific procedures
- ✅ Evidence collected from their AWS account
- ✅ Interactive dashboard showing compliance status
- ✅ Clear remediation guidance for gaps

**No manual work. Fully automated. Production-ready documentation.**

### Reflection Questions for Every Issue

When working on ANY issue, always ask:

1. **How does this improve the msp-readiness skill?**
   - Does it make the skill more automatic?
   - Does it improve the quality of generated artifacts?
   - Does it reduce manual work for users?
   - Does it make results more accurate?

2. **What else could improve the skill?**
   - What manual steps still exist?
   - What requires human judgment that could be automated?
   - What edge cases aren't handled?
   - What would make this more valuable to users?

3. **Should this create new issues?**
   - If you identify improvements, create issues
   - Document them for future prioritization
   - Link to the current work

### Example: Improving the Skill

**Working on Issue #5** (Fix Build Process):
- ❓ How does this improve the skill? → Makes deployment easier, reduces setup friction
- ❓ What else? → Could automate the entire build/release process
- ✅ New issue: "Automate release process with GitHub Actions"

**Working on Issue #2** (Complete Playbooks):
- ❓ How does this improve the skill? → Provides complete documentation for all requirements
- ❓ What else? → Could customize playbooks based on project specifics (tech stack, team size)
- ✅ New issue: "Add playbook customization based on project context"

### The Skill's Value Proposition

**Current State** (manual MSP prep):
- Takes 150+ hours of manual work
- Error-prone documentation
- Inconsistent coverage
- Hard to maintain

**Target State** (with msp-readiness skill):
- Run one command: `/msp-readiness run`
- Get complete MSP package in minutes
- Consistent, high-quality documentation
- Automatic updates as infrastructure changes

### Measuring Success

The skill is successful when:
- ✅ Zero manual playbook writing
- ✅ Zero manual evidence collection
- ✅ Automatic detection of compliance gaps
- ✅ Clear, actionable remediation guidance
- ✅ Real-time compliance dashboard
- ✅ Supports continuous compliance monitoring

### Keep This in Mind

Every commit should move us closer to that automated, one-command MSP readiness experience.

If your work doesn't improve the skill, ask why you're doing it.

---

## Project Overview

This is the **Flexion MSP Readiness Automation** project - a Claude Code skill and toolkit for automating AWS Managed Service Provider (MSP) Program readiness assessment.

**Purpose**: Automate the time-consuming process of:
1. Assessing project documentation and AWS infrastructure against MSP requirements
2. Collecting compliance evidence from AWS services
3. Generating required playbooks, runbooks, and documentation
4. Creating a visual compliance dashboard

## Architecture

The project is organized into functional modules:

```
src/
├── assessors/      # Analyze current state (docs, AWS config, IAM, Security Hub)
├── collectors/     # Collect evidence from AWS services
├── generators/     # Generate playbooks, runbooks, evidence matrices
├── dashboard/      # Build interactive compliance dashboard
├── config/         # Configuration loading and validation
├── data/           # MSP requirements data and mappings
├── utils/          # Shared utilities
└── cli.ts          # CLI entry point
```

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run watch

# Run tests
npm test
npm run test:watch

# Lint
npm run lint
npm run lint:fix

# Format code
npm run format

# Run CLI (after build)
npm run dev -- assess
```

## Key Technologies

- **TypeScript**: Type-safe development
- **AWS SDK v3**: Modular AWS service clients
- **Commander.js**: CLI framework
- **Handlebars**: Template rendering for generated docs
- **Jest**: Testing framework
- **ESLint + Prettier**: Code quality and formatting

## Design Principles

1. **Incremental Value**: Each phase delivers standalone value
2. **Type Safety**: Comprehensive TypeScript types for all data structures
3. **Testability**: Mock AWS responses, test each module independently
4. **Graceful Degradation**: Handle missing AWS permissions, incomplete data
5. **Clear Output**: Human-readable reports, structured JSON for automation
6. **Template-Driven**: Proven templates from real MSP work (fipco-infra)

## Development Plan

See [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) for the complete development roadmap broken into 3 phases with 13 GitHub issues:

**Phase 1: Critical MVP (Weeks 1-6)** - 176 hours
- Issue #2: Complete Playbook Coverage (40h)
- Issue #3: Expand Evidence Collectors (32h)
- Issue #4: Add Remediation Guidance (24h)
- Issue #5: Fix Build Process (4h) ⚡ Quick win
- Issue #6: Pre-flight Permission Check (16h)
- Issue #7: fipco-infra Integration (40h) ✅ Complete
- Issue #14: Refine Existing Playbooks (20h)

**Phase 2: Production Ready (Weeks 7-10)** - 44 hours
- Issue #8: Progress Tracking Over Time (24h)
- Issue #9: Better Reporting Formats (20h)

**Phase 3: Advanced Features (Future)** - 112 hours
- Issue #10: Multi-Account Support (28h)
- Issue #11: Automated Drift Detection (32h)
- Issue #12: Comparison Mode (16h)
- Issue #13: CDK/Terraform Scanner (36h)

**Current Status**: Issue #7 complete and in review, Phase 1 issues ready to start

**GitHub Project**: https://github.com/orgs/flexion/projects/53

**Recommended next**: Issue #5 (Fix Build Process - 4h quick win)

## Key Files

- `src/types.ts` - Core TypeScript type definitions
- `src/data/msp-requirements.ts` - MSP Program requirements data
- `config.example.yaml` - Configuration template
- `.claude/skills/msp-readiness.md` - Claude Code skill definition
- `PLAN.md` - Detailed development plan

## MSP Requirements Reference

The tool handles 20 MSP requirements across 3 categories:

| Category | Count | Examples |
|----------|-------|----------|
| Security | 9 | SECP-001, SECP-002, SEC-001, SEC-003, SEC-004 |
| Operations | 7 | OPS-003, OPS-004, OPS-005, OPSP-001 |
| Support | 4 | OPSP-002, OPSP-003, OPSP-005 |

Each requirement maps to:
- CIS Controls v8 (security framework)
- AWS services (Config, CloudTrail, Inspector, etc.)
- Evidence artifacts needed
- Estimated implementation effort

## Configuration

Projects using this tool need a `config.yaml`:

```yaml
project:
  name: "Project Name"
  docs_path: "../project/docs/msp"
  infra_path: "../project/cdk"

aws:
  profile: "default"
  region: "us-east-1"
  stage: "test"

output:
  evidence_path: "./evidence"
  playbooks_path: "./playbooks"
  dashboard_path: "./dashboard.html"
```

## Testing Strategy

- **Unit Tests**: Each assessor, collector, generator module
- **Integration Tests**: Mock AWS SDK responses
- **E2E Tests**: Run against fipco-infra project
- **Coverage Target**: >80%

## Code Style

- Use TypeScript strict mode
- Prefer async/await over callbacks
- Document public functions with JSDoc
- Keep functions focused and testable
- Use descriptive variable names
- Avoid any type unless truly necessary

## AWS Permissions

The tool requires read-only AWS access:
- Config (rules, resources, compliance)
- CloudTrail (trail configuration)
- Security Hub (findings)
- Inspector (vulnerabilities)
- IAM (users, roles, policies)
- Backup (vaults, plans, recovery points)
- CloudWatch (alarms, logs)
- RDS, EC2, S3 (resource details)

## Claude Skill Usage

Once complete, users invoke from their project:

```bash
# From a project directory (e.g., fipco-infra)
/msp-readiness assess          # Run assessment
/msp-readiness generate --all  # Generate missing docs
/msp-readiness dashboard       # Create dashboard
/msp-readiness run             # Full pipeline
```

## GitHub Project Management

This project uses GitHub Projects for issue tracking and workflow management.

**Project Board**: https://github.com/orgs/flexion/projects/53

### 🔧 Essential Tool: move-issue.sh

**CRITICAL**: This project has a helper script that MUST be used to manage issue status in the GitHub project.

```bash
./scripts/move-issue.sh <issue-number> <status>
```

**Status values**: `backlog`, `ready`, `in-progress`, `in-review`, `done`

**When to use**:
- ✅ Starting work on an issue → `in-progress`
- ✅ Creating a PR → `in-review`  
- ✅ After PR merged → `done`

**Example**:
```bash
# Start working on issue #5
./scripts/move-issue.sh 5 in-progress

# Complete and move to review
./scripts/move-issue.sh 5 in-review

# After merge
./scripts/move-issue.sh 5 done
```

This script is the **required way** to update issue status. Do not manually update issues in the GitHub UI.

### Issue Workflow

Every issue follows this workflow:

1. **Backlog** → New issues start here
2. **Ready** → Issue is prioritized and ready to work on (use `ready`)
3. **In Progress** → Actively being worked on (use `in-progress`)
4. **In Review** → Pull request created, awaiting review (use `in-review`)
5. **Done** → Reviewed and merged (use `done`)

### Working on Issues

**IMPORTANT**: Always use `./scripts/move-issue.sh` for project management.

#### Starting Work on an Issue

1. **Move issue to "In Progress"**:
   ```bash
   ./scripts/move-issue.sh <issue-number> in-progress
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/issue-<number>-short-description
   ```
   
   Examples:
   - `feature/issue-5-fix-build-process`
   - `feature/issue-2-complete-playbooks`
   - `feature/issue-7-fipco-integration`

3. **Work on the issue**:
   - Make commits with clear, descriptive messages
   - Reference the issue number in commits: `feat: add X (#5)`
   - Test your changes thoroughly

#### Completing Work on an Issue

1. **Build and test**:
   ```bash
   npm run build
   npm test
   npm run lint
   ```

2. **Commit final changes**:
   ```bash
   git add .
   git commit -m "feat: complete feature description (#<issue-number>)

   - Change 1
   - Change 2
   - Change 3

   Closes #<issue-number>

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

3. **Push branch and create pull request**:
   ```bash
   git push -u origin feature/issue-<number>-short-description
   
   gh pr create \
     --title "feat: short description (#<issue-number>)" \
     --body "$(cat <<'EOF'
   ## Summary
   Brief description of changes
   
   ## Changes
   - Change 1
   - Change 2
   - Change 3
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manually tested against fipco-infra
   
   ## Issue
   Closes #<issue-number>
   
   🤖 Generated with [Claude Code](https://claude.ai/claude-code)
   EOF
   )"
   ```

4. **Move issue to "In Review"**:
   ```bash
   ./scripts/move-issue.sh <issue-number> in-review
   ```

5. **After PR is reviewed and merged**, move to "Done":
   ```bash
   ./scripts/move-issue.sh <issue-number> done
   ```

### Helper Scripts

The `scripts/` directory contains automation tools:

- **move-issue.sh**: Move issues between project columns
  ```bash
  ./scripts/move-issue.sh <issue-number> <status>
  # Status: backlog, ready, in-progress, in-review, done
  ```

See `scripts/README.md` for more details.

### Branch Naming Convention

Use descriptive branch names that reference the issue:

- `feature/issue-N-description` - For new features
- `fix/issue-N-description` - For bug fixes
- `docs/issue-N-description` - For documentation updates
- `chore/issue-N-description` - For maintenance tasks

Always include the issue number for traceability.

## Development Guidelines

When developing:

1. **Always work on a feature branch** - Never commit directly to `main`
2. **One issue per branch** - Keep changes focused and reviewable
3. **Move issue status** using `./scripts/move-issue.sh`
4. **Create PRs for review** - Use `gh pr create`
5. **Reference issue numbers** in commits and PRs
6. Follow the phase plan in PROJECT_ROADMAP.md
7. Write tests for new functionality
8. Update types.ts for new data structures
9. Document public APIs with JSDoc
10. Test against fipco-infra after each iteration
11. Update README with new features

## Notes

- This tool is based on real MSP preparation work for Compliance Concierge (Flexion/FIPCO)
- Templates derive from proven playbooks in fipco-infra repository
- CIS Controls v8 mapping follows AWS Cloud Companion Guide
- MSP requirements from AWS MSP Self-Assessment Checklist (Feb 2026 - Aug 2026)
