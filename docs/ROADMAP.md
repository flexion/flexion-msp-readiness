# Development Roadmap

Visual guide to the 6-phase development plan.

## Timeline Overview

```
Phase 1: Foundation (6h) ✅ COMPLETE
│
├─ Phase 2: Core Assessment (45h)
│  ├─ Iteration 1: Basic Assessment MVP (23h) ← START HERE
│  └─ Iteration 2: AWS Analysis (22h)
│
├─ Phase 3: Evidence Collection (19h)
│
├─ Phase 4: Content Generation (31h)
│
├─ Phase 5: Dashboard (18h)
│
└─ Phase 6: Skill Integration (34h)

Total: 153 hours (~4 weeks for one developer)
```

## Iteration Strategy

Instead of building all 6 phases linearly, we build in iterations that deliver value incrementally:

### ✅ Iteration 0: Foundation (COMPLETE)
**Time**: 6 hours
**Deliverable**: Project structure, types, planning

### 🎯 Iteration 1: Basic Assessment MVP (NEXT)
**Time**: 23 hours
**Goal**: Get working assessment of documentation coverage

**Tasks**:
1. Config loader (3h)
2. Documentation scanner (8h)
3. Requirement matcher - docs only (8h)
4. Report generator (4h)

**Output**:
```bash
npm run dev -- assess
# Generates: assessment-report.md
```

**Value**: Immediate visibility into doc coverage gaps

---

### Iteration 2: AWS Infrastructure Analysis
**Time**: 22 hours
**Goal**: Add AWS state analysis

**Tasks**:
1. AWS Config analyzer (12h)
2. IAM evaluator (6h)
3. Security Hub checker (4h)

**Output**:
```bash
npm run dev -- assess
# Now includes AWS infrastructure status
```

**Value**: Full picture of compliance (docs + infrastructure)

---

### Iteration 3: Evidence Automation
**Time**: 19 hours
**Goal**: Automate evidence collection

**Tasks**:
1. CloudTrail collector (3h)
2. Config collector (4h)
3. Backup collector (4h)
4. Inspector collector (3h)
5. IAM collector (3h)
6. Manifest generator (2h)

**Output**:
```bash
npm run dev -- collect-evidence
# Creates: evidence/ directory with JSON exports
```

**Value**: No more manual evidence gathering

---

### Iteration 4: Documentation Generation
**Time**: 31 hours
**Goal**: Auto-generate missing playbooks/runbooks

**Tasks**:
1. Template system (4h)
2. Playbook templates (8h)
3. Runbook templates (6h)
4. Playbook generator (6h)
5. Evidence matrix (3h)
6. Self-assessment filler (4h)

**Output**:
```bash
npm run dev -- generate --all
# Creates: playbooks/ directory with generated docs
```

**Value**: Hours of documentation writing automated

---

### Iteration 5: Visual Dashboard
**Time**: 18 hours
**Goal**: Interactive compliance tracking

**Tasks**:
1. Data aggregator (4h)
2. HTML template (8h)
3. Dashboard builder (6h)

**Output**:
```bash
npm run dev -- dashboard
# Creates: dashboard.html
```

**Value**: Stakeholder-ready compliance visualization

---

### Iteration 6: Production Polish
**Time**: 34 hours
**Goal**: Claude skill integration and production readiness

**Tasks**:
1. CLI entry point (6h)
2. Skill orchestration (4h)
3. Error handling (3h)
4. Testing (12h)
5. Documentation (6h)
6. Release (3h)

**Output**:
```bash
/msp-readiness run  # From Claude Code
```

**Value**: Seamless user experience

---

## Feature Roadmap

### MVP (Iterations 0-1)
- [x] Project structure
- [x] Type definitions
- [x] MSP requirements data
- [ ] Config loader
- [ ] Doc scanner
- [ ] Basic report

### v0.2 (Iteration 2)
- [ ] AWS Config analysis
- [ ] IAM evaluation
- [ ] Security Hub checking
- [ ] Full assessment report

### v0.3 (Iteration 3)
- [ ] Evidence collection
- [ ] Multi-service collectors
- [ ] Evidence manifest

### v0.4 (Iteration 4)
- [ ] Template system
- [ ] Playbook generation
- [ ] Runbook generation
- [ ] Evidence matrices

### v0.5 (Iteration 5)
- [ ] Dashboard builder
- [ ] Interactive HTML
- [ ] Timeline projections

### v1.0 (Iteration 6)
- [ ] CLI interface
- [ ] Claude skill
- [ ] Full test suite
- [ ] Complete docs

## Dependency Graph

```
Foundation (Phase 1)
    ↓
Config Loader ──→ Doc Scanner ──┐
                                ├──→ Requirement Matcher ──→ Report
AWS Analyzers ─────────────────┘
    ↓
Evidence Collectors ──→ Evidence Manifest
    ↓
Template System ──→ Generators ──→ Playbooks/Runbooks
    ↓
Dashboard Builder ──→ HTML Dashboard
    ↓
CLI + Skill ──→ Production Release
```

## Critical Path

These are the blocking tasks that must be done in order:

1. **Config Loader** (3h)
   - Required by everything else
   - Must work before any other module

2. **Doc Scanner** (8h)
   - Required by Requirement Matcher
   - Needed for MVP assessment

3. **Requirement Matcher** (8h)
   - Required by Report Generator
   - Core assessment logic

4. **Report Generator** (4h)
   - Delivers MVP value
   - Needed before adding more features

5. **AWS Analyzers** (22h)
   - Parallel to evidence collectors
   - Required for full assessment

**Everything else can be built in parallel or asynchronously**

## Testing Milestones

### After Iteration 1
✓ Scan fipco-infra docs
✓ Find ~8 addressed requirements
✓ Generate readable report

### After Iteration 2
✓ Connect to AWS (test account)
✓ Analyze Config, IAM, Security Hub
✓ Report includes AWS status

### After Iteration 3
✓ Collect evidence from AWS
✓ Generate evidence manifest
✓ Export as JSON

### After Iteration 4
✓ Generate missing playbooks
✓ Playbooks include real AWS details
✓ Output is review-ready

### After Iteration 5
✓ Dashboard opens in browser
✓ Shows accurate statistics
✓ Interactive features work

### After Iteration 6
✓ Claude skill works end-to-end
✓ All tests pass (>80% coverage)
✓ Documentation complete

## Time Estimates by Role

### If you're a solo developer:
- **Part-time (10h/week)**: 15 weeks to v1.0
- **Full-time (40h/week)**: 4 weeks to v1.0
- **Focused sprint**: 10 days to v1.0

### If you're a team:
- **2 developers**: 2 weeks to v1.0 (parallel work)
- **3 developers**: 10 days to v1.0 (parallel + code review)

## Risk Mitigation

### Risk: AWS API complexity
**Mitigation**: Start with mock data, add AWS SDK incrementally

### Risk: Template flexibility
**Mitigation**: Hard-code templates initially, parameterize later

### Risk: Scope creep
**Mitigation**: MVP first, then iterate. Each iteration delivers value.

### Risk: AWS permission issues
**Mitigation**: Graceful degradation, clear error messages

### Risk: Project-specific variations
**Mitigation**: Test on fipco-infra first, generalize second

## Success Metrics

### Iteration 1 Success
- Scans fipco-infra docs in <10 seconds
- Identifies 20+ requirement references
- Generates readable report

### Iteration 2 Success
- Connects to AWS without errors
- Analyzes 50+ AWS resources
- Assessment status matches manual review

### Iteration 3 Success
- Collects evidence in <30 seconds
- Generates 6+ evidence files
- Evidence is audit-ready

### Iteration 4 Success
- Generates playbooks in <5 seconds
- Playbooks include real AWS ARNs
- Content is 90% review-ready

### Iteration 5 Success
- Dashboard loads in any browser
- All metrics accurate
- Stakeholder-presentable

### Iteration 6 Success
- `/msp-readiness run` works end-to-end
- Completes in <2 minutes
- User needs minimal guidance

## Next Steps

**Immediate**: Start Iteration 1
1. Implement config loader
2. Test on fipco-infra
3. Implement doc scanner
4. Generate first report

**Week 1**: Complete Iteration 1
**Week 2**: Complete Iteration 2
**Week 3**: Complete Iterations 3-4
**Week 4**: Complete Iterations 5-6

See [PLAN.md](../PLAN.md) for detailed task breakdowns.
