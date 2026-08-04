# Contributing Guide

Guidelines for contributing to the MSP Readiness tool.

## Before You Start

1. **Read the documentation**:
   - [CLAUDE.md](CLAUDE.md) - Project overview and architecture
   - [SETUP.md](SETUP.md) - Environment setup
   - [WORKFLOW.md](WORKFLOW.md) - Git and PR workflow
   - [TESTING.md](TESTING.md) - Testing procedures

2. **Set up your environment**:
   - Follow [SETUP.md](SETUP.md) completely
   - Verify you can run assessments against fipco-infra
   - Ensure `gh` CLI has project permissions

3. **Check the project board**:
   - https://github.com/orgs/flexion/projects/53
   - Look for issues marked "Ready"
   - Don't start work on issues in "Backlog" without discussion

## Issue Workflow

### 1. Pick an Issue

Choose an issue from the "Ready" column:

```bash
# View ready issues
gh project item-list 53 --owner flexion --format json | \
  jq -r '.items[] | select(.status == "Ready") | "#\(.content.number): \(.content.title)"'
```

**Recommended for beginners**: Issue #5 (Fix Build Process - 4h)

### 2. Move to "In Progress"

```bash
./scripts/move-issue.sh <issue-number> in-progress
```

This signals to others that you're working on it.

### 3. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/issue-<number>-short-description
```

**Branch naming convention**:
- `feature/issue-N-description` - New features
- `fix/issue-N-description` - Bug fixes
- `docs/issue-N-description` - Documentation
- `chore/issue-N-description` - Maintenance

**Examples**:
- `feature/issue-5-fix-build-process`
- `feature/issue-2-complete-playbooks`
- `fix/issue-42-aws-credential-error`

### 4. Work on the Issue

Make your changes following the guidelines below.

### 5. Test Your Changes

See [TESTING.md](TESTING.md) for complete testing guide.

**Minimum required**:
```bash
npm run build
npm test
npm run lint
node dist/cli.js assess --config config.fipco.yaml
```

### 6. Commit Your Changes

Use conventional commit messages:

```bash
git add <files>
git commit -m "feat: add feature description (#<issue-number>)

- Change 1
- Change 2
- Change 3

Closes #<issue-number>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Commit message format**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `test:` - Adding tests
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring

### 7. Push and Create PR

```bash
git push -u origin feature/issue-<number>-description

gh pr create \
  --title "feat: description (#<issue-number>)" \
  --body "## Summary
Brief description of changes

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manually tested against fipco-infra
- [x] All acceptance criteria met

## Issue
Closes #<issue-number>

🤖 Generated with [Claude Code](https://claude.ai/claude-code)"
```

### 8. Move to "In Review"

```bash
./scripts/move-issue.sh <issue-number> in-review
```

### 9. Address Review Feedback

If reviewers request changes:

```bash
# Make changes
git add <files>
git commit -m "fix: address review feedback

- Addressed comment about X
- Fixed Y as requested"

git push
```

The PR will automatically update.

### 10. After Merge

```bash
# Move to done
./scripts/move-issue.sh <issue-number> done

# Clean up local branch
git checkout main
git pull origin main
git branch -d feature/issue-<number>-description
```

## Definition of Done

An issue is considered "done" when:

### Code Complete

- [ ] All acceptance criteria met (from issue description)
- [ ] Code follows TypeScript style guide
- [ ] No TypeScript errors or warnings
- [ ] No ESLint errors
- [ ] Code is properly formatted (Prettier)

### Testing Complete

- [ ] Unit tests written for new code
- [ ] All tests pass (`npm test`)
- [ ] Manual testing completed against fipco-infra
- [ ] Edge cases tested
- [ ] No regressions in existing functionality

### Documentation Complete

- [ ] Public functions have JSDoc comments
- [ ] README updated (if user-facing changes)
- [ ] CLAUDE.md updated (if architecture changes)
- [ ] Type definitions in `types.ts` updated
- [ ] Inline comments for complex logic

### Quality Checks

- [ ] Build succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console errors when running tool
- [ ] Templates copied (if modified generators/dashboard)

### Review Ready

- [ ] Feature branch created and pushed
- [ ] Pull request created with clear description
- [ ] Issue moved to "In Review"
- [ ] All CI checks pass (when CI is set up)

## Code Style Guidelines

### TypeScript

**Use strict mode**:
```typescript
// Good
function processData(input: string): Result {
  // ...
}

// Bad
function processData(input: any): any {
  // ...
}
```

**Prefer async/await**:
```typescript
// Good
async function fetchData(): Promise<Data> {
  const result = await apiCall();
  return result;
}

// Bad
function fetchData(): Promise<Data> {
  return apiCall().then(result => {
    return result;
  });
}
```

**Use descriptive names**:
```typescript
// Good
const requirementAssessments = matchRequirements(docScan);
const configRulesEvidence = await collectConfigRulesEvidence();

// Bad
const data = match(scan);
const ev = await collect();
```

**Document complex logic**:
```typescript
// Good
/**
 * Matches documentation findings to MSP requirements.
 * Uses a scoring algorithm to determine if a requirement is addressed:
 * - Strong reference (heading/bold) = 2 points
 * - Weak reference (body text) = 1 point
 * - Threshold for "addressed" = 3 points
 */
function matchRequirements(docScan: DocScanResult): RequirementAssessment[] {
  // ...
}

// Bad
function matchRequirements(docScan: DocScanResult): RequirementAssessment[] {
  // No explanation of complex logic
}
```

### File Organization

**One export per file** (when practical):
```typescript
// Good: src/assessors/doc-scanner.ts
export function scanDocumentation() { }

// Good: src/assessors/cdk-parser.ts  
export function parseCDKInfrastructure() { }

// Avoid: src/assessors/utils.ts with 20 different exports
```

**Group related functionality**:
```
src/
├── assessors/     # Analysis of current state
├── collectors/    # Evidence collection
├── generators/    # Document generation
└── dashboard/     # Dashboard building
```

### Testing

**Test file naming**: `<module>.test.ts`

**Test structure**:
```typescript
describe('scanDocumentation', () => {
  it('should find markdown files', () => {
    // Arrange
    const docsPath = '/test/path';
    
    // Act
    const result = scanDocumentation(docsPath);
    
    // Assert
    expect(result.totalFiles).toBeGreaterThan(0);
  });

  it('should handle empty directories', () => {
    // Test edge case
  });
});
```

**Mock external dependencies**:
```typescript
// Good - mock AWS SDK
jest.mock('@aws-sdk/client-cloudtrail');

// Bad - make real AWS API calls in tests
```

## When to Update Key Files

### types.ts

Update when adding new:
- Data structures
- Interfaces
- Type definitions
- Enums

Example:
```typescript
export interface CDKResource {
  type: string;
  file: string;
  properties: Record<string, any>;
}
```

### msp-requirements.ts

Update when:
- Adding new MSP requirements
- Updating requirement definitions
- Changing CIS Control mappings

**Don't modify** unless requirement spec changes.

### CLAUDE.md

Update when:
- Changing project architecture
- Adding new major features
- Modifying development workflow
- Adding new phases to roadmap

### README.md

Update when:
- Adding user-facing features
- Changing installation steps
- Adding new CLI commands
- Updating usage examples

## PR Review Checklist

Before requesting review, verify:

- [ ] PR title follows convention: `feat: description (#N)`
- [ ] PR description explains what and why
- [ ] All tests pass
- [ ] No merge conflicts with main
- [ ] Issue linked in PR description (`Closes #N`)
- [ ] Screenshots/examples included (if UI changes)
- [ ] Breaking changes documented (if any)

## Working with AWS

### Test Accounts

Use test/dev AWS accounts when possible:
- Account: 688672519222 (dev)
- Profile: `AWSAdministratorAccess-688672519222`

**Never test against production** unless explicitly read-only.

### Graceful Degradation

Always handle missing AWS permissions:

```typescript
// Good
try {
  const trails = await client.send(command);
  return trails;
} catch (error) {
  if (error.name === 'AccessDeniedException') {
    console.warn('Missing CloudTrail permissions, skipping...');
    return [];
  }
  throw error;
}

// Bad
const trails = await client.send(command); // Crashes if no permission
```

### Rate Limiting

Avoid excessive API calls:

```typescript
// Good - batch requests
const allFindings = await Promise.all([
  getConfigFindings(),
  getSecurityHubFindings(),
  getIAMFindings()
]);

// Bad - sequential, slow
const config = await getConfigFindings();
const securityHub = await getSecurityHubFindings();
const iam = await getIAMFindings();
```

## Security Guidelines

### No Secrets in Code

**Never commit**:
- AWS credentials
- API keys
- Passwords
- Tokens

Use environment variables or AWS profiles instead.

### Input Validation

Validate all external input:

```typescript
// Good
function processConfig(config: unknown): Config {
  if (!isValidConfig(config)) {
    throw new ConfigError('Invalid configuration');
  }
  return config as Config;
}

// Bad
function processConfig(config: any): Config {
  return config; // No validation
}
```

### Safe File Operations

```typescript
// Good
const safePath = path.resolve(basePath, userInput);
if (!safePath.startsWith(basePath)) {
  throw new Error('Path traversal detected');
}

// Bad
const file = fs.readFileSync(userInput); // Path traversal vulnerability
```

## Getting Help

**Stuck?** Check:
1. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
2. Existing issues - Someone may have hit the same problem
3. Ask in PR review - Reviewers are here to help

**Found a bug?** Create an issue:
- Clear title
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## Recognition

All contributors are recognized in:
- Git commit history
- Pull request discussions
- Release notes

Use Co-Authored-By in commits to give credit:
```
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
Co-Authored-By: Another Contributor <email@example.com>
```

## Questions?

- **Project Board**: https://github.com/orgs/flexion/projects/53
- **Issues**: https://github.com/flexion/flexion-msp-readiness/issues
- **Roadmap**: [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md)
