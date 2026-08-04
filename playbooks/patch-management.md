---
generated: "2026-08-04T16:01:14.447Z"
template_version: "1.0"
status: "draft"
requirement_id: "OPS-008"
---

# Patch Management Playbook

**Project**: FIPCO
**Organization**: Flexion Org
**Last Updated**: 2026-08-04

## Purpose

This playbook defines the patch management process for FIPCO to ensure timely remediation of security vulnerabilities and system updates across all infrastructure components.

## Scope

This playbook covers:
- Operating system patches (Amazon Linux, Ubuntu, Windows)
- Application runtime updates (Node.js, Python, Java)
- Container base image updates
- AWS managed service patching (RDS, ElastiCache)
- Third-party dependency updates

## Patching Strategy

### Patch Categories

| Category | Definition | SLA | Example |
|----------|-----------|-----|---------|
| **CRITICAL** | CVSS 9.0+ or active exploit | 7 days | Remote code execution, privilege escalation |
| **HIGH** | CVSS 7.0-8.9 | 30 days | Authentication bypass, data exposure |
| **MEDIUM** | CVSS 4.0-6.9 | 90 days | Denial of service, information disclosure |
| **LOW** | CVSS 0.1-3.9 | Next maintenance | Minor bugs, cosmetic issues |

### Patch Windows

**Production**:
- **Day**: Second Saturday of each month
- **Time**: 2 AM - 6 AM UTC
- **Duration**: 4 hours
- **Emergency patches**: Within 24 hours of identification (CRITICAL only)

**Non-Production**:
- **Day**: First Saturday of each month
- **Time**: 12 AM - 6 AM UTC
- **Duration**: 6 hours

**Emergency Patching**:
- Triggered for: CRITICAL vulnerabilities with active exploits
- Approval: Security Lead + Ops Lead
- Timing: Within 24-48 hours
- Process: Follow emergency change procedure

## Vulnerability Scanning

### AWS Inspector

**Configuration**:
- Continuous scanning enabled for EC2, ECR, Lambda
- Scan frequency: Continuously + on-demand
- Findings sent to Security Hub
- Automated ticket creation for CRITICAL/HIGH

**Inspector Rules**:
- CVE scanning
- Network reachability
- CIS benchmarks
- Package vulnerabilities

**Scanning Schedule**:
```
Continuous: All running EC2 instances, Lambda functions
On-Deploy: All ECR images before production
Weekly: Full account scan on Sunday 1 AM
```

### Container Image Scanning

**ECR Image Scanning**:
- Scan on push: Enabled for all repositories
- Basic scanning: Free tier
- Enhanced scanning (Inspector): Enabled for production images

**Docker Hub Dependencies**:
- Renovate bot monitors base images
- PR created for new versions
- Security scan before merge

**Scan Results**:
```bash
# View ECR scan results
aws ecr describe-image-scan-findings \
  --repository-name FIPCO/api \
  --image-id imageTag=latest
```

## Patching Procedures

### 1. EC2 Instance Patching

#### Using Systems Manager Patch Manager

**Pre-Patching**:
1. Review Inspector findings for patch candidates
2. Create snapshot/AMI of instance:
```bash
aws ec2 create-image \
  --instance-id i-xxxxx \
  --name "FIPCO-dev-pre-patch-$(date +%Y%m%d)"
```
3. Notify team in #support
4. Create maintenance window ticket

**Patching Execution**:
1. Create Maintenance Window:
```bash
aws ssm create-maintenance-window \
  --name "FIPCO-patching-$(date +%Y%m%d)" \
  --schedule "cron(0 2 ? * SAT#2 *)" \
  --duration 4 \
  --cutoff 1
```

2. Execute Patch Baseline:
```bash
aws ssm send-command \
  --document-name "AWS-RunPatchBaseline" \
  --targets "Key=tag:Environment,Values=dev" \
  --parameters "Operation=Install"
```

3. Monitor execution in Systems Manager console

**Post-Patching**:
1. Verify instance health checks pass
2. Test application functionality
3. Monitor for 2 hours post-patch
4. Document patches applied
5. Update CMDB/asset inventory

#### Manual Patching (when SSM unavailable)

**Steps**:
1. SSH to instance
2. Create snapshot first
3. Execute updates:
```bash
# Amazon Linux/RHEL
sudo yum update -y
sudo reboot

# Ubuntu/Debian
sudo apt update
sudo apt upgrade -y
sudo reboot
```
4. Verify services restart correctly
5. Test application endpoints

### 2. RDS/Managed Service Patching

**RDS Maintenance Windows**:
- Configured per instance
- Automatic minor version updates: Enabled
- Major version updates: Manual approval required
- Maintenance window: Sunday 3 AM - 4 AM UTC

**Pre-Patching**:
1. Review AWS notification emails
2. Check compatibility notes for version
3. Create manual snapshot
4. Schedule maintenance for approved window

**Patching**:
```bash
# Apply pending maintenance
aws rds apply-pending-maintenance-action \
  --resource-identifier arn:aws:rds:us-east-1:account:db:FIPCO-dev \
  --apply-action system-update \
  --opt-in-type immediate
```

**Post-Patching**:
1. Verify database availability
2. Check application connectivity
3. Monitor slow query logs
4. Validate backup after patch

### 3. Container Image Updates

**Base Image Updates**:

**Dockerfile**:
```dockerfile
# Use specific version tags, not 'latest'
FROM node:18.17-alpine

# Scan for vulnerabilities
RUN npm audit fix

# Update system packages
RUN apk update && apk upgrade
```

**Build Process**:
1. Renovate bot creates PR for base image update
2. CI/CD pipeline:
   - Build new image
   - Scan with ECR Inspector
   - Run security tests
   - Block if CRITICAL vulnerabilities found
3. Manual review of scan results
4. Approve and merge if clean
5. Deploy to dev → test → staging → production

**Scanning in CI/CD**:
```yaml
# GitHub Actions example
- name: Scan Docker image
  uses: anchore/scan-action@v3
  with:
    image: FIPCO/api:$
    fail-build: true
    severity-cutoff: high
```

### 4. Application Dependency Updates

**Automated Updates (Renovate)**:

**renovate.json**:
```json
{
  "extends": ["config:base"],
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "automerge": false,
    "assignees": ["@security-team"]
  },
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "matchCurrentVersion": "!/^0/"
    }
  ]
}
```

**Manual Dependency Review**:
1. Check Dependabot/Renovate security alerts
2. Review npm audit / pip-audit results:
```bash
npm audit --audit-level=high
```
3. Update vulnerable dependencies:
```bash
npm update <package>
# or for breaking changes
npm install <package>@latest
```
4. Run full test suite
5. Deploy to dev for validation

**SLA for Dependency Updates**:
- **CRITICAL**: 7 days
- **HIGH**: 30 days
- **MEDIUM**: 90 days
- **LOW**: Next release cycle

## Testing & Validation

### Pre-Production Testing

**Test Environment Patching** (Week before production):
1. Apply patches to test environment
2. Run automated test suite
3. Perform smoke tests on key workflows
4. Load testing if significant changes
5. Security scan post-patch
6. Document any issues

**Rollback Plan**:
- Keep pre-patch snapshots for 30 days
- Automated rollback if health checks fail
- Manual rollback procedure documented

### Production Validation

**Post-Patch Checklist**:
- [ ] All instances pass health checks
- [ ] Application endpoints responding (200 OK)
- [ ] Key workflows functional (login, data access)
- [ ] No new errors in CloudWatch Logs
- [ ] Performance metrics normal (latency, throughput)
- [ ] Database connectivity verified
- [ ] External integrations working

**Monitoring Period**: 2 hours minimum post-patch

## Emergency Patching

### Critical Vulnerability Response

**Trigger**: CRITICAL vulnerability (CVSS 9.0+) with active exploit

**Process**:
1. **Alert** (0-2 hours):
   - Security team identifies vulnerability
   - Assess impact to FIPCO
   - Determine affected systems

2. **Emergency CAB** (2-4 hours):
   - Security Lead + Ops Lead approval
   - Review patch/workaround options
   - Plan deployment timeline

3. **Testing** (4-8 hours):
   - Test patch in isolated environment
   - Verify no breaking changes
   - Prepare rollback plan

4. **Deployment** (8-24 hours):
   - Apply to non-production first
   - Validate functionality
   - Apply to production
   - Monitor for 4 hours

5. **Documentation** (24-48 hours):
   - Update CMDB
   - Document in change log
   - Post-incident review
   - Update playbook

### Zero-Day Exploits

**Immediate Actions**:
1. Isolate affected systems (security groups, NACLs)
2. Enable enhanced logging/monitoring
3. Search for indicators of compromise
4. Apply vendor patch/workaround ASAP
5. Consider temporary service degradation vs. risk

## Patch Management Tools

### AWS Systems Manager

**Components Used**:
- **Patch Manager**: Automated patching
- **Maintenance Windows**: Scheduled patching
- **Compliance**: Track patch status
- **Session Manager**: Secure access for manual patching

**Patch Baselines**:
- `FIPCO-amazon-linux-baseline`
- `FIPCO-ubuntu-baseline`
- `FIPCO-windows-baseline`

### Third-Party Tools

**Renovate Bot**:
- Automated dependency updates
- Security vulnerability alerts
- Configurable auto-merge rules

**Dependabot**:
- GitHub security alerts
- Automated PRs for security updates
- Integration with Actions for testing

## Reporting

### Monthly Patch Report

**Contents**:
- Total vulnerabilities identified
- Vulnerabilities remediated
- Outstanding vulnerabilities (by severity)
- SLA compliance metrics
- Emergency patches applied
- Patch success rate

**Distribution**: Send to msp-team@example.com and security team

**Metrics**:
```
Critical Patches:
- Identified: X
- Remediated within SLA: Y (Y/X * 100%)
- Average time to patch: Z days

High Patches:
- Identified: X
- Remediated within SLA: Y (Y/X * 100%)
- Average time to patch: Z days
```

### Inspector Findings Dashboard

**CloudWatch Dashboard**: `FIPCO-vulnerability-dashboard`

**Widgets**:
- CRITICAL findings (last 30 days)
- HIGH findings by resource
- Patch compliance by instance
- ECR image scan results

## Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| **Security Team** | Vulnerability identification, prioritization, emergency response |
| **DevOps Team** | Patch deployment, testing, rollback |
| **Development Team** | Application dependency updates, compatibility testing |
| **Product Owner** | Approve emergency patches, maintenance windows |

## Compliance Mapping

| MSP Requirement | Evidence |
|----------------|----------|
| **OPS-008** | Patch management procedures, patch schedules, compliance reports |
| **SEC-008** | Vulnerability remediation records, SLA compliance |
| **CIS Control 7** | Inspector configuration, patch baselines, scan results |

## Related Documents

- Vulnerability Remediation Playbook
- Change Management Playbook
- Incident Response Playbook
- Systems Manager Console: https://console.aws.amazon.com/systems-manager/home?region=us-east-1

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-04 | Initial playbook generated | MSP Readiness Tool |

---

**🤖 Generated by MSP Readiness Automation**
