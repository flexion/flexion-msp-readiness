# Changelog

All notable changes to the MSP Readiness automation tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - 2026-08-04

**Workspace Model (Issue #37)**
- Self-assessment mode with `--self` flag to assess workspace completeness
- Frontmatter metadata in generated documents (status, generated timestamp, template version)
- Overwrite protection to prevent destroying user customizations
- Document lifecycle tracking: draft → in-progress → approved → complete
- Workspace assessor that checks playbook + evidence + approval status
- Workspace report generator (markdown + JSON formats)
- Workspace dashboard with progress visualization
- `--force` and `--dry-run` flags for generate command
- Completion percentage now correctly calculated (requirements fully complete / total)

**Reporting Improvements (Issue #9)**
- JSON export format for all assessment reports
- Markdown report format with detailed requirement breakdowns
- Assessment comparison with `diff` command to track compliance changes
- Historical tracking to compare baseline vs current assessments
- Drift detection to identify compliance regressions
- CI/CD integration support (exit code 1 on compliance drops)

### Fixed

- Completion percentage calculation (was showing average of percentages, now shows actual complete/total)
- Assessment reports now show correct completion for workspace mode
- Evidence collection properly linked to requirements

### Changed

- Assessment mode now defaults to workspace self-assessment
- Generated playbooks include frontmatter metadata by default
- Reports distinguish between external project assessment and workspace assessment

## [1.0.0] - 2026-07-27

### Added

**Phase 1: Foundation**
- Core TypeScript project setup with strict mode
- Type definitions for MSP requirements, assessments, and evidence
- MSP Program requirements database (20 requirements across Security, Operations, Support)
- CIS Controls v8 mapping for all requirements
- Configuration loader with YAML support
- Jest testing framework
- ESLint for code quality

**Phase 2: Core Assessment Engine**
- Documentation scanner for Markdown files
- Requirement reference extraction with regex pattern matching
- Document type categorization (playbook, runbook, evidence, assessment)
- AWS Config analyzer with Config rules and conformance packs
- IAM evaluator for access controls and MFA status
- Security Hub checker for vulnerability findings
- Requirement matcher with confidence scoring algorithm
- Assessment report generator (Markdown + JSON output)
- Critical gaps identification
- CLI `assess` command with progress indicators

**Phase 3: Evidence Collection**
- CloudTrail evidence collector with S3 bucket analysis
- AWS Config rules evidence collector
- AWS Backup evidence collector (vaults, plans, recovery points)
- AWS Inspector evidence collector (vulnerability findings)
- Evidence manifest generator
- Artifact metadata tracking
- CLI `collect-evidence` command
- Evidence linking to requirements

**Phase 4: Content Generation**
- Handlebars template engine with custom helpers
- Professional playbook templates:
  - Incident Response
  - Change Management
  - Security Review Checklist
  - Vulnerability & Patch Management
- Runbook templates:
  - Access Key Rotation
  - CloudTrail Investigation
  - Security Finding Remediation
- Evidence matrix generator
- Template variable injection with project details
- Missing content identification
- CLI `generate` command with filtering options

**Phase 5: Dashboard**
- Dashboard data aggregator
- Interactive HTML dashboard with responsive design
- Summary cards for overall completion
- Category breakdown (Security, Operations, Support)
- Critical gaps visualization
- All requirements table with status badges
- Evidence inventory display
- Timeline projection (6-week view)
- No external dependencies (inline CSS)
- Print-friendly styles
- CLI `dashboard` command

**Phase 6: Skill Integration & Polish**
- Claude Code skill definition (`.claude/skills/msp-readiness.md`)
- Structured logging utility with log levels
- Enhanced error handling with actionable guidance
- MSPError class with error codes
- AWS error wrapping with guidance
- Unit tests for assessors (doc-scanner, requirement-matcher)
- Comprehensive documentation:
  - ARCHITECTURE.md - System design and data flow
  - DEVELOPMENT.md - Development guide and contribution guidelines
  - SKILL-USAGE.md - User guide with workflows and troubleshooting
- CLI `status` command for quick summary

### Features

- **Automated Assessment**: Scan documentation and AWS infrastructure to determine MSP readiness
- **Evidence Collection**: Gather compliance evidence from 5 AWS services automatically
- **Content Generation**: Generate missing playbooks and runbooks from proven templates
- **Interactive Dashboard**: Visualize compliance status with sortable requirements table
- **Confidence Scoring**: 0-1 confidence scores based on documentation and AWS evidence
- **Critical Path**: Prioritized gaps sorted by effort and priority
- **Multi-Format Reports**: Both Markdown (human-readable) and JSON (machine-readable)
- **AWS Integration**: Analyze Config, CloudTrail, IAM, Security Hub, Inspector, Backup
- **Flexible Configuration**: YAML-based configuration with environment-specific settings
- **Skip Requirements**: Option to skip non-applicable requirements
- **Parallel AWS Calls**: Efficient parallel analysis of multiple AWS services
- **Error Recovery**: Graceful degradation when AWS services are unavailable
- **No AWS Required**: Can assess documentation only with `--skip-aws` flag

### CLI Commands

- `msp-readiness assess` - Full assessment with optional AWS analysis
- `msp-readiness collect-evidence` - Collect evidence from AWS services
- `msp-readiness generate` - Generate missing playbooks and runbooks
- `msp-readiness dashboard` - Build interactive HTML dashboard
- `msp-readiness status` - Show current configuration and readiness stage

### Technical Details

- **Language**: TypeScript 5.x with strict mode
- **Runtime**: Node.js 18+
- **AWS SDK**: AWS SDK for JavaScript v3 (modular clients)
- **CLI Framework**: Commander.js
- **Template Engine**: Handlebars
- **Testing**: Jest
- **Linting**: ESLint

### Documentation

- README.md - Project overview and quick start
- ARCHITECTURE.md - System architecture and design decisions
- DEVELOPMENT.md - Development guide and contribution guidelines
- SKILL-USAGE.md - User guide with workflows and troubleshooting
- config.example.yaml - Configuration template

### Requirements Coverage

Supports all 20 AWS MSP Program requirements:

**Security (8 requirements)**
- SEC-001: Incident Response Plan
- SEC-002: Security Event Monitoring
- SEC-003: Data Encryption
- SEC-004: Audit Logging (CloudTrail)
- SEC-005: Vulnerability Management
- SEC-006: Access Control
- SEC-007: Security Standards Compliance
- SEC-008: Security Finding Remediation

**Security Plus (2 requirements)**
- SECP-001: IAM Access Key Exposure
- SECP-002: Public Resource Detection

**Operations (7 requirements)**
- OPS-001: Change Management
- OPS-002: Backup and Recovery
- OPS-003: Monitoring and Alerting
- OPS-004: Capacity Management
- OPS-005: Deployment Automation
- OPS-006: Change Management Playbook
- OPS-007: Performance Optimization
- OPS-008: Patch Management

**Operations Plus (1 requirement)**
- OPSP-005: Disaster Recovery Plan

**Support (2 requirements)**
- SUP-001: 24/7 Support Coverage
- SUP-002: Ticketing System
- SUP-003: Customer Communication

### Known Limitations

- AWS Config rules detection is heuristic-based (may need manual verification)
- IAM analysis requires GetAccountSummary permission
- Security Hub must be enabled in the region
- Inspector v2 required for vulnerability scanning
- Dashboard requires assessment JSON to be pre-generated
- Evidence collection requires appropriate IAM permissions

### Acknowledgments

Built for Flexion MSP Program preparation, tested on fipco-infra project.

## [Unreleased]

### Planned Features

- Remediation code generation (Terraform/CDK)
- Continuous monitoring with drift detection
- Multi-account/multi-region support
- Custom requirement definitions
- Integration with Slack/Teams for notifications
- PDF report export
- Diff reports (compare assessments over time)

---

For upgrade instructions and breaking changes, see README.md.
