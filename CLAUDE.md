# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

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

See [PLAN.md](PLAN.md) for the complete development roadmap broken into 6 phases:

1. **Phase 1**: Foundation ✅ (Complete)
2. **Phase 2**: Core Assessment Engine (45h)
3. **Phase 3**: Evidence Collection (19h)
4. **Phase 4**: Content Generation (31h)
5. **Phase 5**: Dashboard (18h)
6. **Phase 6**: Skill Integration (34h)

**Current Status**: Phase 1 complete, starting Phase 2

**Recommended approach**: Build iteratively
- Iteration 1: Basic doc assessment (MVP)
- Iteration 2: Add AWS analysis
- Iteration 3: Evidence collection
- Iteration 4: Doc generation
- Iteration 5: Dashboard
- Iteration 6: Polish

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

## Contributing

When developing:

1. Follow the phase plan in PLAN.md
2. Write tests for new functionality
3. Update types.ts for new data structures
4. Document public APIs with JSDoc
5. Test against fipco-infra after each iteration
6. Update README with new features

## Notes

- This tool is based on real MSP preparation work for Compliance Concierge (Flexion/FIPCO)
- Templates derive from proven playbooks in fipco-infra repository
- CIS Controls v8 mapping follows AWS Cloud Companion Guide
- MSP requirements from AWS MSP Self-Assessment Checklist (Feb 2026 - Aug 2026)
