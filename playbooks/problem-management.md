---
generated: "2026-08-04T16:01:14.454Z"
template_version: "1.0"
status: "draft"
requirement_id: "OPSP-002"
---

# Problem Management Playbook

**Project**: FIPCO
**Organization**: Flexion Org
**Last Updated**: 2026-08-04

## Purpose

This playbook defines the problem management process for FIPCO, focusing on post-incident analysis, root cause identification, and prevention of recurring incidents.

## Scope

This playbook covers:
- Post-incident analysis and review
- Root cause analysis (RCA)
- Problem identification and tracking
- Preventive action implementation
- Customer communication
- Knowledge base updates

## Problem vs. Incident

| Aspect | Incident | Problem |
|--------|----------|---------|
| **Focus** | Restore service | Prevent recurrence |
| **Timeline** | Immediate | After incident resolved |
| **Goal** | Minimize impact | Eliminate root cause |
| **Output** | Service restored | Permanent fix or workaround |

## Post-Incident Review Process

### When Required

**Mandatory PIR**:
- SEV-1 incidents (critical outages)
- SEV-2 incidents (major degradation)
- Any incident impacting customers
- Recurring issues (3+ occurrences)

**Optional PIR**:
- SEV-3 incidents (if learning opportunity)
- Near-miss incidents
- Significant security events

### Timeline

1. **Incident Resolution**: 0 hours (service restored)
2. **PIR Scheduling**: Within 24 hours
3. **PIR Meeting**: Within 48 hours of resolution
4. **PIR Document**: Published within 72 hours
5. **Action Items**: Tracked to completion (30-90 days)

### PIR Meeting

**Duration**: 60 minutes

**Attendees**:
- Incident Commander
- Technical responders
- Product Owner
- Engineering Manager
- Customer Success (if customer-impacted)

**Agenda**:
1. **Incident Timeline** (10 min): Chronological sequence of events
2. **Impact Assessment** (10 min): Customer impact, business impact, duration
3. **Root Cause Analysis** (20 min): What, why, contributing factors
4. **Response Evaluation** (10 min): What went well, what didn't
5. **Action Items** (10 min): Preventive measures, improvements

**Ground Rules**:
- Blameless culture: Focus on systems, not people
- Assume good intent
- Be specific and factual
- Focus on learnings

## Root Cause Analysis

### 5 Whys Technique

**Example**:
```
Issue: Database connection timeout

Why? Connection pool exhausted
Why? Too many concurrent requests
Why? Traffic spike from new feature launch
Why? No load testing performed
Why? Load testing not in release checklist

Root Cause: Missing load testing in deployment process
Action: Add load testing requirement to release checklist
```

### Fishbone Diagram (Ishikawa)

**Categories**:
- **People**: Skills, training, handoffs
- **Process**: Procedures, documentation, communication
- **Technology**: Systems, tools, automation
- **Environment**: Infrastructure, capacity, dependencies

**Example**:
```
Problem: API Timeout

People:
  - On-call engineer unfamiliar with system
  - No runbook for this scenario

Process:
  - No alerting on connection pool saturation
  - Deployment during peak hours

Technology:
  - Default connection pool size too small
  - No auto-scaling configured

Environment:
  - Traffic spike from marketing campaign
  - Database not sized for peak load
```

### Contributing Factors

**Identify all factors** (not just primary cause):
- Immediate cause: What directly caused failure
- Systemic cause: Underlying issues enabling failure
- Latent conditions: Weaknesses that contributed

## PIR Document Template

### Executive Summary

**Incident**: [Brief description]
**Duration**: [Start time - End time, total duration]
**Impact**: [Customer impact, services affected]
**Root Cause**: [One sentence]
**Status**: [Resolved/Monitoring]

### Incident Timeline

| Time (UTC) | Event |
|------------|-------|
| 14:00 | Marketing email sent to 100k users |
| 14:15 | API latency increased to 5s (p99) |
| 14:20 | CloudWatch alarm triggered |
| 14:25 | On-call engineer acknowledged |
| 14:30 | Investigation began |
| 14:45 | Root cause identified (connection pool) |
| 15:00 | Temporary fix applied (increased pool size) |
| 15:15 | Latency returned to normal |
| 15:30 | Monitoring for stability |

### Impact Analysis

**Customer Impact**:
- Affected users: ~5,000 (5% of active users)
- Duration: 45 minutes of degraded service
- User experience: Slow API responses, some timeouts

**Business Impact**:
- Revenue: Estimated $500 in lost transactions
- Reputation: 15 support tickets, 3 social media mentions
- SLA: Within SLA (99.9% uptime maintained)

### Root Cause

**Primary Cause**: Database connection pool sized for average load, not peak

**Contributing Factors**:
1. No load testing performed before feature launch
2. No alerting on connection pool saturation
3. Marketing campaign coordination gap
4. Auto-scaling not configured for database connections

### What Went Well

- CloudWatch alarms detected issue quickly (5 min)
- On-call engineer responded within SLA
- Temporary fix effective
- Communication to customers timely

### What Didn't Go Well

- Issue took 30 minutes to identify root cause
- No runbook for connection pool exhaustion
- Marketing and engineering not coordinated on launch
- Rollback procedure unclear

### Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Add connection pool monitoring | DevOps | 2026-08-11 | In Progress |
| Create runbook for DB performance issues | SRE | 2026-08-11 | Not Started |
| Implement auto-scaling for DB connections | DevOps | 2026-08-18 | Not Started |
| Add load testing to release checklist | QA Lead | 2026-08-11 | Not Started |
| Establish launch coordination process | PM | 2026-08-15 | Not Started |

### Lessons Learned

1. **Load testing is critical**: Always test at expected peak load
2. **Monitor all resource limits**: Connection pools, file descriptors, etc.
3. **Coordinate with marketing**: Engineering must know about campaigns
4. **Runbooks need practice**: Create and test runbooks regularly

## Customer Communication

### Communication Triggers

**Immediate** (within 1 hour):
- SEV-1 incidents affecting customer service
- Data breach or security incident
- Widespread customer reports

**Post-Resolution** (within 24 hours):
- SEV-1 and SEV-2 incidents
- Any incident visible to customers
- Incidents resulting in data loss/corruption

### Communication Channels

**Internal**:
- Slack: #support
- Email: engineering team
- Status page: internal.status.FIPCO.com

**External**:
- Email: Affected customers
- Status page: status.FIPCO.com
- Social media: For widespread issues
- Support portal: Knowledge base article

### Message Templates

#### During Incident

**Subject**: [FIPCO] Service Degradation - [Brief Description]

```
We are currently experiencing [specific issue] affecting [services/features].

Impact: [Customer-facing impact]
Status: [Investigating/Identified/Fixing/Monitoring]
ETA: [Expected resolution time or "updates every 2 hours"]

We apologize for the inconvenience and are working to resolve this as quickly as possible.

Next update: [Time]

- Flexion Org Team
```

#### Post-Incident

**Subject**: [FIPCO] Incident Report - [Date]

```
On [date], we experienced a service disruption affecting [description].

What Happened:
[2-3 sentences describing the incident in customer-friendly terms]

Impact:
- Duration: [X minutes/hours]
- Affected: [Services/features affected]
- Scope: [Percentage or number of affected users]

Root Cause:
[1-2 sentences explaining root cause in non-technical terms]

Resolution:
[How the issue was resolved]

Prevention:
We have implemented the following measures to prevent recurrence:
- [Action item 1]
- [Action item 2]
- [Action item 3]

We sincerely apologize for the disruption and any inconvenience caused.

If you have questions, please contact msp-team@example.com.

- Flexion Org Team
```

## Problem Tracking

### Problem Record

**Fields**:
- Problem ID: PROB-{year}-{number}
- Incident ID(s): INC-{year}-{number}
- Title: Brief description
- Status: Identified → Investigating → Resolved → Closed
- Priority: Critical, High, Medium, Low
- Root Cause: Detailed description
- Workaround: Temporary mitigation
- Permanent Fix: Long-term solution
- Owner: Assigned team member
- Created Date
- Target Resolution Date
- Actual Resolution Date

**Example**:
```
Problem ID: PROB-2026-042
Incident ID: INC-2026-156, INC-2026-189, INC-2026-201
Title: Database connection pool exhaustion during traffic spikes
Status: Resolved
Priority: High
Root Cause: Static connection pool size, no auto-scaling
Workaround: Manual increase of pool size during campaigns
Permanent Fix: Implemented dynamic connection pool scaling based on load
Owner: DevOps Team
Created: 2026-08-04
Target: 2026-08-18
Actual: 2026-08-15
```

### Problem Prioritization

**Priority Matrix**:

| Priority | Frequency | Impact | Response Time |
|----------|-----------|--------|---------------|
| **CRITICAL** | >1/week | SEV-1 | 7 days |
| **HIGH** | >1/month | SEV-1/2 | 30 days |
| **MEDIUM** | >1/quarter | SEV-2/3 | 90 days |
| **LOW** | Rare | SEV-3/4 | Backlog |

## Knowledge Management

### Runbook Updates

After every PIR, update relevant runbooks:
1. Add new scenarios encountered
2. Document effective troubleshooting steps
3. Include resolution procedures
4. Update with lessons learned

**Runbook Review**: Quarterly review of all runbooks for accuracy

### Knowledge Base Articles

**Create KB Article**:
- For problems with known workarounds
- For recurring customer questions
- For self-service resolution steps

**Article Components**:
- Problem description
- Symptoms
- Cause
- Solution/workaround
- Prevention
- Related articles

### Team Learning

**Monthly Learning Session** (1 hour):
- Review interesting incidents/problems
- Share lessons learned
- Update team on action item progress
- Discuss trends and patterns

**Incident Log**: Maintain log of all incidents for trend analysis

## Metrics and Reporting

### Problem Management Metrics

**Monthly Report**:
- New problems identified
- Problems resolved
- Open problems by age
- Recurring incident rate (target: <10%)
- PIR completion rate (target: 100% for SEV-1/2)
- Action item completion rate (target: >90%)

**Trends**:
- Most common problem categories
- Average time to resolve problem
- Effectiveness of preventive measures

### Dashboard

**CloudWatch Dashboard**: `FIPCO-problem-management`

**Widgets**:
- Open problems by priority
- Recurring incidents (last 90 days)
- Action items completion rate
- PIR turnaround time
- Problem resolution time

## Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| **Incident Commander** | Lead PIR meeting, ensure action items tracked |
| **Engineering Manager** | Resource allocation for problem fixes, approve priorities |
| **Product Owner** | Customer communication, business impact assessment |
| **Technical Lead** | Root cause analysis, solution design |
| **DevOps Team** | Implement fixes, update monitoring |

## Compliance Mapping

| MSP Requirement | Evidence |
|----------------|----------|
| **OPSP-002** | Post-incident reports, customer communication templates |
| **CIS Control 17** | Incident management procedures, continuous improvement |

## Related Documents

- Incident Response Playbook
- Change Management Playbook
- Customer Communication Guidelines
- Runbook Library

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-04 | Initial playbook generated | MSP Readiness Tool |

---

**🤖 Generated by MSP Readiness Automation**
