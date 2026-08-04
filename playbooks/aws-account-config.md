---
generated: "2026-08-04T16:01:14.452Z"
template_version: "1.0"
status: "approved"
requirement_id: "SEC-003"
last_modified: "2026-08-04T16:01:30.612Z"
---


# AWS Account Configuration Playbook

**Project**: FIPCO
**Organization**: Flexion Org
**Last Updated**: 2026-08-04

## Purpose

This playbook documents the AWS account baseline configuration for FIPCO per AWS MSP Program Appendix A requirements and CIS AWS Foundations Benchmark.

## Scope

This playbook covers:
- AWS Control Tower setup
- AWS Config rules and compliance
- CloudTrail configuration
- GuardDuty threat detection
- Security Hub standards
- IAM Identity Center (SSO)
- AWS Organizations structure
- Service Control Policies (SCPs)

## AWS Organizations Structure

### Organization Hierarchy

```
Root
├── Security OU
│   ├── Log Archive Account
│   └── Audit Account
├── Infrastructure OU
│   └── Shared Services Account
├── Workloads OU
│   ├── FIPCO-prod
│   ├── FIPCO-staging
│   └── FIPCO-dev
└── Sandbox OU
    └── Developer Sandbox Accounts
```

### Account Standards

**Naming Convention**: `{projectName}-{environment}` or `{function}-{purpose}`

**Required Tags**:
- Environment: production|staging|development|sandbox
- Project: FIPCO
- Owner: team-email
- CostCenter: cost-code

**Account Contacts**:
- Operations: msp-team@example.com
- Security: msp-team@example.com
- Billing: msp-team@example.com

## AWS Control Tower

### Control Tower Configuration

**Enabled Regions**:
- Home Region: us-east-1
- Governed Regions: us-east-1, 

**Landing Zone Version**: Latest (auto-update enabled)

**Guardrails Enabled**:

**Strongly Recommended (Preventive)**:
- Disallow changes to CloudTrail
- Disallow deletion of log archives
- Disallow changes to AWS Config
- Disallow internet access for VPCs (except approved)

**Elective (Detective)**:
- Detect public read access to S3 buckets
- Detect public write access to S3 buckets
- Detect whether MFA is enabled for root user
- Detect whether unrestricted incoming TCP traffic is allowed

**Customizations**:
- Account Factory customizations for baseline setup
- Automated tagging via Control Tower Lifecycle Events
- Integration with Service Catalog for provisioning

### Account Factory

**Baseline Configuration** (applied to all new accounts):
1. VPC with private/public subnets
2. CloudTrail enabled
3. Config enabled
4. GuardDuty enabled
5. Security Hub enabled
6. Default encryption enabled (S3, EBS)
7. Standard IAM roles
8. Tagging enforcement

## CloudTrail Configuration

### Organization Trail

**Trail Name**: `Flexion Org-org-trail`

**Configuration**:
- Enabled in all regions: Yes
- Multi-region trail: Yes
- Organization trail: Yes (logs all accounts)
- Management events: Read and Write
- Data events: S3 and Lambda (selected buckets/functions)
- Insights: Enabled (API call rate anomalies)

**Log Storage**:
- S3 Bucket: `Flexion Org-cloudtrail-logs`
- Encryption: KMS (key alias: `alias/cloudtrail-key`)
- Log file validation: Enabled
- Retention: 7 years (compliance requirement)

**Lifecycle Policy**:
```
0-90 days: S3 Standard
90-365 days: S3 Standard-IA
365+ days: S3 Glacier Deep Archive
```

**CloudWatch Integration**:
- Stream to CloudWatch Logs: Enabled
- Log Group: `/aws/cloudtrail/Flexion Org`
- Retention: 90 days

### Data Events Monitoring

**S3 Buckets** (confidential data only):
- `FIPCO-dev-data`
- `FIPCO-dev-backups`

**Lambda Functions** (sensitive operations):
- Functions with IAM role modifications
- Functions accessing databases

**Metric Filters**:
- Root account usage
- Unauthorized API calls
- IAM policy changes
- Security group changes
- Network ACL changes
- S3 bucket policy changes

## AWS Config

### Config Recorder

**Recording Strategy**: All resources, all regions

**Resource Types**:
- All supported resources
- Global resources (IAM, Route53) recorded in home region only

**Delivery Channel**:
- S3 Bucket: `Flexion Org-config-logs`
- SNS Topic: `config-compliance-notifications`
- Delivery frequency: 24 hours

### Config Rules (MSP Required)

**Security**:

1. **access-keys-rotated**: IAM access keys rotated within 90 days
   - Severity: MEDIUM
   - Remediation: Manual (notify user)

2. **iam-password-policy**: IAM password policy meets requirements
   - Min length: 14
   - Require uppercase, lowercase, numbers, symbols
   - Max age: 90 days
   - Password reuse: Last 24 passwords

3. **mfa-enabled-for-iam-console-access**: All IAM users have MFA
   - Severity: HIGH
   - Remediation: Auto-notify user, disable after 7 days

4. **root-account-mfa-enabled**: Root account has MFA
   - Severity: CRITICAL
   - Remediation: Immediate alert to security team

5. **s3-bucket-public-read-prohibited**: No S3 buckets allow public read
   - Severity: HIGH
   - Remediation: Auto-remediate (block public access)

6. **s3-bucket-public-write-prohibited**: No S3 buckets allow public write
   - Severity: CRITICAL
   - Remediation: Auto-remediate (block public access)

7. **rds-storage-encrypted**: All RDS instances encrypted
   - Severity: HIGH
   - Remediation: Manual (create encrypted copy)

8. **encrypted-volumes**: All EBS volumes encrypted
   - Severity: HIGH
   - Remediation: Manual (create encrypted snapshot)

**Compliance**:

9. **approved-amis-by-tag**: Only approved AMIs used
   - Severity: MEDIUM
   - Approved tag: `approved=true`

10. **vpc-flow-logs-enabled**: VPC flow logs enabled
    - Severity: MEDIUM
    - Remediation: Auto-remediate

11. **cloudtrail-enabled**: CloudTrail enabled
    - Severity: CRITICAL
    - Remediation: Alert (do not auto-fix)

12. **guardduty-enabled-centralized**: GuardDuty enabled
    - Severity: HIGH
    - Remediation: Auto-remediate

### Custom Config Rules

**Resource Tagging**:
```python
# Lambda function checking required tags
def evaluate_compliance(config_item):
    required_tags = ['Environment', 'Project', 'Owner']
    resource_tags = config_item['tags']

    missing_tags = [tag for tag in required_tags if tag not in resource_tags]

    if missing_tags:
        return 'NON_COMPLIANT', f'Missing tags: {missing_tags}'
    return 'COMPLIANT'
```

**Backup Verification**:
- Check resources tagged `backup=true` have backup plans

**Patch Compliance**:
- Verify SSM patch compliance for EC2 instances

## Security Hub

### Enabled Standards

1. **AWS Foundational Security Best Practices v1.0.0**
   - All controls enabled
   - Exceptions documented in exception register

2. **CIS AWS Foundations Benchmark v1.4.0**
   - All controls enabled
   - Custom response times per severity

3. **PCI DSS v3.2.1** (if applicable)
   - Enabled if handling payment data

### Security Hub Insights

**Custom Insights**:

1. **Critical Findings - Last 7 Days**
   - Filter: Severity = CRITICAL, RecordState = ACTIVE
   - Group by: ResourceId

2. **Failed CIS Controls**
   - Filter: ComplianceStatus = FAILED, Standard = CIS
   - Group by: ControlId

3. **Public S3 Buckets**
   - Filter: ResourceType = S3, Title contains "public"
   - Group by: ResourceId

4. **Unencrypted Resources**
   - Filter: Title contains "encrypted", ComplianceStatus = FAILED
   - Group by: ResourceType

### Automated Response

**EventBridge Rules**:

**Critical Findings**:
```json
{
  "source": ["aws.securityhub"],
  "detail-type": ["Security Hub Findings - Imported"],
  "detail": {
    "findings": {
      "Severity": {
        "Label": ["CRITICAL"]
      }
    }
  }
}
```
- Target: SNS → #support + PagerDuty

**Auto-Remediation**:
- S3 public access → Block immediately
- Security group 0.0.0.0/0 → Alert and create ticket
- Unencrypted resource → Create encrypted copy (manual approval)

## GuardDuty

### GuardDuty Configuration

**Enabled**: Yes (organization-wide)

**Finding Types**:
- Malicious IPs
- Cryptocurrency mining
- Backdoor activity
- Credential exfiltration
- Port scanning
- Unusual API calls

**S3 Protection**: Enabled on all buckets

**EKS Protection**: Enabled (if using EKS)

**Malware Protection**: Enabled (if using EC2)

### GuardDuty Response

**Severity Handling**:

**HIGH/CRITICAL**:
- Immediate alert to security team
- Automatic ticket creation
- Isolate affected resource (if confirmed malicious)

**MEDIUM**:
- Daily digest to security team
- Review and investigate within 48 hours

**LOW**:
- Weekly summary
- Review during security team meeting

**Automated Actions** (via Lambda):
1. Isolate compromised EC2 (revoke security group rules)
2. Disable compromised IAM credentials
3. Snapshot forensics data
4. Notify security team

**Example - Auto-Isolate EC2**:
```python
def lambda_handler(event, context):
    finding = event['detail']['findings'][0]

    if finding['Severity']['Label'] == 'HIGH':
        instance_id = extract_instance_id(finding)

        # Create forensic snapshot
        ec2.create_snapshot(InstanceId=instance_id)

        # Isolate instance
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            Groups=['sg-isolation-group']  # No ingress/egress
        )

        # Notify
        sns.publish(
            TopicArn='arn:aws:sns:...:security-alerts',
            Subject=f'EC2 Instance Isolated: {instance_id}',
            Message=f'GuardDuty finding: {finding["Title"]}'
        )
```

## IAM Identity Center (AWS SSO)

### SSO Configuration

**Identity Source**: AWS Managed (or Azure AD/Okta)

**Session Duration**: 8 hours

**MFA**: Required for all users

**Permission Sets**:

1. **AdministratorAccess**: Full admin (2-3 users only)
   - MFA: Required
   - Session duration: 4 hours

2. **PowerUserAccess**: Developer access (no IAM changes)
   - Accounts: Dev, Staging
   - MFA: Required

3. **ReadOnlyAccess**: Audit and monitoring
   - Accounts: All
   - MFA: Required

4. **SecurityAudit**: Security team access
   - Accounts: All
   - Permissions: SecurityAudit + ViewOnlyAccess
   - MFA: Required

### User Groups

**Administrators**:
- Members: 2-3 senior engineers
- Access: AdministratorAccess to all accounts

**Developers**:
- Members: Engineering team
- Access: PowerUserAccess to dev/staging, ReadOnly to prod

**SecurityTeam**:
- Members: Security team
- Access: SecurityAudit to all accounts

**Finance**:
- Members: Finance team
- Access: Billing console only

## Service Control Policies (SCPs)

### Root OU SCP

**DenyRootUserOperations**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:PrincipalArn": "arn:aws:iam::*:root"
        }
      }
    }
  ]
}
```

**RequireMFA**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
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

### Production OU SCP

**DenyResourceDeletion** (without approval):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "rds:DeleteDBInstance",
        "dynamodb:DeleteTable",
        "s3:DeleteBucket"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalTag/BreakGlassApproved": "true"
        }
      }
    }
  ]
}
```

**RestrictRegions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["us-east-1", ""]
        }
      }
    }
  ]
}
```

## Compliance Monitoring

### Daily Checks

**Automated** (CloudWatch Events):
- [ ] Config compliance status
- [ ] Security Hub critical findings
- [ ] GuardDuty high severity findings
- [ ] IAM access keys >90 days
- [ ] Root account usage

### Weekly Reviews

**Security Team**:
- Review all GuardDuty findings
- Review Security Hub trends
- Check Config rule compliance
- Review CloudTrail for anomalies

### Monthly Reports

**MSP Compliance Report**:
1. Config rule compliance rates
2. Security Hub finding summary
3. GuardDuty incident count
4. IAM access review
5. CloudTrail unusual activity
6. Cost optimization recommendations

## Maintenance Procedures

### Adding New AWS Account

1. Use Control Tower Account Factory
2. Apply baseline configuration automatically
3. Add to appropriate OU
4. Apply SCPs
5. Provision IAM Identity Center access
6. Configure centralized logging
7. Enable Security Hub aggregation
8. Update CMDB

### Updating Config Rules

1. Test rule in non-production account
2. Create change ticket
3. Deploy via CloudFormation/CDK
4. Monitor for false positives
5. Adjust if needed
6. Document in this playbook

### GuardDuty Tuning

**Suppression Rules**:
- Create for known false positives
- Document reason for suppression
- Review quarterly

**Example**:
```bash
aws guardduty create-filter \
  --detector-id abc123 \
  --name "Suppress-Internal-Port-Scanning" \
  --finding-criteria 'Criterion={"type": {"Eq": ["Recon:EC2/PortProbeUnprotectedPort"]}, "service.action.networkConnectionAction.remoteIpDetails.ipAddressV4": {"Eq": ["10.0.0.0/8"]}}'
```

## Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| **Cloud Architect** | Account structure, baseline configuration, SCPs |
| **Security Team** | Security Hub, GuardDuty, Config rules, compliance monitoring |
| **DevOps Team** | CloudTrail maintenance, Config rule implementation, automation |
| **Compliance Officer** | Audit coordination, report generation, policy updates |

## Compliance Mapping

| MSP Requirement | Evidence |
|----------------|----------|
| **SEC-003** | Control Tower, Config rules, Security Hub, GuardDuty |
| **CIS Controls 4,5,6,8,12,13** | Specific Config rules and Security Hub controls |

## Related Documents

- Security Policies Playbook
- IAM Management Playbook
- Monitoring and Alerting Playbook
- Control Tower Console: https://console.aws.amazon.com/controltower/
- Config Console: https://console.aws.amazon.com/config/
- Security Hub Console: https://console.aws.amazon.com/securityhub/

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-04 | Initial playbook generated | MSP Readiness Tool |

---

**🤖 Generated by MSP Readiness Automation**
