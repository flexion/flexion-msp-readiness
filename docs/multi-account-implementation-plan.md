# Multi-Account Support Implementation Plan

**Issue**: #10 - Multi-Account Support for Aggregated Compliance  
**Estimated Effort**: 28 hours  
**Priority**: Phase 3 (Advanced Features)

## Overview

Enable the MSP readiness tool to assess multiple AWS accounts (dev, staging, prod) and provide aggregated compliance views with cross-account gap analysis.

## User Story

As an MSP readiness assessor, I want to assess multiple AWS accounts simultaneously so that I can:
- See overall compliance across all environments
- Identify gaps that exist in multiple accounts
- Prioritize fixes that impact multiple environments
- Generate consolidated reports for stakeholders

## Requirements

### Functional Requirements

1. **Multi-Account Configuration**
   - Support configuring multiple AWS accounts with names, profiles, and regions
   - Maintain backward compatibility with single-account configs
   - Support cross-account IAM roles (AssumeRole)

2. **Per-Account Assessment**
   - Run full MSP assessment for each configured account
   - Collect evidence from each account independently
   - Handle account-specific failures gracefully

3. **Aggregated Results**
   - Combine results across accounts using worst-case logic
   - Calculate per-account compliance percentages
   - Generate overall compliance score

4. **Cross-Account Gap Analysis**
   - Identify requirements that are gaps in 2+ accounts
   - Prioritize cross-account gaps for centralized solutions
   - Show affected account list for each gap

5. **Reporting**
   - Generate per-account assessment reports
   - Generate aggregated multi-account report
   - Generate account comparison report (side-by-side)

6. **Dashboard**
   - Display per-account compliance metrics
   - Show cross-account gaps prominently
   - Add account filter/selector
   - Enable account comparison view

## Architecture

### Type Definitions

```typescript
// Multi-account types in src/types.ts

export interface AWSAccountConfig {
  name: string;              // "Production", "Staging", etc.
  profile: string;           // AWS profile name
  region: string;            // Primary region
  role_arn?: string;         // Optional cross-account role
  external_id?: string;      // Optional external ID
}

export interface ProjectAssessment {
  // ... existing fields ...
  accountName?: string;      // For multi-account assessments
}

export interface MultiAccountAssessment {
  projectName: string;
  assessmentDate: Date;
  version: string;
  accounts: ProjectAssessment[];
  aggregatedStatus: {
    addressed: number;
    partial: number;
    gap: number;
    notApplicable: number;
    notStarted: number;
  };
  crossAccountGaps: CrossAccountGap[];
  complianceByAccount: AccountComplianceSummary[];
  summary: string;
}

export interface CrossAccountGap {
  requirement: MSPRequirement;
  affectedAccounts: string[];
  totalAccounts: number;
  worstStatus: RequirementStatus;
  recommendations: string[];
}

export interface AccountComplianceSummary {
  accountName: string;
  compliancePercentage: number;
  addressed: number;
  partial: number;
  gap: number;
  notApplicable: number;
  criticalGapsCount: number;
  estimatedEffort: number;
}
```

### Configuration Schema

```yaml
aws:
  # SINGLE ACCOUNT MODE (legacy - still supported)
  # profile: "default"
  # region: "us-east-1"
  # stage: "test"

  # MULTI-ACCOUNT MODE
  accounts:
    - name: "Production"
      profile: "fipco-prod"
      region: "us-east-1"
      # Optional: cross-account role
      # role_arn: "arn:aws:iam::123456789012:role/MSPAssessorRole"
      # external_id: "unique-external-id"

    - name: "Staging"
      profile: "fipco-staging"
      region: "us-east-1"

    - name: "Development"
      profile: "fipco-dev"
      region: "us-east-1"
```

### Module Structure

```
src/
├── types.ts                                  [UPDATE] Add multi-account types
├── config/
│   └── loader.ts                             [UPDATE] Support multi-account config
├── collectors/
│   └── multi-account-collector.ts            [NEW] Orchestrate multi-account collection
├── assessors/
│   └── multi-account-assessor.ts             [NEW] Multi-account assessment logic
├── dashboard/
│   ├── aggregator.ts                         [UPDATE] Handle multi-account data
│   └── builder.ts                            [UPDATE] Multi-account dashboard
└── cli.ts                                    [UPDATE] Multi-account commands
```

### Evidence Storage Structure

```
evidence/
├── Production/
│   ├── cloudtrail-status.json
│   ├── config-snapshot.json
│   ├── backup-status.json
│   ├── inspector-findings.json
│   └── MANIFEST.md
├── Staging/
│   ├── cloudtrail-status.json
│   └── ...
└── Development/
    └── ...
```

### Report Output Structure

```
assessment-report-Production.json
assessment-report-Production.md
assessment-report-Staging.json
assessment-report-Staging.md
assessment-report-Development.json
assessment-report-Development.md
assessment-report-multi-account.json      # Aggregated results
assessment-report-comparison.md           # Side-by-side comparison
```

## Implementation Phases

### Phase 1: Core Infrastructure (8 hours)

**Tasks:**
1. Update `src/types.ts` with multi-account interfaces (1h)
2. Update `src/config/loader.ts` for multi-account config (2h)
   - Validate both single and multi-account modes
   - Add `isMultiAccountMode()` helper
   - Add `getAccounts()` normalizer
3. Create `src/collectors/multi-account-collector.ts` (3h)
   - `collectAccountEvidence()` - per-account collection
   - `collectMultiAccountEvidence()` - orchestration
   - Sequential execution to avoid rate limits
4. Create `src/assessors/multi-account-assessor.ts` (2h)
   - `assessAccount()` - per-account assessment
   - Stub aggregation functions

**Deliverable:** Multi-account config loading and per-account collection working

### Phase 2: Aggregation Logic (6 hours)

**Tasks:**
1. Implement `aggregateMultiAccountAssessments()` (3h)
   - Worst-case aggregation logic
   - Per-requirement status mapping
2. Implement `identifyCrossAccountGaps()` (2h)
   - Find gaps in 2+ accounts
   - Sort by impact (affected accounts × priority)
3. Implement `buildAccountComplianceSummary()` (1h)
   - Calculate per-account compliance %
   - Critical gaps count

**Deliverable:** Multi-account aggregation working with cross-account gap analysis

### Phase 3: CLI Integration (4 hours)

**Tasks:**
1. Update `assess` command for multi-account mode (2h)
   - Detect multi-account config
   - Run per-account assessments
   - Generate all reports
2. Update `collect-evidence` command (1h)
   - Multi-account evidence collection
   - Per-account manifests
3. Add progress indicators for multi-account operations (1h)

**Deliverable:** CLI commands working in multi-account mode

### Phase 4: Reporting (4 hours)

**Tasks:**
1. Implement `generateAccountComparisonReport()` (2h)
   - Markdown table with per-account metrics
   - Cross-account gaps section
2. Update report generator for multi-account (1h)
   - Save per-account reports
   - Save aggregated report
3. Update evidence manifest for multi-account (1h)

**Deliverable:** Complete multi-account reporting

### Phase 5: Dashboard (4 hours)

**Tasks:**
1. Update `src/dashboard/aggregator.ts` (1h)
   - Handle `MultiAccountAssessment` type
   - Aggregate evidence across accounts
2. Update `src/dashboard/builder.ts` (2h)
   - Display per-account compliance table
   - Show cross-account gaps prominently
   - Add account selector/filter
3. Style improvements (1h)
   - Account comparison view
   - Visual account indicators

**Deliverable:** Interactive multi-account dashboard

### Phase 6: Testing & Documentation (2 hours)

**Tasks:**
1. Unit tests for multi-account modules (1h)
2. Update README with multi-account examples (30min)
3. Add multi-account workflow guide (30min)

**Deliverable:** Tested and documented multi-account support

## Design Decisions

### 1. Aggregation Logic: Worst Case

**Decision:** Use worst-case aggregation (if any account has a gap, it's a gap overall)

**Rationale:**
- Conservative approach ensures no gaps are hidden
- Makes sense for compliance (you're only as strong as your weakest link)
- Clear semantics for stakeholders

**Alternatives Considered:**
- Average: Could hide serious gaps in some accounts
- Best case: Not useful for compliance
- Custom per-requirement: Too complex

### 2. Sequential vs Parallel Collection

**Decision:** Sequential collection by default

**Rationale:**
- Avoids AWS rate limits (most common failure mode)
- Simpler error handling and debugging
- Good performance for 3-5 accounts (typical use case)
- Can add parallel option later if needed

**Future Enhancement:**
- Add `--parallel` flag with rate limiting for 10+ accounts

### 3. Evidence Storage: Per-Account Subdirectories

**Decision:** Store evidence in account-specific subdirectories

**Rationale:**
- Clear organization
- Easy to find account-specific evidence
- Supports per-account manifests
- No naming conflicts

**Alternative:** Flat structure with prefixes (rejected - harder to navigate)

### 4. Report Output: Multiple Files

**Decision:** Generate separate report for each account plus aggregated reports

**Rationale:**
- Each account team can focus on their report
- Aggregated report for overall view
- Comparison report for side-by-side analysis
- Flexible for different audiences

## Configuration Migration

### Existing Single-Account Config (Still Works)

```yaml
aws:
  profile: "default"
  region: "us-east-1"
  stage: "test"
```

### New Multi-Account Config

```yaml
aws:
  accounts:
    - name: "Production"
      profile: "fipco-prod"
      region: "us-east-1"
    - name: "Staging"
      profile: "fipco-staging"
      region: "us-east-1"
```

**Migration:** No breaking changes. Single-account configs continue to work. Multi-account is opt-in.

## CLI Usage Examples

### Single Account (Existing Behavior)

```bash
npm run dev -- assess
# Output: Single account assessment as before
```

### Multi-Account

```bash
npm run dev -- assess
# Detects multi-account config automatically
# Output:
# Running assessment for 3 accounts...
# ✅ Production assessed
# ✅ Staging assessed
# ✅ Development assessed
# 
# Aggregating results...
# 
# Multi-Account Assessment Summary:
# 
# Compliance by Account:
# ✅ Production: 85% (17/20 addressed, 2 critical gaps)
# ⚠️  Staging: 70% (14/20 addressed, 4 critical gaps)
# ⚠️  Development: 65% (13/20 addressed, 5 critical gaps)
# 
# Aggregated Status:
#   ✅ Addressed:      12 requirements
#   ⚠️  Partial:        5 requirements
#   ❌ Gap:            3 requirements
#   ⬜ Not Applicable: 0 requirements
# 
# Cross-Account Gaps (5):
#   SECP-002: Public Access Detection (3/3 accounts)
#   SEC-003: AWS Config Rules (2/3 accounts)
#   OPS-004: Automated Backups (2/3 accounts)
#   ...
```

### Multi-Account Evidence Collection

```bash
npm run dev -- collect-evidence
# Output:
# Multi-Account Evidence Collection Summary:
# 
# ✅ Production (fipco-prod/us-east-1): 4 artifacts
# ✅ Staging (fipco-staging/us-east-1): 4 artifacts
# ⚠️  Development (fipco-dev/us-east-1): 3 artifacts
#     ❌ Inspector: Service not enabled
# 
# Total: 11 artifacts, 1 errors
```

## Testing Strategy

### Unit Tests

```typescript
describe('multi-account-assessor', () => {
  it('should aggregate assessments with worst-case logic');
  it('should identify cross-account gaps');
  it('should calculate per-account compliance');
  it('should handle account-specific failures gracefully');
});

describe('multi-account-collector', () => {
  it('should collect evidence from each account');
  it('should save to account-specific subdirectories');
  it('should track per-account errors');
});
```

### Integration Tests

- Mock AWS SDK responses for multiple accounts
- Test aggregation with various status combinations
- Test report generation

### End-to-End Test

- If fipco-infra has multiple accounts/profiles configured, test against it
- Otherwise, create mock profiles for testing

## Future Enhancements

### Phase 3+ Features

1. **Cross-Account IAM Roles**
   - Implement AssumeRole for cross-account access
   - Use `role_arn` and `external_id` from config
   - Single profile, multiple accounts via roles

2. **Dashboard Enhancements**
   - Interactive account selector
   - Drill-down from aggregated to per-account view
   - Trend analysis across accounts
   - Export filtered views

3. **Advanced Reporting**
   - PDF export with multi-account comparison
   - Excel export with per-account sheets
   - Email distribution to account-specific teams

4. **Performance Optimization**
   - Parallel collection with rate limiting
   - Caching of shared data (docs, CDK)
   - Incremental updates (only changed accounts)

5. **CLI Enhancements**
   - `--account <name>` flag to assess single account from multi-account config
   - `--compare <file1> <file2>` to compare assessments
   - `--baseline <file>` to track changes over time

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AWS rate limits with parallel collection | High | Medium | Use sequential by default |
| Account-specific failures | Medium | High | Graceful error handling, continue with other accounts |
| Config complexity | Low | Low | Good examples, validation |
| Type safety with union types | Medium | Low | Careful TypeScript, helper functions |

## Acceptance Criteria

- [ ] Can configure multiple AWS accounts in config.yaml
- [ ] Can run `assess` command on multi-account config
- [ ] Generates per-account assessment reports
- [ ] Generates aggregated multi-account report
- [ ] Generates account comparison report
- [ ] Identifies cross-account gaps
- [ ] Dashboard displays multi-account data
- [ ] Backward compatible with single-account configs
- [ ] Unit tests pass
- [ ] Documentation updated
- [ ] Example multi-account config provided

## References

- Issue #10: https://github.com/flexion/flexion-msp-readiness/issues/10
- PROJECT_ROADMAP.md: Phase 3 features
- AWS Best Practices: Multi-account strategies
