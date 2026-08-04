# Remediation Guidance

The MSP Readiness tool now includes comprehensive remediation guidance for common compliance gaps. When the assessment identifies issues, it automatically provides step-by-step instructions, code snippets, and AWS documentation links to help fix them.

## Features

### Automatic Enrichment

Assessment findings are automatically enriched with remediation guidance when:
- The finding represents a gap (not a supportive finding)
- The gap matches a known remediation pattern
- Detailed guidance is available for that finding type

### What's Included

Each remediation includes:

- **Root Cause**: Why this issue exists
- **Impact**: What risks or problems this creates
- **Risk Level**: Critical, High, Medium, or Low priority
- **Prerequisites**: What you need before starting
- **Step-by-Step Instructions**: Detailed remediation steps with:
  - CLI commands (AWS CLI)
  - Console walkthrough (AWS Console UI steps)
  - Additional details and context
- **Validation Steps**: How to verify the fix worked
- **Infrastructure as Code**: Ready-to-use code snippets for:
  - AWS CDK (TypeScript)
  - AWS CDK (Python)
  - CloudFormation (YAML)
  - Terraform (HCL)
- **AWS Documentation**: Links to official AWS docs
- **Effort Estimate**: Time required in hours

## Supported Remediations

Currently includes guidance for:

1. **config-not-enabled** - AWS Config not enabled in region
   - Critical priority, 2 hours
   - Includes S3 bucket setup, Config recorder, and managed rules

2. **cloudtrail-not-logging** - CloudTrail not logging API calls
   - Critical priority, 2 hours
   - Includes trail creation, S3 storage, and CloudWatch Logs integration

3. **no-backup-plans** - No AWS Backup plans configured
   - Critical priority, 3 hours
   - Includes vault setup, backup plan with multiple retention periods, and resource tagging

4. **old-access-keys** - IAM access keys not rotated
   - High priority, 2 hours
   - Includes key rotation procedure with zero-downtime process

5. **alb-invalid-headers** - ALB not dropping invalid HTTP headers
   - Medium priority, 0.5 hours
   - Simple attribute update with security best practices

6. **security-hub-not-enabled** - AWS Security Hub not enabled
   - High priority, 1 hour
   - Includes CIS Benchmark and AWS Foundational Security standards

7. **mfa-not-enabled** - Multi-factor authentication not enabled
   - Critical priority, 1 hour
   - Includes virtual MFA setup and enforcement policies

8. **inspector-not-enabled** - Amazon Inspector not enabled
   - High priority, 0.5 hours
   - Includes EC2, ECR, and Lambda scanning

## Usage

### In Assessment Reports

Remediation guidance is automatically included when you run:

```bash
npm run dev -- assess
```

This generates three reports:

1. **assessment-report.md** - Standard assessment with remediation indicators
2. **assessment-report.json** - Full JSON data including remediation
3. **assessment-report-remediation.md** - Dedicated remediation guide

### Example Output

The remediation report organizes findings by priority:

```markdown
## 🔴 Critical Priority Remediations

### AWS Config not enabled

**Source**: AWS Config Analysis
**Risk Level**: critical
**Estimated Effort**: 2 hours

#### Root Cause

AWS Config is not enabled in this region. Config is required for continuous 
compliance monitoring and resource inventory.

#### Impact

Without Config, you cannot track resource configurations over time, detect 
non-compliant resources automatically, or provide audit evidence of 
infrastructure state.

#### Remediation Steps

1. **Create S3 bucket for Config delivery**
   
   ```bash
   aws s3 mb s3://config-bucket-${ACCOUNT_ID}-${REGION} --region ${REGION}
   ```
   
   - Console steps:
     - Go to S3 console
     - Click "Create bucket"
     - Name: config-bucket-{account-id}-{region}
     - Enable versioning
     - Enable default encryption

2. **Enable AWS Config**
   
   ```bash
   aws configservice put-configuration-recorder ...
   ```

3. **Start the Config recorder**
   
   ```bash
   aws configservice start-configuration-recorder --configuration-recorder-name default
   ```

#### Infrastructure as Code

**cdk-typescript**: Enable AWS Config with S3 delivery bucket

```typescript
import * as config from 'aws-cdk-lib/aws-config';
import * as s3 from 'aws-cdk-lib/aws-s3';

// Create S3 bucket for Config
const configBucket = new s3.Bucket(this, 'ConfigBucket', {
  bucketName: `config-bucket-${this.account}-${this.region}`,
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});

// Enable AWS Config
const recorder = new config.CfnConfigurationRecorder(this, 'ConfigRecorder', {
  name: 'default',
  roleArn: configRole.roleArn,
  recordingGroup: {
    allSupported: true,
    includeGlobalResourceTypes: true,
  },
});
```

#### Validation

- Run: aws configservice describe-configuration-recorder-status
- Verify "recording" is true
- Check Config console shows resources being discovered
- Wait 10-15 minutes and verify configuration items appear in Config

#### AWS Documentation

- [Getting Started with AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/gs-console.html)
- [AWS Config Managed Rules](https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html)
```

## Adding New Remediations

To add remediation guidance for a new finding type:

### 1. Define the Guidance

Add to `src/data/remediation-guidance.ts`:

```typescript
export const REMEDIATION_GUIDANCE: Record<string, RemediationGuidance> = {
  'your-finding-type': {
    findingType: 'your-finding-type',
    rootCause: 'Why this issue exists',
    impact: 'What problems this causes',
    riskLevel: 'critical', // or 'high', 'medium', 'low'
    estimatedEffort: 2, // hours
    prerequisites: [
      'What you need before starting',
    ],
    steps: [
      {
        order: 1,
        action: 'First step',
        command: 'aws service command ...',
        consoleSteps: [
          'Go to AWS console',
          'Click this',
        ],
      },
      // More steps...
    ],
    validation: [
      'How to verify it worked',
    ],
    awsDocs: [
      'https://docs.aws.amazon.com/...',
    ],
    iacSnippets: [
      {
        language: 'cdk-typescript',
        description: 'What this code does',
        code: 'const x = new Service(...)',
        filePath: 'lib/service-stack.ts',
      },
    ],
  },
};
```

### 2. Add Pattern Matching

Update `mapGapToRemediationType()` in `src/data/remediation-guidance.ts`:

```typescript
export function mapGapToRemediationType(gapDescription: string): string | undefined {
  const gapLower = gapDescription.toLowerCase();

  if (gapLower.includes('your-service') && gapLower.includes('keyword')) {
    return 'your-finding-type';
  }
  
  // ... existing patterns
}
```

### 3. Add Tests

Create tests in `src/__tests__/data/remediation-guidance.test.ts`:

```typescript
it('should map your service gaps', () => {
  expect(mapGapToRemediationType('Your service not configured')).toBe('your-finding-type');
});
```

## Architecture

### Components

1. **Types** (`src/types.ts`)
   - `RemediationGuidance` - Core guidance structure
   - `RemediationStep` - Individual step
   - `IaCSnippet` - Code snippet with language
   - `AssessmentFinding.remediation` - Optional guidance on findings

2. **Data** (`src/data/remediation-guidance.ts`)
   - `REMEDIATION_GUIDANCE` - Database of all guidance
   - `getRemediationGuidance()` - Retrieve by finding type
   - `mapGapToRemediationType()` - Pattern matching

3. **Generator** (`src/generators/remediation-generator.ts`)
   - `enrichFindingsWithRemediation()` - Add guidance to findings
   - `generateRemediationReport()` - Aggregate and categorize
   - `generateRemediationMarkdown()` - Format as markdown
   - `saveRemediationReport()` - Write to file

4. **Integration** (`src/assessors/report-generator.ts`)
   - Automatically enriches assessments
   - Generates remediation reports alongside main report
   - Indicates remediation availability in main report

### Data Flow

```
Assessment Findings
        ↓
enrichFindingsWithRemediation()
        ↓
Findings + Remediation Guidance
        ↓
generateRemediationReport()
        ↓
Categorized by Risk Level
        ↓
generateRemediationMarkdown()
        ↓
remediation-report.md
```

## Benefits

1. **Actionable**: Specific commands and steps, not vague recommendations
2. **Complete**: Everything needed in one place - docs, code, validation
3. **Multiple Formats**: CLI commands, console steps, and IaC code
4. **Prioritized**: Risk-based ordering focuses attention on critical issues
5. **Extensible**: Easy to add new remediation patterns
6. **Time-Saving**: Eliminates research and trial-and-error

## Future Enhancements

Potential improvements for future releases:

- **Project-Specific Context**: Customize remediation based on detected tech stack
- **Cost Estimates**: Include AWS cost implications for each remediation
- **Dependency Detection**: Identify remediations that depend on others
- **Progress Tracking**: Track which remediations have been applied
- **Automated Remediation**: For low-risk fixes, offer to apply automatically
- **Terraform/Pulumi Support**: Add more IaC framework options
- **Multi-Account Guidance**: Instructions for organization-wide fixes
- **Compliance Mapping**: Show how each fix addresses specific compliance controls
