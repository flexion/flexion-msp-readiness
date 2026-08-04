# Environment Setup

Complete setup guide for developing the MSP Readiness tool.

## Prerequisites

- **Node.js**: v18+ (check: `node --version`)
- **npm**: v9+ (check: `npm --version`)
- **AWS CLI**: v2+ (check: `aws --version`)
- **GitHub CLI**: v2.92+ (check: `gh --version`)
- **Git**: v2.30+ (check: `git --version`)

## Initial Setup

### 1. Clone and Install

```bash
git clone https://github.com/flexion/flexion-msp-readiness.git
cd flexion-msp-readiness
npm install
```

### 2. Build the Project

```bash
npm run build

# IMPORTANT: Copy template files (until issue #5 is fixed)
mkdir -p dist/dashboard/templates
cp src/dashboard/templates/dashboard.html dist/dashboard/templates/
```

**Note**: The build process doesn't automatically copy template files. This is tracked in issue #5.

### 3. AWS Credentials Setup

The tool requires AWS access to collect evidence and analyze infrastructure.

#### Recommended: Use AWS SSO Profile

```bash
# List available profiles
aws configure list-profiles

# Use a profile with AdministratorAccess or read-only access
export AWS_PROFILE=AWSAdministratorAccess-688672519222

# Login if using SSO
aws sso login --profile AWSAdministratorAccess-688672519222
```

#### Configuration File

Update `config.fipco.yaml` with your AWS profile:

```yaml
aws:
  profile: "AWSAdministratorAccess-688672519222"  # Your profile name
  region: "us-east-1"
  stage: "dev"
```

#### Common Issue: Multiple Credential Sources

You may see this warning:
```
Multiple credential sources detected: 
Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
```

**Solution**: Unset static credentials if not needed:
```bash
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN
```

Or explicitly set the profile you want:
```bash
export AWS_PROFILE=AWSAdministratorAccess-688672519222
```

### 4. GitHub CLI Setup

The project uses `gh` CLI for managing issues and pull requests.

#### Authenticate

```bash
gh auth login
```

#### Add Project Permissions

**CRITICAL**: The `gh` CLI needs project permissions to manage the GitHub project board.

```bash
gh auth refresh -h github.com -s project -s read:project
```

This will open a browser for authentication. Accept the permissions.

#### Verify Authentication

```bash
gh auth status

# Should show:
# - Token scopes: 'gist', 'project', 'read:org', 'repo', 'workflow'
```

#### Test Project Access

```bash
gh project list --owner flexion

# Should see project #53: "MSP Readiness"
```

### 5. Verify Setup

Run a test assessment:

```bash
export AWS_PROFILE=AWSAdministratorAccess-688672519222
node dist/cli.js assess --config config.fipco.yaml
```

Expected output:
- ✔ Documentation scanned (66 files)
- ✔ CDK infrastructure parsed (23 files)
- ✔ AWS infrastructure analyzed
- Assessment report generated

## Configuration Files

### config.fipco.yaml

This file is configured to scan the real fipco-infra repository:

```yaml
project:
  name: "FIPCO"
  docs_path: "/Users/tim/repos/fipco-infra/docs/managed-service-provider"
  infra_path: "/Users/tim/repos/fipco-infra/cdk"

aws:
  profile: "AWSAdministratorAccess-688672519222"
  region: "us-east-1"
  stage: "dev"
```

**Path Requirements**:
- `docs_path`: Must point to fipco-infra MSP documentation directory
- `infra_path`: Must point to fipco-infra CDK directory

If these paths don't exist, you'll get an error:
```
Documentation path does not exist: /path/to/docs
```

## Required AWS Permissions

The tool requires read-only AWS permissions for:

**Core Services**:
- CloudTrail: `DescribeTrails`, `GetTrailStatus`, `ListTags`
- AWS Config: `DescribeConfigRules`, `DescribeComplianceByConfigRule`
- Security Hub: `GetFindings`, `DescribeHub`
- IAM: `GetAccountPasswordPolicy`, `ListUsers`, `ListMFADevices`

**Evidence Collection**:
- Backup: `ListBackupVaults`, `ListBackupPlans`
- Inspector: `ListFindings`, `DescribeFindings`
- CloudWatch: `DescribeAlarms`, `ListMetrics`

**Note**: Missing permissions will show warnings but won't break the tool. It gracefully handles permission errors.

## Development Tools

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features

### Useful Commands

```bash
# Watch mode (auto-rebuild on changes)
npm run watch

# Run tests
npm test
npm run test:watch

# Lint and format
npm run lint
npm run lint:fix
npm run format

# Run CLI
npm run dev -- assess --config config.fipco.yaml
```

## Troubleshooting Setup

### "Command not found: gh"

Install GitHub CLI:
- **macOS**: `brew install gh`
- **Linux**: See https://github.com/cli/cli#installation
- **Windows**: See https://github.com/cli/cli#installation

### "gh project list" fails

Ensure you have project permissions:
```bash
gh auth refresh -h github.com -s project -s read:project
```

### AWS Permission Errors

If you see `AccessDeniedException`, your AWS profile lacks required permissions. Either:
1. Use a profile with AdministratorAccess
2. Request read-only permissions for the services listed above
3. Skip AWS analysis: `node dist/cli.js assess --skip-aws`

### Build Errors

If TypeScript compilation fails:
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Template Files Missing

If you see `ENOENT: no such file or directory, open '.../dist/dashboard/templates/dashboard.html'`:

```bash
# Manually copy templates (until issue #5 is fixed)
mkdir -p dist/dashboard/templates
cp src/dashboard/templates/dashboard.html dist/dashboard/templates/
```

## Next Steps

After setup is complete:

1. Review [WORKFLOW.md](WORKFLOW.md) for git/PR workflow
2. Check [CLAUDE.md](CLAUDE.md) for architecture and guidelines
3. See [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) for available issues
4. Start working on an issue: `./scripts/move-issue.sh <number> in-progress`

## Getting Help

- **Issues**: https://github.com/flexion/flexion-msp-readiness/issues
- **Project Board**: https://github.com/orgs/flexion/projects/53
- **Documentation**: See CLAUDE.md, WORKFLOW.md, CONTRIBUTING.md
