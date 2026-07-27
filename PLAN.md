# MSP Readiness Automation - Development Plan

**Project Goal**: Create a Claude Code skill that automates AWS MSP Program readiness preparation by analyzing projects, collecting evidence, generating documentation, and visualizing compliance status.

**Timeline**: 6 phases, approximately 80-100 hours total development effort

---

## Phase 1: Foundation ✅ COMPLETE

**Objective**: Set up project structure, types, and core data

**Deliverables**:
- [x] Repository structure and initialization
- [x] TypeScript configuration
- [x] Core type definitions (`types.ts`)
- [x] MSP requirements data model (`msp-requirements.ts`)
- [x] Configuration system (`config.yaml`)
- [x] Package dependencies
- [x] README documentation
- [x] Claude skill stub

**Time**: 6 hours

---

## Phase 2: Core Assessment Engine

**Objective**: Build the assessment engine that scans projects and maps to MSP requirements

### 2.1 Configuration Loader
**File**: `src/config/loader.ts`

**Tasks**:
- [ ] Load and validate config.yaml
- [ ] Apply defaults for missing values
- [ ] Validate AWS credentials
- [ ] Validate paths exist
- [ ] Export typed Config object

**Acceptance Criteria**:
- Loads config from file or throws clear error
- Validates all required fields
- Provides helpful error messages for invalid config

**Estimated Time**: 3 hours

---

### 2.2 Documentation Scanner
**File**: `src/assessors/doc-scanner.ts`

**Tasks**:
- [ ] Recursively scan docs directory for markdown files
- [ ] Parse markdown files (frontmatter + content)
- [ ] Extract MSP requirement references (SECP-001, OPS-003, etc.)
- [ ] Identify existing playbooks, runbooks, evidence
- [ ] Map found documents to requirements
- [ ] Calculate coverage confidence scores

**Key Functions**:
```typescript
interface DocScanResult {
  files: DocumentFile[];
  requirementMentions: Map<string, DocumentReference[]>;
  playbooksFound: string[];
  runbooksFound: string[];
  evidenceFound: string[];
}

async function scanDocumentation(docsPath: string): Promise<DocScanResult>
```

**Acceptance Criteria**:
- Finds all markdown files in directory tree
- Extracts requirement IDs from content (regex: `/[A-Z]+-\d+/g`)
- Identifies document types (playbook vs runbook vs evidence)
- Returns structured scan results

**Test Cases**:
- Empty directory → empty result
- Directory with fipco-infra MSP docs → finds all 20+ requirements
- Malformed markdown → graceful handling

**Estimated Time**: 8 hours

---

### 2.3 AWS Config Analyzer
**File**: `src/assessors/aws-config-analyzer.ts`

**Tasks**:
- [ ] Initialize AWS SDK clients (Config, CloudTrail, IAM, S3, RDS, etc.)
- [ ] Query Config for deployed resources
- [ ] Check Config rules and conformance packs
- [ ] Verify resource configurations (encryption, backups, etc.)
- [ ] Map AWS resources to MSP requirements
- [ ] Generate findings for each requirement

**Key Functions**:
```typescript
interface AWSConfigAnalysis {
  resourceInventory: ResourceInventory;
  configRules: ConfigRule[];
  complianceStatus: Map<string, ComplianceStatus>;
  findings: AssessmentFinding[];
}

async function analyzeAWSConfig(region: string): Promise<AWSConfigAnalysis>
```

**Requirements Mapping**:
| Requirement | AWS Check |
|-------------|-----------|
| SEC-003 | Config rules enabled, CloudTrail logging |
| SEC-004 | IAM policies, MFA enforcement |
| SEC-009 | KMS keys, RDS encryption, S3 encryption |
| OPS-004 | CloudTrail retention, CloudWatch Logs retention |
| OPS-005 | Backup vault, backup plans, recovery points |
| SECP-002 | Config rules for public resources |

**Acceptance Criteria**:
- Connects to AWS using configured profile
- Queries all relevant services
- Returns structured analysis with findings
- Handles missing permissions gracefully
- Supports multi-region analysis

**Test Cases**:
- Mock AWS responses for unit tests
- Real AWS account for integration tests
- No AWS credentials → clear error message

**Estimated Time**: 12 hours

---

### 2.4 IAM Policy Evaluator
**File**: `src/assessors/iam-evaluator.ts`

**Tasks**:
- [ ] List all IAM users, groups, roles
- [ ] Evaluate MFA enforcement
- [ ] Check for root account usage
- [ ] Analyze least-privilege policies
- [ ] Identify overly permissive policies
- [ ] Check access key age and rotation
- [ ] Map findings to SEC-004, SECP-001

**Key Functions**:
```typescript
interface IAMAnalysis {
  users: IAMUser[];
  roles: IAMRole[];
  mfaEnforced: boolean;
  rootAccountSecure: boolean;
  findings: AssessmentFinding[];
}

async function evaluateIAM(): Promise<IAMAnalysis>
```

**Acceptance Criteria**:
- Lists all IAM entities
- Checks MFA status for all users
- Identifies stale access keys (>90 days)
- Generates findings for SEC-004 compliance

**Estimated Time**: 6 hours

---

### 2.5 Security Hub Inspector
**File**: `src/assessors/security-hub-checker.ts`

**Tasks**:
- [ ] Query Security Hub for active findings
- [ ] Filter by severity (CRITICAL, HIGH)
- [ ] Group findings by requirement
- [ ] Check CIS AWS Foundations Benchmark compliance
- [ ] Map findings to MSP requirements

**Key Functions**:
```typescript
interface SecurityHubAnalysis {
  findings: SecurityFinding[];
  cisCompliance: CISComplianceStatus;
  requirementFindings: Map<string, SecurityFinding[]>;
}

async function analyzeSecurityHub(): Promise<SecurityHubAnalysis>
```

**Acceptance Criteria**:
- Retrieves current Security Hub findings
- Maps CIS controls to MSP requirements
- Generates assessment findings

**Estimated Time**: 4 hours

---

### 2.6 Requirement Matcher
**File**: `src/assessors/requirement-matcher.ts`

**Tasks**:
- [ ] Take doc scan results + AWS analysis results
- [ ] For each MSP requirement, determine status
- [ ] Calculate confidence score (0-1)
- [ ] Identify gaps and partial implementations
- [ ] Generate recommendations
- [ ] Estimate effort for gaps

**Status Determination Logic**:
```typescript
function determineStatus(req: MSPRequirement, findings: AssessmentFinding[]): RequirementStatus {
  // If documentation + AWS evidence both present → 'addressed'
  // If documentation present but AWS incomplete → 'partial'
  // If no documentation or AWS evidence → 'gap'
  // If in skip list → 'not-applicable'
}
```

**Key Functions**:
```typescript
function matchRequirements(
  docScan: DocScanResult,
  awsAnalysis: AWSConfigAnalysis,
  iamAnalysis: IAMAnalysis,
  securityHub: SecurityHubAnalysis
): RequirementAssessment[]
```

**Acceptance Criteria**:
- Correctly classifies all requirements
- Confidence scores reflect evidence quality
- Gaps have actionable recommendations
- Effort estimates are realistic

**Estimated Time**: 8 hours

---

### 2.7 Assessment Report Generator
**File**: `src/assessors/report-generator.ts`

**Tasks**:
- [ ] Format assessment results as markdown
- [ ] Create summary statistics
- [ ] List requirements by status
- [ ] Detail findings for each requirement
- [ ] Include recommendations and effort estimates
- [ ] Export as markdown and/or JSON

**Output Format**:
```markdown
# MSP Readiness Assessment Report

**Project**: Compliance Concierge
**Date**: 2026-07-27
**Overall Completion**: 67% (20/30)

## Summary
- ✅ Addressed: 8 requirements
- ⚠️ Partial: 7 requirements
- ❌ Gap: 4 requirements
- ⬜ N/A: 11 requirements

## Critical Gaps
...

## Requirements Detail
...
```

**Acceptance Criteria**:
- Generates readable markdown report
- Exports structured JSON for dashboard
- Saves to configured output path

**Estimated Time**: 4 hours

---

**Phase 2 Total Time**: 45 hours

---

## Phase 3: Evidence Collection

**Objective**: Automate collection of compliance evidence from AWS services

### 3.1 CloudTrail Evidence Collector
**File**: `src/collectors/cloudtrail-collector.ts`

**Tasks**:
- [ ] Query CloudTrail trail configuration
- [ ] Verify log file validation enabled
- [ ] Check S3 bucket encryption
- [ ] Verify log retention (90 days minimum)
- [ ] Export configuration snapshot as evidence
- [ ] Map to OPS-004 requirement

**Output**: `evidence/cloudtrail-status.json`

**Estimated Time**: 3 hours

---

### 3.2 Config Rules Collector
**File**: `src/collectors/config-collector.ts`

**Tasks**:
- [ ] List all Config rules
- [ ] Query compliance status for each rule
- [ ] Export resource inventory
- [ ] Capture conformance pack results
- [ ] Export as evidence artifact
- [ ] Map to SEC-003, SECP-002

**Output**: `evidence/config-snapshot.json`

**Estimated Time**: 4 hours

---

### 3.3 Backup Verification Collector
**File**: `src/collectors/backup-collector.ts`

**Tasks**:
- [ ] List backup vaults and plans
- [ ] Query recovery points (last 7 days)
- [ ] Verify backup frequency matches policy
- [ ] Check backup retention settings
- [ ] Export backup status as evidence
- [ ] Map to OPS-005, OPS-011

**Output**: `evidence/backup-status.json`

**Estimated Time**: 4 hours

---

### 3.4 Inspector Findings Collector
**File**: `src/collectors/inspector-collector.ts`

**Tasks**:
- [ ] Query Inspector for active findings
- [ ] Group by severity
- [ ] Export vulnerability summary
- [ ] Include SBOM if available
- [ ] Map to SEC-007, SEC-008

**Output**: `evidence/inspector-findings.json`

**Estimated Time**: 3 hours

---

### 3.5 IAM Summary Collector
**File**: `src/collectors/iam-collector.ts`

**Tasks**:
- [ ] Export IAM user/role summary
- [ ] Document MFA enforcement status
- [ ] List access keys and ages
- [ ] Export credential report
- [ ] Map to SEC-004, SECP-001

**Output**: `evidence/iam-summary.json`

**Estimated Time**: 3 hours

---

### 3.6 Evidence Manifest Generator
**File**: `src/collectors/manifest-generator.ts`

**Tasks**:
- [ ] Create index of all evidence files
- [ ] Link evidence to requirements
- [ ] Generate markdown evidence matrix
- [ ] Include collection timestamps
- [ ] Mark expiration dates for time-sensitive evidence

**Output**: `evidence/MANIFEST.md`

**Estimated Time**: 2 hours

---

**Phase 3 Total Time**: 19 hours

---

## Phase 4: Content Generation

**Objective**: Generate playbooks, runbooks, and documentation using templates

### 4.1 Template System
**File**: `src/generators/template-engine.ts`

**Tasks**:
- [ ] Set up Handlebars rendering
- [ ] Load templates from templates/ directory
- [ ] Support custom template paths
- [ ] Inject variables from config
- [ ] Support partials (reusable sections)
- [ ] Validate rendered output

**Key Functions**:
```typescript
function renderTemplate(
  templatePath: string,
  context: Record<string, unknown>
): string
```

**Estimated Time**: 4 hours

---

### 4.2 Playbook Templates
**Directory**: `templates/playbooks/`

**Tasks**:
- [ ] Create Incident Response playbook template
- [ ] Create Deployment Support playbook template
- [ ] Create Change Management playbook template
- [ ] Create Disaster Recovery playbook template
- [ ] Create Vulnerability Management playbook template
- [ ] Create Access Management playbook template

**Template Variables**:
- `projectName`
- `organization`
- `supportEmail`, `supportSlack`
- `slaCritical`, `slaHigh`
- `awsResources` (ECS services, RDS instances, etc.)
- `evidenceReferences`

**Estimated Time**: 8 hours

---

### 4.3 Runbook Templates
**Directory**: `templates/runbooks/`

**Tasks**:
- [ ] Create runbook templates for common procedures:
  - Access Key Rotation
  - Public Resource Remediation
  - Emergency Patch Deployment
  - Backup Verification
  - Database Recovery
  - Access Grant/Revoke

**Estimated Time**: 6 hours

---

### 4.4 Playbook Generator
**File**: `src/generators/playbook-generator.ts`

**Tasks**:
- [ ] Identify missing playbooks from assessment
- [ ] Load appropriate templates
- [ ] Inject project-specific context
- [ ] Inject AWS resource details
- [ ] Inject evidence references
- [ ] Render and save markdown files
- [ ] Track generated files

**Key Functions**:
```typescript
async function generatePlaybook(
  requirementId: string,
  context: GenerationContext
): Promise<GeneratedPlaybook>
```

**Acceptance Criteria**:
- Generates valid markdown
- Includes real AWS resource names/ARNs
- References exist in evidence files
- Ready for review (not placeholder-filled)

**Estimated Time**: 6 hours

---

### 4.5 Evidence Matrix Builder
**File**: `src/generators/evidence-matrix.ts`

**Tasks**:
- [ ] Create evidence matrix template
- [ ] Populate with collected evidence
- [ ] Link requirements to evidence artifacts
- [ ] Include collection timestamps
- [ ] Mark gaps with "TODO" placeholders
- [ ] Generate markdown table

**Output**: `evidence-matrix.md`

**Estimated Time**: 3 hours

---

### 4.6 Self-Assessment Filler
**File**: `src/generators/self-assessment.ts`

**Tasks**:
- [ ] Load MSP self-assessment checklist template
- [ ] Auto-fill "Yes" for addressed requirements
- [ ] Auto-fill "Partial" with notes for partial requirements
- [ ] Auto-fill "No" for gaps
- [ ] Add evidence references
- [ ] Generate markdown checklist

**Output**: `self-assessment.md`

**Estimated Time**: 4 hours

---

**Phase 4 Total Time**: 31 hours

---

## Phase 5: Dashboard

**Objective**: Create interactive HTML dashboard for compliance visualization

### 5.1 Dashboard Data Aggregator
**File**: `src/dashboard/aggregator.ts`

**Tasks**:
- [ ] Load assessment results
- [ ] Load evidence inventory
- [ ] Calculate statistics by category
- [ ] Identify critical path (blocking requirements)
- [ ] Generate timeline projection
- [ ] Create dashboard data structure

**Output**: `DashboardData` object

**Estimated Time**: 4 hours

---

### 5.2 Dashboard HTML Template
**File**: `src/dashboard/templates/dashboard.html`

**Tasks**:
- [ ] Design clean, readable layout
- [ ] Create summary cards (overall %, by category)
- [ ] Build requirement list with status badges
- [ ] Create critical gaps section
- [ ] Add evidence inventory section
- [ ] Include next actions list
- [ ] Add timeline visualization
- [ ] Make it printable

**Styling**:
- Clean, professional design
- Color-coded status (green/yellow/red/gray)
- Responsive layout
- No external dependencies (inline CSS/JS)

**Estimated Time**: 8 hours

---

### 5.3 Dashboard Builder
**File**: `src/dashboard/builder.ts`

**Tasks**:
- [ ] Render HTML template with data
- [ ] Inject statistics and charts
- [ ] Add interactivity (filtering, sorting)
- [ ] Include last-updated timestamp
- [ ] Save HTML file
- [ ] Optionally open in browser

**Key Functions**:
```typescript
async function buildDashboard(
  assessment: ProjectAssessment,
  evidenceInventory: EvidenceArtifact[],
  outputPath: string
): Promise<void>
```

**Acceptance Criteria**:
- Generates valid HTML
- Opens in any modern browser
- All data displayed correctly
- Interactive features work

**Estimated Time**: 6 hours

---

**Phase 5 Total Time**: 18 hours

---

## Phase 6: Claude Skill Integration

**Objective**: Wire everything together into a Claude Code skill

### 6.1 CLI Entry Point
**File**: `src/cli.ts`

**Tasks**:
- [ ] Set up Commander.js for CLI
- [ ] Implement `assess` command
- [ ] Implement `collect-evidence` command
- [ ] Implement `generate` command
- [ ] Implement `dashboard` command
- [ ] Implement `run` command (full pipeline)
- [ ] Implement `status` command
- [ ] Add progress indicators (ora)
- [ ] Add colored output (chalk)

**Commands**:
```bash
msp-readiness assess
msp-readiness collect-evidence
msp-readiness generate [--all] [requirement-ids...]
msp-readiness dashboard
msp-readiness run [--stage test]
msp-readiness status
```

**Estimated Time**: 6 hours

---

### 6.2 Skill Orchestration
**File**: `src/skill-orchestrator.ts`

**Tasks**:
- [ ] Implement skill entry point
- [ ] Parse skill invocation args
- [ ] Load configuration
- [ ] Execute requested command
- [ ] Format output for Claude
- [ ] Handle errors gracefully
- [ ] Return structured results

**Skill Flow**:
1. Parse `/msp-readiness <command> [args]`
2. Load config
3. Execute command
4. Return human-readable summary
5. Include paths to generated files

**Estimated Time**: 4 hours

---

### 6.3 Error Handling & Logging
**File**: `src/utils/error-handler.ts`, `src/utils/logger.ts`

**Tasks**:
- [ ] Create custom error types
- [ ] Add helpful error messages
- [ ] Implement logging (debug, info, warn, error)
- [ ] Log to file for debugging
- [ ] Graceful degradation (missing AWS permissions, etc.)

**Estimated Time**: 3 hours

---

### 6.4 Testing
**Directory**: `tests/`

**Tasks**:
- [ ] Unit tests for assessors
- [ ] Unit tests for generators
- [ ] Integration test with mock AWS
- [ ] Integration test with fipco-infra project
- [ ] End-to-end test of full pipeline
- [ ] Test error cases

**Coverage Target**: >80%

**Estimated Time**: 12 hours

---

### 6.5 Documentation
**Files**: `docs/`

**Tasks**:
- [ ] Write ARCHITECTURE.md (design decisions)
- [ ] Write DEVELOPMENT.md (dev setup, contribution guide)
- [ ] Write SKILL-USAGE.md (detailed skill usage examples)
- [ ] Add JSDoc comments to all public functions
- [ ] Create example outputs in examples/
- [ ] Update README with final status

**Estimated Time**: 6 hours

---

### 6.6 Polish & Release
**Tasks**:
- [ ] Create initial Git commit
- [ ] Tag v0.1.0 release
- [ ] Test on fipco-infra project
- [ ] Iterate based on real usage
- [ ] Create GitHub releases

**Estimated Time**: 3 hours

---

**Phase 6 Total Time**: 34 hours

---

## Summary

| Phase | Description | Time | Status |
|-------|-------------|------|--------|
| 1 | Foundation | 6h | ✅ Complete |
| 2 | Core Assessment | 45h | 🔲 Not Started |
| 3 | Evidence Collection | 19h | 🔲 Not Started |
| 4 | Content Generation | 31h | 🔲 Not Started |
| 5 | Dashboard | 18h | 🔲 Not Started |
| 6 | Skill Integration | 34h | 🔲 Not Started |
| **Total** | | **153h** | **4% Complete** |

---

## Recommended Iteration Order

Given the scope, here's a pragmatic build order that delivers value incrementally:

### Iteration 1: Basic Assessment (MVP)
**Goal**: Get a working assessment that scans docs and generates a report

**Tasks**:
- Phase 2.1: Config Loader
- Phase 2.2: Documentation Scanner
- Phase 2.6: Requirement Matcher (docs only, no AWS)
- Phase 2.7: Assessment Report Generator

**Time**: 23 hours
**Output**: Basic assessment of documentation coverage

---

### Iteration 2: AWS Analysis
**Goal**: Add AWS infrastructure analysis

**Tasks**:
- Phase 2.3: AWS Config Analyzer
- Phase 2.4: IAM Policy Evaluator
- Phase 2.5: Security Hub Inspector
- Update Phase 2.6: Include AWS findings

**Time**: 22 hours
**Output**: Full assessment including AWS state

---

### Iteration 3: Evidence Collection
**Goal**: Automate evidence gathering

**Tasks**:
- All of Phase 3

**Time**: 19 hours
**Output**: Automated evidence collection

---

### Iteration 4: Documentation Generation
**Goal**: Auto-generate missing docs

**Tasks**:
- All of Phase 4

**Time**: 31 hours
**Output**: Automated playbook/runbook generation

---

### Iteration 5: Dashboard
**Goal**: Visual compliance tracking

**Tasks**:
- All of Phase 5

**Time**: 18 hours
**Output**: Interactive HTML dashboard

---

### Iteration 6: Skill Polish
**Goal**: Production-ready Claude skill

**Tasks**:
- All of Phase 6

**Time**: 34 hours
**Output**: Complete, tested, documented skill

---

## Next Steps

1. **Start with Iteration 1** (basic assessment)
2. **Test on fipco-infra** after each iteration
3. **Iterate based on feedback** from real usage
4. **Add features incrementally** as needed

To begin development:

```bash
cd ~/repos/flexion-msp-readiness
npm install
npm run build
npm test
```

Then start with Phase 2.1 (Config Loader).
