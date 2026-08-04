# Troubleshooting Guide

Common issues and solutions when developing the MSP Readiness tool.

## Build Issues

### Templates Not Found

**Error**:
```
Error: ENOENT: no such file or directory, open '/Users/tim/repos/flexion-msp-readiness/dist/dashboard/templates/dashboard.html'
```

**Cause**: TypeScript build doesn't copy non-TS files (issue #5).

**Solution**:
```bash
mkdir -p dist/dashboard/templates
cp src/dashboard/templates/dashboard.html dist/dashboard/templates/
```

**Permanent Fix**: Issue #5 will add automatic template copying to the build process.

### TypeScript Compilation Errors

**Error**: `error TS2304: Cannot find name 'X'`

**Solution**:
```bash
# Clean and rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

### Module Not Found at Runtime

**Error**: `Cannot find module './some-module'`

**Cause**: Forgot to rebuild after changes.

**Solution**:
```bash
npm run build
```

**Tip**: Use watch mode during development:
```bash
npm run watch
```

## AWS Credential Issues

### Multiple Credential Sources Warning

**Warning**:
```
Multiple credential sources detected: 
Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
```

**Cause**: Environment variables conflict with AWS profile.

**Solution**:
```bash
# Option 1: Unset static credentials
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN

# Option 2: Explicitly use profile
export AWS_PROFILE=AWSAdministratorAccess-688672519222
```

**Note**: This is a warning, not an error. The tool will use AWS_PROFILE.

### Access Denied Errors

**Error**:
```
AccessDeniedException: User is not authorized to perform: cloudtrail:DescribeTrails
```

**Cause**: AWS profile lacks required permissions.

**Solutions**:

1. **Use admin profile**:
```bash
export AWS_PROFILE=AWSAdministratorAccess-688672519222
```

2. **Login to SSO**:
```bash
aws sso login --profile AWSAdministratorAccess-688672519222
```

3. **Skip AWS analysis** (if permissions unavailable):
```bash
node dist/cli.js assess --config config.fipco.yaml --skip-aws
```

4. **Request permissions**: Ask your AWS admin for read-only access to:
   - CloudTrail, Config, Security Hub, IAM, Backup, Inspector, CloudWatch

### Invalid Security Token

**Error**:
```
UnrecognizedClientException: The security token included in the request is invalid
```

**Cause**: SSO session expired.

**Solution**:
```bash
aws sso login --profile AWSAdministratorAccess-688672519222
```

**Check expiration**:
```bash
aws sts get-caller-identity --profile AWSAdministratorAccess-688672519222
```

## Configuration Issues

### Documentation Path Does Not Exist

**Error**:
```
Documentation path does not exist: /Users/tim/repos/fipco-infra/docs/managed-service-provider
Configured as: project.docs_path = "/Users/tim/repos/fipco-infra/docs/managed-service-provider"
```

**Cause**: Path in config.fipco.yaml is incorrect or fipco-infra not cloned.

**Solutions**:

1. **Check path exists**:
```bash
ls /Users/tim/repos/fipco-infra/docs/managed-service-provider
```

2. **Update config** with correct path:
```yaml
project:
  docs_path: "/correct/path/to/fipco-infra/docs/managed-service-provider"
```

3. **Clone fipco-infra** if missing:
```bash
cd ~/repos
git clone https://github.com/flexion/fipco-infra.git
```

### Infrastructure Path Does Not Exist

Same as above, but for `project.infra_path`.

**Solution**: Ensure CDK directory exists:
```bash
ls /Users/tim/repos/fipco-infra/cdk
```

## GitHub CLI Issues

### Project Permissions Missing

**Error**:
```
error: your authentication token is missing required scopes [read:project]
```

**Cause**: GitHub CLI not authenticated with project permissions.

**Solution**:
```bash
gh auth refresh -h github.com -s project -s read:project
```

Browser will open for authentication. Accept the permissions.

### move-issue.sh Fails

**Error**:
```
Error: Issue #X not found in project
```

**Causes**:
1. Issue not added to project board
2. Wrong project number
3. Wrong owner

**Solution**:
```bash
# Verify issue exists
gh issue view X --repo flexion/flexion-msp-readiness

# Check project board
gh project list --owner flexion

# Manually add issue to project via web UI:
# https://github.com/orgs/flexion/projects/53
```

### gh Command Not Found

**Error**: `command not found: gh`

**Solution**: Install GitHub CLI:
- **macOS**: `brew install gh`
- **Linux**: https://github.com/cli/cli#installation
- **Windows**: https://github.com/cli/cli#installation

## Runtime Errors

### No Findings Shown

**Issue**: Assessment runs but shows 0 findings, even though issues exist.

**Causes**:
1. AWS services not configured (Config, Security Hub disabled)
2. Running against wrong AWS account
3. Permissions insufficient

**Solutions**:
```bash
# 1. Check which account you're using
aws sts get-caller-identity

# 2. Verify services are enabled in that account
aws configservice describe-configuration-recorders
aws securityhub describe-hub

# 3. Try different account
export AWS_PROFILE=AWSAdministratorAccess-370153301343
```

**Expected**: Some services may not be enabled. Tool handles this gracefully.

### Dashboard Not Opening

**Issue**: Dashboard generates but doesn't open in browser.

**Cause**: `auto_open: true` in config but no browser available.

**Solution**:
```bash
# Manually open
open dashboard.html

# Or disable auto-open in config.fipco.yaml:
dashboard:
  auto_open: false
```

### Assessment Takes Too Long

**Issue**: Assessment runs for > 5 minutes.

**Causes**:
1. Many AWS resources to scan
2. Network latency
3. Inefficient code

**Solutions**:
```bash
# Skip AWS analysis for faster runs
node dist/cli.js assess --config config.fipco.yaml --skip-aws

# Use specific region only (not multi-region)
# Edit config.fipco.yaml:
aws:
  region: "us-east-1"
  additional_regions: []  # Empty
```

## Test Failures

### Unit Tests Fail After Changes

**Error**: Tests that previously passed now fail.

**Solutions**:

1. **Update test expectations** if behavior intentionally changed:
```typescript
// In test file
expect(result).toBe(newExpectedValue);
```

2. **Add new tests** for new functionality:
```typescript
describe('New Feature', () => {
  it('should work correctly', () => {
    // Test here
  });
});
```

3. **Check for unintended side effects**:
```bash
# Run specific test
npm test -- specific-test.test.ts

# Run with verbose output
npm test -- --verbose
```

### Lint Errors

**Error**: ESLint reports style violations.

**Solution**:
```bash
# Auto-fix most issues
npm run lint:fix

# Format code
npm run format

# Manual fixes for remaining issues
# Edit files and fix reported problems
```

## Development Issues

### Watch Mode Not Working

**Issue**: Changes don't trigger rebuild in watch mode.

**Solutions**:

1. **Restart watch**:
```bash
# Stop watch (Ctrl+C)
npm run watch
```

2. **Check file changes are saved**

3. **Manual build** if watch broken:
```bash
npm run build
```

### Git Issues

**Issue**: Can't push to remote.

**Causes**:
1. Not on feature branch
2. Remote branch doesn't exist
3. No permission to push

**Solutions**:

1. **Check current branch**:
```bash
git branch
# Should be: feature/issue-X-description
# NOT: main
```

2. **Create feature branch** if on main:
```bash
git checkout -b feature/issue-X-description
```

3. **Push with upstream**:
```bash
git push -u origin feature/issue-X-description
```

4. **Never force push** unless you know what you're doing

### PR Creation Fails

**Error**: `gh pr create` fails.

**Causes**:
1. Not on feature branch
2. No commits to push
3. Already have a PR open for this branch

**Solutions**:

1. **Check for existing PR**:
```bash
gh pr list --head feature/issue-X-description
```

2. **Ensure commits pushed**:
```bash
git push
```

3. **Check branch**:
```bash
git branch
# Must be on feature/issue-X-description, not main
```

## Known Limitations

### Issue #5: Build Process

Templates not automatically copied during build. Manual step required until fixed.

**Workaround**: Run after each build:
```bash
mkdir -p dist/dashboard/templates
cp src/dashboard/templates/dashboard.html dist/dashboard/templates/
```

### CDK Parser Limitations

Current CDK parser uses regex, not AST parsing. May miss:
- Complex property expressions
- Properties set via variables
- Dynamically constructed resources

**Future Enhancement**: Issue #13 will add full AST parsing.

### Missing Evidence Collectors

Not all AWS services supported yet. Currently missing:
- Security Hub (stub only)
- IAM Access Analyzer
- CloudWatch detailed metrics
- Systems Manager patch compliance

**In Progress**: Issue #3 adds these collectors.

## Getting More Help

If you're still stuck:

1. **Check documentation**:
   - [CLAUDE.md](CLAUDE.md) - Architecture and guidelines
   - [SETUP.md](SETUP.md) - Environment setup
   - [TESTING.md](TESTING.md) - Testing procedures
   - [WORKFLOW.md](WORKFLOW.md) - Git workflow

2. **Check existing issues**:
   - https://github.com/flexion/flexion-msp-readiness/issues
   - Search for error messages

3. **Create new issue**:
   - Include error message
   - Include steps to reproduce
   - Include environment details (OS, Node version, etc.)

4. **Ask in Slack** (if applicable):
   - Share error messages
   - Share what you've tried

## Quick Diagnostic Commands

When something's wrong, run these:

```bash
# Check Node/npm versions
node --version  # Should be v18+
npm --version   # Should be v9+

# Check AWS authentication
aws sts get-caller-identity
echo $AWS_PROFILE

# Check gh authentication  
gh auth status

# Check build status
npm run build

# Check project directory
ls dist/
ls src/

# Check config
cat config.fipco.yaml

# Run assessment with debugging
node dist/cli.js assess --config config.fipco.yaml 2>&1 | tee debug.log
```

Share `debug.log` when asking for help.
