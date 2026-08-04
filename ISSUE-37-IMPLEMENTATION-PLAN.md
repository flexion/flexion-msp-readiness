# Issue #37 Implementation Plan

## Problem Summary

Tool generates artifacts in `./playbooks` but assesses external project, showing 0% even with completed work. Need workspace model where this repo IS the MSP workspace.

## Implementation Phases

### Phase 1: Frontmatter Foundation ✅ (Current)

**Files Created**:
- `src/utils/frontmatter.ts` - Parse/serialize YAML frontmatter
- `src/utils/__tests__/frontmatter.test.ts` - 13 tests
- `src/generators/safe-generator.ts` - Safe write with overwrite protection

**Capabilities**:
- ✅ Parse/serialize frontmatter
- ✅ Track document metadata (generated, modified, status)
- ✅ Detect user modifications
- ✅ Safe write operations

### Phase 2: Update Generators (TODO)

**Update playbook-generator.ts**:
```typescript
// Add frontmatter to all generated documents
const metadata: DocumentMetadata = {
  generated: new Date().toISOString(),
  template_version: '1.0',
  status: 'draft',
  requirement_id: spec.requirementIds[0],
};

const result = safeWriteFile(outputPath, content, metadata, {
  force: options.force,
  dryRun: options.dryRun
});
```

**Add CLI flags**:
- `--force`: Overwrite user-modified files
- `--dry-run`: Show what would be generated

### Phase 3: Self-Assessment Mode (TODO)

**Add config option**:
```yaml
assessment:
  mode: "self"  # or "external"
  
project:
  docs_path: "./playbooks"    # Local for self
  # OR
  docs_path: "../fipco-infra/docs"  # External for target project
```

**Update requirement-matcher.ts**:
```typescript
// When in self mode, check local files
function assessRequirement(req: MSPRequirement, mode: 'self' | 'external') {
  if (mode === 'self') {
    const hasPlaybook = fs.existsSync(`./playbooks/${getPlaybookName(req)}`);
    const hasEvidence = fs.existsSync(`./evidence/${req.id}-*.json`);
    const isAddressed = /* check AWS + docs */;
    
    return hasPlaybook && hasEvidence && isAddressed ? 'complete' : 'partial';
  }
  // ... external mode logic
}
```

### Phase 4: Completeness Calculation (TODO)

**New completeness model**:
```typescript
interface RequirementCompleteness {
  requirement: MSPRequirement;
  hasPlaybook: boolean;
  playbookPath?: string;
  playbookStatus?: 'draft' | 'in-progress' | 'approved';
  hasEvidence: boolean;
  evidencePaths: string[];
  isAddressed: boolean;  // From AWS analysis
  overallStatus: 'complete' | 'in-progress' | 'not-started';
}

function calculateCompleteness(req: MSPRequirement): RequirementCompleteness {
  // Check all three conditions
  const hasPlaybook = checkPlaybookExists(req);
  const hasEvidence = checkEvidenceExists(req);
  const isAddressed = checkAWSAddressed(req);
  
  let overallStatus: 'complete' | 'in-progress' | 'not-started';
  if (hasPlaybook && hasEvidence && isAddressed) {
    overallStatus = 'complete';
  } else if (hasPlaybook || hasEvidence) {
    overallStatus = 'in-progress';
  } else {
    overallStatus = 'not-started';
  }
  
  return { requirement, hasPlaybook, hasEvidence, isAddressed, overallStatus };
}
```

### Phase 5: Status Management Commands (TODO)

**New CLI commands**:
```bash
# Show workspace status
msp-readiness status [--config config.yaml]

# Approve a document for audit
msp-readiness approve SEC-001 [--config config.yaml]

# Bulk approve multiple
msp-readiness approve SEC-001,SEC-003,OPS-005

# Show what would be generated
msp-readiness generate --dry-run
```

**Implementation**:
```typescript
// src/cli.ts
program
  .command('status')
  .description('Show MSP workspace status')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .action(async options => {
    // Load config
    // Calculate completeness for all requirements
    // Print summary
  });

program
  .command('approve <requirement-ids>')
  .description('Mark requirements as approved for audit')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .action(async (ids, options) => {
    // Parse comma-separated IDs
    // Update frontmatter status to 'approved'
    // Print confirmation
  });
```

### Phase 6: Dashboard Updates (TODO)

**Update dashboard to show**:
- Complete vs. in-progress vs. not-started
- Playbook status (draft/approved)
- Evidence presence
- AWS addressed status

**Visual design**:
```
MSP Workspace Status
====================
📊 Overall: 26% complete (5/19)

✅ Complete (5)
  SEC-001: Security Policies
    ✓ Playbook: approved
    ✓ Evidence: sec-001-policies.json
    ✓ AWS: Addressed
    
🚧 In Progress (8)
  SEC-003: AWS Config
    ✓ Playbook: in-progress
    ✗ Evidence: Missing
    ⚠  AWS: Partial
    
❌ Not Started (6)
  SEC-010: Incident Response
    ✗ Playbook: Not generated
    ✗ Evidence: Missing
    ✗ AWS: Gap
```

### Phase 7: Migration & Documentation (TODO)

**Migration guide for existing users**:
1. Copy existing playbooks to workspace
2. Add frontmatter to legacy docs
3. Switch config to self-assessment mode
4. Re-run assessment

**Update docs**:
- README.md - Explain new workspace model
- COMPLETENESS-MODEL.md - Update with implementation details
- Add examples/

## Testing Strategy

### Unit Tests
- ✅ frontmatter.ts (13 tests)
- TODO: safe-generator.ts
- TODO: requirement-matcher.ts (self mode)
- TODO: completeness calculation

### Integration Tests
- TODO: Generate → modify → regenerate (should skip)
- TODO: Generate → approve → status
- TODO: Self-assessment mode end-to-end

### E2E Test
- TODO: Fresh workspace → generate all → collect evidence → assess → 100% complete

## Acceptance Criteria

- [ ] Generated files have frontmatter with metadata
- [ ] Regenerate never overwrites user-modified files (without `--force`)
- [ ] `--dry-run` shows what would be generated
- [ ] Self-assessment mode works (`assess --self` or config setting)
- [ ] Completeness correctly requires: playbook + evidence + addressed
- [ ] `status` command shows clear summary
- [ ] `approve` command updates document status
- [ ] Dashboard shows complete/in-progress/not-started
- [ ] Migration guide exists
- [ ] All existing tests pass
- [ ] New tests added for new functionality

## Estimated Effort

- Phase 1: ✅ Complete (2h)
- Phase 2: 3h (generator updates + CLI flags)
- Phase 3: 4h (self-assessment mode)
- Phase 4: 4h (completeness calculation)
- Phase 5: 3h (status commands)
- Phase 6: 3h (dashboard updates)
- Phase 7: 2h (migration + docs)

**Total**: 21 hours

## Current Status

**Phase 1 Complete**: Foundation laid with frontmatter utilities
**Next**: Phase 2 - Update generators to use safe writes

## Notes

This is a significant architectural change. Consider breaking into sub-issues:
- #37a: Frontmatter + Safe Generation
- #37b: Self-Assessment Mode
- #37c: Status Commands
- #37d: Dashboard Updates

For now, implementing Phase 1 + 2 gives immediate value (overwrite protection).
