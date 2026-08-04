---
generated: "2026-08-04T16:01:14.471Z"
template_version: "1.0"
status: "draft"
requirement_id: "SECP-002"
---

# Public Resources Detection and Remediation Runbook

**Project**: FIPCO
**Organization**: Flexion Org
**Last Updated**: 2026-08-04

## Purpose

This runbook provides procedures for detecting and remediating unintentionally public AWS resources, including S3 buckets, RDS snapshots, EBS snapshots, and AMIs.

## Scope

- S3 bucket public access detection and remediation
- RDS snapshot public access
- EBS snapshot public access
- AMI public access
- Automated detection and remediation
- Prevention strategies

## Overview

Publicly accessible resources pose a significant security risk. This runbook ensures rapid detection and remediation of unintentionally public resources.

## Detection Methods

### AWS Config Rules

**1. S3 Bucket Public Read Prohibited**:
```bash
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "s3-bucket-public-read-prohibited",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "S3_BUCKET_PUBLIC_READ_PROHIBITED"
    }
  }'
```

**2. S3 Bucket Public Write Prohibited**:
```bash
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "s3-bucket-public-write-prohibited",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "S3_BUCKET_PUBLIC_WRITE_PROHIBITED"
    }
  }'
```

**3. RDS Snapshots Public Prohibited**:
```bash
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "rds-snapshots-public-prohibited",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "RDS_SNAPSHOTS_PUBLIC_PROHIBITED"
    }
  }'
```

**4. EBS Snapshots Public Prohibited** (Custom):
```python
# Lambda function for custom Config rule
def lambda_handler(event, context):
    config = boto3.client('config')
    ec2 = boto3.client('ec2')

    # Get all EBS snapshots owned by this account
    snapshots = ec2.describe_snapshots(OwnerIds=['self'])['Snapshots']

    compliance_results = []

    for snapshot in snapshots:
        # Check if snapshot is public
        create_volume_permissions = snapshot.get('CreateVolumePermissions', [])

        is_public = any(
            perm.get('Group') == 'all'
            for perm in create_volume_permissions
        )

        compliance_results.append({
            'ResourceId': snapshot['SnapshotId'],
            'ResourceType': 'AWS::EC2::Snapshot',
            'ComplianceType': 'NON_COMPLIANT' if is_public else 'COMPLIANT'
        })

    # Report to Config
    config.put_evaluations(
        Evaluations=compliance_results,
        ResultToken=event['resultToken']
    )
```

### Security Hub

**Findings**:
- `S3.1`: S3 Block Public Access setting should be enabled
- `S3.2`: S3 buckets should prohibit public read access
- `S3.3`: S3 buckets should prohibit public write access
- `S3.8`: S3 Block Public Access setting should be enabled at the bucket-level
- `RDS.1`: RDS snapshots should be private
- `EC2.1`: EBS snapshots should not be publicly restorable

**View Findings**:
```bash
aws securityhub get-findings \
  --filters '{"Title": [{"Value": "S3", "Comparison": "PREFIX"}], "ComplianceStatus": [{"Value": "FAILED", "Comparison": "EQUALS"}]}'
```

## Automated Remediation

### EventBridge + Lambda Auto-Remediation

**EventBridge Rule**:
```bash
aws events put-rule \
  --name FIPCO-public-resource-detected \
  --description "Auto-remediate public resources" \
  --event-pattern '{
    "source": ["aws.securityhub"],
    "detail-type": ["Security Hub Findings - Imported"],
    "detail": {
      "findings": {
        "Compliance": {
          "Status": ["FAILED"]
        },
        "Title": [{
          "prefix": "S3.2"
        }, {
          "prefix": "S3.3"
        }]
      }
    }
  }'
```

**Lambda Remediation Function**:
```python
import boto3
import json

s3 = boto3.client('s3')
ec2 = boto3.client('ec2')
rds = boto3.client('rds')
sns = boto3.client('sns')
securityhub = boto3.client('securityhub')

def lambda_handler(event, context):
    print(f"Event: {json.dumps(event)}")

    findings = event['detail']['findings']

    for finding in findings:
        resource_type = finding['Resources'][0]['Type']
        resource_id = finding['Resources'][0]['Id']
        finding_id = finding['Id']

        try:
            if resource_type == 'AwsS3Bucket':
                remediate_s3_bucket(resource_id, finding_id)
            elif resource_type == 'AwsRdsDbSnapshot':
                remediate_rds_snapshot(resource_id, finding_id)
            elif resource_type == 'AwsEc2Snapshot':
                remediate_ebs_snapshot(resource_id, finding_id)

            # Update Security Hub finding
            securityhub.update_findings(
                Filters={'Id': [{'Value': finding_id, 'Comparison': 'EQUALS'}]},
                Note={
                    'Text': 'Auto-remediated: Public access blocked',
                    'UpdatedBy': 'AutoRemediation'
                },
                Workflow={'Status': 'RESOLVED'}
            )

        except Exception as e:
            print(f"Error remediating {resource_id}: {str(e)}")
            notify_security_team(resource_type, resource_id, str(e))

def remediate_s3_bucket(bucket_arn, finding_id):
    # Extract bucket name from ARN
    bucket_name = bucket_arn.split(':::')[-1]

    print(f"Blocking public access for S3 bucket: {bucket_name}")

    # Block all public access
    s3.put_public_access_block(
        Bucket=bucket_name,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': True,
            'IgnorePublicAcls': True,
            'BlockPublicPolicy': True,
            'RestrictPublicBuckets': True
        }
    )

    # Remove public ACLs
    try:
        s3.put_bucket_acl(
            Bucket=bucket_name,
            ACL='private'
        )
    except:
        pass  # May fail if bucket policy prevents

    notify_security_team(
        'AwsS3Bucket',
        bucket_name,
        'Public access blocked automatically'
    )

def remediate_rds_snapshot(snapshot_arn, finding_id):
    # Extract snapshot ID
    snapshot_id = snapshot_arn.split(':')[-1]

    print(f"Making RDS snapshot private: {snapshot_id}")

    # Make snapshot private
    rds.modify_db_snapshot_attribute(
        DBSnapshotIdentifier=snapshot_id,
        AttributeName='restore',
        ValuesToRemove=['all']
    )

    notify_security_team(
        'AwsRdsDbSnapshot',
        snapshot_id,
        'Snapshot made private automatically'
    )

def remediate_ebs_snapshot(snapshot_arn, finding_id):
    # Extract snapshot ID
    snapshot_id = snapshot_arn.split('/')[-1]

    print(f"Making EBS snapshot private: {snapshot_id}")

    # Make snapshot private
    ec2.modify_snapshot_attribute(
        SnapshotId=snapshot_id,
        Attribute='createVolumePermission',
        OperationType='remove',
        GroupNames=['all']
    )

    notify_security_team(
        'AwsEc2Snapshot',
        snapshot_id,
        'Snapshot made private automatically'
    )

def notify_security_team(resource_type, resource_id, message):
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:ACCOUNT:security-alerts',
        Subject=f'Public Resource Auto-Remediated: {resource_type}',
        Message=f"""
A public resource was detected and automatically remediated:

Resource Type: {resource_type}
Resource ID: {resource_id}
Action Taken: {message}
Timestamp: {datetime.now().isoformat()}

Please review and confirm this action was appropriate.
Console: https://console.aws.amazon.com/
        """
    )
```

**IAM Permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutPublicAccessBlock",
        "s3:PutBucketAcl",
        "s3:GetBucketAcl",
        "s3:GetPublicAccessBlock"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:ModifyDBSnapshotAttribute",
        "rds:DescribeDBSnapshotAttributes"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:ModifySnapshotAttribute",
        "ec2:DescribeSnapshotAttribute"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "securityhub:UpdateFindings"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:us-east-1:ACCOUNT:security-alerts"
    }
  ]
}
```

## Manual Remediation Procedures

### S3 Bucket Public Access

**Step 1: Identify Public Buckets**

```bash
# List all buckets
aws s3api list-buckets --query 'Buckets[*].Name' --output text | while read bucket; do
  echo "Checking bucket: $bucket"

  # Check public access block configuration
  aws s3api get-public-access-block --bucket $bucket 2>/dev/null || echo "No block config"

  # Check bucket ACL
  aws s3api get-bucket-acl --bucket $bucket --query 'Grants[?Grantee.URI==`http://acs.amazonaws.com/groups/global/AllUsers`]'

  # Check bucket policy for public access
  aws s3api get-bucket-policy --bucket $bucket 2>/dev/null | jq '.Policy | fromjson | .Statement[] | select(.Principal == "*" or .Principal.AWS == "*")'
done
```

**Step 2: Verify if Public Access is Intentional**

**Check Tags**:
```bash
aws s3api get-bucket-tagging --bucket BUCKET_NAME
```

**Expected Tag** (if intentionally public):
```json
{
  "PublicAccess": "approved",
  "ApprovedBy": "security-team",
  "ApprovalDate": "2026-08-04",
  "Reason": "Public website hosting"
}
```

**Step 3: Block Public Access (if unintentional)**

```bash
BUCKET_NAME="FIPCO-dev-data"

# Block all public access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

**Step 4: Remove Public ACL**

```bash
# Set ACL to private
aws s3api put-bucket-acl --bucket $BUCKET_NAME --acl private
```

**Step 5: Remove Public Bucket Policy**

```bash
# Review current policy
aws s3api get-bucket-policy --bucket $BUCKET_NAME

# Remove policy if completely public
aws s3api delete-bucket-policy --bucket $BUCKET_NAME

# Or update policy to remove public statements
# (Edit policy JSON, then)
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://updated-policy.json
```

**Step 6: Verify**

```bash
# Verify block configuration
aws s3api get-public-access-block --bucket $BUCKET_NAME

# Test public access (should fail)
curl -I https://$BUCKET_NAME.s3.amazonaws.com/test-file.txt
# Expected: 403 Forbidden
```

### RDS Snapshot Public Access

**Step 1: Identify Public Snapshots**

```bash
# List manual snapshots
aws rds describe-db-snapshots \
  --snapshot-type manual \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier]' \
  --output text | while read snapshot; do

  # Check if public
  aws rds describe-db-snapshot-attributes \
    --db-snapshot-identifier $snapshot \
    --query 'DBSnapshotAttributesResult.DBSnapshotAttributes[?AttributeName==`restore`].AttributeValues' \
    --output text | grep -q "all" && echo "PUBLIC: $snapshot"
done
```

**Step 2: Make Snapshot Private**

```bash
SNAPSHOT_ID="FIPCO-dev-snapshot-20260804"

# Remove public restore permission
aws rds modify-db-snapshot-attribute \
  --db-snapshot-identifier $SNAPSHOT_ID \
  --attribute-name restore \
  --values-to-remove all
```

**Step 3: Verify**

```bash
# Check attributes
aws rds describe-db-snapshot-attributes \
  --db-snapshot-identifier $SNAPSHOT_ID \
  --query 'DBSnapshotAttributesResult.DBSnapshotAttributes[?AttributeName==`restore`]'
```

### EBS Snapshot Public Access

**Step 1: Identify Public Snapshots**

```bash
# List snapshots with public permissions
aws ec2 describe-snapshots \
  --owner-ids self \
  --query 'Snapshots[*].[SnapshotId]' \
  --output text | while read snapshot; do

  # Check if public
  aws ec2 describe-snapshot-attribute \
    --snapshot-id $snapshot \
    --attribute createVolumePermission \
    --query 'CreateVolumePermissions[?Group==`all`]' \
    --output text | grep -q "all" && echo "PUBLIC: $snapshot"
done
```

**Step 2: Make Snapshot Private**

```bash
SNAPSHOT_ID="snap-0123456789abcdef0"

# Remove public permission
aws ec2 modify-snapshot-attribute \
  --snapshot-id $SNAPSHOT_ID \
  --attribute createVolumePermission \
  --operation-type remove \
  --group-names all
```

**Step 3: Verify**

```bash
# Check attributes
aws ec2 describe-snapshot-attribute \
  --snapshot-id $SNAPSHOT_ID \
  --attribute createVolumePermission
```

### AMI Public Access

**Step 1: Identify Public AMIs**

```bash
# List AMIs with public permissions
aws ec2 describe-images \
  --owners self \
  --query 'Images[?Public==`true`].[ImageId,Name]' \
  --output table
```

**Step 2: Make AMI Private**

```bash
AMI_ID="ami-0123456789abcdef0"

# Remove public launch permission
aws ec2 modify-image-attribute \
  --image-id $AMI_ID \
  --launch-permission "Remove=[{Group=all}]"
```

**Step 3: Verify**

```bash
# Check if AMI is private
aws ec2 describe-images \
  --image-ids $AMI_ID \
  --query 'Images[0].Public'
```

## Prevention Strategies

### 1. S3 Block Public Access (Account-Level)

**Enable for Entire Account**:
```bash
aws s3control put-public-access-block \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

**Benefits**:
- Prevents accidental public access across all buckets
- New buckets automatically protected
- Can still allow specific buckets via exemption

### 2. Service Control Policies (SCPs)

**Deny Public S3 Buckets** (Organization-wide):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "s3:PutBucketPublicAccessBlock"
      ],
      "Resource": "*",
      "Condition": {
        "Bool": {
          "s3:BlockPublicAcls": "false"
        }
      }
    },
    {
      "Effect": "Deny",
      "Action": [
        "s3:PutAccountPublicAccessBlock"
      ],
      "Resource": "*",
      "Condition": {
        "Bool": {
          "s3:BlockPublicAcls": "false"
        }
      }
    }
  ]
}
```

**Deny Public Snapshots**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "rds:ModifyDBSnapshotAttribute",
        "ec2:ModifySnapshotAttribute",
        "ec2:ModifyImageAttribute"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "rds:attributeName": "restore",
          "ec2:Add/Group": "all"
        }
      }
    }
  ]
}
```

### 3. IAM Policies

**Prevent Users from Making Resources Public**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "s3:PutBucketAcl",
        "s3:PutBucketPolicy",
        "s3:PutObjectAcl"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "s3:x-amz-acl": [
            "public-read*",
            "public-write*"
          ]
        }
      }
    }
  ]
}
```

### 4. Tagging and Approval Process

**Approval Process for Public Resources**:
1. Create change ticket
2. Security team reviews and approves
3. Tag resource with approval metadata
4. Document business justification
5. Quarterly review of approved public resources

**Required Tags**:
```json
{
  "PublicAccess": "approved",
  "ApprovedBy": "security-lead@example.com",
  "ApprovalDate": "2026-08-04",
  "ReviewDate": "2026-11-04",
  "BusinessJustification": "Public website hosting"
}
```

### 5. Regular Audits

**Weekly Automated Scan**:
- Lambda function scans for public resources
- Compare against approved list
- Alert on unapproved public resources
- Report to security team

**Monthly Manual Review**:
- Review all approved public resources
- Verify still required
- Update approvals and tags
- Revoke if no longer needed

## Testing

### Quarterly Test

**Test Detection**:
1. Create test S3 bucket
2. Make bucket public (with test tag)
3. Verify Config rule detects (within 15 minutes)
4. Verify Security Hub finding created
5. Verify automated remediation triggers
6. Verify notification sent to #support

**Test Remediation**:
1. Follow manual remediation procedures
2. Verify access blocked
3. Verify Config rule compliance
4. Document any issues

**Clean up test resources**

## Incident Response

### If Data Exposed

**Immediate Actions**:
1. Block public access immediately
2. Determine what data was exposed
3. Determine exposure duration
4. Check access logs (S3 access logs, CloudTrail)
5. Identify if data was accessed
6. Assess compliance/regulatory impact

**Notification Requirements**:
- GDPR: 72 hours if personal data
- State breach laws: Varies by state
- Consult legal and compliance teams

**Post-Incident**:
- Document exposure in incident log
- Post-incident review (PIR)
- Update prevention controls
- Consider external security audit

## Metrics

**Track Monthly**:
- Public resources detected
- Mean time to detection (MTTD)
- Mean time to remediation (MTTR)
- Auto-remediation success rate
- False positives (approved public resources flagged)

**Targets**:
- MTTD: <15 minutes (Config evaluation)
- MTTR: <5 minutes (automated), <1 hour (manual)
- Auto-remediation rate: >90%

## Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| **Security Team** | Detection, approval process, incident response |
| **DevOps Team** | Remediation, automation maintenance, prevention |
| **Application Owners** | Justify public access needs, maintain approvals |
| **Compliance Team** | Breach notification, regulatory requirements |

## Compliance Mapping

| MSP Requirement | Evidence |
|----------------|----------|
| **SECP-002** | Config rules, auto-remediation lambda, prevention procedures |
| **CIS Control 4** | Secure configuration, public access controls |

## Related Documents

- Security Policies Playbook
- AWS Account Configuration Playbook
- Incident Response Playbook
- Config Console: https://console.aws.amazon.com/config/
- Security Hub Console: https://console.aws.amazon.com/securityhub/

## Contact Information

- **Security Team**: msp-team@example.com
- **Slack Channel**: #support

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-04 | Initial runbook generated | MSP Readiness Tool |

---

**🤖 Generated by MSP Readiness Automation**
