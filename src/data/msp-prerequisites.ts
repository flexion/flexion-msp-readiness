/**
 * AWS MSP Program Prerequisites
 *
 * These requirements must be met BEFORE the technical validation (ISSI audit).
 * Prerequisites focus on business processes, team structure, and foundational practices.
 *
 * Source: AWS Managed Service Provider (MSP) Program Self-Assessment.xlsx
 * Tab: MSP Prerequisites
 * Last updated: 2026-08-05
 */

export interface MSPPrerequisite {
  id: string;
  name: string;
  category: string;
  description: string;
  mandatory: boolean;
  evidenceRequired: string[];
  estimatedHours: number;
}

export const MSP_PREREQUISITES: MSPPrerequisite[] = [
  {
    "id": "BUSP-001",
    "name": "Web Presence",
    "category": "business",
    "description": "AWS Partner has a public landing page on their primary website that describes their AWS managed services practice and links to their public case studies. This page must describe the Partner's differentiated expertise in designing, building, and managing workloads on AWS.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of a public URL for their AWS MSP practice landing page."
    ],
    "estimatedHours": 4
  },
  {
    "id": "BUSP-002",
    "name": "Sales and Marketing Accreditations",
    "category": "business",
    "description": "AWS Partner sales teams, marketing teams, and/or applicable business units supporting the AWS MSP practice have all completed the AWS Partner: Sales Accreditation (Business) (https://skillbuilder.aws/learn/BP1WX82N37/aws-partner-sales-accreditation-business/8UV4TQWVZ6) or AWS Partner: Accreditation (Technical) (https://skillbuilder.aws/learn/8DDTPJ2RK5/aws-partner-accreditation-technical/AHX1VJYYVV)",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of records  of the appropriate accreditations. The form of records may be in the form of pdf, spreadsheet, tool screenshot,etc."
    ],
    "estimatedHours": 4
  },
  {
    "id": "BUSP-003",
    "name": "Customer Case Studies",
    "category": "business",
    "description": "AWS Partner has ≥ 4 AWS Customer Case Studies (as defined in the Definitions section of the Checklist). At least two (2) of the provided case studies must have a publicly available artifacts describing how AWS managed services delivered by the AWS Partner helped solve a customer challenge. These publicly available artifacts may be in the form of formal customer case studies, white papers, videos, or blog posts etc. and were not used in any previous MSP audits and renewals. The private case studies may be in the form of PDF, Powerpoint, or Word document and were not used in any previous MSP audits and renewals.",
    "mandatory": true,
    "evidenceRequired": [
      ""
    ],
    "estimatedHours": 4
  },
  {
    "id": "PEOP-001",
    "name": "Personnel Skills",
    "category": "people",
    "description": "AWS Partner has a defined strategy for continuously improving the technical expertise of their staff. This may include formal training and certification and/or other approaches that promote a culture of continuous learning.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of examples of learning events or activities conducted within the past 12 months for their staff supporting the managed services operations."
    ],
    "estimatedHours": 4
  },
  {
    "id": "GOVP-001",
    "name": "Supplier Management",
    "category": "governance",
    "description": "AWS Partner has defined processes for selection and evaluation of suppliers (e.g., SaaS vendors or any other third parties to whom activities or services are subcontracted, or any ISV tools procured to deliver managed services).",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of a detailed SOP for selecting suppliers. Alternatively, evidence of proper supplier management procedures may also be in the form of current industry certification related to information security (e.g., ISO 27001, SOC2) achieved by the suppliers themselves."
    ],
    "estimatedHours": 4
  },
  {
    "id": "GOVP-002",
    "name": "Operations Improvement",
    "category": "governance",
    "description": "AWS Partner has established processes for continuous improvement that includes a regular cadence for reviewing operational processes like incident managment, cloud cost management, architecture pattern, performance, security, etc. and identifying opportunities, and prioritizing efforts.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of governance process documentation focusing on identifying improvement opportunities."
    ],
    "estimatedHours": 4
  },
  {
    "id": "GOVP-003",
    "name": "Sustainability Commitment",
    "category": "governance",
    "description": "AWS Partner is committed with a sustainability vision as part of their long-term strategy.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of a policy documentation / communication with a leadership commitment from a CxO office."
    ],
    "estimatedHours": 4
  },
  {
    "id": "PLATP-001",
    "name": "Expert Design Review",
    "category": "platform",
    "description": "The AWS Partner has a documented policy requiring an AWS Solutions Architect – Associate or Professional certified individual to review the design and implementation of all customer AWS projects. The policy must also include specific guidance for when reviews should be conducted by individuals with Professional or Specialty level certifications.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of a documented policy and a customer project document which shows that the document has been reviewed and approved by the individuals with Professional or Specialty level certifications."
    ],
    "estimatedHours": 4
  },
  {
    "id": "SECP-001",
    "name": "Access Key Exposure Detection",
    "category": "security",
    "description": "AWS Trusted Advisor checks popular code repositories for access keys that have been exposed to the public and for irregular Amazon Elastic Compute Cloud (Amazon EC2) usage that could be the result of a compromised access key. If an access key exposure is detected the service triggers an event in AWS CloudWatch Events. It is critical that AWS MSP Partners actively monitor these events and create mechanisms to ensure they are responded to quickly. The AWS Partner must implement an automated mechanism for handling all AWS Health events with service type “RISK” in all managed customer accounts. At a minimum, an automated system must be in place to create new tickets in an ITSM or security ticketing system at the highest severity when exposed access key notifications are received. See Learn to Detect & Mitigate Account Compromise Issues (https://partnercentral.awspartner.com/apex/WebcastMain?Id=a1G0h00000CXSz3EAH) for an example solution. Additionally, the Partner must have a documented procedure for handling exposed credential notifications that includes deleting or rotating the exposed credentials.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of a documented response procedure on how to handle exposed key."
    ],
    "estimatedHours": 4
  },
  {
    "id": "SECP-002",
    "name": "Public Resources",
    "category": "security",
    "description": "AWS Partner has tooling and processes to prevent and/or detect configurations that make customer resources unintentionally or unnecessarily publicly accessible. This should cover at minimum the following resources: • Amazon S3 buckets • Amazon RDS instances • Amazon EC2 instances • Security groups with unrestricted access to sensitive ports • Amazon EBS snapshots • Amazon RDS snapshots • Amazon Machine Images (AMIs)",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of a documented procedure to mitigate the risk of unintentional public access."
    ],
    "estimatedHours": 4
  },
  {
    "id": "OPSP-001",
    "name": "Incident Management",
    "category": "operations",
    "description": "AWS Partner has documented incident management processes, including: • How IT and Security incidents are identified • How IT and Security incidents are logged • How IT and Security incidents are categorized • How IT and Security incidents are prioritized • How IT and Security incidents are investigated and diagnosed • IT and Security Incidents response plans in the form of playbooks • How customers are communicated • How IT and Security incidents are resolved • How  IT and Security incidents are closed AWS Partner must provide evidence of a documented incident management process that addresses both IT and Security incidents.",
    "mandatory": true,
    "evidenceRequired": [
      ""
    ],
    "estimatedHours": 4
  },
  {
    "id": "OPSP-002",
    "name": "Problem Management",
    "category": "operations",
    "description": "AWS Partner performs post-incident analysis and provides communication to customers after customer-impacting events. The analysis process should identify contributing causes and define an action plan to develop mitigations and limit or prevent recurrence. Tailored communications regarding the contributing causes and action plan are shared with customers in a timely fashion.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of an example of a completed post-incident analysis report including completed action plan and customer communications."
    ],
    "estimatedHours": 4
  },
  {
    "id": "OPSP-003",
    "name": "Deployment Risk Management",
    "category": "operations",
    "description": "AWS Partner has capabilities for implementing limited/canary deployments, parallel environment deployments (e.g.- blue/green deployments, traffic shifting), or other advanced approaches for limiting the risk of failed production changes.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of documented procedure to mitigate the risk of production deployment."
    ],
    "estimatedHours": 4
  },
  {
    "id": "OPSP-004",
    "name": "Cloud Financial Management",
    "category": "operations",
    "description": "AWS Partner regularly assess customer AWS costs and provides recommendations for optimization.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of documented recommendations provided to a customer."
    ],
    "estimatedHours": 4
  },
  {
    "id": "OPSP-005",
    "name": "Service Continuity",
    "category": "operations",
    "description": "The AWS Partner defines and tests processes to respond to events that could impact their ability to service customers. These procedures cover complete data and infrastructure loss, environmental events that affect significant portions of the workforce (e.g., disasters that prevent physical access to corporate offices), and interruptions in third party services critical to servicing customers (e.g., a prolonged outage to the internal ticketing and helpdesk systems). Business continuity tests that exercise alternative/backup infrastructure, tools, and capacity should be conducted annually.",
    "mandatory": true,
    "evidenceRequired": [
      "Evidence must be in the form of a documented process that addresses the above, as well as results of a business continuity test performed within the last 12 months. Alternatively, ISO 22301 certification specifically scoped to the AWS Partner’s AWS MSP practice is also sufficient."
    ],
    "estimatedHours": 4
  }
];

// Category breakdown
export const PREREQUISITE_CATEGORIES = {
  business: 3,
  people: 1,
  governance: 3,
  platform: 1,
  security: 2,
  operations: 5,
};

export const TOTAL_PREREQUISITES = 15;
