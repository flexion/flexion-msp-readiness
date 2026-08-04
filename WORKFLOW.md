# MSP Readiness Workflow Quick Reference

## Starting Work on an Issue

```bash
# 1. Move issue to "In Progress"
./scripts/move-issue.sh <issue-number> in-progress

# 2. Create feature branch
git checkout -b feature/issue-<number>-short-description

# 3. Work on the issue
# Make commits, reference issue number in messages
```

## Completing an Issue

```bash
# 1. Build and test
npm run build
npm test
npm run lint

# 2. Commit final changes
git add .
git commit -m "feat: description (#<issue-number>)

- Change 1
- Change 2

Closes #<issue-number>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 3. Push and create PR
git push -u origin feature/issue-<number>-description

gh pr create \
  --title "feat: description (#<issue-number>)" \
  --body "## Summary
Brief description

## Changes
- Change 1
- Change 2

## Testing
- [x] Tests pass
- [x] Manually tested

Closes #<issue-number>

🤖 Generated with [Claude Code](https://claude.ai/claude-code)"

# 4. Move to "In Review"
./scripts/move-issue.sh <issue-number> in-review

# 5. After PR merged, mark done
./scripts/move-issue.sh <issue-number> done
```

## Branch Naming

- `feature/issue-N-description` - New features
- `fix/issue-N-description` - Bug fixes
- `docs/issue-N-description` - Documentation
- `chore/issue-N-description` - Maintenance

## Issue Status

```bash
# Move between statuses
./scripts/move-issue.sh <number> backlog
./scripts/move-issue.sh <number> ready
./scripts/move-issue.sh <number> in-progress
./scripts/move-issue.sh <number> in-review
./scripts/move-issue.sh <number> done
```

## Project Links

- **Project Board**: https://github.com/orgs/flexion/projects/53
- **Issues**: https://github.com/flexion/flexion-msp-readiness/issues
- **Roadmap**: [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md)

## Key Rules

✅ **DO**:
- Work on feature branches
- One issue per branch
- Create PRs for all changes
- Reference issue numbers in commits
- Use `./scripts/move-issue.sh` to update status
- Test thoroughly before creating PR

❌ **DON'T**:
- Commit directly to `main`
- Work on multiple issues in one branch
- Merge without review
- Skip issue status updates
