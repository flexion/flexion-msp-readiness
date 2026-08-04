# AWS Permissions Required for MSP Readiness Tool

## 🎯 Quick Summary

**Current Issue**: Your role `ClaudeCodeAccess` is missing 4 core permissions, blocking 50% of evidence collectors.

**Quick Fix**: Attach AWS managed policy `SecurityAudit` to your role.

---

## 🚨 Current Permission Errors

From FIPCO assessment run on August 4, 2026:

```
User: arn:aws:sts::529237317113:assumed-role/AWSReservedSSO_ClaudeCodeAccess_b63e0b0b4fd22b51/trowley@flexion.us

Missing permissions:
✗ cloudtrail:DescribeTrails
✗ config:DescribeConfigRules  
✗ backup:ListBackupVaults
✗ inspector2:ListFindings
```

**Impact**: 4 out of 8 evidence collectors failed. Missing critical security data.

---

## 📋 Complete Permission List

### Core Collectors (Original - 4 services)

#### CloudTrail
```
cloudtrail:DescribeTrails          ← MISSING
cloudtrail:GetTrailStatus
cloudtrail:ListTags
```

#### AWS Config
```
config:DescribeConfigRules         ← MISSING
config:DescribeComplianceByConfigRule
config:DescribeConfigurationRecorders
config:DescribeDeliveryChannels
config:DescribeConformancePacks
config:GetComplianceDetailsByConfigRule
```

#### AWS Backup
```
backup:ListBackupVaults            ← MISSING
backup:ListBackupPlans
backup:ListRecoveryPointsByBackupVault
backup:DescribeBackupVault
backup:GetBackupPlan
```

#### Amazon Inspector
```
inspector2:ListFindings            ← MISSING
inspector2:DescribeFindings
inspector2:GetFindings
```

### New Collectors (Issue #3 - 4 services)

#### Security Hub
```
securityhub:GetFindings
securityhub:DescribeHub
securityhub:GetEnabledStandards
securityhub:ListFindingAggregators
securityhub:BatchImportFindings
```

#### IAM Access Analyzer
```
access-analyzer:ListAnalyzers
access-analyzer:ListFindings
access-analyzer:GetFinding
access-analyzer:GetAnalyzer
```

#### CloudWatch
```
cloudwatch:DescribeAlarms
cloudwatch:ListMetrics
cloudwatch:GetMetricStatistics
logs:DescribeLogGroups
logs:DescribeMetricFilters
logs:FilterLogEvents
```

#### Systems Manager
```
ssm:DescribeInstanceInformation
ssm:DescribeInstancePatchStates
ssm:DescribePatchBaselines
ssm:DescribePatchGroups
ssm:GetPatchBaseline
ssm:ListCommands
```

### Supporting Services

#### IAM (Analysis)
```
iam:GetAccountPasswordPolicy
iam:ListUsers
iam:ListMFADevices
iam:GetAccountSummary
iam:GenerateCredentialReport
iam:GetCredentialReport
iam:ListAccessKeys
iam:GetAccessKeyLastUsed
```

#### S3 (Resource Analysis)
```
s3:ListAllMyBuckets
s3:GetBucketEncryption
s3:GetBucketPublicAccessBlock
s3:GetBucketVersioning
s3:GetBucketLogging
```

#### EC2 (Infrastructure)
```
ec2:DescribeInstances
ec2:DescribeSecurityGroups
ec2:DescribeVolumes
ec2:DescribeVpcs
ec2:DescribeSubnets
```

---

## 🔧 Solution Options

### Option 1: AWS Managed Policy (RECOMMENDED)

Attach the AWS `SecurityAudit` managed policy - provides 90% of needed permissions:

```bash
aws iam attach-role-policy \
  --role-name AWSReservedSSO_ClaudeCodeAccess_b63e0b0b4fd22b51 \
  --policy-arn arn:aws:iam::aws:policy/SecurityAudit
```

**What this includes**:
- ✅ All CloudTrail permissions
- ✅ All Config permissions
- ✅ All Security Hub permissions
- ✅ All Inspector permissions
- ✅ All Backup permissions
- ✅ All IAM read permissions
- ✅ Most EC2, S3 read permissions

**Still need to add separately**:
- access-analyzer:* (not in SecurityAudit)
- Some SSM permissions

### Option 2: Custom Inline Policy (COMPLETE)

Create a custom policy with exactly what's needed:

**Save as `msp-readiness-policy.json`**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MSPReadinessAssessment",
      "Effect": "Allow",
      "Action": [
        "cloudtrail:DescribeTrails",
        "cloudtrail:GetTrailStatus",
        "cloudtrail:ListTags",
        
        "config:Describe*",
        "config:Get*",
        "config:List*",
        
        "backup:List*",
        "backup:Describe*",
        "backup:Get*",
        
        "inspector2:List*",
        "inspector2:Describe*",
        "inspector2:Get*",
        
        "securityhub:Get*",
        "securityhub:Describe*",
        "securityhub:List*",
        
        "access-analyzer:List*",
        "access-analyzer:Get*",
        
        "cloudwatch:Describe*",
        "cloudwatch:List*",
        "cloudwatch:Get*",
        
        "logs:Describe*",
        "logs:List*",
        "logs:Filter*",
        
        "ssm:Describe*",
        "ssm:List*",
        "ssm:Get*",
        
        "iam:GetAccountPasswordPolicy",
        "iam:ListUsers",
        "iam:ListMFADevices",
        "iam:GetAccountSummary",
        "iam:GenerateCredentialReport",
        "iam:GetCredentialReport",
        "iam:ListAccessKeys",
        "iam:GetAccessKeyLastUsed",
        
        "s3:ListAllMyBuckets",
        "s3:GetBucket*",
        
        "ec2:Describe*"
      ],
      "Resource": "*"
    }
  ]
}
```

**Apply it**:

```bash
# Create the policy
aws iam create-policy \
  --policy-name MSPReadinessToolPolicy \
  --policy-document file://msp-readiness-policy.json

# Attach to your role
aws iam attach-role-policy \
  --role-name AWSReservedSSO_ClaudeCodeAccess_b63e0b0b4fd22b51 \
  --policy-arn arn:aws:iam::529237317113:policy/MSPReadinessToolPolicy
```

### Option 3: Minimum Fix (QUICK START)

Just fix the 4 immediate errors to unblock:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MSPReadinessMinimum",
      "Effect": "Allow",
      "Action": [
        "cloudtrail:DescribeTrails",
        "config:DescribeConfigRules",
        "backup:ListBackupVaults",
        "inspector2:ListFindings"
      ],
      "Resource": "*"
    }
  ]
}
```

This gets you from **0/4 working collectors** to **4/4 working collectors** immediately.

---

## ✅ Verification Steps

After applying permissions, verify they work:

### 1. Test Individual Services

```bash
# Test CloudTrail
aws cloudtrail describe-trails --region us-east-1

# Test Config  
aws configservice describe-config-rules --region us-east-1

# Test Backup
aws backup list-backup-vaults --region us-east-1

# Test Inspector
aws inspector2 list-findings --region us-east-1

# Test Security Hub (new)
aws securityhub describe-hub --region us-east-1

# Test IAM Access Analyzer (new)
aws accessanalyzer list-analyzers --region us-east-1

# Test CloudWatch (new)
aws cloudwatch describe-alarms --region us-east-1

# Test Systems Manager (new)
aws ssm describe-instance-information --region us-east-1
```

### 2. Re-run MSP Assessment

```bash
cd /Users/tim/repos/flexion-msp-readiness
npm run dev -- assess --config config.fipco.yaml
```

**Expected improvements**:
- ✅ All 8 collectors working (was 0/8, should be 8/8)
- ✅ More findings (expect 250-350 vs 171)
- ✅ Better evidence coverage
- ✅ More accurate compliance assessment

### 3. Collect Evidence

```bash
npm run dev -- collect-evidence --config config.fipco.yaml
```

**Should see**:
- ✓ CloudTrail evidence collected
- ✓ Config rules evidence collected
- ✓ Backup evidence collected
- ✓ Inspector evidence collected
- ✓ Security Hub evidence collected (new!)
- ✓ IAM Analyzer evidence collected (new!)
- ✓ CloudWatch evidence collected (new!)
- ✓ SSM evidence collected (new!)

---

## 📊 Expected Impact

### Current State (With Permission Errors)

```
Evidence Collection Results:
✓ CloudTrail: 0 trails (but failed to check)
✓ Config: 0 rules (but failed to check)
✓ Backup: 0 vaults (but failed to check)
✓ Inspector: 0 findings (but failed to check)
✗ Security Hub: Not checked (no permissions)
✗ IAM Analyzer: Not checked (no permissions)
✗ CloudWatch: Not checked (no permissions)
✗ SSM: Not checked (no permissions)

Working Collectors: 0/8 (0%)
Findings: 171
Evidence Files: 4
```

### After Permissions Fixed

```
Evidence Collection Results:
✓ CloudTrail: X trails found
✓ Config: X rules found
✓ Backup: X vaults found
✓ Inspector: X findings
✓ Security Hub: X findings
✓ IAM Analyzer: X findings
✓ CloudWatch: X alarms, X log groups
✓ SSM: X instances, X patches

Working Collectors: 8/8 (100%)
Findings: 250-350 (expected)
Evidence Files: 8+
```

---

## 🔐 Security Considerations

### Read-Only Access

All permissions are **read-only**:
- ✅ No `Put*`, `Create*`, `Delete*`, `Update*` actions
- ✅ No resource modifications
- ✅ Only `Describe*`, `List*`, `Get*` operations
- ✅ Safe for production accounts

### Principle of Least Privilege

The tool only requests permissions it actually uses:
- ✅ 8 collectors = 8 service groups
- ✅ Each permission mapped to specific feature
- ✅ No wildcard `*:*` permissions
- ✅ Scoped to assessment requirements

### AWS Best Practices

✅ Use AWS managed policies when possible (`SecurityAudit`)  
✅ Create custom policies for fine-grained control  
✅ Review permissions quarterly  
✅ Use AWS Access Analyzer to validate policy

---

## 🆘 Troubleshooting

### "User is not authorized" Errors

**Symptom**: `AccessDeniedException: User: arn:aws:sts:... is not authorized to perform: <action>`

**Cause**: Missing IAM permission

**Fix**: Add the specific permission to your role policy

### "Service is not enabled" vs "No permissions"

The tool distinguishes:
- ❌ **AccessDenied**: Missing permission (add permission)
- ⚠️ **Service Disabled**: Service not configured (enable service)

Example:
```
Failed to collect CloudTrail evidence: AccessDeniedException
→ Need permission: cloudtrail:DescribeTrails

CloudTrail Evidence: Total trails: 0
→ Service enabled, but no trails configured (need to enable CloudTrail)
```

### SSO/Assumed Role Issues

If using AWS SSO (like ClaudeCodeAccess role):

1. Update the **permission set** in AWS SSO
2. Wait for propagation (can take 5-15 minutes)
3. Re-authenticate: `aws sso login`
4. Verify: `aws sts get-caller-identity`

---

## 📝 Next Steps

### 1. Apply Permissions (Choose One)

**Quick**: Attach `SecurityAudit` managed policy
```bash
aws iam attach-role-policy \
  --role-name AWSReservedSSO_ClaudeCodeAccess_b63e0b0b4fd22b51 \
  --policy-arn arn:aws:iam::aws:policy/SecurityAudit
```

**Complete**: Create custom MSPReadinessToolPolicy (see Option 2 above)

### 2. Re-run Assessment

```bash
cd /Users/tim/repos/flexion-msp-readiness
npm run dev -- assess --config config.fipco.yaml
```

### 3. Review Results

Check for:
- ✅ All 8 collectors working
- ✅ More comprehensive findings
- ✅ Better compliance visibility
- ✅ Complete evidence collection

### 4. Generate Reports

```bash
npm run dev -- generate --config config.fipco.yaml
npm run dev -- dashboard --config config.fipco.yaml
```

---

## 🔗 References

- **Issue #6**: [Add Pre-flight AWS Permission Check](https://github.com/flexion/flexion-msp-readiness/issues/6)
- **AWS SecurityAudit Policy**: [Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html#jf_security-auditor)
- **AWS Config Permissions**: [Docs](https://docs.aws.amazon.com/config/latest/developerguide/security-iam.html)
- **Security Hub Permissions**: [Docs](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-prereqs.html)

---

**Generated**: August 4, 2026  
**Tool Version**: 1.0.0  
**Assessment Run**: FIPCO Infrastructure
