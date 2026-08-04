# MSP Readiness Scripts

Helper scripts for managing the MSP Readiness project.

## validate-build.js

Validates that the build process completed successfully by checking:
- dist directory exists
- TypeScript files were compiled to JavaScript
- Template files (.hbs, .html) were copied from templates/ to dist/

### Usage

This script is automatically run as part of `npm run build`, but can be run manually:

```bash
node scripts/validate-build.js
```

### What it checks

- `dist/cli.js` exists (TypeScript compilation)
- `dist/playbooks/incident-response.hbs` exists
- `dist/playbooks/change-management.hbs` exists
- `dist/runbooks/access-key-rotation.hbs` exists

If any checks fail, the script exits with code 1 and prints diagnostic information.

## move-issue.sh

Move GitHub issues between project board columns.

### Setup

Ensure gh CLI has project permissions:

```bash
gh auth refresh -h github.com -s project -s read:project
```

### Usage

```bash
./scripts/move-issue.sh <issue-number> <status>
```

**Status options:**
- `backlog` - Issue is in the backlog
- `ready` - Issue is ready to be worked on
- `in-progress` - Issue is being actively worked on
- `in-review` - Issue is complete and awaiting review
- `done` - Issue is complete and reviewed

### Examples

```bash
# Move issue #7 to "In review"
./scripts/move-issue.sh 7 in-review

# Move issue #5 to "Ready"
./scripts/move-issue.sh 5 ready

# Mark issue #2 as done
./scripts/move-issue.sh 2 done
```

### Batch Operations

Move multiple issues at once:

```bash
# Move all Phase 1 issues to Ready
for issue in 2 3 4 5 6 14; do
  ./scripts/move-issue.sh $issue ready
done
```

## Project Information

- **Project URL**: https://github.com/orgs/flexion/projects/53
- **Project Number**: 53
- **Owner**: flexion
- **Repository**: flexion-msp-readiness
