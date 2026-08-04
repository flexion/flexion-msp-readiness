---
generated: "2026-08-04T16:01:14.450Z"
template_version: "1.0"
status: "draft"
requirement_id: "SEC-009"
---

# Data Protection Playbook

**Project**: FIPCO
**Organization**: Flexion Org
**Last Updated**: 2026-08-04

## Purpose

This playbook defines data protection strategies including encryption at rest and in transit, data classification, and data lifecycle management for FIPCO.

## Scope

This playbook covers:
- Data encryption (at rest and in transit)
- Key management (AWS KMS)
- Data classification and handling
- Data retention and deletion
- Access controls for sensitive data
- Compliance with data protection regulations

## Data Classification

### Classification Levels

| Level | Definition | Examples | Protection Requirements |
|-------|-----------|----------|------------------------|
| **PUBLIC** | Non-sensitive, publicly available | Marketing materials, documentation | Standard backups |
| **INTERNAL** | Internal use only | Business reports, metrics | Encryption at rest, access control |
| **CONFIDENTIAL** | Sensitive business data | Customer PII, financial records | Encryption at rest + transit, MFA, audit logging |
| **RESTRICTED** | Highly sensitive, regulated | PHI, payment data, credentials | Strong encryption, hardware tokens, DLP, encryption key rotation |

### Data Inventory

**RDS Databases**:
- **FIPCO-dev-db**: CONFIDENTIAL (customer PII)
- **FIPCO-dev-analytics**: INTERNAL (aggregated metrics)

**S3 Buckets**:
- **FIPCO-dev-data**: CONFIDENTIAL (customer files)
- **FIPCO-dev-logs**: INTERNAL (application logs)
- **FIPCO-dev-backups**: CONFIDENTIAL (database backups)
- **FIPCO-dev-public**: PUBLIC (static website assets)

**DynamoDB Tables**:
- **FIPCO-dev-sessions**: CONFIDENTIAL (user sessions)
- **FIPCO-dev-config**: INTERNAL (application config)

## Encryption at Rest

### KMS Key Architecture

**Customer Managed Keys (CMK)**:

**Primary Key**: `alias/FIPCO-dev-primary`
- **Usage**: RDS, EBS volumes, S3 confidential data
- **Key Policy**: Restricted to dev resources
- **Rotation**: Automatic annual rotation enabled

**Backup Key**: `alias/FIPCO-dev-backup`
- **Usage**: Backup vault, snapshot encryption
- **Key Policy**: Limited to backup service
- **Rotation**: Automatic annual rotation enabled

**Secrets Key**: `alias/FIPCO-dev-secrets`
- **Usage**: Secrets Manager, Parameter Store
- **Key Policy**: Application roles only
- **Rotation**: Automatic annual rotation enabled

**Key Policy Example**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM policies",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow services to use key",
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "rds.amazonaws.com",
          "s3.amazonaws.com",
          "lambda.amazonaws.com"
        ]
      },
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "*"
    }
  ]
}
```

### RDS Encryption

**Configuration**:
- **Encryption**: Enabled on all RDS instances
- **Key**: `alias/FIPCO-dev-primary`
- **Automated Backups**: Encrypted with same key
- **Read Replicas**: Encrypted with same key

**Create Encrypted RDS**:
```bash
aws rds create-db-instance \
  --db-instance-identifier FIPCO-dev-db \
  --storage-encrypted \
  --kms-key-id alias/FIPCO-dev-primary \
  --engine postgres \
  --master-username admin
```

**Encrypting Existing Unencrypted RDS**:
1. Create snapshot of current instance
2. Copy snapshot with encryption:
```bash
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier FIPCO-unencrypted-snap \
  --target-db-snapshot-identifier FIPCO-encrypted-snap \
  --kms-key-id alias/FIPCO-dev-primary
```
3. Restore from encrypted snapshot
4. Update connection strings
5. Verify application connectivity
6. Delete old unencrypted instance

### S3 Encryption

**Default Encryption**: Enabled on all buckets

**Configuration Options**:

**Confidential Data** (S3-KMS):
```bash
aws s3api put-bucket-encryption \
  --bucket FIPCO-dev-data \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "alias/FIPCO-dev-primary"
      },
      "BucketKeyEnabled": true
    }]
  }'
```

**Internal Data** (S3-SSE):
```bash
aws s3api put-bucket-encryption \
  --bucket FIPCO-dev-logs \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

**Bucket Key**: Enabled to reduce KMS costs (99% reduction in API calls)

### EBS Encryption

**Default Encryption**: Enabled at account level

**Enable by Default**:
```bash
aws ec2 enable-ebs-encryption-by-default --region us-east-1
```

**Encrypt Existing Volume**:
1. Create snapshot of volume
2. Copy with encryption:
```bash
aws ec2 copy-snapshot \
  --source-snapshot-id snap-xxxxx \
  --encrypted \
  --kms-key-id alias/FIPCO-dev-primary
```
3. Create new volume from encrypted snapshot
4. Attach to instance

### DynamoDB Encryption

**Encryption**: AWS owned key by default, upgrade to CMK for CONFIDENTIAL tables

**Enable CMK**:
```bash
aws dynamodb update-table \
  --table-name FIPCO-dev-sessions \
  --sse-specification \
    Enabled=true,SSEType=KMS,KMSMasterKeyId=alias/FIPCO-dev-primary
```

## Encryption in Transit

### TLS/SSL Requirements

**Minimum Version**: TLS 1.2
**Preferred Version**: TLS 1.3
**Cipher Suites**: Strong ciphers only (no RC4, 3DES)

### API Gateway / ALB

**Configuration**:
- TLS 1.2 minimum enforced
- SSL certificates from ACM
- Custom domain with valid certificate
- HSTS header enabled

**ALB Listener**:
```typescript
const listener = alb.addListener('Listener', {
  port: 443,
  protocol: ApplicationProtocol.HTTPS,
  certificates: [certificate],
  sslPolicy: SslPolicy.TLS12_EXT,
});
```

**Security Headers**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### RDS Connections

**Force SSL**:

**PostgreSQL**:
```sql
ALTER DATABASE FIPCO SET ssl = on;
ALTER USER app_user SET ssl = on;
```

**Application Connection String**:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

**MySQL**:
```sql
GRANT USAGE ON *.* TO 'app_user'@'%' REQUIRE SSL;
```

### S3 Data Transfer

**Enforce HTTPS Only**:

**Bucket Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::FIPCO-dev-data",
        "arn:aws:s3:::FIPCO-dev-data/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

### Inter-Service Communication

**VPC Endpoints**: Use for AWS service communication (S3, DynamoDB)
- Keeps traffic within AWS network
- No internet gateway required
- Private DNS names

**Service Mesh** (if using ECS/EKS):
- mTLS between services
- Certificate rotation via ACM Private CA
- Zero trust networking

## Key Management Procedures

### Key Rotation

**Automatic Rotation**: Enabled on all CMKs (annual)

**Manual Rotation** (when needed):
1. Create new key version
2. Update resource encryption to use new key
3. Re-encrypt data (if required)
4. Retire old key version after 90 days

**Monitor Rotation**:
```bash
aws kms get-key-rotation-status --key-id alias/FIPCO-dev-primary
```

### Key Access Auditing

**CloudTrail Logging**: All KMS API calls logged

**Monitor for**:
- Unauthorized decrypt attempts
- Key policy modifications
- Key scheduling for deletion
- Decrypt operations from unexpected IPs

**CloudWatch Alarm**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name kms-unauthorized-decrypt \
  --alarm-description "Alert on unauthorized KMS decrypt attempts" \
  --metric-name UnauthorizedDecrypt \
  --namespace AWS/KMS \
  --statistic Sum \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### Key Deletion

**Process** (requires approval):
1. Identify key to delete
2. Review usage via CloudTrail (last 90 days)
3. Verify no resources actively using key
4. Schedule deletion (7-30 day waiting period):
```bash
aws kms schedule-key-deletion --key-id KEY_ID --pending-window-in-days 30
```
5. Monitor for decrypt attempts during waiting period
6. If needed, cancel deletion:
```bash
aws kms cancel-key-deletion --key-id KEY_ID
```

## Data Lifecycle Management

### S3 Lifecycle Policies

**Confidential Data Bucket**:
```json
{
  "Rules": [
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```

**Log Data Retention**:
- CloudWatch Logs: 90 days
- S3 Access Logs: 1 year
- CloudTrail: 7 years (compliance requirement)

### Data Deletion

**Hard Delete Process** (for compliance/GDPR):

1. Identify data to delete (user request, retention policy)
2. Create deletion ticket with approval
3. Delete from primary storage:
```bash
aws s3api delete-object \
  --bucket FIPCO-dev-data \
  --key user-data/user-123.json
```
4. Delete from backups:
```bash
aws backup delete-recovery-point \
  --backup-vault-name FIPCO-dev-vault \
  --recovery-point-arn arn:aws:backup:...
```
5. Delete from RDS (SQL):
```sql
DELETE FROM users WHERE user_id = 123;
DELETE FROM user_data WHERE user_id = 123;
```
6. Verify deletion in all locations
7. Document in deletion log

**S3 Delete Markers**: For versioned buckets, ensure delete markers created

## Access Controls

### IAM Policies for Data Access

**Least Privilege**: Grant minimum permissions required

**Example - Read-Only S3 Access**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::FIPCO-dev-data",
        "arn:aws:s3:::FIPCO-dev-data/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:ACCOUNT:key/KEY_ID"
    }
  ]
}
```

### Data Access Logging

**S3 Access Logging**: Enabled on all confidential buckets

**CloudTrail Data Events**: Track S3 object-level operations

**RDS Audit Logging**: pgAudit for PostgreSQL
```sql
ALTER SYSTEM SET pgaudit.log = 'read,write';
```

**Access Review**: Monthly review of data access patterns

## Compliance & Auditing

### Encryption Compliance Check

**Monthly Verification**:
- [ ] All RDS instances encrypted
- [ ] All S3 buckets have default encryption
- [ ] EBS encryption by default enabled
- [ ] KMS key rotation enabled
- [ ] TLS 1.2+ enforced on all endpoints
- [ ] No public S3 buckets (unless explicitly approved)

**AWS Config Rules**:
- `encrypted-volumes`
- `rds-storage-encrypted`
- `s3-default-encryption-kms`
- `s3-bucket-ssl-requests-only`

### Audit Reports

**Quarterly Data Protection Report**:
1. Encryption coverage (% of data encrypted)
2. KMS key inventory and rotation status
3. Data classification updates
4. Access anomalies detected
5. Data deletion requests processed
6. Compliance violations (if any)

## Incident Response

### Data Breach Response

**If encryption key compromised**:
1. Immediately disable compromised key
2. Create new key
3. Re-encrypt all data with new key
4. Rotate application credentials
5. Review CloudTrail for unauthorized access
6. Notify affected parties (if required by law)

**If unencrypted data exposed**:
1. Contain exposure (remove public access, revoke credentials)
2. Assess scope (what data, how many records)
3. Enable encryption immediately
4. Review access logs for unauthorized access
5. Follow data breach notification procedures

## Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| **Security Team** | Key management, encryption standards, compliance audits |
| **DevOps Team** | Implement encryption, key rotation, monitoring |
| **Development Team** | Encrypt data in applications, secure credential handling |
| **Compliance Officer** | Data retention policies, deletion requests, audit coordination |

## Compliance Mapping

| MSP Requirement | Evidence |
|----------------|----------|
| **SEC-009** | Encryption configuration, KMS keys, TLS enforcement |
| **CIS Control 3** | Data protection policies, encryption at rest/transit |

## Related Documents

- Security Policies Playbook
- IAM Management Playbook
- Backup and Recovery Playbook
- KMS Console: https://console.aws.amazon.com/kms/home?region=us-east-1

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-04 | Initial playbook generated | MSP Readiness Tool |

---

**🤖 Generated by MSP Readiness Automation**
