---
requirementId: GOV-003
title: Data Ownership and Customer Offboarding
category: governance
description: Customer contracts define data ownership, data transfer procedures, timeframes, and offboarding process
---

# Data Ownership and Customer Offboarding Policy

<!-- Instructions: Document how your contracts and processes handle data ownership, customer offboarding, and data transfer. This is critical for customer trust and legal compliance. -->

## Overview

**Policy Owner:** [Name, Title - typically General Counsel or VP Operations]  
**Last Reviewed:** [Date]  
**Applies To:** All MSP customer contracts and engagements

---

## Data Ownership Principles

### 1. Customer Data Ownership

**Core Principle:** Customer retains full ownership of all data stored in their AWS environments.

**Contract Language (Standard Clause):**
> "Customer retains all right, title, and interest in and to Customer Data. [Company] claims no ownership rights to Customer Data and shall not use Customer Data except as necessary to provide the Services."

### 2. Service Provider Data

**[Company] Data:** We retain ownership of:
- Our proprietary tools, scripts, and automation
- Infrastructure as Code templates developed by us
- Monitoring dashboards and alert configurations (as templates)
- Runbooks and operational procedures (as templates)
- Performance metrics and aggregated data (anonymized)

**Shared Deliverables:** Customer-specific implementations of our tools/templates belong to the customer.

### 3. Data Processing and Access

- We access customer data only as necessary to provide managed services
- All access is logged and auditable (CloudTrail, application logs)
- We do not use customer data for any purpose other than service delivery
- We do not share customer data with third parties without consent

---

## Customer Offboarding Process

### Offboarding Trigger Events

- Contract expiration and non-renewal
- Customer termination for convenience
- [Company] termination for cause
- Customer requests migration to internal team or different provider

### Offboarding Timeline

**Standard Notice Period:** [X] days (typically 30-90 days per contract)

**Accelerated Offboarding:** Available with [X] days notice (additional fees may apply)

---

## Data Transfer and Transition Procedures

### Phase 1: Offboarding Initiation (Day 1)

**Actions:**
- [ ] Offboarding notice received and acknowledged
- [ ] Offboarding project manager assigned
- [ ] Transition plan developed (based on environment complexity)
- [ ] Customer stakeholder meeting scheduled

**Deliverables:**
- Offboarding project plan with timeline
- Data inventory (what data exists, where it's stored)
- Access requirements during transition

---

### Phase 2: Knowledge Transfer (Days 1-30)

**Activities:**
- [ ] Documentation package prepared:
  - Architecture diagrams (current state)
  - Infrastructure as Code (Terraform/CloudFormation)
  - Runbooks and operational procedures
  - Monitoring and alerting configurations
  - Security baselines and policies
  - Cost optimization recommendations
  - Disaster recovery plans

- [ ] Knowledge transfer sessions:
  - Architecture walkthrough
  - Operations handoff
  - Security and compliance overview
  - Tooling and access procedures

**Deliverables:**
- Complete documentation package
- Recorded knowledge transfer sessions (if requested)
- Q&A session notes

---

### Phase 3: Access Transition (Days 30-60)

**Activities:**
- [ ] Customer team receives AWS access (IAM roles, SSO)
- [ ] Parallel operations period (both teams have access)
- [ ] [Company] team available for consultation
- [ ] Customer team shadows incident response
- [ ] Gradual handoff of operational responsibilities

**Deliverables:**
- Customer team trained and operational
- Documented handoff of on-call responsibilities
- Access verified for customer team

---

### Phase 4: Final Data Transfer (Days 60-90)

**Activities:**
- [ ] Final documentation updates
- [ ] Transfer of monitoring data (CloudWatch logs, metrics history)
- [ ] Transfer of backup data (if stored in our accounts)
- [ ] Export of ITSM tickets and history
- [ ] Export of cost and usage reports

**Data Transfer Methods:**
- AWS account data: Already in customer account (no transfer needed)
- Logs and backups: S3 export or cross-account copy
- Documentation: Zip file or Git repository
- ITSM history: CSV export or API-based transfer

**Deliverables:**
- All operational data transferred
- Customer confirmation of data receipt
- Data transfer completion report

---

### Phase 5: Service Termination (Day 90+)

**Activities:**
- [ ] [Company] revokes all access to customer AWS accounts
- [ ] [Company] removes customer data from internal systems
- [ ] Final invoice and reconciliation
- [ ] Customer confirms satisfactory offboarding
- [ ] Exit survey (optional)

**Data Retention:**
- [Company] retains only what is legally required (contracts, invoices)
- All operational data deleted per data retention policy (typically 30 days post-offboarding)
- Backups purged per retention schedule

**Deliverables:**
- Access revocation confirmation
- Data deletion certificate (if requested)
- Final close-out report

---

## Data Transfer Technical Specifications

### Infrastructure as Code (IaC)

**What:** All Terraform/CloudFormation/CDK code  
**Format:** Git repository or zip file  
**Delivery Method:** GitHub repo access or S3 download link

### CloudWatch Logs and Metrics

**What:** Historical logs and metrics (past [X] months)  
**Format:** CloudWatch Logs Insights exports, S3 export  
**Delivery Method:** Cross-account S3 copy or download link

### Backups and Snapshots

**What:** AWS Backup recovery points, RDS snapshots, EBS snapshots  
**Format:** Native AWS snapshot format  
**Delivery Method:** Already in customer account or cross-account share

### Documentation

**What:** Runbooks, architecture diagrams, SOPs  
**Format:** PDF, Markdown, Confluence export  
**Delivery Method:** S3 download or document sharing platform

### ITSM Ticket History

**What:** All tickets, incidents, changes related to customer  
**Format:** CSV export or API-based transfer  
**Delivery Method:** Email, S3 download, or direct system import

---

## Customer Offboarding Checklist

### Pre-Offboarding
- [ ] Notice period confirmed (per contract)
- [ ] Offboarding PM assigned
- [ ] Transition plan approved by customer
- [ ] Final invoice and payment terms agreed

### Documentation Transfer
- [ ] Architecture diagrams delivered
- [ ] IaC code transferred
- [ ] Runbooks and SOPs delivered
- [ ] Security and compliance docs delivered
- [ ] All documentation reviewed by customer

### Knowledge Transfer
- [ ] Architecture walkthrough completed
- [ ] Operations training completed
- [ ] Security training completed
- [ ] Q&A sessions completed
- [ ] Customer team ready to operate independently

### Data Transfer
- [ ] CloudWatch logs exported
- [ ] Backups verified accessible
- [ ] ITSM history exported
- [ ] Cost/usage reports provided
- [ ] Customer confirms data receipt

### Access Revocation
- [ ] [Company] team access revoked per PEO-003 process
- [ ] Customer confirms full operational control
- [ ] IAM roles/users deleted
- [ ] MFA devices deactivated
- [ ] Access revocation verified

### Final Closeout
- [ ] Final invoice paid
- [ ] Customer satisfaction survey sent
- [ ] Internal data purged (per retention policy)
- [ ] Offboarding retrospective completed
- [ ] Lessons learned documented

---

## Contract Terms (Standard Language)

### Data Ownership Clause
> **Section X: Data Ownership**
>
> Customer Data. Customer retains all right, title, and interest in and to all data, content, and materials provided by Customer or generated in Customer's AWS environment ("Customer Data"). [Company] shall not acquire any rights in Customer Data and shall use Customer Data solely for the purpose of providing the Services.

### Data Return and Deletion Clause
> **Section Y: Data Return Upon Termination**
>
> Upon termination or expiration of this Agreement, [Company] shall:
> (a) Return or transfer all Customer Data in [Company]'s possession or control in a commonly used electronic format;
> (b) Delete all copies of Customer Data from [Company]'s systems within thirty (30) days of termination, except as required by law;
> (c) Provide written certification of data deletion upon Customer's request.

### Offboarding Assistance Clause
> **Section Z: Offboarding Assistance**
>
> [Company] shall provide reasonable assistance to Customer during the offboarding process, including:
> (a) Transfer of documentation, runbooks, and IaC code;
> (b) Knowledge transfer sessions (up to [X] hours);
> (c) Parallel operations support for up to [X] days;
> (d) Data export and transfer assistance.
>
> Offboarding assistance is included in the notice period. Expedited offboarding or additional assistance beyond the standard scope may incur additional fees.

---

## Data Retention Policy

**During Service Delivery:**
- Customer data: Stored in customer AWS accounts (we are custodian, not owner)
- Logs and backups: Per customer-defined retention policies
- ITSM tickets: Retained for duration of service + [X] years

**Post-Offboarding:**
- Contracts, invoices, SOWs: [X] years (per legal requirements)
- Operational data (logs, configs): Deleted within 30 days
- Backups (if stored in our systems): Deleted per retention schedule
- ITSM history: Transferred to customer, then deleted

**Legal Hold:** Data subject to legal hold retained until hold is lifted

---

## Supporting Documentation

### Included Documents
- [ ] Data Ownership and Offboarding Policy (this document)
- [ ] Customer Contract Template (data ownership clauses)
- [ ] Offboarding Checklist
- [ ] Data Transfer Procedures
- [ ] Sample Offboarding Project Plan
- [ ] Example Offboarding Completion Report

### Evidence Location
```
evidence/governance/data-ownership/
├── data-ownership-policy.md
├── contract-template-data-clauses.pdf
├── offboarding-checklist.pdf
├── data-transfer-procedures.pdf
├── sample-offboarding-plan.pdf
└── offboarding-completion-report-example.pdf
```

---

**Document Version:** 1.0  
**Prepared By:** [Name, Title]  
**Date Prepared:** [Date]  
**Next Review:** [Date - recommend annual]

---

## Notes for AWS MSP Program Submission

**What AWS is Looking For:**
- **Clear Data Ownership:** Do contracts explicitly state customer owns their data?
- **Offboarding Process:** Is there a defined process for customer offboarding?
- **Data Transfer:** How is data returned to customer?
- **Timelines:** Are timeframes for data return defined?

**You Should Demonstrate:**
- Standard contract clauses addressing data ownership
- Documented offboarding process with clear phases
- Data transfer procedures (what, when, how)
- Reasonable timelines (typically 30-90 days)
- Examples or templates of offboarding deliverables
- Data deletion procedures post-offboarding

**Contract Requirements:**
- Customer retains ownership of their data
- Data return procedures defined
- Timelines for data transfer specified
- Assistance provided during offboarding
- Data deletion after offboarding (with customer confirmation)
