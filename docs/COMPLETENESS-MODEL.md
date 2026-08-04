# MSP Completeness Model

## The Problem

You asked a great question: "Why does it say 0% compliance when we collected evidence and generated playbooks?"

This revealed a fundamental architectural issue with how the tool defines "completeness."

## Current Behavior (Broken)

### How It Works Now

1. **Generate artifacts** → Tool creates playbooks in `./playbooks` (msp-readiness repo)
2. **Collect evidence** → Tool saves evidence to `./evidence` (msp-readiness repo)
3. **Assess project** → Tool scans TARGET project (e.g., `/Users/tim/repos/fipco-infra/docs/`)
4. **Result**: 0% because target project has no playbooks (they're in the wrong repo!)

### The Confusion

```
msp-readiness repo:
  ✅ Has 19 generated playbooks
  ✅ Has AWS evidence collected
  ❌ Shows 0% complete

Why? Because it's looking at FIPCO repo, not itself!
```

### Current Workaround

Manual file copying:
```bash
# Generate in msp-readiness
cd ~/repos/flexion-msp-readiness
msp-readiness generate

# Copy to target project
cp ./playbooks/* ~/repos/fipco-infra/docs/msp/

# Commit to target
cd ~/repos/fipco-infra
git add docs/msp/
git commit -m "Add MSP playbooks"

# Re-assess
cd ~/repos/flexion-msp-readiness
msp-readiness assess  # NOW shows completion
```

This is tedious and error-prone.

## Proposed Solution (Issue #37)

### New Model: msp-readiness IS the Workspace

The msp-readiness repo becomes your **MSP compliance workspace**:

```
flexion-msp-readiness/
├── playbooks/           # YOUR MSP playbooks (customizable)
│   ├── incident-response.md
│   ├── change-management.md
│   └── ...
├── runbooks/            # YOUR runbooks
│   ├── access-key-rotation.md
│   └── ...
├── evidence/            # YOUR evidence
│   ├── cloudtrail-status.json
│   ├── config-rules.json
│   └── ...
├── assessment-report.md # YOUR assessment
└── dashboard.html       # YOUR dashboard
```

All in ONE place, version controlled, audit-ready.

### New Completeness Definition

A requirement is **complete** when ALL three exist:

1. ✅ **Playbook exists** in `./playbooks/`
2. ✅ **Evidence exists** in `./evidence/`
3. ✅ **Assessment marks as "addressed"**

Example:
```
SEC-001: Security Policies
  ✅ playbooks/security-policies.md exists
  ✅ evidence/sec-001-policies.json exists
  ✅ assessment-report.md: status = "addressed"
  → COMPLETE
  
OPS-005: Backup and Recovery
  ✅ playbooks/backup-recovery.md exists
  ❌ evidence/ops-005-backup.json MISSING
  ⚠️  assessment-report.md: status = "partial"
  → IN PROGRESS (has playbook, needs evidence)
```

### Iterative Development Protection

The biggest concern: **regeneration overwrites your work**.

Solution: Add frontmatter to track modifications:

```markdown
---
generated: 2026-08-04T10:00:00Z
template_version: 1.0
last_modified: 2026-08-05T15:30:00Z
status: approved
custom_sections:
  - "FIPCO-specific escalation paths"
  - "Integration with PagerDuty"
---

# Incident Response Playbook

[Your customizations are safe here]
```

**Regeneration behavior**:
- ❌ **Never overwrite** if `last_modified > generated`
- ✅ **Show diff** and ask to merge if template updated
- ⚠️  **Force with flag** (`--force`) if you really want to reset

### New Commands

```bash
# Self-assessment (assess THIS repo, not external project)
msp-readiness assess --self

# Safe generation (won't overwrite modified files)
msp-readiness generate

# See what would change
msp-readiness generate --dry-run

# Force regenerate (dangerous)
msp-readiness generate --force

# Quick status check
msp-readiness status
# Output:
# 📊 MSP Workspace Status
# ✅ Complete:     5/19 (26%)
# 🚧 In Progress:  8/19 (42%)
# ❌ Not Started:  6/19 (32%)

# Approve a playbook for audit
msp-readiness approve SEC-001
# Marks as status: approved in frontmatter
```

### Status Tracking

Each requirement has a clear lifecycle:

```
not-started → draft → in-progress → approved → complete
   ⬇            ⬇         ⬇           ⬇          ⬇
No files   Generated   Modified    Reviewed   Has evidence
                                              + addressed
```

Dashboard visualization:
```
MSP Readiness Dashboard
=======================

Overall: 26% complete (5/19)

✅ Complete (5)
  SEC-001: Security Policies ✓ playbook ✓ evidence ✓ addressed
  OPS-003: Monitoring        ✓ playbook ✓ evidence ✓ addressed
  ...

🚧 In Progress (8)
  SEC-003: AWS Config        ✓ playbook ✗ evidence ⚠ partial
  OPS-005: Backup            ✓ playbook ✓ evidence ✗ gap
  ...

❌ Not Started (6)
  SEC-010: Incident Response ✗ playbook ✗ evidence ✗ gap
  ...
```

## Benefits

### Before (Current)

- ❌ Artifacts in wrong location
- ❌ Manual copying required
- ❌ Confusing 0% with completed work
- ❌ Regeneration overwrites customizations
- ❌ No clear lifecycle tracking

### After (Issue #37)

- ✅ Single source of truth (this repo)
- ✅ Self-assessment shows accurate completion
- ✅ Safe regeneration with overwrite protection
- ✅ Clear status: draft → approved → complete
- ✅ Version controlled MSP workspace
- ✅ Audit-ready artifacts in one place

## Implementation Plan

See [Issue #37](https://github.com/flexion/flexion-msp-readiness/issues/37) for detailed plan:

1. Add frontmatter metadata system
2. Implement overwrite protection
3. Add `--self` assessment mode
4. Update completeness calculation
5. Add `status` and `approve` commands
6. Update dashboard for new model
7. Migration guide for existing users

## Timeline

- **Current**: Manual workaround (copy files to target project)
- **Phase 3**: Full implementation (Issue #37)
- **Estimate**: 16-24 hours development

## Questions?

This is a significant architectural change. If you have questions or concerns, please comment on [Issue #37](https://github.com/flexion/flexion-msp-readiness/issues/37).

---

**Generated**: 2026-08-04  
**Issue**: #37  
**Status**: Proposed
