/**
 * Document Auto-Completion System
 *
 * Generates completed MSP documentation by:
 * 1. Scanning project structure (README, package.json, CDK, etc.)
 * 2. Extracting AWS resource information
 * 3. Inferring business context from code and configuration
 * 4. Filling templates with real, project-specific content
 */

import fs from 'fs/promises';
import path from 'path';
import { Config, MSPRequirement } from '../types.js';

export interface ProjectContext {
  // Basic project info
  projectName: string;
  description: string;
  version: string;
  repository?: string;

  // Technology stack
  runtime: string;
  dependencies: string[];
  awsServices: string[];

  // Team structure
  teams: Array<{ name: string; members: string[]; }>;
  codeOwners: Map<string, string[]>;

  // Infrastructure
  cdkStacks: Array<{ name: string; resources: string[]; }>;
  awsAccounts: string[];
  regions: string[];

  // Operations
  cicdPipeline: boolean;
  monitoringTools: string[];
  loggingDestinations: string[];

  // Security
  securityFindings: number;
  encryptionEnabled: boolean;
  backupEnabled: boolean;
}

export class DocumentCompleter {
  constructor(private config: Config) {}

  /**
   * Scan project and extract all relevant context
   */
  async extractProjectContext(): Promise<ProjectContext> {
    const context: ProjectContext = {
      projectName: this.config.project.name,
      description: '',
      version: '',
      runtime: 'nodejs',
      dependencies: [],
      awsServices: [],
      teams: [],
      codeOwners: new Map(),
      cdkStacks: [],
      awsAccounts: [],
      regions: [this.config.aws.region],
      cicdPipeline: false,
      monitoringTools: [],
      loggingDestinations: [],
      securityFindings: 0,
      encryptionEnabled: false,
      backupEnabled: false,
    };

    // Extract from package.json
    await this.scanPackageJson(context);

    // Extract from README
    await this.scanReadme(context);

    // Extract from CODEOWNERS
    await this.scanCodeOwners(context);

    // Extract from CDK infrastructure
    await this.scanCdkInfrastructure(context);

    // Extract from AWS (if accessible)
    await this.scanAwsResources(context);

    return context;
  }

  private async scanPackageJson(context: ProjectContext): Promise<void> {
    try {
      const packagePath = path.join(this.config.project.docs_path, '../../package.json');
      const content = await fs.readFile(packagePath, 'utf-8');
      const pkg = JSON.parse(content);

      context.projectName = pkg.name || context.projectName;
      context.description = pkg.description || '';
      context.version = pkg.version || '1.0.0';
      context.repository = pkg.repository?.url || pkg.repository;

      // Extract dependencies
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      context.dependencies = Object.keys(allDeps);

      // Detect AWS services from dependencies
      const awsPackages = context.dependencies.filter(dep => dep.startsWith('@aws-sdk/'));
      context.awsServices = awsPackages.map(pkg =>
        pkg.replace('@aws-sdk/client-', '').replace(/-/g, ' ')
      );

      // Detect runtime
      if (pkg.engines?.node) {
        context.runtime = `Node.js ${pkg.engines.node}`;
      }
    } catch (error) {
      // Package.json not found or unreadable
    }
  }

  private async scanReadme(context: ProjectContext): Promise<void> {
    try {
      const readmePath = path.join(this.config.project.docs_path, '../../README.md');
      const content = await fs.readFile(readmePath, 'utf-8');

      // Extract description from first paragraph
      if (!context.description) {
        const firstPara = content.split('\n\n')[1];
        if (firstPara && !firstPara.startsWith('#')) {
          context.description = firstPara.replace(/\n/g, ' ').trim();
        }
      }

      // Look for monitoring/logging mentions
      if (content.toLowerCase().includes('cloudwatch')) {
        context.monitoringTools.push('CloudWatch');
      }
      if (content.toLowerCase().includes('datadog')) {
        context.monitoringTools.push('Datadog');
      }
      if (content.toLowerCase().includes('grafana')) {
        context.monitoringTools.push('Grafana');
      }
    } catch (error) {
      // README not found
    }
  }

  private async scanCodeOwners(context: ProjectContext): Promise<void> {
    try {
      const codeownersPath = path.join(this.config.project.docs_path, '../../.github/CODEOWNERS');
      const content = await fs.readFile(codeownersPath, 'utf-8');

      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const pattern = parts[0];
          const owners = parts.slice(1);
          context.codeOwners.set(pattern, owners);
        }
      }

      // Extract unique teams
      const allOwners = Array.from(context.codeOwners.values()).flat();
      const teams = new Set(allOwners.filter(o => o.startsWith('@')).map(o => o.substring(1)));

      for (const team of teams) {
        context.teams.push({
          name: team,
          members: [], // Would need GitHub API to get actual members
        });
      }
    } catch (error) {
      // CODEOWNERS not found
    }
  }

  private async scanCdkInfrastructure(context: ProjectContext): Promise<void> {
    try {
      const infraPath = this.config.project.infra_path;
      if (!infraPath) return;

      // Look for CDK stack files
      const files = await this.findFiles(infraPath, /\.ts$/);

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');

        // Extract stack names
        const stackMatch = content.match(/class (\w+Stack) extends/);
        if (stackMatch) {
          const stackName = stackMatch[1];
          const resources: string[] = [];

          // Extract AWS resources
          if (content.includes('aws-lambda')) resources.push('Lambda');
          if (content.includes('aws-dynamodb')) resources.push('DynamoDB');
          if (content.includes('aws-s3')) resources.push('S3');
          if (content.includes('aws-rds')) resources.push('RDS');
          if (content.includes('aws-ec2')) resources.push('EC2');
          if (content.includes('aws-ecs')) resources.push('ECS');
          if (content.includes('aws-apigateway')) resources.push('API Gateway');
          if (content.includes('aws-cloudfront')) resources.push('CloudFront');
          if (content.includes('aws-route53')) resources.push('Route53');
          if (content.includes('aws-cloudwatch')) resources.push('CloudWatch');
          if (content.includes('aws-sns')) resources.push('SNS');
          if (content.includes('aws-sqs')) resources.push('SQS');
          if (content.includes('aws-secretsmanager')) resources.push('Secrets Manager');
          if (content.includes('aws-kms')) resources.push('KMS');

          context.cdkStacks.push({ name: stackName, resources });

          // Add to AWS services list
          resources.forEach(r => {
            if (!context.awsServices.includes(r)) {
              context.awsServices.push(r);
            }
          });
        }

        // Check for encryption
        if (content.includes('encryption') || content.includes('Encryption')) {
          context.encryptionEnabled = true;
        }

        // Check for backups
        if (content.includes('backup') || content.includes('Backup')) {
          context.backupEnabled = true;
        }
      }
    } catch (error) {
      // Infrastructure path not found
    }
  }

  private async scanAwsResources(context: ProjectContext): Promise<void> {
    // This would integrate with existing evidence collectors
    // For now, mark as available for future enhancement
  }

  private async findFiles(dir: string, pattern: RegExp): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.findFiles(fullPath, pattern);
          files.push(...subFiles);
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory not accessible
    }

    return files;
  }

  /**
   * Generate completed document for a specific requirement
   */
  async generateCompletedDocument(
    requirement: MSPRequirement,
    context: ProjectContext,
  ): Promise<string | null> {
    // Determine which generator to use based on requirement
    switch (requirement.id) {
      // Business
      case 'BUS-001':
        return this.generateCompanyOverview(context);
      case 'BUS-004':
        return this.generateGtmProcess(context);

      // People
      case 'PEO-001':
        return this.generateOnboardingChecklist(context);
      case 'PEO-002':
        return this.generateCcoeCharter(context);

      // Governance
      case 'GOV-001':
        return this.generateRiskRegister(context);
      case 'GOV-003':
        return this.generateDataGovernance(context);
      case 'GOV-004':
        return this.generateVendorManagement(context);
      case 'GOV-005':
        return this.generateChangeManagement(context);

      // Platform
      case 'PLAT-001':
        return this.generateSolutionCapabilities(context);
      case 'PLAT-002':
        return this.generateAccountStructure(context);
      case 'PLAT-003':
        return this.generateWorkloadResilience(context);

      default:
        return null; // Cannot auto-generate this requirement
    }
  }

  // Business generators

  private generateCompanyOverview(context: ProjectContext): string {
    const services = context.awsServices.slice(0, 10).join(', ');

    return `---
requirement_id: BUS-001
title: Company Overview
category: business
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Company Overview

**Requirement ID**: BUS-001
**Category**: Business
**Status**: Auto-Completed

## Overview

${context.projectName} is a cloud-native application built on AWS infrastructure. ${context.description || 'This project leverages AWS managed services to deliver scalable, secure, and reliable solutions.'}

**Version**: ${context.version}
${context.repository ? `**Repository**: ${context.repository}` : ''}

## Technology Stack

### Runtime Environment
- ${context.runtime}

### AWS Services
${context.awsServices.length > 0 ? context.awsServices.map(s => `- ${s}`).join('\n') : '- Multiple AWS managed services'}

### Key Dependencies
${context.dependencies.slice(0, 10).map(d => `- ${d}`).join('\n')}

## Infrastructure

### CDK Stacks
${context.cdkStacks.length > 0
  ? context.cdkStacks.map(s => `- **${s.name}**: ${s.resources.join(', ')}`).join('\n')
  : 'Infrastructure defined as code using AWS CDK'}

### Deployment Regions
${context.regions.map(r => `- ${r}`).join('\n')}

## Team Structure

${context.teams.length > 0
  ? context.teams.map(t => `- **${t.name}**: Development and operations team`).join('\n')
  : '- Cross-functional development team with AWS expertise'}

## Security & Compliance

- Encryption: ${context.encryptionEnabled ? 'Enabled' : 'To be configured'}
- Backup Strategy: ${context.backupEnabled ? 'Implemented' : 'To be configured'}
- Monitoring: ${context.monitoringTools.length > 0 ? context.monitoringTools.join(', ') : 'CloudWatch'}

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Platform Team
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  private generateGtmProcess(context: ProjectContext): string {
    return `---
requirement_id: BUS-004
title: Go-to-Market Process
category: business
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Go-to-Market Process

**Requirement ID**: BUS-004
**Category**: Business
**Status**: Auto-Completed

## Overview

${context.projectName} follows a structured deployment and release process to ensure reliable service delivery.

## Technology Capabilities

### Core Services
${context.awsServices.slice(0, 15).map(s => `- ${s}`).join('\n')}

### Infrastructure Stacks
${context.cdkStacks.map(s => `- **${s.name}**: ${s.resources.join(', ')}`).join('\n')}

## Deployment Process

### CI/CD Pipeline
${context.cicdPipeline ? 'Automated CI/CD pipeline configured' : 'Deployment process to be documented'}

### Release Strategy
1. Development environment testing
2. Staging environment validation
3. Production deployment with rollback capability

### Monitoring
${context.monitoringTools.length > 0
  ? `- ${context.monitoringTools.join('\n- ')}`
  : '- CloudWatch metrics and alarms\n- Distributed tracing\n- Log aggregation'}

## Support Model

### Operational Support
- 24/7 monitoring and alerting
- Incident response procedures
- Regular maintenance windows

### Customer Communication
- Status page for service health
- Proactive notification of planned maintenance
- Incident communication protocols

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Product Team
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  // People generators

  private generateOnboardingChecklist(context: ProjectContext): string {
    return `---
requirement_id: PEO-001
title: Engineer Onboarding Checklist
category: people
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Engineer Onboarding Checklist

**Requirement ID**: PEO-001
**Category**: People
**Status**: Auto-Completed

## Overview

Standardized onboarding process for engineers joining the ${context.projectName} team.

## Pre-Start (Before Day 1)

- [ ] AWS account created
- [ ] GitHub access provisioned
- [ ] Slack workspace invited
- [ ] Email account configured

## Week 1: Environment Setup

### Development Environment
- [ ] Clone repository${context.repository ? `: ${context.repository}` : ''}
- [ ] Install required tools:
  - [ ] ${context.runtime}
  - [ ] AWS CLI
  - [ ] CDK CLI (if using infrastructure as code)
- [ ] Configure AWS credentials
- [ ] Run local development environment

### Access & Permissions
- [ ] AWS Console access (${this.config.aws.region})
- [ ] GitHub repository access
${context.codeOwners.size > 0 ? `- [ ] Added to relevant CODEOWNERS teams` : ''}
- [ ] CI/CD pipeline access

### Documentation Review
- [ ] Project README
- [ ] Architecture documentation
- [ ] MSP compliance documentation
- [ ] Runbooks and operational procedures

## Week 2-4: Technical Onboarding

### AWS Services Orientation
${context.awsServices.slice(0, 10).map(s => `- [ ] ${s} overview and usage`).join('\n')}

### Infrastructure Understanding
${context.cdkStacks.map(s => `- [ ] ${s.name} architecture review`).join('\n')}

### Development Workflow
- [ ] Branching strategy
- [ ] Code review process
- [ ] Testing requirements
- [ ] Deployment procedures

## Ongoing

### Training
- [ ] AWS security best practices
- [ ] MSP compliance requirements
- [ ] Incident response procedures
- [ ] On-call rotation training

### Team Integration
${context.teams.map(t => `- [ ] ${t.name} team introduction`).join('\n')}

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Engineering Manager
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  private generateCcoeCharter(context: ProjectContext): string {
    return `---
requirement_id: PEO-002
title: Cloud Center of Excellence Charter
category: people
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Cloud Center of Excellence (CCoE) Charter

**Requirement ID**: PEO-002
**Category**: People
**Status**: Auto-Completed

## Mission

Establish and maintain best practices for AWS cloud operations, ensuring security, reliability, and cost optimization for ${context.projectName}.

## Scope

### AWS Services Managed
${context.awsServices.map(s => `- ${s}`).join('\n')}

### Infrastructure Components
${context.cdkStacks.map(s => `- ${s.name}: ${s.resources.join(', ')}`).join('\n')}

## Responsibilities

### Architecture & Design
- Review and approve infrastructure changes
- Establish architectural patterns and standards
- Ensure alignment with AWS best practices
- Maintain infrastructure as code principles

### Security & Compliance
- Implement security controls and monitoring
- Ensure MSP compliance requirements are met
- Conduct regular security assessments
- Manage IAM policies and access controls

### Operations & Reliability
- Define operational procedures and runbooks
- Establish monitoring and alerting standards
- Implement backup and disaster recovery strategies
- Coordinate incident response

### Cost Optimization
- Monitor and optimize AWS spending
- Implement cost allocation and tagging strategies
- Identify opportunities for reserved capacity
- Regular cost reviews and optimization

## Team Structure

${context.teams.length > 0
  ? context.teams.map(t => `### ${t.name}\n- Responsibilities to be defined\n`).join('\n')
  : '### Core Team\n- Infrastructure Engineers\n- Security Engineers\n- DevOps Engineers\n'}

## Processes

### Change Management
1. Propose infrastructure changes via pull request
2. CCoE review and approval
3. Testing in non-production environments
4. Staged production deployment
5. Post-deployment validation

### Incident Response
1. Automated alerting via ${context.monitoringTools.join(' and ') || 'CloudWatch'}
2. On-call engineer engagement
3. Incident investigation and mitigation
4. Post-mortem and remediation

### Continuous Improvement
- Weekly operational reviews
- Monthly architecture discussions
- Quarterly security assessments
- Annual disaster recovery drills

## Governance

### Decision-Making
- Consensus-based for standard changes
- Escalation path for critical decisions
- Documentation of all architectural decisions

### Reporting
- Weekly operational metrics
- Monthly cost and optimization reports
- Quarterly compliance status
- Annual security assessment

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Platform Team Lead
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  // Governance generators

  private generateRiskRegister(context: ProjectContext): string {
    return `---
requirement_id: GOV-001
title: Risk Register and Mitigation Plans
category: governance
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Risk Register and Mitigation Plans

**Requirement ID**: GOV-001
**Category**: Governance
**Status**: Auto-Completed

## Overview

Risk assessment and mitigation strategies for ${context.projectName} AWS infrastructure and operations.

## Infrastructure Risks

### 1. Service Availability
**Risk**: AWS service disruption in ${context.regions.join(', ')}
**Likelihood**: Low
**Impact**: High
**Mitigation**:
- Multi-AZ deployment for critical resources
- Regular backup and restore testing
- Documented disaster recovery procedures
- ${context.regions.length > 1 ? 'Multi-region failover capability' : 'Consider multi-region deployment'}

### 2. Data Loss
**Risk**: Accidental deletion or corruption of data
**Likelihood**: Medium
**Impact**: Critical
**Mitigation**:
- ${context.backupEnabled ? 'Automated backup systems in place' : 'Implement automated backup strategy'}
- Point-in-time recovery capabilities
- Backup retention policies
- Regular restore testing

### 3. Security Breach
**Risk**: Unauthorized access to AWS resources
**Likelihood**: Medium
**Impact**: Critical
**Mitigation**:
- ${context.encryptionEnabled ? 'Encryption at rest and in transit' : 'Implement encryption for sensitive data'}
- IAM least privilege access
- Security Hub monitoring
- Regular security assessments
- Incident response procedures

## Operational Risks

### 4. Configuration Drift
**Risk**: Manual changes causing infrastructure inconsistency
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Infrastructure as Code (AWS CDK)
- AWS Config for drift detection
- Change management process
- Regular compliance scans

### 5. Cost Overrun
**Risk**: Unexpected AWS billing increases
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- AWS Budgets and cost alerts
- Resource tagging strategy
- Regular cost optimization reviews
- Reserved capacity planning

### 6. Dependency Failures
**Risk**: Third-party service or library vulnerabilities
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Dependency scanning and updates
- Security vulnerability monitoring
- Multiple vendor options where possible
- Service Level Agreements with vendors

**Key Dependencies**:
${context.dependencies.slice(0, 20).map(d => `- ${d}`).join('\n')}

## Compliance Risks

### 7. MSP Requirements
**Risk**: Failure to maintain MSP program compliance
**Likelihood**: Low
**Impact**: High
**Mitigation**:
- Regular MSP readiness assessments
- Automated compliance monitoring
- Documentation maintenance
- Quarterly compliance reviews

## Monitoring and Review

### Risk Monitoring Process
1. ${context.monitoringTools.join(', ') || 'CloudWatch'} for operational monitoring
2. Security Hub for security findings
3. Weekly operational reviews
4. Monthly risk register updates

### Review Schedule
- **Operational Risks**: Weekly review
- **Security Risks**: Monthly assessment
- **Full Risk Register**: Quarterly update
- **Risk Framework**: Annual review

## Escalation

### Risk Severity Levels
- **Critical**: Immediate escalation to management
- **High**: 24-hour notification requirement
- **Medium**: Included in weekly reports
- **Low**: Tracked in quarterly reviews

## Maintenance

**Review Schedule**: Monthly
**Owner**: Operations Team
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  private generateDataGovernance(context: ProjectContext): string {
    const hasDataStores = context.awsServices.some(s =>
      s.includes('DynamoDB') || s.includes('RDS') || s.includes('S3')
    );

    return `---
requirement_id: GOV-003
title: Data Governance Policy
category: governance
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Data Governance Policy

**Requirement ID**: GOV-003
**Category**: Governance
**Status**: Auto-Completed

## Overview

Data governance framework for ${context.projectName}, covering data classification, retention, and compliance.

## Data Stores

${hasDataStores ? 'The following data stores are managed:' : 'Data storage services to be configured:'}

${context.awsServices.filter(s =>
  s.includes('DynamoDB') || s.includes('RDS') || s.includes('S3') ||
  s.includes('Aurora') || s.includes('DocumentDB')
).map(s => `### ${s}\n- Classification: To be determined\n- Retention: Based on business requirements\n- Encryption: ${context.encryptionEnabled ? 'Enabled' : 'To be configured'}\n`).join('\n')}

## Data Classification

### Public Data
- Non-sensitive information
- No encryption required
- Standard retention policies

### Internal Data
- Business data not for public disclosure
- Encryption in transit
- Access controls enforced

### Confidential Data
- Sensitive business or customer data
- Encryption at rest and in transit
- Strict access controls
- Audit logging required

### Restricted Data
- Highly sensitive regulated data
- Strong encryption mandatory
- Minimal access (need-to-know basis)
- Comprehensive audit trails

## Data Retention

### Default Retention Periods
- **Application Logs**: 90 days
- **Audit Logs**: 7 years
- **Backup Data**: 30 days
- **Operational Data**: Based on business requirements

### Deletion Process
1. Automated retention policy enforcement
2. Secure deletion methods
3. Verification of deletion
4. Documentation of deleted data

## Data Protection

### Encryption
- **At Rest**: ${context.encryptionEnabled ? 'AWS KMS encryption enabled' : 'KMS encryption to be configured'}
- **In Transit**: TLS 1.2+ for all connections
- **Key Management**: AWS KMS with automatic rotation

### Access Control
- IAM roles and policies for AWS access
- Least privilege principle
- Regular access reviews
- MFA for privileged access

### Backup and Recovery
- ${context.backupEnabled ? 'Automated backup configured' : 'Backup strategy to be implemented'}
- Point-in-time recovery capability
- Regular restore testing
- Geographically distributed backups

## Compliance

### Requirements
- AWS MSP Program standards
- Industry-specific regulations (if applicable)
- Customer contractual obligations

### Monitoring
- ${context.monitoringTools.join(', ') || 'CloudWatch'} for access logging
- AWS Config for compliance tracking
- Security Hub for security findings
- Regular compliance audits

## Data Lifecycle

### Creation
- Data classification at creation
- Proper tagging and metadata
- Encryption applied automatically

### Usage
- Access logging and monitoring
- Data minimization principles
- Purpose limitation

### Archival
- Automated archival policies
- Reduced access controls
- Cost-optimized storage classes

### Deletion
- Secure deletion procedures
- Verification and documentation
- Retention policy compliance

## Incident Response

### Data Breach Procedure
1. Immediate containment
2. Assessment of exposure
3. Notification (if required)
4. Remediation and recovery
5. Post-incident review

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Security and Compliance Team
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  private generateVendorManagement(context: ProjectContext): string {
    return `---
requirement_id: GOV-004
title: Vendor Management
category: governance
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Vendor Management

**Requirement ID**: GOV-004
**Category**: Governance
**Status**: Auto-Completed

## Overview

Vendor and third-party dependency management for ${context.projectName}.

## Primary Vendor

### Amazon Web Services (AWS)
- **Services Used**: ${context.awsServices.length} AWS services
- **Regions**: ${context.regions.join(', ')}
- **Support Plan**: To be documented
- **SLA**: Per AWS service-specific SLAs
- **Review Frequency**: Quarterly

## Software Dependencies

The project has ${context.dependencies.length} dependencies that require regular maintenance and security monitoring.

### Critical Dependencies
${context.dependencies.slice(0, 20).map(d => `- ${d}`).join('\n')}

### Dependency Management Process
1. **Regular Updates**: Weekly dependency updates
2. **Security Scanning**: Automated vulnerability detection
3. **Version Pinning**: Reproducible builds
4. **License Compliance**: Open source license review

## Vendor Assessment Criteria

### Security
- Security certifications (SOC 2, ISO 27001)
- Incident response capabilities
- Data protection measures
- Vulnerability disclosure process

### Reliability
- Historical uptime and SLAs
- Disaster recovery capabilities
- Support response times
- Change management process

### Compliance
- Regulatory compliance alignment
- Data residency requirements
- Audit capabilities
- Subprocessor management

## Risk Management

### Vendor Risk Assessment
- Initial evaluation before adoption
- Annual security reviews
- Continuous monitoring of security advisories
- Regular business continuity validation

### Contingency Planning
- Alternative vendor identification
- Data portability procedures
- Service migration plans
- Backup and recovery options

## Monitoring

### Performance Monitoring
- ${context.monitoringTools.join(', ') || 'CloudWatch'} for AWS services
- Dependency vulnerability scanning
- Service health dashboards
- SLA compliance tracking

### Security Monitoring
- CVE monitoring for all dependencies
- Security advisory subscriptions
- Patch management process
- Regular security assessments

## Contracts and SLAs

### AWS Services
- Standard AWS customer agreement
- Service-specific SLAs
- Support plan terms
- Data processing agreements

### Third-Party Services
- Vendor contracts to be documented
- SLA requirements defined
- Data processing agreements
- Right to audit clauses

## Review Process

### Quarterly Reviews
- Vendor performance assessment
- Cost optimization opportunities
- Security posture evaluation
- Dependency updates and patches

### Annual Reviews
- Comprehensive vendor assessment
- Contract renewal evaluation
- Alternative vendor consideration
- Strategic alignment review

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Platform Team
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  private generateChangeManagement(context: ProjectContext): string {
    return `---
requirement_id: GOV-005
title: Change Management Process
category: governance
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Change Management Process

**Requirement ID**: GOV-005
**Category**: Governance
**Status**: Auto-Completed

## Overview

Standardized change management process for ${context.projectName} infrastructure and application changes.

## Change Categories

### Standard Changes
Pre-approved, low-risk changes with documented procedures:
- Dependency updates
- Configuration parameter adjustments
- Scaling operations
- Certificate renewals

### Normal Changes
Changes requiring review and approval:
- New feature deployments
- Infrastructure modifications
- Security policy updates
- Database schema changes

### Emergency Changes
Critical changes requiring expedited process:
- Security vulnerability patches
- Production incident remediation
- Service restoration
- Data corruption fixes

## Change Request Process

### 1. Initiation
**Method**: Pull Request in version control${context.repository ? ` (${context.repository})` : ''}

**Required Information**:
- Description of change
- Business justification
- Risk assessment
- Rollback plan
- Testing evidence
- Affected services/components

### 2. Review and Approval

**Infrastructure Changes**:
- Peer code review (minimum 1 approval)
- Architecture review for significant changes
${context.teams.length > 0 ? `- Review by ${context.teams[0].name} team` : '- Platform team review'}
- Security review for policy changes

**Approval Criteria**:
- Code quality standards met
- Tests passing (unit, integration)
- Documentation updated
- Rollback plan documented

### 3. Testing

**Non-Production Validation**:
- Development environment testing
- Integration testing
- Performance testing (if applicable)
- Security scanning

**Production Readiness**:
- Smoke test procedures defined
- Monitoring dashboards prepared
- Runbooks updated
- On-call team notified

### 4. Implementation

**Deployment Windows**:
- **Standard**: Business hours (9 AM - 5 PM local time)
- **Off-hours**: Approved changes only
- **Emergency**: Any time with proper approval

**Deployment Process**:
${context.cicdPipeline ? '- Automated via CI/CD pipeline' : '- Follow documented deployment runbooks'}
- Staged rollout where possible
- Continuous monitoring during deployment
- Validation against success criteria

**Infrastructure Deployment**:
${context.cdkStacks.length > 0
  ? `CDK stacks deployed:\n${context.cdkStacks.map(s => `- ${s.name}`).join('\n')}`
  : '- Infrastructure as Code deployment'}

### 5. Validation

**Post-Deployment Checks**:
- Smoke tests execution
- Monitoring for errors/anomalies
- Performance metrics review
- User acceptance (if applicable)

**Monitoring**:
- ${context.monitoringTools.join('\n- ') || 'CloudWatch dashboards\n- Log analysis\n- Metric alerts'}

### 6. Documentation

**Required Documentation**:
- Change log updated
- Runbooks updated (if affected)
- Architecture diagrams (if affected)
- Post-implementation review

## Rollback Procedures

### Automatic Rollback Triggers
- Deployment failure
- Critical errors detected
- Health check failures
- Performance degradation

### Manual Rollback Process
1. Declare rollback decision
2. Execute rollback procedure
3. Validate system stability
4. Document incident
5. Schedule remediation

### Rollback Verification
- Service functionality restored
- No data corruption
- Monitoring returns to baseline
- Incident report filed

## Change Calendar

### Scheduled Maintenance Windows
- **Regular Deployments**: [To be defined]
- **Emergency Changes**: As needed with proper approval
- **Blackout Periods**: Major holidays, peak business periods

### Change Coordination
- Notification to stakeholders (24-hour advance)
- Coordination with dependent teams
- Customer communication (if customer-facing)

## Emergency Change Process

### Criteria for Emergency Changes
- Security vulnerability with active exploitation
- Production outage affecting customers
- Data integrity at risk
- Legal or compliance requirement

### Expedited Approval
1. On-call engineer assessment
2. Management notification
3. Immediate implementation if critical
4. Post-incident documentation and review

## Metrics and Reporting

### Change Metrics
- Total changes per period
- Success rate
- Rollback frequency
- Average implementation time
- Incident correlation

### Reporting
- Weekly change log
- Monthly change analysis
- Quarterly trend review
- Annual process evaluation

## Continuous Improvement

### Post-Implementation Reviews
- Changes with incidents
- Complex or high-risk changes
- Emergency changes
- Failed changes

### Process Improvements
- Lessons learned documentation
- Procedure updates
- Automation opportunities
- Training needs identification

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Operations Team
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  // Platform generators

  private generateSolutionCapabilities(context: ProjectContext): string {
    return `---
requirement_id: PLAT-001
title: Solution Capabilities Overview
category: platform
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Solution Capabilities Overview

**Requirement ID**: PLAT-001
**Category**: Platform
**Status**: Auto-Completed

## Overview

Technical capabilities and architecture of ${context.projectName}.

${context.description}

## Technology Stack

### Runtime
- ${context.runtime}
- AWS Cloud Infrastructure

### Core AWS Services
${context.awsServices.map(s => `- **${s}**`).join('\n')}

## Architecture

### Infrastructure Stacks

${context.cdkStacks.map(stack => `#### ${stack.name}
**Components**: ${stack.resources.join(', ')}

**Purpose**: [Infrastructure stack providing ${stack.resources[0]} capabilities]
`).join('\n')}

### Deployment Architecture

**Regions**: ${context.regions.join(', ')}
${context.regions.length > 1 ? '- Multi-region deployment for high availability' : '- Single-region deployment'}

**Availability**: ${context.cdkStacks.some(s => s.resources.includes('RDS') || s.resources.includes('DynamoDB')) ? 'Multi-AZ for data services' : 'High availability configuration'}

## Security Features

### Data Protection
- **Encryption**: ${context.encryptionEnabled ? 'Enabled for data at rest and in transit' : 'To be configured'}
- **Key Management**: AWS KMS for encryption keys
- **Access Control**: IAM roles and policies

### Network Security
- VPC isolation
- Security groups and NACLs
- Private subnets for sensitive resources
- NAT gateways for outbound connectivity

### Identity and Access
- IAM roles for AWS service access
- Principle of least privilege
- MFA for privileged access
- Regular access reviews

## Operational Capabilities

### Monitoring and Observability
${context.monitoringTools.length > 0
  ? context.monitoringTools.map(t => `- ${t}`).join('\n')
  : '- CloudWatch metrics and logs\n- Distributed tracing\n- Custom dashboards'}

### Backup and Recovery
- ${context.backupEnabled ? 'Automated backup systems' : 'Backup strategy to be implemented'}
- Point-in-time recovery
- Cross-region backup replication (where applicable)
- Documented recovery procedures

### Scalability
- Auto-scaling for compute resources
- Database read replicas (where applicable)
- CDN for content delivery (if applicable)
- Load balancing for high availability

## Performance Characteristics

### Latency Targets
- API response time: < 200ms (p95)
- Database queries: < 50ms (p95)
- Page load time: < 2s (p95)

### Throughput
- Designed for elastic scalability
- Auto-scaling based on demand
- No hard capacity limits

### Availability
- Target: 99.9% uptime
- Multi-AZ deployment for fault tolerance
- Automated health checks and failover

## Integration Points

### AWS Service Integration
${context.awsServices.filter(s =>
  s.includes('API Gateway') || s.includes('EventBridge') ||
  s.includes('SNS') || s.includes('SQS')
).map(s => `- ${s}`).join('\n')}

### External Services
${context.dependencies.filter(d =>
  d.includes('aws-sdk') || d.includes('stripe') ||
  d.includes('sendgrid') || d.includes('twilio')
).slice(0, 5).map(d => `- ${d}`).join('\n')}

## Development and Deployment

### Infrastructure as Code
- AWS CDK (TypeScript)
${context.cdkStacks.length} stacks defined and managed

### CI/CD
${context.cicdPipeline ? '- Automated deployment pipeline' : '- CI/CD pipeline to be configured'}
- Automated testing
- Staged deployments
- Rollback capabilities

### Version Control
${context.repository ? `- Repository: ${context.repository}` : '- Git-based version control'}
- Branch protection rules
- Code review requirements
- Automated quality checks

## Future Enhancements

- Additional monitoring and alerting
- Enhanced disaster recovery capabilities
- Performance optimization
- Cost optimization initiatives

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Platform Team
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  private generateAccountStructure(context: ProjectContext): string {
    return `---
requirement_id: PLAT-002
title: AWS Account Structure
category: platform
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# AWS Account Structure

**Requirement ID**: PLAT-002
**Category**: Platform
**Status**: Auto-Completed

## Overview

AWS account organization and structure for ${context.projectName}.

## Account Organization

### Current Configuration
- **Primary Region**: ${this.config.aws.region}
- **Additional Regions**: ${this.config.aws.additional_regions?.join(', ') || 'None configured'}
- **AWS Profile**: ${this.config.aws.profile}
- **Stage/Environment**: ${this.config.aws.stage}

### Account Strategy
${context.awsAccounts.length > 1
  ? `Multi-account setup with ${context.awsAccounts.length} accounts`
  : 'Single account with environment separation'}

## Environment Separation

### Development
- **Purpose**: Development and testing
- **Access**: Development team
- **Data**: Non-production test data
- **Cost Controls**: Budget alerts configured

### Staging
- **Purpose**: Pre-production validation
- **Access**: Limited team access
- **Data**: Production-like data (anonymized)
- **Configuration**: Mirrors production

### Production
- **Purpose**: Customer-facing services
- **Access**: Restricted access, MFA required
- **Data**: Live customer data
- **Monitoring**: Enhanced monitoring and alerting

## Resource Organization

### Tagging Strategy
Required tags for all resources:
- **Environment**: dev/staging/prod
- **Project**: ${context.projectName}
- **Owner**: Team or individual responsible
- **CostCenter**: For billing allocation
- **ManagedBy**: Infrastructure as Code tool

### Naming Conventions
- Format: \`{project}-{env}-{service}-{resource-type}\`
- Example: \`${context.projectName.toLowerCase()}-prod-api-lambda\`

## Access Control

### IAM Structure

**Roles**:
- Admin: Full access (restricted to operations team)
- Developer: Read/write to dev resources
- ReadOnly: Audit and monitoring access
- CI/CD: Automated deployment access

**Policies**:
- Least privilege principle
- Service-specific policies
- Environment-based boundaries
- MFA required for privileged operations

### Cross-Account Access
${context.awsAccounts.length > 1
  ? '- IAM roles for cross-account access\n- Assume role for service operations\n- Centralized audit logging'
  : '- Not currently configured'}

## Billing and Cost Management

### Cost Allocation
- Tag-based cost allocation
- Environment-level budgets
- Service-level cost tracking
- Regular cost optimization reviews

### Budget Controls
- Development: $[To be configured]
- Staging: $[To be configured]
- Production: $[To be configured]
- Alerts at 50%, 80%, 100% of budget

## Compliance and Governance

### AWS Organizations
${context.awsAccounts.length > 1
  ? '- Organizational units per environment\n- Service control policies\n- Consolidated billing'
  : '- To be configured for multi-account setup'}

### Compliance Controls
- AWS Config rules for compliance
- Security Hub for security standards
- CloudTrail for audit logging
- GuardDuty for threat detection

### Guardrails
- Service control policies (if using Organizations)
- Required encryption for data at rest
- Required MFA for console access
- Prevent public S3 buckets (if applicable)

## Disaster Recovery

### Backup Strategy
- ${context.backupEnabled ? 'AWS Backup configured' : 'Backup strategy to be implemented'}
- Cross-region backup replication
- 30-day retention minimum
- Regular restore testing

### Business Continuity
- Documented recovery procedures
- RTO: [To be defined]
- RPO: [To be defined]
- Annual DR testing

## Monitoring and Logging

### Centralized Logging
- CloudTrail: All API calls
- VPC Flow Logs: Network traffic
- Application Logs: ${context.monitoringTools.join(', ') || 'CloudWatch Logs'}
- 90-day retention minimum

### Security Monitoring
- Security Hub: Security posture
- GuardDuty: Threat detection
- Config: Compliance monitoring
- Automated remediation where possible

## Network Architecture

### VPC Configuration
- Public subnets: Load balancers, NAT gateways
- Private subnets: Application servers, databases
- Isolated subnets: Highly sensitive resources

### Connectivity
- VPC peering (if multi-VPC)
- Transit Gateway (if complex topology)
- VPN or Direct Connect (if hybrid)

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Platform Team
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }

  private generateWorkloadResilience(context: ProjectContext): string {
    return `---
requirement_id: PLAT-003
title: Workload Resilience and Disaster Recovery
category: platform
status: completed
generated_at: ${new Date().toISOString()}
auto_completed: true
---

# Workload Resilience and Disaster Recovery

**Requirement ID**: PLAT-003
**Category**: Platform
**Status**: Auto-Completed

## Overview

Resilience strategy and disaster recovery plan for ${context.projectName}.

## High Availability Architecture

### Multi-AZ Deployment
${context.cdkStacks.some(s =>
  s.resources.includes('RDS') || s.resources.includes('DynamoDB') ||
  s.resources.includes('Aurora')
) ? '- Database services deployed across multiple availability zones' : '- Multi-AZ deployment recommended for data services'}

### Auto-Scaling
- Compute resources scale based on demand
- Automatic recovery from instance failures
- Load balancing across healthy instances

### Fault Isolation
- Availability zone isolation
- Resource distribution across AZs
- Independent failure domains

## Disaster Recovery

### Recovery Objectives
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Target Availability**: 99.9%

### DR Strategy
**Approach**: ${context.regions.length > 1 ? 'Warm standby (multi-region)' : 'Backup and restore with regional redundancy recommended'}

### Backup Strategy
${context.backupEnabled
  ? '**Status**: Automated backups configured\n\n**Backup Scope**:'
  : '**Status**: To be configured\n\n**Recommended Scope**:'}
${context.awsServices.filter(s =>
  s.includes('RDS') || s.includes('DynamoDB') || s.includes('S3') ||
  s.includes('EBS') || s.includes('Aurora')
).map(s => `- ${s}: Daily automated backups`).join('\n')}

**Retention**:
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year (compliance)

**Testing**:
- Monthly restore verification
- Quarterly DR drill
- Annual full DR exercise

## Recovery Procedures

### Service Restoration Priority
1. **Critical** (RTO: 1 hour): Core application services
2. **High** (RTO: 4 hours): Supporting services
3. **Medium** (RTO: 24 hours): Reporting and analytics
4. **Low** (RTO: 72 hours): Development and test environments

### Recovery Steps

#### Database Recovery
1. Identify failure scope
2. Restore from most recent backup
3. Apply transaction logs (if available)
4. Verify data integrity
5. Resume application connections

#### Application Recovery
1. Deploy to standby region (if multi-region)
2. Update DNS/routing
3. Verify service functionality
4. Monitor for errors
5. Communicate status

#### Infrastructure Recovery
1. Deploy infrastructure from CDK code
2. Restore application deployments
3. Restore data from backups
4. Validate end-to-end functionality
5. Switch traffic to restored environment

## Monitoring and Alerting

### Health Checks
- Application health endpoints
- Database connectivity
- External dependency status
- Automated failover triggers

### Alerting
**Monitoring Tools**: ${context.monitoringTools.join(', ') || 'CloudWatch'}

**Critical Alerts** (immediate notification):
- Service outage
- Database failure
- Security breach
- Data corruption

**Warning Alerts** (15-minute notification):
- Performance degradation
- Resource constraints
- Backup failures
- Unusual traffic patterns

## Resilience Testing

### Regular Testing Schedule
- **Monthly**: Backup restore testing
- **Quarterly**: Failover testing
- **Bi-annually**: Full DR exercise
- **Annually**: Cross-region failover (if applicable)

### Test Scenarios
1. Single AZ failure
2. Database failover
3. Application server failure
4. Full region outage
5. Data corruption and restore

## Infrastructure Resilience

### Application Layer
${context.cdkStacks.filter(s =>
  s.resources.includes('Lambda') || s.resources.includes('ECS') ||
  s.resources.includes('EC2')
).map(s => `- ${s.name}: Auto-scaling and health monitoring`).join('\n')}

### Data Layer
${context.cdkStacks.filter(s =>
  s.resources.includes('RDS') || s.resources.includes('DynamoDB') ||
  s.resources.includes('S3')
).map(s => `- ${s.name}: Multi-AZ with automated backups`).join('\n')}

### Network Layer
- Multi-AZ load balancers
- Route53 health checks
- CloudFront for static assets (if applicable)

## Security Considerations

### Data Protection
- ${context.encryptionEnabled ? 'Encryption enabled' : 'Encryption to be configured'} for backups
- Secure backup storage
- Access controls for backup data
- Backup integrity verification

### Access Control
- Emergency access procedures documented
- DR runbooks maintain security controls
- Audit logging during recovery
- Post-recovery security validation

## Communication Plan

### Incident Notification
- Automated alerts to on-call team
- Management notification for major incidents
- Customer communication for service interruptions
- Post-incident reports

### Status Updates
- Regular updates during incident
- Status page updates
- Stakeholder communication
- Resolution notification

## Continuous Improvement

### Post-Incident Reviews
- Root cause analysis
- Process improvements
- Documentation updates
- Training needs assessment

### Metrics and Reporting
- MTTR (Mean Time To Recover)
- MTBF (Mean Time Between Failures)
- Backup success rate
- DR drill results

## Maintenance

**Review Schedule**: Quarterly
**Owner**: Operations Team
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Auto-generated by MSP Readiness Automation*
`;
  }
}
