---
requirementId: PEO-003
title: Personnel Offboarding
category: people
description: Defined termination processes ensuring all access to customer and Partner systems is revoked
---

# Personnel Offboarding Checklist

<!-- Instructions: This template provides a comprehensive offboarding checklist for team members leaving your AWS MSP practice. This is a CRITICAL security requirement - AWS requires documented processes ensuring all access is promptly revoked. -->

## Overview

**Purpose:** Ensure secure and complete offboarding of departing employees, contractors, and vendors, with particular attention to revoking access to customer AWS accounts and sensitive systems.

**Security Criticality:** HIGH - Unrevoked access poses significant risk to customer data and systems.

**Offboarding Timeline:** Access revocation begins immediately upon notification; full offboarding completed within [X] hours of separation.

---

## Offboarding Process Summary

### Key Principles
1. **Immediate Access Revocation:** Customer-facing access revoked immediately
2. **Zero Trust:** Assume all access must be explicitly revoked; do not rely on expiration
3. **Audit Trail:** Document all access revocation steps
4. **Verification:** Confirm access has been removed through testing
5. **Knowledge Transfer:** Ensure continuity of customer service

### Roles and Responsibilities
| Role | Responsibility |
|------|----------------|
| **Manager** | Initiate offboarding, knowledge transfer, exit interview |
| **HR** | Process termination paperwork, coordinate timeline |
| **IT/Security** | Revoke all system access, verify completion |
| **CCOE/Operations Lead** | Revoke AWS and customer-specific access |
| **Customer Success** | Notify customers (if appropriate), reassign accounts |

---

## Pre-Offboarding (When Separation is Known)

### Voluntary Departure (Resignation)
- [ ] **Resignation Notice Received:** Date: [____]
- [ ] **Last Day of Work:** [____]
- [ ] **Notice Period:** [X] weeks
- [ ] **Manager Notified:** [Date]
- [ ] **HR Notified:** [Date]
- [ ] **Offboarding Kickoff Meeting Scheduled:** [Date/Time]

### Involuntary Departure (Termination)
- [ ] **Termination Decision Made:** Date: [____]
- [ ] **Termination Date/Time:** [____]
- [ ] **HR and Legal Consulted:** [Date]
- [ ] **Manager Briefed:** [Date]
- [ ] **IT/Security on Standby:** Access revocation to begin immediately upon termination

### Contractor/Vendor End of Engagement
- [ ] **Contract End Date:** [____]
- [ ] **Renewal Decision:** [Renewing / Not Renewing]
- [ ] **Notice Provided to Contractor:** [Date]
- [ ] **Offboarding Plan Reviewed:** [Date]

---

## Immediate Actions (Day of Separation or Earlier for Involuntary)

**CRITICAL: These actions must be completed immediately, ideally within 1 hour of separation.**

### 1. AWS and Customer System Access Revocation

#### AWS IAM Identity Center / SSO
- [ ] **Disable User in IAM Identity Center:** [Timestamp: ____]
- [ ] **Verify User Cannot Authenticate:** [Tested by: ____ Time: ____]
- [ ] **Remove User from All Permission Sets:** [Timestamp: ____]
- [ ] **Remove User from All AWS SSO Groups:** [Timestamp: ____]

**Verification:**
- [ ] Test login to confirm access denied
- [ ] Review CloudTrail for any successful authentications post-revocation

#### Customer AWS Account Access
For each customer account, revoke:

| Customer/Account | Access Method | Revocation Action | Verified By | Timestamp |
|------------------|---------------|-------------------|-------------|-----------|
| [Customer A] | [IAM Role/SSO] | [Removed from group/Deleted role trust] | [Name] | [Time] |
| [Customer B] | [IAM Role/SSO] | [Removed from group/Deleted role trust] | [Name] | [Time] |
| [Customer C] | [IAM Role/SSO] | [Removed from group/Deleted role trust] | [Name] | [Time] |

**Actions:**
- [ ] List all customer accounts user had access to (via IAM, SSO, or assumed roles)
- [ ] Remove user from AWS SSO groups granting customer access
- [ ] Update IAM role trust policies if user had direct role assumption
- [ ] Revoke any IAM user accounts (if they exist - should not per best practice)
- [ ] Rotate any shared credentials user had access to (e.g., service account passwords)

**Verification:**
- [ ] Attempt to assume each customer role - should fail
- [ ] Review AWS CloudTrail for any post-revocation access attempts

#### AWS Access Keys and Credentials
- [ ] **Search for Active IAM Access Keys:** [User had keys: Yes / No]
  - [ ] If Yes: Deactivate all access keys immediately
  - [ ] Access Key IDs deactivated: [List keys: ____]
  - [ ] Timestamp: [____]
- [ ] **Search CodeCommit/Secrets Manager for any credentials:** [Found: Yes / No]
  - [ ] If Yes: Rotate immediately
- [ ] **MFA Devices:** [User had MFA: Yes / No]
  - [ ] If Yes: Deactivate MFA device
  - [ ] Timestamp: [____]

---

### 2. Corporate System Access Revocation

#### Identity Provider (Okta, Azure AD, etc.)
- [ ] **Disable User Account in IdP:** [Timestamp: ____]
- [ ] **Verify User Cannot Authenticate:** [Tested by: ____ Time: ____]
- [ ] **Remove from All Groups:** [Timestamp: ____]

#### Email and Communication
- [ ] **Disable Email Account:** [Timestamp: ____]
  - [ ] Set out-of-office message (forward to: [Manager/Replacement])
  - [ ] Duration: [Permanent / 30 days]
  - [ ] Forward emails to: [Email address]
  - [ ] Timestamp: [____]
- [ ] **Revoke Slack/Teams Access:** [Timestamp: ____]
- [ ] **Remove from Distribution Lists:** [Timestamp: ____]
- [ ] **Revoke Calendar Access:** [Timestamp: ____]

#### VPN and Network Access
- [ ] **Disable VPN Access:** [Timestamp: ____]
- [ ] **Revoke WiFi Access (if applicable):** [Timestamp: ____]
- [ ] **Disable Badge/Physical Access:** [Timestamp: ____]

---

### 3. Application and Tool Access Revocation

#### ITSM and Ticketing
- [ ] **ServiceNow/Jira:** Disable user, reassign open tickets
  - [ ] User deactivated: [Timestamp: ____]
  - [ ] Open tickets reassigned to: [Name]
  - [ ] Tickets reassigned: [Count]
- [ ] **PagerDuty/Opsgenie:** Remove from on-call rotations and escalation policies
  - [ ] User removed: [Timestamp: ____]
  - [ ] Replacement added to on-call: [Name]

#### Monitoring and Observability
- [ ] **CloudWatch/Datadog/New Relic:** Remove user access [Timestamp: ____]
- [ ] **Grafana/Kibana/Other:** Remove user access [Timestamp: ____]

#### Security Tools
- [ ] **Security Hub/GuardDuty:** Remove from access [Timestamp: ____]
- [ ] **Wiz/Prisma/Other Security Platforms:** Revoke access [Timestamp: ____]

#### Code Repositories and CI/CD
- [ ] **GitHub/GitLab/Bitbucket:** Remove from organization [Timestamp: ____]
  - [ ] Personal access tokens revoked: [Yes/No]
  - [ ] SSH keys removed: [Yes/No]
- [ ] **CI/CD Systems (Jenkins, CircleCI, etc.):** Revoke access [Timestamp: ____]

#### Collaboration and Documentation
- [ ] **Confluence/Notion:** Revoke access or downgrade to view-only [Timestamp: ____]
- [ ] **Google Drive/SharePoint:** Revoke access to sensitive folders [Timestamp: ____]
- [ ] **Miro/Lucidchart:** Remove from organization [Timestamp: ____]

#### Other Tools
- [ ] **CRM (Salesforce, HubSpot):** Deactivate user [Timestamp: ____]
- [ ] **Password Manager (1Password, LastPass):** Remove from vaults [Timestamp: ____]
- [ ] **Expense/Finance Tools:** Revoke access [Timestamp: ____]
- [ ] **[Other Tool 1]:** [Action taken] [Timestamp: ____]
- [ ] **[Other Tool 2]:** [Action taken] [Timestamp: ____]

---

### 4. Mobile Device and Equipment

#### Company Devices
- [ ] **Laptop/Desktop:** Returned [Date: ____] or Remote wipe initiated [Timestamp: ____]
- [ ] **Mobile Phone:** Returned [Date: ____] or Remote wipe initiated [Timestamp: ____]
- [ ] **Tablet/iPad:** Returned [Date: ____] or Remote wipe initiated [Timestamp: ____]
- [ ] **Hardware Tokens (YubiKey, etc.):** Returned [Date: ____]
- [ ] **Badge/Access Card:** Returned [Date: ____]
- [ ] **Other Equipment:** [List: ____] Returned [Date: ____]

#### BYOD (Bring Your Own Device)
- [ ] **Remove Company Data from Personal Devices:** [MDM wipe triggered: Yes/No]
  - [ ] Timestamp: [____]
- [ ] **Revoke Mobile Device Access (MDM):** [Timestamp: ____]
- [ ] **Remove Company Email/Apps from Personal Phone:** [Confirmed: Yes/No]

---

## Within 24 Hours of Separation

### Knowledge Transfer and Continuity

#### Customer Account Transition
- [ ] **List All Assigned Customers:** [Count: ____]
  - [ ] Customer 1: [Name] Reassigned to: [Name]
  - [ ] Customer 2: [Name] Reassigned to: [Name]
  - [ ] Customer 3: [Name] Reassigned to: [Name]
- [ ] **Open Tickets Reassigned:** [Count: ____ ] Assigned to: [Name(s)]
- [ ] **Scheduled Customer Meetings:** [Count: ____] Reassigned or canceled
- [ ] **Customer Communication:** [If appropriate] Notify customers of transition
  - [ ] Email template used: [Yes/No]
  - [ ] Customers notified: [Date: ____]

#### Documentation and Handoff
- [ ] **Handoff Meeting with Manager/Replacement:** [Date: ____]
- [ ] **Document Current Projects and Status:** [Documented in: ____]
- [ ] **Share Passwords/Credentials (via secure method):** [Completed: Yes/No]
- [ ] **Transfer Ownership of Documents:** [Completed: Yes/No]
- [ ] **Update On-Call Rotation:** [Removed from schedule: Date ____]

---

### Access Audit and Verification

#### Comprehensive Access Review
- [ ] **Review All Access Logs (Last 90 Days):** 
  - [ ] AWS CloudTrail: [Reviewed by: ____ Date: ____]
  - [ ] Application logs: [Reviewed by: ____ Date: ____]
  - [ ] VPN logs: [Reviewed by: ____ Date: ____]
- [ ] **Identify Any Unusual Activity:** [Findings: ____]
- [ ] **Generate Access Revocation Report:** [Generated by: ____ Date: ____]

#### Post-Revocation Testing
- [ ] **Attempt Login to All Systems (as departed user):** [Tested by: ____ Date: ____]
  - [ ] AWS: [Result: Access Denied ✓]
  - [ ] IdP (Okta/Azure AD): [Result: Access Denied ✓]
  - [ ] Email: [Result: Access Denied ✓]
  - [ ] VPN: [Result: Access Denied ✓]
  - [ ] GitHub/GitLab: [Result: Access Denied ✓]
  - [ ] [Other critical systems]: [Result: Access Denied ✓]

---

## Within 1 Week of Separation

### Exit Process Completion

#### HR and Administrative
- [ ] **Final Paycheck Processed:** [Date: ____]
- [ ] **Benefits Termination:** [Effective Date: ____]
- [ ] **COBRA/Benefits Continuation Info Sent:** [Date: ____]
- [ ] **Exit Interview Conducted:** [Date: ____ ] [Notes: ____]
- [ ] **Signed Termination Agreement (if applicable):** [Date: ____]
- [ ] **Return of Confidential Information Confirmed:** [Date: ____]

#### Legal and Compliance
- [ ] **NDA Reminder Sent:** [Date: ____]
- [ ] **Non-Compete/Non-Solicit Review (if applicable):** [Date: ____]
- [ ] **Intellectual Property Assignment Confirmed:** [Date: ____]

#### Financial
- [ ] **Expense Reports Submitted and Approved:** [Date: ____]
- [ ] **Company Credit Card Returned and Canceled:** [Date: ____]
- [ ] **Outstanding Balances Settled:** [Date: ____]

---

### Customer Notification and Communication

#### When to Notify Customers
- [ ] **Notify if user was primary customer contact:** [Required: Yes/No]
- [ ] **Notify if user had escalation privileges:** [Required: Yes/No]
- [ ] **Notify if contractually required:** [Required: Yes/No]

**Customer Notification Template:**
> Dear [Customer Name],
>
> We wanted to inform you that [Employee Name], who has been supporting your account, is no longer with [Company Name] as of [Date]. 
>
> [Replacement Name] will be your primary contact going forward and is fully up to speed on your environment and any ongoing work. You can reach [him/her/them] at [Email] or [Phone].
>
> We have completed all necessary security procedures, including revoking [Employee Name]'s access to your AWS accounts and systems. There is no action required on your part.
>
> If you have any questions or concerns, please don't hesitate to reach out.
>
> Best regards,  
> [Manager Name]

- [ ] **Customers Notified:** [Count: ____] [Date: ____]

---

## Ongoing Monitoring (30 Days Post-Separation)

### Post-Offboarding Verification
- [ ] **Week 1 Review:** Any access anomalies detected? [Yes/No - Notes: ____]
- [ ] **Week 2 Review:** Any access anomalies detected? [Yes/No - Notes: ____]
- [ ] **Week 4 Review:** Any access anomalies detected? [Yes/No - Notes: ____]

### CloudTrail Monitoring
- [ ] **Monitor CloudTrail for 30 days:** Any activity from departed user's identity? [Yes/No]
  - [ ] If Yes: Investigate and remediate immediately
- [ ] **Review AWS IAM credential reports:** Any orphaned credentials? [Yes/No]
- [ ] **Review application logs:** Any API calls from departed user's credentials? [Yes/No]

### Final Cleanup
- [ ] **Delete email account (after 30 days):** [Date: ____]
- [ ] **Archive documents to [Location]:** [Date: ____]
- [ ] **Remove from company directory:** [Date: ____]
- [ ] **Close offboarding ticket:** [Date: ____]

---

## Offboarding Checklist by Role

### Cloud Engineer / DevOps Engineer
**Additional focus areas:**
- [ ] AWS IAM user/role access (all customer accounts)
- [ ] SSH keys (EC2 instances, bastion hosts)
- [ ] Git repository access (personal access tokens, deploy keys)
- [ ] CI/CD pipeline access
- [ ] Secrets Manager / Parameter Store access
- [ ] Terraform/IaC state file access
- [ ] Kubernetes cluster access (if applicable)

### Solutions Architect / Customer Success Manager
**Additional focus areas:**
- [ ] Customer relationship handoff
- [ ] Pending proposals or quotes
- [ ] Active pre-sales engagements
- [ ] Scheduled architecture reviews
- [ ] CRM account ownership transfer

### Security Engineer
**Additional focus areas:**
- [ ] Security tool access (SIEM, SOAR, vulnerability scanners)
- [ ] Incident response platform access
- [ ] Compliance portal access
- [ ] Security audit logs review
- [ ] Elevated privileges verification (all revoked)

---

## Incident Response for Offboarding

### High-Risk Offboarding (Involuntary Termination, Misconduct)

**Immediate Actions (within 15 minutes):**
- [ ] Disable all access immediately (before informing employee if possible)
- [ ] Alert security team
- [ ] Enable enhanced monitoring of user's previous activities
- [ ] Review recent access logs for suspicious activity
- [ ] Consider rotating customer AWS credentials user had access to
- [ ] Document all actions taken with timestamps

**Follow-Up Actions:**
- [ ] Forensic review of user's recent activities (if warranted)
- [ ] Customer notification (if security incident occurred)
- [ ] Legal consultation (if appropriate)
- [ ] Incident report documentation

---

## Offboarding Metrics and Reporting

### Metrics Tracked
| Metric | Target | Current Avg |
|--------|--------|-------------|
| Time to Initial Access Revocation | < 1 hour | [X] minutes |
| Time to Complete Offboarding | < 24 hours | [X] hours |
| Post-Offboarding Access Incidents | 0 | [X] per quarter |
| Equipment Recovery Rate | 100% | [X]% |

### Reporting
- **Offboarding Report:** Generated for each departure (sent to: Manager, HR, Security)
- **Quarterly Audit:** Review all offboardings, ensure compliance
- **Annual Review:** Offboarding process improvement review

---

## Supporting Documentation

### Included Offboarding Documents
- [ ] Offboarding Checklist (this document)
- [ ] Sample Customer Notification Email
- [ ] Access Revocation Verification Report Template
- [ ] Equipment Return Form
- [ ] Exit Interview Template
- [ ] Offboarding Completion Report (last 6 months)

### Evidence Location
```
evidence/people/offboarding/
├── offboarding-checklist-template.md
├── customer-notification-template.txt
├── access-revocation-report-template.xlsx
├── equipment-return-form.pdf
├── exit-interview-template.pdf
└── offboarding-completion-records-[YYYY].xlsx
```

---

**Document Version:** 1.0  
**Prepared By:** [Name, Title]  
**Date Prepared:** [Date]  
**Next Review:** [Date - recommend annual review]

---

## Notes for AWS MSP Program Submission

**What AWS is Looking For:**
- **Comprehensive Process:** Is there a detailed offboarding checklist that covers all access points?
- **Customer Access Focus:** Does the process explicitly address revoking AWS and customer system access?
- **Timeliness:** Is access revoked immediately (within hours, not days)?
- **Verification:** Is there testing/verification that access was actually revoked?
- **Audit Trail:** Are offboarding actions documented and logged?

**Critical Requirements:**
- ✅ Immediate revocation of customer AWS account access
- ✅ Documented process for removing access to all systems
- ✅ Verification that access is actually revoked (not just assumed)
- ✅ Security audit of recent user activity
- ✅ Proper knowledge transfer to avoid customer service disruption

**You Should Demonstrate:**
- This comprehensive offboarding checklist
- Evidence of completed offboardings (anonymized records)
- Clear ownership (IT/Security responsible for execution)
- Defined timelines (immediate, 24 hours, 1 week)
- Monitoring and verification steps
- Incident response plan for high-risk offboarding

**Common Pitfalls to Avoid:**
- ❌ Slow access revocation (days/weeks)
- ❌ Forgotten access points (SSH keys, API tokens, shared credentials)
- ❌ No verification that access was removed
- ❌ No audit of user's recent activity
- ❌ Poor knowledge transfer leading to customer service gaps
