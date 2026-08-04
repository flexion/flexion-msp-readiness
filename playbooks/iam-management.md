---
generated: "2026-08-04T16:01:14.453Z"
template_version: "1.0"
status: "draft"
requirement_id: "SEC-004"
---

# IAM Management Playbook

**Project**: FIPCO
**Organization**: Flexion Org
**Last Updated**: 2026-08-04

## Purpose

This playbook defines Identity and Access Management (IAM) policies, procedures, and best practices for FIPCO to ensure secure access control following the principle of least privilege.

## Scope

This playbook covers:
- IAM users, groups, and roles
- IAM Identity Center (AWS SSO)
- Access key management and rotation
- MFA enforcement
- Service roles and instance profiles
- Cross-account access
- Access reviews and auditing

## IAM Strategy

### Core Principles

1. **Least Privilege**: Grant minimum permissions required
2. **Zero Trust**: Assume breach, verify everything
3. **Temporary Credentials**: Use roles instead of long-term keys
4. **MFA Everywhere**: Require MFA for all human users
5. **Audit Continuously**: Log and monitor all access

### Access Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Human Users** | Console/CLI access | IAM Identity Center with MFA |
| **Applications** | AWS service access | IAM roles (IRSA, instance profiles) |
| **CI/CD** | Deployment automation | OIDC federation (GitHub Actions) |
| **Cross-Account** | Multi-account access | IAM roles with trust policies |
| **Emergency** | Break-glass access | Root account (MFA protected) |

## IAM Identity Center (SSO)

### Configuration

**Identity Source**: AWS Managed (or external IdP: Azure AD, Okta)

**MFA**: Required for all users

**Session Duration**:
- Administrators: 4 hours
- Developers: 8 hours
- ReadOnly: 12 hours

### Permission Sets

#### 1. AdministratorAccess

**Use**: Full AWS access for senior engineers

**Policy**: AWS managed `AdministratorAccess`

**Accounts**: All (with approval)

**Restrictions**:
- MFA required
- Limited to 2-3 users
- Session duration: 4 hours
- Activity logged and monitored

#### 2. PowerUserAccess

**Use**: Developers needing broad access (no IAM changes)

**Policy**: AWS managed `PowerUserAccess`

**Accounts**: Dev, Staging

**Custom additions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:*",
        "cloudwatch:*",
        "ssm:StartSession"
      ],
      "Resource": "*"
    }
  ]
}
```

#### 3. DeveloperReadOnly

**Use**: Read-only production access for debugging

**Accounts**: Production

**Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "rds:Describe*",
        "s3:GetObject",
        "s3:ListBucket",
        "logs:Get*",
        "logs:Describe*",
        "logs:FilterLogEvents",
        "cloudwatch:Get*",
        "cloudwatch:List*"
      ],
      "Resource": "*"
    }
  ]
}
```

#### 4. SecurityAudit

**Use**: Security team access for auditing

**Accounts**: All

**Policy**: AWS managed `SecurityAudit` + `ViewOnlyAccess`

**Additional permissions**:
- GuardDuty findings
- Security Hub findings
- Config rules
- CloudTrail logs

### User Groups

**Groups**:
- **Engineering**: PowerUserAccess to dev/staging
- **SRE**: AdministratorAccess to all environments
- **Security**: SecurityAudit to all environments
- **Finance**: Billing console only
- **ReadOnly**: ViewOnlyAccess to all environments

## IAM Users (Minimize Usage)

### User Policy

**Preferred**: IAM Identity Center (SSO)

**IAM Users Allowed For**:
- Service accounts (rotate to roles when possible)
- Legacy integrations (migrate to roles)
- Break-glass emergency access

**Not Allowed**:
- Developer daily access (use SSO)
- Production application access (use roles)
- Long-term access keys in code

### Password Policy

**Requirements**:
- Minimum length: 14 characters
- Require uppercase letters
- Require lowercase letters
- Require numbers
- Require symbols
- Password expiration: 90 days
- Password reuse prevention: Last 24 passwords
- Allow users to change password: Yes

**Enforce via IAM**:
```bash
aws iam update-account-password-policy \
  --minimum-password-length 14 \
  --require-symbols \
  --require-numbers \
  --require-uppercase-characters \
  --require-lowercase-characters \
  --max-password-age 90 \
  --password-reuse-prevention 24 \
  --allow-users-to-change-password
```

### MFA Enforcement

**Policy**: MFA required for all IAM users

**Enforcement via IAM Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAllExceptListedIfNoMFA",
      "Effect": "Deny",
      "NotAction": [
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:GetUser",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices",
        "iam:ResyncMFADevice",
        "sts:GetSessionToken"
      ],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

**Supported MFA Devices**:
- Virtual MFA (Authy, Google Authenticator): Preferred
- Hardware tokens (YubiKey, Gemalto): Allowed
- SMS: Not allowed (security risk)

## IAM Roles

### Application Roles

**Naming Convention**: `FIPCO-dev-{service}-role`

**Example**: `FIPCO-dev-api-role`

**Trust Policy** (for EC2/ECS):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Permissions**: Minimum required for application
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::FIPCO-dev-data/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:FIPCO/dev/*"
    }
  ]
}
```

### Lambda Execution Roles

**Naming**: `FIPCO-dev-{function-name}-role`

**Minimum Permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/aws/lambda/FIPCO-*"
    }
  ]
}
```

**Additional Permissions**: Add as needed per function

### Cross-Account Roles

**Use Case**: Access resources in another AWS account

**Trust Policy** (in target account):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::SOURCE_ACCOUNT:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "unique-external-id-123"
        }
      }
    }
  ]
}
```

**Assume from Source Account**:
```bash
aws sts assume-role \
  --role-arn arn:aws:iam::TARGET_ACCOUNT:role/CrossAccountRole \
  --role-session-name session-name \
  --external-id unique-external-id-123
```

## Access Key Management

### Policy

**Preferred**: No access keys (use roles)

**When Required**:
- CI/CD (prefer OIDC federation)
- Third-party integrations (no other option)
- Legacy applications (migrate to roles)

**Requirements**:
- Rotate every 90 days (target: 60 days)
- Store in Secrets Manager (never in code)
- Monitor usage via CloudTrail
- Delete unused keys

### Access Key Rotation

**Automated Reminder** (Lambda + EventBridge):
```python
def lambda_handler(event, context):
    iam = boto3.client('iam')

    # Get all users
    users = iam.list_users()['Users']

    for user in users:
        # Get access keys
        keys = iam.list_access_keys(UserName=user['UserName'])['AccessKeyMetadata']

        for key in keys:
            age = (datetime.now(timezone.utc) - key['CreateDate']).days

            if age > 75:  # Warn at 75 days
                notify_user(user, key, age)

            if age > 90:  # Disable at 90 days
                iam.update_access_key(
                    UserName=user['UserName'],
                    AccessKeyId=key['AccessKeyId'],
                    Status='Inactive'
                )
                notify_security_team(user, key, age)
```

**Manual Rotation Process**:
1. Create new access key
2. Update application/service with new key
3. Test application with new key
4. Delete old access key
5. Document rotation in log

**Runbook**: See Access Key Rotation runbook

### Unused Access Key Cleanup

**Weekly Check** (Lambda):
- Check CloudTrail for access key usage
- If no usage in 90 days → Notify user
- If no usage in 180 days → Disable key
- If no usage in 365 days → Delete key

## Service Accounts (Bot Users)

### Policy

**Minimize IAM Users**: Migrate to roles where possible

**Required Service Accounts**:
- CI/CD (prefer OIDC over access keys)
- Third-party SaaS (no alternative)
- Legacy integrations

**Requirements**:
- Descriptive names: `svc-FIPCO-{purpose}`
- No console access
- Access keys rotated every 60 days
- Minimum permissions
- Documented owner and purpose

### CI/CD Authentication

**Preferred**: OIDC Federation (GitHub Actions)

**GitHub Actions OIDC Setup**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Flexion Org/FIPCO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

**GitHub Actions Workflow**:
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v2
  with:
    role-to-assume: arn:aws:iam::ACCOUNT:role/github-actions-role
    aws-region: us-east-1
```

## Access Reviews

### Quarterly IAM Access Review

**Scope**: All IAM users, roles, and permissions

**Process**:
1. Export IAM credential report:
```bash
aws iam generate-credential-report
aws iam get-credential-report --output text --query Content | base64 -d > iam-report.csv
```

2. Review each user:
   - Is user still active?
   - Is MFA enabled?
   - Last password change?
   - Access keys age?
   - Last used?

3. Review each role:
   - Is role still needed?
   - Permissions still appropriate?
   - Last used?

4. Clean up:
   - Disable inactive users
   - Delete unused roles
   - Remove excessive permissions
   - Rotate old access keys

5. Document findings and actions

**CloudWatch Dashboard**: `FIPCO-iam-compliance`

### Unused Permissions Analysis

**IAM Access Analyzer**: Identify unused permissions

**Enable**:
```bash
aws accessanalyzer create-analyzer \
  --analyzer-name FIPCO-access-analyzer \
  --type ACCOUNT
```

**Review Findings**:
```bash
aws accessanalyzer list-findings \
  --analyzer-arn arn:aws:access-analyzer:us-east-1:ACCOUNT:analyzer/FIPCO-access-analyzer
```

**Action**: Remove unused permissions based on findings

## Break-Glass Procedures

### Root Account Access

**Policy**: Root account only for emergency/required tasks

**Protection**:
- MFA with hardware token (YubiKey)
- Strong password (24+ characters)
- Credentials in secure vault (offline)
- No access keys
- CloudTrail monitors all root activity

**Required Uses**:
- Account recovery
- Changing account settings
- Restoring IAM access (if locked out)
- Support plan changes

**Procedure**:
1. Verify emergency requires root access
2. Get approval from VP Engineering + CISO
3. Retrieve root credentials from secure vault
4. Use MFA to login
5. Perform required task
6. Immediately log out
7. Document activity in incident log
8. Review CloudTrail logs

**Root Account Monitoring**:
```json
{
  "source": ["aws.signin"],
  "detail-type": ["AWS Console Sign In via CloudTrail"],
  "detail": {
    "userIdentity": {
      "type": ["Root"]
    }
  }
}
```
- Target: SNS → #support + PagerDuty + Email to security team

### Emergency IAM User

**Purpose**: Backup access if SSO unavailable

**User**: `emergency-access`

**Protection**:
- MFA required (hardware token)
- Strong password (secure vault)
- AdministratorAccess policy
- Only used when SSO down

**Monitoring**: Alert on any use

## IAM Policies (Custom)

### Policy Design Principles

1. **Explicit Deny**: Use deny for security boundaries
2. **Condition Keys**: Restrict by IP, MFA, time
3. **Resource-Level**: Specify exact resources
4. **Action-Level**: Specific actions, not wildcards
5. **Testing**: Test in non-production first

### Common Policy Patterns

**Restrict by IP**:
```json
{
  "Condition": {
    "IpAddress": {
      "aws:SourceIp": ["10.0.0.0/8", "203.0.113.0/24"]
    }
  }
}
```

**Require MFA**:
```json
{
  "Condition": {
    "Bool": {
      "aws:MultiFactorAuthPresent": "true"
    }
  }
}
```

**Restrict by Time**:
```json
{
  "Condition": {
    "DateGreaterThan": {"aws:CurrentTime": "2026-01-01T00:00:00Z"},
    "DateLessThan": {"aws:CurrentTime": "2026-12-31T23:59:59Z"}
  }
}
```

**Tag-Based Access**:
```json
{
  "Condition": {
    "StringEquals": {
      "ec2:ResourceTag/Environment": "dev"
    }
  }
}
```

## Monitoring and Alerting

### IAM Audit Alerts

**CloudWatch Alarms** (via CloudTrail metric filters):

1. **Root Account Usage**
2. **IAM Policy Changes**
3. **Failed Console Logins** (>5 in 10 min)
4. **Access Key Creation**
5. **MFA Deleted**
6. **Unauthorized API Calls**

**Daily IAM Report** (automated):
- Users without MFA
- Access keys >90 days
- Inactive users (no activity in 90 days)
- Users with AdministratorAccess
- Recently created/deleted users

## Compliance Mapping

| MSP Requirement | Evidence |
|----------------|----------|
| **SEC-004** | IAM policies, MFA enforcement, access review logs |
| **CIS Control 5** | Account management procedures |
| **CIS Control 6** | Access control policies, MFA, least privilege |

## Related Documents

- Security Policies Playbook
- AWS Account Configuration Playbook
- Access Key Rotation Runbook
- IAM Console: https://console.aws.amazon.com/iam/
- IAM Identity Center: https://console.aws.amazon.com/singlesignon/

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-04 | Initial playbook generated | MSP Readiness Tool |

---

**🤖 Generated by MSP Readiness Automation**
