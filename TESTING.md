# Testing Guide

How to test changes before creating a pull request.

## Quick Checklist

Before creating a PR, ensure:

- [ ] Code builds without errors: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Manual testing completed against fipco-infra
- [ ] Template files copied (if modified generators/dashboard)
- [ ] Documentation updated (if adding features)

## Build and Unit Tests

### Build TypeScript

```bash
npm run build
```

Expected: No errors, `dist/` directory created with compiled JavaScript.

**If you modified templates**: Copy them manually (until issue #5 is fixed):
```bash
mkdir -p dist/dashboard/templates
cp src/dashboard/templates/dashboard.html dist/dashboard/templates/

# If you modified generator templates:
mkdir -p dist/generators/templates
cp src/generators/templates/*.hbs dist/generators/templates/ 2>/dev/null || true
```

### Run Tests

```bash
# Run all tests
npm test

# Watch mode (useful during development)
npm run test:watch

# Run specific test file
npm test -- doc-scanner.test.ts

# Run with coverage
npm test -- --coverage
```

Expected: All tests pass.

### Lint and Format

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Format code
npm run format
```

Expected: No errors.

## Manual Testing Against fipco-infra

The most important test is running the tool against the real fipco-infra repository.

### 1. Set AWS Credentials

```bash
export AWS_PROFILE=AWSAdministratorAccess-688672519222
aws sso login --profile AWSAdministratorAccess-688672519222
```

### 2. Run Assessment

```bash
node dist/cli.js assess --config config.fipco.yaml
```

**Expected Results**:
```
✔ Documentation scanned (66 files)
  Evidence files: 66

✔ CDK infrastructure parsed (23 files)
  Resources found: 28
  Security findings: 6

✔ AWS infrastructure analyzed
  Config rules: 25
  Non-compliant: 3
  
📊 Assessment Summary:
  Overall Completion: 0% (0/19)
  Estimated Effort: 152 hours
```

### 3. Verify Output Files

```bash
# Assessment reports should be generated
ls -lh assessment-report.md assessment-report.json

# Check report content
head -20 assessment-report.md
```

### 4. Test Other Commands

```bash
# Generate documentation
node dist/cli.js generate --config config.fipco.yaml

# Expected: Playbooks generated in playbooks/ directory
ls playbooks/

# Collect evidence
node dist/cli.js collect-evidence --config config.fipco.yaml

# Expected: Evidence collected in evidence/ directory
ls evidence/

# Generate dashboard
node dist/cli.js dashboard --config config.fipco.yaml

# Expected: dashboard.html created and opens in browser
```

## Testing New Features

### Testing Assessors

If you modified `src/assessors/`:

```bash
# Run assessment with verbose output
node dist/cli.js assess --config config.fipco.yaml

# Check that your changes are reflected in:
# - Console output
# - assessment-report.json
# - assessment-report.md
```

**Verify**:
- New findings appear in reports
- Existing functionality still works
- No errors in console

### Testing Collectors

If you modified `src/collectors/`:

```bash
# Run evidence collection
node dist/cli.js collect-evidence --config config.fipco.yaml

# Check evidence files
ls -lh evidence/

# Verify evidence manifest
cat evidence/MANIFEST.md
```

**Verify**:
- New evidence files created
- Evidence mapped to correct requirements
- MANIFEST.md updated

### Testing Generators

If you modified `src/generators/`:

```bash
# Generate documentation
node dist/cli.js generate --config config.fipco.yaml

# Check generated files
ls -lh playbooks/
cat playbooks/evidence-matrix.md
```

**Verify**:
- New playbooks/runbooks generated
- Content is accurate and complete
- Markdown formatting is correct
- Templates are applied correctly

### Testing Dashboard

If you modified `src/dashboard/`:

```bash
# Generate dashboard
node dist/cli.js dashboard --config config.fipco.yaml

# Open in browser
open dashboard.html
```

**Verify**:
- Dashboard renders correctly
- All sections display data
- Charts and visualizations work
- Responsive layout works

### Testing CLI

If you modified `src/cli.ts`:

```bash
# Test all commands
node dist/cli.js --help
node dist/cli.js assess --help
node dist/cli.js generate --help
node dist/cli.js collect-evidence --help
node dist/cli.js dashboard --help

# Test with various options
node dist/cli.js assess --config config.fipco.yaml --skip-aws
node dist/cli.js generate --config config.fipco.yaml --playbooks-only
```

**Verify**:
- Help text is accurate
- Options work as expected
- Error messages are clear

## Regression Testing

Always verify existing functionality still works:

### Core Assessment Flow

```bash
# Full assessment pipeline
node dist/cli.js assess --config config.fipco.yaml

# Should complete without errors and show:
# - Documentation scan results
# - CDK parsing results
# - AWS analysis results
# - Assessment summary
# - Generated reports
```

### Expected Baseline Results

These are the current known results from fipco-infra (as of Issue #7):

**Documentation Scan**:
- Total files: 66
- Evidence files: 66
- Playbooks/Runbooks: 0 (none in fipco-infra yet)

**CDK Parsing**:
- Stack files: 23
- Resources found: 28
- Security findings: 6 (2 high, 4 info)

**AWS Analysis** (varies by account state):
- Config rules: 25
- Non-compliant: ~3
- Backup vaults: 3
- CloudTrail trails: 2 (not logging)

**Overall Assessment**:
- Requirements: 19
- Addressed: 0
- Gaps: 19
- Completion: 0%

If your changes significantly alter these numbers, understand why.

## Edge Cases to Test

### Empty Directories

```bash
# Test with empty docs directory
# Temporarily modify config.fipco.yaml
node dist/cli.js assess --config config.yaml
```

Expected: No crash, graceful handling of missing files.

### Missing Permissions

```bash
# Test with limited AWS permissions
# Use a profile with restricted access
export AWS_PROFILE=limited-profile
node dist/cli.js assess --config config.fipco.yaml
```

Expected: Warnings logged, but assessment continues with available data.

### Invalid Configuration

```bash
# Test with missing config file
node dist/cli.js assess --config nonexistent.yaml
```

Expected: Clear error message, not a stack trace.

## Performance Testing

For large repositories:

```bash
# Time the assessment
time node dist/cli.js assess --config config.fipco.yaml
```

**Target**: Complete in under 2 minutes for fipco-infra.

If significantly slower, investigate:
- Are you making too many AWS API calls?
- Is file I/O inefficient?
- Are there unnecessary loops?

## Integration Testing

### Test with Different AWS Accounts

If you have access to multiple AWS accounts:

```bash
# Test environment account
export AWS_PROFILE=test-environment
node dist/cli.js assess --config config.test.yaml

# Production account (read-only!)
export AWS_PROFILE=prod-readonly
node dist/cli.js assess --config config.prod.yaml
```

Verify results make sense for each environment.

## Definition of "Test Complete"

Your changes are fully tested when:

1. ✅ **Unit tests pass** - `npm test` succeeds
2. ✅ **Linting passes** - `npm run lint` succeeds
3. ✅ **Builds successfully** - `npm run build` succeeds
4. ✅ **Manual test passes** - Assessment runs against fipco-infra
5. ✅ **No regressions** - Existing features still work
6. ✅ **Edge cases handled** - Tested error conditions
7. ✅ **Documentation updated** - If adding features

## Common Test Failures

### "Cannot find module"

You forgot to build:
```bash
npm run build
```

### "ENOENT: no such file or directory" (templates)

Templates not copied:
```bash
mkdir -p dist/dashboard/templates
cp src/dashboard/templates/dashboard.html dist/dashboard/templates/
```

### AWS Permission Errors

Use correct AWS profile:
```bash
export AWS_PROFILE=AWSAdministratorAccess-688672519222
aws sso login --profile AWSAdministratorAccess-688672519222
```

### "Documentation path does not exist"

Check config.fipco.yaml paths point to real fipco-infra location:
```bash
ls /Users/tim/repos/fipco-infra/docs/managed-service-provider
ls /Users/tim/repos/fipco-infra/cdk
```

## Before Creating PR

Complete this checklist:

```bash
# 1. Build
npm run build && echo "✅ Build passed"

# 2. Copy templates (if needed)
mkdir -p dist/dashboard/templates
cp src/dashboard/templates/dashboard.html dist/dashboard/templates/

# 3. Test
npm test && echo "✅ Tests passed"

# 4. Lint
npm run lint && echo "✅ Lint passed"

# 5. Manual test against fipco-infra
export AWS_PROFILE=AWSAdministratorAccess-688672519222
node dist/cli.js assess --config config.fipco.yaml && echo "✅ Manual test passed"

# 6. Verify outputs
ls -lh assessment-report.md assessment-report.json && echo "✅ Reports generated"
```

All green? Ready to create your PR! 🎉

See [WORKFLOW.md](WORKFLOW.md) for PR creation process.
