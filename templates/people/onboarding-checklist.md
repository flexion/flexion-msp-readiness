---
requirementId: PEO-001
title: Personnel Onboarding
category: people
description: Defined onboarding processes and checklists for personnel relevant to MSP practice
---

# Personnel Onboarding Checklist

<!-- Instructions: This template provides a comprehensive onboarding checklist for new team members joining your AWS MSP practice. Customize based on role (engineer, architect, support, manager) and your specific tools/processes. -->

## Overview

**Purpose:** Ensure new MSP practice team members are effectively onboarded with proper training, access, and knowledge to deliver high-quality AWS managed services.

**Onboarding Duration:** [X] weeks  
**Onboarding Owner:** [Role - e.g., Engineering Manager, HR]  
**New Hire Buddy Program:** [Yes/No - assign experienced team member as mentor]

---

## Pre-Onboarding (Before Day 1)

### HR and Administrative
- [ ] Offer letter signed
- [ ] Background check completed
- [ ] I-9 / Work authorization verified
- [ ] Benefits enrollment completed
- [ ] Employee handbook acknowledged
- [ ] NDA and IP agreement signed

### Equipment and Access Provisioning
- [ ] Laptop/workstation ordered and configured
- [ ] Phone/mobile device provisioned (if applicable)
- [ ] Email account created
- [ ] Company Slack/Teams account created
- [ ] Badge/physical access provisioned (if applicable)
- [ ] Parking/building access arranged (if applicable)

### First Day Logistics
- [ ] Start date confirmed
- [ ] Start time and location communicated
- [ ] First day agenda sent
- [ ] Buddy/mentor assigned
- [ ] Team introductions scheduled

---

## Week 1: Company and Team Orientation

### Day 1: Welcome and Setup

#### Morning
- [ ] Welcome meeting with manager
- [ ] HR orientation session
- [ ] Workspace setup and equipment verification
- [ ] IT setup assistance (laptop, VPN, MFA)
- [ ] Review of first week schedule

#### Afternoon
- [ ] Team introduction meeting
- [ ] Company culture and values overview
- [ ] Org chart and key stakeholders review
- [ ] Review role expectations and responsibilities
- [ ] Buddy introduction and first 1:1

**Deliverable:** New hire completes first day survey

---

### Days 2-5: Core Company Knowledge

#### Company and Practice Overview
- [ ] Company history, mission, and strategy
- [ ] MSP practice overview and service offerings
- [ ] Customer base and key accounts overview
- [ ] Revenue model and business goals
- [ ] Competitive landscape and positioning

#### Tools and Systems Access
- [ ] **Communication:**
  - [ ] Slack/Teams access and channel overview
  - [ ] Email setup (distribution lists, signatures)
  - [ ] Calendar access and meeting best practices
  
- [ ] **Collaboration:**
  - [ ] Google Workspace / Microsoft 365 access
  - [ ] Confluence/Wiki access (knowledge base)
  - [ ] GitHub/GitLab access (code repositories)
  - [ ] Miro/Lucidchart (diagramming)

- [ ] **ITSM and Operations:**
  - [ ] ServiceNow/Jira Service Management access
  - [ ] Ticket queue overview and assignment process
  - [ ] Incident, problem, and change management overview
  - [ ] On-call rotation (PagerDuty/Opsgenie)

#### Policies and Procedures
- [ ] Security and acceptable use policy
- [ ] Customer data handling and privacy policy
- [ ] Code of conduct and ethics policy
- [ ] Time tracking and PTO procedures
- [ ] Expense reporting procedures

**Deliverable:** Access to all required tools verified, policies acknowledged

---

## Week 2: AWS and Technical Foundations

### AWS Fundamentals
- [ ] AWS console access (sandbox account)
- [ ] AWS IAM, organizations, and account structure training
- [ ] AWS core services overview (EC2, S3, RDS, Lambda, VPC)
- [ ] AWS Well-Architected Framework introduction
- [ ] AWS support model and how to engage AWS TAM/support

### AWS Security and Compliance
- [ ] AWS security services (GuardDuty, Security Hub, Config)
- [ ] IAM best practices (least privilege, MFA, roles)
- [ ] Compliance frameworks relevant to our customers (SOC2, HIPAA, PCI, etc.)
- [ ] Data encryption and key management (KMS)
- [ ] Logging and monitoring (CloudTrail, CloudWatch)

### Technical Stack Training
- [ ] **Infrastructure as Code:**
  - [ ] Terraform / CloudFormation / CDK overview
  - [ ] Repository structure and branching strategy
  - [ ] CI/CD pipeline overview
  
- [ ] **Monitoring and Observability:**
  - [ ] CloudWatch dashboards and alarms
  - [ ] [Third-party tools - e.g., Datadog, New Relic]
  - [ ] Log aggregation and analysis
  - [ ] Distributed tracing (X-Ray)

- [ ] **Automation:**
  - [ ] Lambda and EventBridge patterns
  - [ ] Systems Manager automation
  - [ ] Self-healing infrastructure approaches

**Deliverable:** Complete AWS sandbox exercises, build sample resources

---

## Week 3: MSP Service Delivery

### Customer Engagement and Service Delivery
- [ ] Customer communication guidelines and escalation paths
- [ ] SLA expectations and performance metrics
- [ ] Ticketing and incident management workflow
- [ ] Change management process and CAB (Change Advisory Board)
- [ ] Customer onboarding process overview

### Operational Runbooks and Procedures
- [ ] Introduction to operational runbook library
- [ ] Common incidents and troubleshooting guides
- [ ] Disaster recovery and backup procedures
- [ ] Cost optimization strategies and tools
- [ ] Performance tuning best practices

### Shadow Experienced Team Members
- [ ] Shadow 3-5 customer support tickets (observe resolution)
- [ ] Attend customer meeting or check-in call
- [ ] Review recent incident post-mortems
- [ ] Participate in team stand-up and weekly sync

### Security and Access Management
- [ ] **Customer AWS Account Access:**
  - [ ] Requesting and receiving IAM role access
  - [ ] Using AWS SSO / Identity Center
  - [ ] Session Manager for instance access
  - [ ] Audit trail and logging of actions
  
- [ ] **Security Protocols:**
  - [ ] Customer data access logging
  - [ ] Secure communication channels (encrypted chat, MFA)
  - [ ] Credential management (no long-lived keys)
  - [ ] Insider threat awareness

**Deliverable:** Successfully resolve first ticket with guidance

---

## Week 4: Hands-On Customer Work

### Assigned Customer Accounts
- [ ] Access granted to [X] customer AWS accounts (read-only initially)
- [ ] Review customer architecture diagrams and documentation
- [ ] Review customer runbooks and alert response procedures
- [ ] Introduction to customer success manager and account team

### First Independent Tasks
- [ ] Assigned [X] low-complexity tickets to resolve independently
- [ ] Contribute to documentation (update runbook or KB article)
- [ ] Participate in on-call shadow rotation (not primary, observing only)
- [ ] Complete [X] hands-on lab or certification study module

### Certification Path Planning
- [ ] Identify current AWS certifications (if any)
- [ ] Create certification roadmap (e.g., Solutions Architect Associate → Professional)
- [ ] Enroll in AWS training resources (Skill Builder, Udemy, ACloudGuru)
- [ ] Schedule first certification exam (target within 90 days)

### First 30-Day Check-In
- [ ] 1:1 with manager: Feedback, questions, adjustment of onboarding plan
- [ ] Review role expectations and success criteria
- [ ] Identify any gaps or additional training needs
- [ ] Set goals for first 90 days

**Deliverable:** First ticket resolved, certification exam scheduled

---

## Weeks 5-8: Increasing Independence

### Month 2 Goals
- [ ] Independently resolve [X] tickets per week
- [ ] Lead [X] customer interactions (scheduled maintenance, follow-up)
- [ ] Contribute to [X] infrastructure changes or projects
- [ ] Complete [X] hours of AWS training or certification study
- [ ] Attend customer QBR (Quarterly Business Review) as observer

### Advanced Technical Training (Role-Specific)

#### For Engineers/DevOps
- [ ] Advanced IaC patterns and modules
- [ ] CI/CD pipeline troubleshooting
- [ ] Kubernetes/ECS/EKS (if applicable)
- [ ] Database performance tuning
- [ ] Advanced networking (Transit Gateway, PrivateLink)

#### For Architects
- [ ] Well-Architected Review process
- [ ] Customer solution design workshops
- [ ] Migration planning and AWS migration tools (MGN, DMS)
- [ ] Multi-account landing zone design
- [ ] Cost modeling and FinOps

#### For Support/NOC
- [ ] Advanced incident triage and root cause analysis
- [ ] Alerting and monitoring configuration
- [ ] Customer communication best practices
- [ ] Escalation management
- [ ] Knowledge base curation

### Month 2 Check-In
- [ ] 1:1 with manager: Progress review
- [ ] Peer feedback session (buddy and team members)
- [ ] Adjust goals and development plan as needed

**Deliverable:** Consistently meeting performance expectations for role

---

## Weeks 9-12: Full Integration

### Month 3 Goals
- [ ] Full workload capacity for role
- [ ] Participate in on-call rotation (if applicable)
- [ ] Lead [X] customer projects or initiatives
- [ ] Complete AWS certification (or scheduled)
- [ ] Mentor new hire or contribute to onboarding improvements

### Specialized Training (Optional, Based on Customer Needs)
- [ ] Security specialty focus (Security Hub, Inspector, GuardDuty deep dive)
- [ ] Compliance and auditing (SOC2, HIPAA, PCI processes)
- [ ] Specific AWS service deep dive (e.g., EKS, RDS, Lambda at scale)
- [ ] Cost optimization and FinOps advanced techniques
- [ ] Disaster recovery and business continuity planning

### 90-Day Review
- [ ] Formal performance review with manager
- [ ] Review of 90-day goals and achievement
- [ ] Career development discussion (next 6-12 months)
- [ ] Compensation and benefits review (if applicable)
- [ ] Set goals for next quarter

**Deliverable:** Successfully onboarded, meeting full role expectations

---

## Role-Specific Onboarding Tracks

### AWS Solutions Architect
**Additional Focus Areas:**
- [ ] Customer architectural review process
- [ ] Well-Architected Framework assessment methodology
- [ ] Proposal development and technical scoping
- [ ] Pre-sales technical support
- [ ] Presenting to technical and executive audiences

### DevOps Engineer
**Additional Focus Areas:**
- [ ] CI/CD pipeline architecture and tools
- [ ] GitOps workflows and best practices
- [ ] Container orchestration (ECS, EKS)
- [ ] Infrastructure testing (Terratest, InSpec)
- [ ] Automation scripting (Python, Bash, PowerShell)

### Cloud Support Engineer
**Additional Focus Areas:**
- [ ] Ticket prioritization and SLA management
- [ ] Customer communication and expectation management
- [ ] Incident escalation procedures
- [ ] On-call rotation protocols
- [ ] Runbook creation and maintenance

### Customer Success Manager
**Additional Focus Areas:**
- [ ] Customer relationship management
- [ ] QBR preparation and facilitation
- [ ] Upsell and expansion opportunity identification
- [ ] Customer satisfaction tracking (NPS, CSAT)
- [ ] Renewal management and contract negotiation

---

## Onboarding Success Criteria

### Technical Competency
- [ ] Understands AWS core services and MSP service offerings
- [ ] Can independently resolve standard customer requests
- [ ] Follows security and compliance procedures
- [ ] Uses IaC and follows change management process
- [ ] Understands monitoring and alerting systems

### Operational Excellence
- [ ] Consistently meets SLA requirements for assigned work
- [ ] Communicates effectively with customers and team
- [ ] Documents work and contributes to knowledge base
- [ ] Escalates appropriately when needed
- [ ] Participates in team processes (stand-ups, retrospectives)

### AWS Knowledge
- [ ] AWS certification achieved or in progress
- [ ] Demonstrates AWS best practices in work
- [ ] Stays current with AWS service updates
- [ ] Can articulate AWS value proposition to customers

### Cultural Fit
- [ ] Aligns with company values
- [ ] Collaborates effectively with team
- [ ] Seeks feedback and acts on it
- [ ] Demonstrates customer-first mindset
- [ ] Takes ownership and accountability

---

## Continuous Learning and Development

### Ongoing Training (Post-Onboarding)
- **Monthly:** AWS service update review (team meeting)
- **Quarterly:** Advanced topic deep dive or certification study group
- **Annually:** AWS re:Invent or other major conference
- **Ongoing:** Pluralsight/ACloudGuru/Udemy subscriptions available

### Certification Goals
| Certification | Timeline | Status |
|---------------|----------|--------|
| AWS Certified Solutions Architect - Associate | Within 90 days | [ ] Planned [ ] Scheduled [ ] Passed |
| AWS Certified SysOps Administrator - Associate | Within 6 months | [ ] Planned [ ] Scheduled [ ] Passed |
| AWS Certified Solutions Architect - Professional | Within 12 months | [ ] Planned [ ] Scheduled [ ] Passed |
| AWS Certified Security - Specialty | [Timeline] | [ ] Planned [ ] Scheduled [ ] Passed |

**Company Support for Certifications:**
- Exam fees covered: [Yes/No - how many per year]
- Training materials provided: [Yes/No - what resources]
- Study time during work hours: [Yes/No - how much]
- Certification bonuses: [Yes/No - amount or structure]

---

## Onboarding Feedback and Improvement

### New Hire Feedback
- [ ] **Week 1 Survey:** First impressions, equipment/access issues
- [ ] **Week 4 Survey:** Training effectiveness, clarity of role
- [ ] **Day 90 Survey:** Overall onboarding experience, suggestions for improvement

### Manager Feedback
- [ ] **Week 2 Check-in:** On-track or adjustments needed
- [ ] **Week 4 Check-in:** Performance trajectory, identify gaps
- [ ] **Day 90 Review:** Formal assessment and goal setting

### Continuous Improvement
- Onboarding process reviewed and updated [Quarterly/Annually]
- Incorporate feedback from new hires and managers
- Update for new tools, processes, or customer requirements

---

## Supporting Documentation

### Onboarding Resources
- [ ] Employee Handbook
- [ ] Security Policies
- [ ] Customer Data Handling Guidelines
- [ ] MSP Service Catalog
- [ ] Runbook Library
- [ ] Knowledge Base Access
- [ ] Org Chart and Contact List
- [ ] AWS Certification Roadmap

### Evidence for AWS MSP Program
<!-- Prepare the following for MSP submission -->
- [ ] Onboarding checklist template (this document)
- [ ] Training curriculum outline
- [ ] Sample onboarding schedule (anonymized)
- [ ] New hire completion records (last 6 months)
- [ ] Certification tracking spreadsheet

### Evidence Location
```
evidence/people/onboarding/
├── onboarding-checklist-template.md
├── training-curriculum.pdf
├── sample-onboarding-schedule.pdf
└── onboarding-completion-records-[YYYY].xlsx
```

---

**Document Version:** 1.0  
**Prepared By:** [Name, Title]  
**Date Prepared:** [Date]  
**Next Review:** [Date - recommend annual review]

---

## Notes for AWS MSP Program Submission

**What AWS is Looking For:**
- **Structured Process:** Is there a defined onboarding process with checklists?
- **Technical Training:** Do new hires receive AWS and MSP service training?
- **Security Awareness:** Are security policies and customer data handling covered?
- **Consistency:** Is onboarding repeatable and documented?

**You Should Demonstrate:**
- Comprehensive onboarding checklist (this document)
- Training program that includes AWS, security, and MSP service delivery
- Clear timeline and milestones (week 1, week 2, etc.)
- Success criteria and performance expectations
- Continuous learning culture (certifications, ongoing training)
- Evidence of actual usage (completed onboarding records for recent hires)
