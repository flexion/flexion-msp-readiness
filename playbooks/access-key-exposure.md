---
generated: "2026-08-04T16:01:14.470Z"
template_version: "1.0"
status: "draft"
requirement_id: "SECP-001"
---

# Access Key Exposure Detection and Response Runbook

**Project**: FIPCO
**Organization**: Flexion Org
**Last Updated**: 2026-08-04

## Purpose

This runbook provides step-by-step procedures for detecting and responding to exposed AWS access keys, automated response configuration, and prevention strategies.

## Scope

- AWS Health event monitoring for exposed access keys
- Automated detection and response
- Manual response procedures
- Post-incident cleanup
- Prevention strategies

## Overview

When AWS detects an access key exposed (e.g., in public GitHub repo), it sends an AWS Health event. This runbook ensures rapid response to minimize risk.

## Automated Response System

### Architecture

**AWS Health Event** → **EventBridge Rule** → **Lambda Function** → **Actions**:
1. Disable exposed access key
2. Create snapshot of current permissions
3. Notify security team
4. Create incident ticket
5. Log event

### EventBridge Rule

**Create Rule**:
```bash
aws events put-rule \
  --name FIPCO-access-key-exposed \
  --description "Detect exposed AWS access keys" \
  --event-pattern '{
    "source": ["aws.health"],
    "detail-type": ["AWS Health Event"],
    "detail": {
      "service": ["RISK"],
      "eventTypeCategory": ["issue"],
      "eventTypeCode": ["AWS_RISK_CREDENTIALS_EXPOSED"]
    }
  }'
```

**Add Lambda Target**:
```bash
aws events put-targets \
  --rule FIPCO-access-key-exposed \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:ACCOUNT:function:FIPCO-access-key-response"
```

### Lambda Response Function

**Function**: `FIPCO-access-key-response`

**Code** (Python):
```python
import boto3
import json
from datetime import datetime

iam = boto3.client('iam')
sns = boto3.client('sns')
ssm = boto3.client('ssm')

def lambda_handler(event, context):
    print(f"Health Event: {json.dumps(event)}")

    # Extract access key from event
    access_key_id = event['detail']['affectedEntities'][0]['entityValue']

    # Get user associated with access key
    try:
        response = iam.list_access_keys()
        user_name = None
        for user in response['AccessKeyMetadata']:
            if user['AccessKeyId'] == access_key_id:
                user_name = user['UserName']
                break

        if not user_name:
            print(f"Could not find user for access key: {access_key_id}")
            return

        # Capture current state for forensics
        user_policies = iam.list_attached_user_policies(UserName=user_name)
        user_groups = iam.list_groups_for_user(UserName=user_name)

        # Store in Parameter Store for investigation
        ssm.put_parameter(
            Name=f'/security/exposed-key/{access_key_id}',
            Value=json.dumps({
                'userName': user_name,
                'accessKeyId': access_key_id,
                'exposedAt': datetime.now().isoformat(),
                'policies': user_policies['AttachedPolicies'],
                'groups': user_groups['Groups']
            }),
            Type='SecureString',
            Overwrite=True
        )

        # Disable the access key immediately
        iam.update_access_key(
            UserName=user_name,
            AccessKeyId=access_key_id,
            Status='Inactive'
        )

        print(f"Disabled access key {access_key_id} for user {user_name}")

        # Notify security team
        message = f"""
🚨 CRITICAL: AWS Access Key Exposed

Access Key: {access_key_id}
User: {user_name}
Detected: {datetime.now().isoformat()}
Action Taken: Access key DISABLED immediately

IMMEDIATE ACTIONS REQUIRED:
1. Review CloudTrail for unauthorized activity
2. Rotate access key
3. Notify application owners
4. Investigate exposure source

Details: https://console.aws.amazon.com/cloudtrail/home?region=us-east-1#/events?EventName=UpdateAccessKey
        """

        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:ACCOUNT:security-alerts',
            Subject=f'🚨 Access Key Exposed: {access_key_id}',
            Message=message
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'action': 'key_disabled',
                'accessKeyId': access_key_id,
                'userName': user_name
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        # Notify even if we fail
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:ACCOUNT:security-alerts',
            Subject='ERROR: Access Key Exposure Response Failed',
            Message=f'Failed to disable access key {access_key_id}: {str(e)}'
        )
        raise
```

**IAM Permissions Required**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:ListAccessKeys",
        "iam:UpdateAccessKey",
        "iam:ListAttachedUserPolicies",
        "iam:ListGroupsForUser"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:us-east-1:ACCOUNT:security-alerts"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:PutParameter"
      ],
      "Resource": "arn:aws:ssm:us-east-1:ACCOUNT:parameter/security/exposed-key/*"
    }
  ]
}
```

## Manual Response Procedure

### Step 1: Identify Exposed Key (0-5 minutes)

**Notification Sources**:
- AWS Health Dashboard: https://phd.aws.amazon.com/
- Email from AWS Security
- Slack alert in #support
- PagerDuty incident

**Gather Information**:
1. Access Key ID: `AKIA...`
2. Exposure location: GitHub repo, public S3, etc.
3. Detection time
4. User associated with key

**Identify User**:
```bash
aws iam list-access-keys --query 'AccessKeyMetadata[?AccessKeyId==`AKIA...`]'
```

### Step 2: Disable Access Key Immediately (5-10 minutes)

**Disable Key**:
```bash
USER_NAME="identified-user"
ACCESS_KEY_ID="AKIA..."

aws iam update-access-key \
  --user-name $USER_NAME \
  --access-key-id $ACCESS_KEY_ID \
  --status Inactive
```

**Verify Disabled**:
```bash
aws iam list-access-keys --user-name $USER_NAME \
  --query 'AccessKeyMetadata[?AccessKeyId==`'$ACCESS_KEY_ID'`]'
```

**Expected Output**: Status should show `Inactive`

### Step 3: Assess Impact (10-30 minutes)

**Check Permissions**:
```bash
# List user policies
aws iam list-attached-user-policies --user-name $USER_NAME

# List group memberships
aws iam list-groups-for-user --user-name $USER_NAME

# List inline policies
aws iam list-user-policies --user-name $USER_NAME
```

**Review CloudTrail for Unauthorized Activity**:
```bash
# Get events from exposed key (last 90 days)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=$ACCESS_KEY_ID \
  --max-results 50 \
  --query 'Events[*].[EventTime,EventName,Username,SourceIPAddress]' \
  --output table
```

**Key Questions**:
- When was the key first exposed?
- Was the key used after exposure?
- What API calls were made?
- From what IP addresses?
- Were any resources modified/deleted?
- Was data accessed or exfiltrated?

**CloudWatch Insights Query**:
```
fields @timestamp, eventName, sourceIPAddress, userAgent, errorCode
| filter userIdentity.accessKeyId = "AKIA..."
| sort @timestamp desc
| limit 100
```

### Step 4: Containment (30-60 minutes)

**If Unauthorized Activity Detected**:

1. **Revoke Active Sessions**:
```bash
# Attach deny-all policy temporarily
aws iam put-user-policy \
  --user-name $USER_NAME \
  --policy-name DenyAll-Emergency \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Deny",
        "Action": "*",
        "Resource": "*"
      }
    ]
  }'
```

2. **Isolate Compromised Resources**:
- If EC2 launched: Isolate with security group (no ingress/egress)
- If S3 bucket modified: Enable MFA delete, versioning
- If IAM changes: Revert unauthorized changes

3. **Preserve Evidence**:
- Download CloudTrail logs
- Screenshot AWS Health event
- Document timeline
- Save all commands and outputs

### Step 5: Notify Stakeholders (Concurrent with above)

**Immediate Notification** (#support):
```
🚨 Security Incident: Exposed Access Key

Access Key: AKIA...
User: [username]
Exposure: [location - e.g., GitHub repo URL]
Status: Key DISABLED
Unauthorized Activity: [YES/NO - details]

Investigation in progress. Updates every 30 minutes.
War Room: [video link]
```

**Notify**:
- Security team
- Engineering Manager
- Application owner (if service account)
- Compliance team (if data accessed)

### Step 6: Cleanup and Recovery (1-4 hours)

**Delete Exposed Key**:
```bash
aws iam delete-access-key \
  --user-name $USER_NAME \
  --access-key-id $ACCESS_KEY_ID
```

**Create New Key**:
```bash
aws iam create-access-key --user-name $USER_NAME
```

**Rotate in Applications**:
1. Update application configuration with new key
2. Update Secrets Manager/Parameter Store
3. Deploy updated configuration
4. Verify application functionality
5. Document rotation

**Remove Temporary Restrictions**:
```bash
# Remove deny-all policy if applied
aws iam delete-user-policy \
  --user-name $USER_NAME \
  --policy-name DenyAll-Emergency
```

### Step 7: Remove Exposed Key from Source (Concurrent)

**GitHub**:
1. Delete from repository
2. Remove from git history:
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/credentials.txt" \
  --prune-empty --tag-name-filter cat -- --all

git push --force --all
```
3. Notify GitHub Security to invalidate cached copies

**Public S3/Website**:
1. Delete file immediately
2. Check CloudFront cache
3. Invalidate cached copies

**Other Locations**:
- Slack messages: Delete and notify admins
- Documentation: Update immediately
- Docker images: Rebuild and push new versions

### Step 8: Post-Incident Activities (1-7 days)

**Immediate** (Day 1):
- Document incident timeline
- Assess business impact
- File incident report

**Short-term** (Day 2-3):
- Complete CloudTrail review
- Verify no unauthorized charges
- Check for persistence mechanisms (backdoors)
- Scan for other exposed secrets

**Medium-term** (Week 1):
- Post-incident review (PIR)
- Update response procedures
- Implement preventive controls
- Training for team

## Prevention Strategies

### 1. Eliminate Access Keys

**Prefer IAM Roles**:
- EC2: Instance profiles
- ECS: Task roles
- Lambda: Execution roles
- Kubernetes: IRSA (IAM Roles for Service Accounts)

**For CI/CD**: Use OIDC federation (GitHub Actions, GitLab)

**Migrate Service Accounts**:
- Identify all access keys
- Convert to roles where possible
- Delete unused keys

### 2. Secret Scanning

**GitHub Secret Scanning**: Enable (automatic for public repos)

**Pre-commit Hooks**:
```bash
# Install git-secrets
git secrets --install

# Add AWS patterns
git secrets --register-aws

# Scan entire repository
git secrets --scan-history
```

**CI/CD Scanning**:
```yaml
# GitHub Actions
- name: Scan for secrets
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
```

### 3. Access Key Hygiene

**Policies**:
- Rotate keys every 90 days (enforce with Config rule)
- No keys in code repositories
- Store in Secrets Manager/Parameter Store
- Use temporary credentials (STS) where possible
- Monitor key age and usage

**AWS Config Rule**:
```bash
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "access-keys-rotated",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ACCESS_KEYS_ROTATED"
    },
    "InputParameters": "{\"maxAccessKeyAge\": \"90\"}"
  }'
```

### 4. Monitoring and Alerting

**CloudWatch Alarms**:
- New access key created
- Access key >90 days old
- Access key unused for 90 days
- Unusual API calls with access key

**EventBridge Rules**:
- IAM credential changes
- Access key rotation events

### 5. Least Privilege

**Restrict Key Permissions**:
- Grant minimum required permissions
- Use conditions (IP, MFA, time-based)
- Regular permission reviews

**Example Policy** (restricted by IP):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "NotIpAddress": {
          "aws:SourceIp": [
            "203.0.113.0/24",
            "198.51.100.0/24"
          ]
        }
      }
    }
  ]
}
```

## Testing

### Quarterly Test

**Simulate Exposure**:
1. Create test IAM user with limited permissions
2. Create access key
3. "Expose" key in test GitHub repo (private, then public briefly)
4. Verify automated response triggers
5. Follow manual procedures
6. Document test results
7. Update runbook

**Success Criteria**:
- Automation disables key within 5 minutes
- Team notified immediately
- Manual procedures followed correctly
- Recovery completed within 1 hour

## Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| **Security Team** | Incident response, forensic analysis, prevention |
| **DevOps Team** | Key rotation, application updates, automation maintenance |
| **Application Owners** | Application-specific key rotation, testing |
| **Compliance Team** | Incident documentation, regulatory reporting (if required) |

## Compliance Mapping

| MSP Requirement | Evidence |
|----------------|----------|
| **SECP-001** | Automated response lambda, EventBridge rule, detection logs |
| **CIS Control 6** | Access key monitoring, rotation policies, incident response |

## Related Documents

- Access Key Rotation Runbook
- Incident Response Playbook
- IAM Management Playbook
- Security Policies Playbook

## Contact Information

- **Security Team**: msp-team@example.com
- **Slack Channel**: #support
- **PagerDuty**: On-call engineer

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-04 | Initial runbook generated | MSP Readiness Tool |

---

**🤖 Generated by MSP Readiness Automation**
