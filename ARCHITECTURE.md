# Architecture

This document describes the architecture and design decisions behind the MSP Readiness automation tool.

## Overview

The MSP Readiness tool is a TypeScript-based CLI application that automates AWS MSP Program readiness preparation. It consists of four main phases:

1. **Assessment** - Scan documentation and AWS infrastructure to determine current compliance status
2. **Evidence Collection** - Gather compliance evidence from AWS services
3. **Content Generation** - Generate missing playbooks, runbooks, and documentation
4. **Dashboard** - Create an interactive HTML dashboard for visualization

## Module Structure

```
src/
├── cli.ts                    # CLI entry point (Commander.js)
├── types.ts                  # Core type definitions
├── util/
│   ├── logger.ts            # Structured logging and error handling
│   └── app-config.ts        # (referenced but moved to config/)
├── config/
│   └── loader.ts            # Configuration loading and validation
├── data/
│   └── msp-requirements.ts  # MSP Program requirements definitions
├── assessors/
│   ├── doc-scanner.ts       # Documentation scanning
│   ├── requirement-matcher.ts # Requirements matching logic
│   ├── aws-config-analyzer.ts # AWS Config analysis
│   ├── iam-evaluator.ts     # IAM configuration evaluation
│   ├── security-hub-checker.ts # Security Hub analysis
│   └── report-generator.ts  # Assessment report generation
├── collectors/
│   ├── cloudtrail-collector.ts # CloudTrail evidence
│   ├── config-collector.ts     # AWS Config evidence
│   ├── backup-collector.ts     # AWS Backup evidence
│   ├── inspector-collector.ts  # Inspector findings
│   └── manifest-generator.ts   # Evidence manifest
├── generators/
│   ├── template-engine.ts      # Handlebars template engine
│   ├── playbook-generator.ts   # Playbook/runbook generation
│   └── evidence-matrix.ts      # Evidence matrix generation
└── dashboard/
    ├── aggregator.ts           # Dashboard data aggregation
    ├── builder.ts              # HTML dashboard builder
    └── templates/
        └── dashboard.html      # Dashboard Handlebars template
```

## Data Flow

### Assessment Flow

```
1. Load config.yaml
   ↓
2. Scan documentation (doc-scanner)
   ├─ Find markdown files
   ├─ Extract requirement references
   └─ Categorize document types
   ↓
3. Analyze AWS infrastructure (optional)
   ├─ AWS Config (aws-config-analyzer)
   ├─ IAM (iam-evaluator)
   └─ Security Hub (security-hub-checker)
   ↓
4. Match requirements (requirement-matcher)
   ├─ Combine doc scan + AWS analysis
   ├─ Determine requirement status
   ├─ Calculate confidence scores
   └─ Identify gaps
   ↓
5. Generate assessment (report-generator)
   ├─ Create ProjectAssessment
   ├─ Identify critical gaps
   └─ Save markdown + JSON reports
```

### Evidence Collection Flow

```
1. Load config.yaml
   ↓
2. Collect from AWS services (parallel)
   ├─ CloudTrail status
   ├─ Config rules & compliance
   ├─ Backup vaults & plans
   └─ Inspector findings
   ↓
3. Save evidence artifacts
   ├─ JSON files in evidence/
   └─ Create EvidenceArtifact metadata
   ↓
4. Generate manifest (manifest-generator)
   ├─ Index all evidence files
   ├─ Link to requirements
   └─ Save MANIFEST.md
```

### Content Generation Flow

```
1. Load config.yaml
   ↓
2. Scan existing docs
   ↓
3. Identify missing content
   ├─ Compare against AVAILABLE_PLAYBOOKS
   └─ Compare against AVAILABLE_RUNBOOKS
   ↓
4. Generate missing content
   ├─ Load Handlebars template
   ├─ Inject TemplateContext
   ├─ Render markdown
   └─ Save to output directory
   ↓
5. Build evidence matrix
   ├─ Link requirements to evidence
   └─ Create markdown table
```

### Dashboard Flow

```
1. Load assessment JSON
   ↓
2. Aggregate data (aggregator)
   ├─ Calculate by-category stats
   ├─ Identify critical path
   ├─ Count evidence inventory
   └─ Project timeline
   ↓
3. Build dashboard (builder)
   ├─ Load dashboard.html template
   ├─ Prepare context data
   ├─ Render with Handlebars
   └─ Save HTML file
```

## Assessment Algorithm

The requirement matching algorithm determines compliance status based on multiple signals:

### Requirement Status Determination

For each MSP requirement:

1. **Check documentation coverage**
   - Strong references (requirement ID in heading/title)
   - Weak references (requirement ID in body)
   - Document types (playbook, runbook, evidence, assessment)
   - Word count of covering documents

2. **Check AWS evidence** (if available)
   - Config rule compliance
   - CloudTrail status
   - IAM configuration
   - Security Hub findings

3. **Calculate confidence score** (0-1)
   - Base score from documentation coverage
   - Bonus for playbooks (+0.2) and runbooks (+0.1)
   - Bonus for AWS evidence (+0.3)
   - Penalties for weak references only

4. **Determine status**
   - `addressed`: Strong documentation + high confidence (>0.7)
   - `partial`: Some documentation but gaps exist
   - `gap`: No documentation and missing AWS evidence
   - `not-applicable`: In skip list
   - `not-started`: No coverage and low priority

5. **Identify gaps**
   - Missing documentation types
   - Missing AWS Config rules
   - Missing evidence artifacts
   - Configuration issues

6. **Generate recommendations**
   - Specific actions to close gaps
   - Priority order based on effort
   - Links to templates or AWS services

### Confidence Scoring

```typescript
confidence = baseScore + documentBonus + awsBonus - penalties

where:
  baseScore = min(1.0, (strongReferences * 0.3 + weakReferences * 0.1))
  documentBonus = hasPlaybook ? 0.2 : 0
                 + hasRunbook ? 0.1 : 0
                 + hasEvidence ? 0.1 : 0
  awsBonus = hasAwsEvidence ? 0.3 : 0
  penalties = onlyWeakReferences ? -0.2 : 0
```

## AWS Integration Patterns

### Client Initialization

```typescript
// Do NOT pass profile/credentials - use AWS SDK default credential chain
const clientConfig = { region };
const client = new ServiceClient(clientConfig);
```

The tool relies on AWS SDK default credential chain:
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM role (if running on EC2/ECS/Lambda)

### Error Handling

All AWS SDK calls are wrapped with try/catch:

```typescript
try {
  const result = await client.send(command);
  // Process result
} catch (error) {
  const wrappedError = wrapAWSError(error, 'ServiceName');
  logger.error('Operation failed', wrappedError, { context });
  // Return degraded result or rethrow
}
```

The `wrapAWSError` utility provides actionable guidance based on error type.

### Permission Strategy

The tool requires only **read-only** AWS permissions:

- `config:Describe*`, `config:Get*`, `config:List*`
- `cloudtrail:Describe*`, `cloudtrail:Get*`, `cloudtrail:List*`
- `securityhub:Get*`, `securityhub:List*`, `securityhub:Describe*`
- `inspector2:Get*`, `inspector2:List*`
- `backup:Describe*`, `backup:List*`
- `iam:Get*`, `iam:List*`
- `s3:GetBucket*`

No write or modification permissions are required.

## Template Engine

### Handlebars Setup

Custom helpers:
- `{{date}}` - Current date in YYYY-MM-DD format
- `{{year}}` - Current year
- `{{uppercase str}}` - Convert to uppercase
- `{{lowercase str}}` - Convert to lowercase

### Template Context

All templates receive a `TemplateContext` with:

```typescript
interface TemplateContext {
  projectName: string;
  organization: string;
  region: string;
  stage: string;
  accountId?: string;
  slackChannel?: string;
  additionalContext?: Record<string, unknown>;
}
```

### Template Loading

Templates are loaded from `templates/playbooks/` and `templates/runbooks/`:

```
templates/
├── playbooks/
│   ├── incident-response.hbs
│   ├── change-management.hbs
│   ├── security-review.hbs
│   └── vulnerability-management.hbs
└── runbooks/
    ├── access-key-rotation.hbs
    ├── cloudtrail-investigation.hbs
    └── security-finding-remediation.hbs
```

## Dashboard Architecture

### Data Aggregation

The dashboard aggregates data from:
1. Assessment JSON (requirement statuses, gaps, effort)
2. Evidence directory (file count, last collected date)
3. Project configuration (name, stage, region)

### Dashboard Sections

1. **Summary Cards** - Overall completion, addressed, partial, gap counts
2. **Progress Bar** - Visual completion percentage
3. **Category Breakdown** - Security, Operations, Support stats
4. **Critical Gaps** - Top priority gaps with effort estimates
5. **All Requirements Table** - Sortable table with status badges
6. **Evidence Inventory** - Count of collected evidence files

### Responsive Design

The dashboard uses a mobile-first responsive design:
- CSS Grid for layout
- No external dependencies (all CSS inline)
- Print-friendly styles
- Accessible color contrast

## Error Handling Strategy

### Error Types

1. **ConfigError** - Configuration file issues
2. **MSPError** - Application errors with guidance
3. **AWS SDK errors** - Wrapped with `wrapAWSError`

### Error Codes

See `src/util/logger.ts` for full list:

- `CONFIG_NOT_FOUND` - Missing config.yaml
- `CONFIG_INVALID` - Invalid config syntax
- `AWS_ACCESS_DENIED` - AWS permission errors
- `AWS_SERVICE_ERROR` - AWS service errors
- `DOCS_PATH_INVALID` - Invalid documentation path
- `TEMPLATE_NOT_FOUND` - Missing template file
- `ASSESSMENT_NOT_FOUND` - Missing assessment JSON

Each error code has associated guidance for resolution.

### Logging Levels

- `DEBUG` - Detailed diagnostic information
- `INFO` - General informational messages
- `WARN` - Warning messages (non-fatal)
- `ERROR` - Error messages with stack traces

## Design Decisions

### Why TypeScript?

- Type safety for complex data structures
- Better IDE support and autocomplete
- Easier refactoring and maintenance
- Compile-time error detection

### Why Commander.js?

- De facto standard for Node.js CLIs
- Rich option parsing
- Automatic help generation
- Subcommand support

### Why Handlebars?

- Logic-less templates (separation of concerns)
- Custom helper support
- Widely used and well-documented
- Secure by default (auto-escaping)

### Why Inline CSS in Dashboard?

- No external dependencies to manage
- Single file for easy sharing
- No build step required
- Works offline

### Why JSON + Markdown Reports?

- **JSON** - Machine-readable for dashboard and automation
- **Markdown** - Human-readable for review and documentation
- Both generated from same `ProjectAssessment` data structure

## Extension Points

### Adding New Requirements

1. Edit `src/data/msp-requirements.ts`
2. Add new `MSPRequirement` object
3. Include `cisControls`, `awsServices`, `evidenceRequired`
4. Rebuild and test

### Adding New Templates

1. Create Handlebars template in `templates/playbooks/` or `templates/runbooks/`
2. Add to `AVAILABLE_PLAYBOOKS` or `AVAILABLE_RUNBOOKS` in `src/generators/playbook-generator.ts`
3. Map requirement IDs to template
4. Test generation

### Adding New Evidence Collectors

1. Create collector in `src/collectors/`
2. Follow pattern: `collect*Evidence()` + `save*Evidence()`
3. Add to `collect-evidence` command in `src/cli.ts`
4. Update MANIFEST generation

### Adding New AWS Analyzers

1. Create analyzer in `src/assessors/`
2. Follow pattern: `analyze*()` returns analysis interface with findings
3. Add to AWS analysis in `assess` command
4. Update `AWSAnalysisResults` type
5. Integrate findings into requirement matcher

## Testing Strategy

### Unit Tests

- **Assessors** - Mock DocScanResult and AWS responses
- **Collectors** - Mock AWS SDK clients
- **Generators** - Test template rendering with fixtures
- **Dashboard** - Test data aggregation logic

### Integration Tests

- Run full CLI commands with test fixtures
- Verify file outputs and formats
- Test error handling paths

### E2E Tests

- Test on actual project (fipco-infra)
- Verify all commands work end-to-end
- Validate generated artifacts

## Performance Considerations

### Parallel AWS Calls

AWS analyzers run in parallel using `Promise.all()`:

```typescript
const [configAnalysis, iamAnalysis, securityHubAnalysis] = await Promise.all([
  analyzeAWSConfig(region, profile),
  analyzeIAM(region, profile),
  analyzeSecurityHub(region, profile),
]);
```

### Lazy Loading

Templates are loaded only when needed, not at startup.

### Caching

Evidence collection saves snapshots to avoid repeated API calls. The manifest tracks collection timestamps.

## Security Considerations

### Credential Handling

- No credentials stored in code or config
- Uses AWS SDK default credential chain
- Supports AWS CLI profiles
- No credential logging

### Input Validation

- Config YAML validated with schema
- File paths resolved and checked for traversal
- Requirement IDs validated against known set

### Output Sanitization

- Handlebars auto-escapes HTML by default
- No eval() or dynamic code execution
- Safe file path construction

## Future Enhancements

Potential improvements for future versions:

1. **Remediation Automation** - Generate Terraform/CDK code to close gaps
2. **Continuous Monitoring** - Run periodically and track trends over time
3. **Team Collaboration** - Multi-user support with task assignment
4. **Integration Testing** - Actually deploy generated IaC and verify compliance
5. **Custom Requirements** - Support for organization-specific requirements beyond AWS MSP
6. **Diff Reports** - Compare assessments over time to show progress
7. **Notification System** - Slack/email alerts for critical gaps or compliance drift

## Glossary

- **Assessment** - Evaluation of current compliance status against MSP requirements
- **Confidence Score** - 0-1 score indicating certainty of requirement status
- **Critical Path** - Highest priority gaps blocking MSP approval
- **Evidence Artifact** - Snapshot or document proving compliance
- **Gap** - Requirement not addressed or partially addressed
- **Playbook** - Operational procedure document (incident response, change management)
- **Requirement** - Specific MSP Program requirement (e.g., SEC-001)
- **Runbook** - Step-by-step technical procedure (access key rotation, investigation)
- **Strong Reference** - Requirement ID mentioned in heading or title
- **Weak Reference** - Requirement ID mentioned in document body
