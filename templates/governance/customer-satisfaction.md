---
requirementId: GOV-002
title: Customer Satisfaction
category: governance
description: Mechanism to objectively capture customer satisfaction via surveys, post-interaction feedback, or review meetings
---

# Customer Satisfaction Process

<!-- Instructions: Document your customer satisfaction measurement and improvement process. AWS wants to see that you systematically gather and act on customer feedback. -->

## Overview

**Customer Satisfaction Owner:** [Name, Title - typically VP Customer Success]  
**Measurement Methods:** [e.g., NPS surveys, CSAT surveys, QBRs]  
**Survey Frequency:** [e.g., Quarterly NPS, Post-ticket CSAT]  
**Target NPS Score:** [e.g., >50]  
**Current NPS Score:** [Score - last measurement]

---

## Customer Satisfaction Measurement Methods

### 1. Net Promoter Score (NPS) Survey

**Frequency:** Quarterly  
**Distribution:** All active MSP customers  
**Survey Tool:** [e.g., SurveyMonkey, Typeform, Delighted]

**Survey Question:**
> "On a scale of 0-10, how likely are you to recommend [Company Name] MSP services to a colleague?"

**Follow-up Question:**
> "What is the primary reason for your score?"

**Scoring:**
- Promoters (9-10): Loyal customers who will refer others
- Passives (7-8): Satisfied but unenthusiastic customers
- Detractors (0-6): Unhappy customers who may churn

**NPS Calculation:** % Promoters - % Detractors

**Action Thresholds:**
- Detractor (0-6): Immediate follow-up call within 24 hours
- Passive (7-8): Follow-up within 1 week, identify improvement areas
- Promoter (9-10): Thank you message, request testimonial/reference

---

### 2. Customer Satisfaction (CSAT) - Post-Ticket Survey

**Frequency:** After each ticket closed  
**Distribution:** Automated via ITSM system  
**Response Rate Target:** >30%

**Survey Questions:**
1. "How satisfied were you with the resolution of your request?" (1-5 stars)
2. "How satisfied were you with the response time?" (1-5 stars)
3. "Any additional feedback?" (open text)

**Action Thresholds:**
- 1-2 stars: Manager reviews ticket and follows up with customer
- 3 stars: Team lead reviews for improvement opportunities
- 4-5 stars: No action, track trends

---

### 3. Quarterly Business Reviews (QBRs)

**Frequency:** Quarterly for all customers  
**Participants:** Customer stakeholders, CSM, Technical lead

**QBR Agenda:**
1. Service delivery metrics (SLAs, incidents, response times)
2. Infrastructure health and optimization opportunities
3. Security posture and compliance status
4. Cost analysis and optimization
5. Upcoming initiatives and roadmap
6. Open discussion / feedback

**Satisfaction Assessment:**
- Formal satisfaction rating collected at end of QBR (1-5 scale)
- Action items documented and tracked

---

### 4. Annual Customer Satisfaction Survey (Detailed)

**Frequency:** Annually  
**Distribution:** All customers

**Survey Topics:**
- Overall satisfaction (1-10)
- Service quality dimensions:
  - Technical expertise
  - Responsiveness
  - Communication
  - Proactive recommendations
  - Value for money
- Likelihood to renew (1-10)
- Areas for improvement (open text)
- Additional services desired (checklist)

---

## Customer Feedback Processing

### Feedback Collection and Tracking

| Method | Frequency | Tool | Owner | Distribution |
|--------|-----------|------|-------|--------------|
| NPS Survey | Quarterly | [Tool] | [CSM Lead] | All customers |
| CSAT (Post-Ticket) | Per ticket | [ITSM] | [Support Lead] | Per interaction |
| QBR Feedback | Quarterly | [Template] | [CSM] | Account-specific |
| Annual Survey | Annually | [Tool] | [CSM Lead] | All customers |
| Ad-hoc Feedback | Ongoing | [Email/Slack] | [CSM] | As received |

### Feedback Response SLAs

| Feedback Type | Response Time | Action Owner |
|---------------|---------------|--------------|
| Detractor (NPS 0-6) | 24 hours | Director/VP |
| Low CSAT (1-2 stars) | 48 hours | Manager |
| Critical feedback in QBR | Immediate | CSM + Manager |
| General improvement suggestions | 1 week | CSM |

---

## Customer Satisfaction Metrics and Targets

### Key Metrics

| Metric | Current | Target | Trend |
|--------|---------|--------|-------|
| **NPS Score** | [X] | [>50] | [↑/→/↓] |
| **CSAT Average (Post-Ticket)** | [X.X]/5 | [>4.5]/5 | [↑/→/↓] |
| **QBR Satisfaction** | [X.X]/5 | [>4.5]/5 | [↑/→/↓] |
| **Survey Response Rate** | [X]% | [>40]% | [↑/→/↓] |
| **Renewal Rate** | [X]% | [>95]% | [↑/→/↓] |
| **Churn Rate** | [X]% | [<5]% | [↑/→/↓] |
| **Customer Effort Score (CES)** | [X.X]/7 | [<2.0]/7 | [↑/→/↓] |

### Quarterly Trends

#### NPS by Quarter
| Quarter | NPS | Promoters % | Passives % | Detractors % | Response Rate |
|---------|-----|-------------|------------|--------------|---------------|
| Q1 [YYYY] | [X] | [X]% | [X]% | [X]% | [X]% |
| Q2 [YYYY] | [X] | [X]% | [X]% | [X]% | [X]% |
| Q3 [YYYY] | [X] | [X]% | [X]% | [X]% | [X]% |
| Q4 [YYYY] | [X] | [X]% | [X]% | [X]% | [X]% |

#### CSAT by Category
| Category | Avg Rating | % Excellent (5 stars) | % Poor (1-2 stars) | Volume |
|----------|------------|----------------------|-------------------|--------|
| Incident Response | [X.X]/5 | [X]% | [X]% | [X] tickets |
| Change Requests | [X.X]/5 | [X]% | [X]% | [X] tickets |
| General Support | [X.X]/5 | [X]% | [X]% | [X] tickets |
| Project Delivery | [X.X]/5 | [X]% | [X]% | [X] projects |

---

## Feedback Analysis and Action

### Root Cause Analysis for Negative Feedback

**Process for Detractors and Low CSAT:**
1. **Immediate Response:** Contact customer within SLA
2. **Root Cause Analysis:** Identify what went wrong
3. **Action Plan:** Define corrective actions
4. **Follow-up:** Re-engage customer after resolution
5. **Process Improvement:** Update procedures to prevent recurrence

**Example Detractor Analysis:**

| Customer | NPS Score | Reason Given | Root Cause | Action Taken | Resolution |
|----------|-----------|--------------|------------|--------------|------------|
| Customer A | 4 | "Slow incident response" | Understaffed on-call | Hired 2 engineers | Re-surveyed: 8 |
| Customer B | 5 | "Lack of proactive recommendations" | No regular architecture reviews | Scheduled quarterly reviews | Ongoing |

### Common Themes and Trends

**Positive Feedback Themes:**
- [Theme 1 - e.g., "Fast response times and knowledgeable team"]
- [Theme 2 - e.g., "Proactive cost optimization saved us $X"]
- [Theme 3 - e.g., "Excellent communication during incidents"]

**Areas for Improvement:**
- [Theme 1 - e.g., "More proactive recommendations needed"]
  - **Action:** Implement monthly optimization reports
- [Theme 2 - e.g., "Billing clarity could be improved"]
  - **Action:** Redesigned invoice format, added cost breakdown
- [Theme 3 - e.g., "Longer wait times during peak hours"]
  - **Action:** Added 2 FTEs to support team

---

## Customer Satisfaction Improvement Initiatives

### Current Quarter Initiatives

| Initiative | Objective | Owner | Status | Impact |
|------------|-----------|-------|--------|--------|
| [Initiative 1] | [e.g., Implement automated cost reports] | [Name] | [In Progress] | [Expected: +5 NPS] |
| [Initiative 2] | [e.g., Launch customer success portal] | [Name] | [Planned] | [Expected: Reduce effort] |
| [Initiative 3] | [e.g., Enhance runbook library] | [Name] | [In Progress] | [Expected: Faster resolution] |

### Past Improvements Based on Feedback

**Example 1: Improved Incident Communication**
- **Feedback:** "We weren't kept informed during the outage"
- **Action:** Implemented automated status page and proactive SMS/email updates
- **Result:** Incident satisfaction improved from 3.2 to 4.6 out of 5

**Example 2: Cost Transparency**
- **Feedback:** "AWS bill is confusing, hard to understand charges"
- **Action:** Created monthly cost breakdown report with visualization
- **Result:** Billing satisfaction improved from 3.8 to 4.5 out of 5

---

## Customer Escalation and Resolution

### Escalation Process for Dissatisfied Customers

**Level 1:** CSM/Account Manager
- Initial contact and issue documentation
- Resolution attempts

**Level 2:** Director of Customer Success
- Escalated if CSM cannot resolve within 7 days
- Development of formal resolution plan

**Level 3:** VP/Executive
- Escalated for at-risk customers or major dissatisfaction
- Executive-level intervention and commitment

**Escalation Criteria:**
- Detractor (NPS 0-6) with no improvement after 30 days
- Multiple low CSAT scores (3+ in a quarter)
- Customer threatens to churn or requests executive involvement
- Service failure impacting customer business

---

## Reporting and Review

### Monthly Customer Satisfaction Report

**Distribution:** Executive team, Customer Success team  
**Contents:**
- NPS trend (if measured this month)
- CSAT averages (overall and by category)
- Detractor/escalation summary
- Improvement initiatives status
- Customer churn risk analysis

### Quarterly Business Review (Internal)

**Participants:** Executive team, Customer Success, Operations, Sales  
**Agenda:**
- Review quarterly NPS results
- Detractor root cause analysis and resolution status
- Customer health scoring review
- Renewal pipeline and at-risk accounts
- Improvement initiatives prioritization

---

## Customer Testimonials and Success Stories

### Capturing Positive Feedback

**Process for Promoters (NPS 9-10):**
1. Thank customer for positive feedback
2. Request permission to use as testimonial
3. Request case study participation (if appropriate)
4. Ask for referral or reference

**Testimonial Library:**
- [X] testimonials collected
- [X] case studies published
- [X] customers willing to serve as references

**Example Testimonials:**
> "[Quote from happy customer about your MSP services]"
> — [Name, Title, Company]

---

## Supporting Documentation

### Included Documents
- [ ] Customer Satisfaction Process (this document)
- [ ] NPS Survey Template and Results (last 2 quarters)
- [ ] CSAT Survey Template and Results (last quarter)
- [ ] QBR Template and Sample Feedback
- [ ] Customer Satisfaction Dashboard
- [ ] Feedback Resolution Examples

### Evidence Location
```
evidence/governance/customer-satisfaction/
├── customer-satisfaction-process.md
├── nps-survey-template.pdf
├── nps-results-[YYYY-QX].pdf
├── csat-results-[YYYY-QX].pdf
├── qbr-template.pptx
├── satisfaction-dashboard-[YYYY-QX].pdf
└── feedback-resolution-examples.pdf
```

---

**Document Version:** 1.0  
**Prepared By:** [Name, Title]  
**Date Prepared:** [Date]  
**Next Review:** [Date - recommend quarterly]

---

## Notes for AWS MSP Program Submission

**What AWS is Looking For:**
- **Systematic Measurement:** Do you have a structured process to capture satisfaction?
- **Objective Metrics:** NPS, CSAT, or similar quantitative measures
- **Action on Feedback:** Do you respond to and act on customer feedback?
- **Continuous Improvement:** Can you demonstrate improvements based on feedback?

**You Should Demonstrate:**
- Multiple feedback collection methods (surveys, QBRs, post-interaction)
- Defined process for responding to negative feedback (with SLAs)
- Metrics and trends showing satisfaction levels
- Examples of improvements made based on customer feedback
- Regular review and reporting cadence

**Minimum Requirements:**
- At least one formal feedback mechanism (NPS or CSAT surveys recommended)
- Documented process for addressing negative feedback
- Evidence of actual feedback collection (survey results from last 2 quarters)
- Examples of acting on feedback (process improvements, issue resolution)
