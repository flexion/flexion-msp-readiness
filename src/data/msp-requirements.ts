/**
 * AWS MSP Program Requirements
 *
 * Complete set of 46 requirements from the official AWS MSP Program Self-Assessment
 * Source: AWS Managed Service Provider (MSP) Program Self-Assessment.xlsx
 * Last updated: 2026-08-04
 */

import { MSPRequirement } from '../types';

export const MSP_REQUIREMENTS: MSPRequirement[] = [
  // ============================================================================
  // BUSINESS (BUS) - 4 requirements
  // ============================================================================
  {
    id: 'BUS-001',
    name: 'Company Overview',
    category: 'business',
    description:
      'AWS Partner has a company overview presentation covering company history, locations, employees, customer profile, service differentiators, and AWS relationship details',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['company-overview-presentation', 'customer-portfolio-summary'],
    estimatedHours: 8,
  },
  {
    id: 'BUS-002',
    name: 'MSP Practice Growth',
    category: 'business',
    description:
      'AWS Partner is actively growing their MSP Practice with ≥4 new customer contracts or addenda demonstrating growth within last 18 months',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['customer-contracts', 'growth-documentation'],
    estimatedHours: 4,
  },
  {
    id: 'BUS-003',
    name: 'Financial Planning and Reporting',
    category: 'business',
    description:
      'AWS Partner has processes for financial planning including forecasting, budgeting, and review of financial metrics',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['financial-reports', 'budget-forecasts', 'financial-policies'],
    estimatedHours: 4,
  },
  {
    id: 'BUS-004',
    name: 'Go-To-Market',
    category: 'business',
    description:
      'AWS Partner has documented processes for identifying MSP opportunities, training sellers, and generating demand/leads',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['gtm-process-documentation', 'sales-enablement-materials'],
    estimatedHours: 8,
  },

  // ============================================================================
  // PEOPLE (PEO) - 3 requirements
  // ============================================================================
  {
    id: 'PEO-001',
    name: 'Personnel Onboarding',
    category: 'people',
    description:
      'AWS Partner has defined onboarding processes and checklists for personnel relevant to MSP practice',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['onboarding-checklists', 'training-plans', 'onboarding-records'],
    estimatedHours: 4,
  },
  {
    id: 'PEO-002',
    name: 'Cloud Center of Excellence (CCOE)',
    category: 'people',
    description:
      'AWS Partner maintains a CCOE covering cloud adoption, training, governance, strategy, and operations/automation',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['ccoe-charter', 'organization-structure', 'operational-process'],
    estimatedHours: 16,
  },
  {
    id: 'PEO-003',
    name: 'Personnel Offboarding',
    category: 'people',
    description:
      'AWS Partner has defined termination processes ensuring all access to customer and Partner systems is revoked',
    priority: 'critical',
    cisControls: ['5', '6'],
    awsServices: ['IAM'],
    evidenceRequired: ['offboarding-checklists', 'access-revocation-records', 'security-certifications'],
    estimatedHours: 4,
  },

  // ============================================================================
  // GOVERNANCE (GOV) - 6 requirements
  // ============================================================================
  {
    id: 'GOV-001',
    name: 'Risk and Mitigation Plans',
    category: 'governance',
    description:
      'Business risks including AWS practice are outlined with documented mitigation plans',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['risk-analysis', 'mitigation-plans', 'risk-monitoring-process'],
    estimatedHours: 12,
  },
  {
    id: 'GOV-002',
    name: 'Customer Satisfaction',
    category: 'governance',
    description:
      'AWS Partner has mechanism to objectively capture customer satisfaction via surveys, post-interaction feedback, or review meetings',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['customer-feedback-process', 'satisfaction-reports', 'feedback-resolution-process'],
    estimatedHours: 8,
  },
  {
    id: 'GOV-003',
    name: 'Data Ownership and Customer Offboarding',
    category: 'governance',
    description:
      'Customer contracts define data ownership, data transfer procedures, timeframes, and offboarding process',
    priority: 'critical',
    cisControls: ['3'],
    awsServices: [],
    evidenceRequired: ['customer-contract-template', 'offboarding-procedures', 'data-transfer-process'],
    estimatedHours: 8,
  },
  {
    id: 'GOV-004',
    name: 'Operational Readiness',
    category: 'governance',
    description:
      'AWS Partner has Operational Readiness process with checklists for personnel, tools, and operational processes',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['operational-readiness-checklist', 'ops-team-documentation'],
    estimatedHours: 8,
  },
  {
    id: 'GOV-005',
    name: 'Shared Responsibility Model',
    category: 'governance',
    description:
      'AWS Partner defines security requirements and operational expectations via RACI matrix between Partner and Customer',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['raci-matrix', 'customer-onboarding-documentation'],
    estimatedHours: 4,
  },
  {
    id: 'GOV-006',
    name: 'Sustainability Best Practices',
    category: 'governance',
    description:
      'AWS Partner optimizes workload placement and architecture for energy efficiency',
    priority: 'medium',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['sustainability-examples', 'optimization-documentation'],
    estimatedHours: 8,
  },

  // ============================================================================
  // PLATFORM (PLAT) - 5 requirements
  // ============================================================================
  {
    id: 'PLAT-001',
    name: 'Account Management',
    category: 'platform',
    description:
      'AWS accounts are not shared across customers (except multi-tenant SaaS products owned by Partner)',
    priority: 'critical',
    cisControls: ['4', '5'],
    awsServices: ['Organizations'],
    evidenceRequired: ['account-isolation-policy', 'account-creation-procedures'],
    estimatedHours: 4,
  },
  {
    id: 'PLAT-002',
    name: 'Solution Capabilities',
    category: 'platform',
    description:
      'Detailed design documents for 2 customers reviewed by AWS certified Solutions Architect, including requirements and architecture',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['design-documents', 'architecture-diagrams', 'requirements-documentation'],
    estimatedHours: 24,
  },
  {
    id: 'PLAT-003',
    name: 'Non-Functional Requirements',
    category: 'platform',
    description:
      'Design documents include performance, capacity, availability requirements, SLAs, monitoring approach, and testing process',
    priority: 'high',
    cisControls: [],
    awsServices: ['CloudWatch'],
    evidenceRequired: ['nfr-documentation', 'sla-definitions', 'testing-procedures'],
    estimatedHours: 16,
  },
  {
    id: 'PLAT-004',
    name: 'Well-Architected',
    category: 'platform',
    description:
      'Design documents show customer infrastructure is well-architected per AWS Well-Architected Framework with zero HRIs in Security, Operational Excellence, and Reliability pillars',
    priority: 'critical',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['wafr-reports', 'design-documents', 'remediation-documentation'],
    estimatedHours: 32,
  },
  {
    id: 'PLAT-005',
    name: 'AWS Service Expertise',
    category: 'platform',
    description:
      'Two customer workloads each using ≥4 AWS services beyond basic compute/network/storage (exempt with 3+ Competencies/Service Deliveries)',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['customer-workload-documentation', 'service-utilization-diagrams'],
    estimatedHours: 16,
  },

  // ============================================================================
  // SECURITY (SEC) - 10 requirements
  // ============================================================================
  {
    id: 'SEC-001',
    name: 'Security Policies and Procedures',
    category: 'security',
    description:
      'Established security policies and procedures to protect Partner systems, reviewed and approved by management',
    priority: 'critical',
    cisControls: ['1', '2', '3', '4', '5', '6', '7', '8', '11', '12', '13', '17'],
    awsServices: [],
    evidenceRequired: ['security-policies', 'iso-27001-certification', 'soc2-report'],
    estimatedHours: 0, // Already implemented
  },
  {
    id: 'SEC-002',
    name: 'Security Awareness Training',
    category: 'security',
    description:
      'MSP Practice employees complete annual security awareness training',
    priority: 'high',
    cisControls: ['14'],
    awsServices: [],
    evidenceRequired: ['training-completion-records', 'training-program-documentation'],
    estimatedHours: 8,
  },
  {
    id: 'SEC-003',
    name: 'AWS Account Configuration',
    category: 'security',
    description:
      'Standard security controls implemented for all managed environments per Appendix A minimum configuration',
    priority: 'critical',
    cisControls: ['4', '5', '6', '8', '12', '13'],
    awsServices: ['Control Tower', 'Config', 'CloudTrail', 'GuardDuty', 'Security Hub'],
    evidenceRequired: ['security-dashboards', 'config-rules', 'findings-remediation-documentation'],
    estimatedHours: 0, // Already implemented
  },
  {
    id: 'SEC-004',
    name: 'Identity and Access Management',
    category: 'security',
    description:
      'Centralized identity provider for managing access to all AWS accounts and customer data systems',
    priority: 'critical',
    cisControls: ['5', '6'],
    awsServices: ['IAM', 'IAM Identity Center', 'Cognito'],
    evidenceRequired: ['authentication-process-demo', 'idp-configuration', 'access-policies'],
    estimatedHours: 0, // Already implemented
  },
  {
    id: 'SEC-005',
    name: 'Policy Management',
    category: 'security',
    description:
      'Mechanism to evaluate and restrict permissions including IAM Access Analyzer reviews performed multiple times in last 12 months',
    priority: 'high',
    cisControls: ['5', '6'],
    awsServices: ['IAM', 'Access Analyzer'],
    evidenceRequired: ['access-analyzer-reviews', 'policy-review-reports', 'permission-baselines'],
    estimatedHours: 12,
  },
  {
    id: 'SEC-006',
    name: 'Role-Based Access',
    category: 'security',
    description:
      'All Partner access to AWS accounts uses temporary credentials via IAM roles following least privilege',
    priority: 'critical',
    cisControls: ['6'],
    awsServices: ['IAM', 'STS'],
    evidenceRequired: ['iam-role-configuration', 'temporary-credentials-demo', 'least-privilege-documentation'],
    estimatedHours: 8,
  },
  {
    id: 'SEC-007',
    name: 'Multi-Factor Authentication',
    category: 'security',
    description:
      'All human access to AWS accounts requires MFA',
    priority: 'critical',
    cisControls: ['6'],
    awsServices: ['IAM', 'IAM Identity Center'],
    evidenceRequired: ['mfa-enforcement-demo', 'idp-mfa-configuration'],
    estimatedHours: 4,
  },
  {
    id: 'SEC-008',
    name: 'Vulnerability Management',
    category: 'security',
    description:
      'Vulnerability scanning functionality to evaluate security and compliance of AWS infrastructure',
    priority: 'high',
    cisControls: ['7'],
    awsServices: ['Inspector', 'Security Hub'],
    evidenceRequired: ['vulnerability-scanning-demo', 'scan-reports', 'remediation-slas'],
    estimatedHours: 6,
  },
  {
    id: 'SEC-009',
    name: 'Security Event Logging',
    category: 'security',
    description:
      'Defines logging requirements with customers, captures security events, and ensures retention periods are honored',
    priority: 'critical',
    cisControls: ['8'],
    awsServices: ['CloudTrail', 'CloudWatch Logs', 'S3'],
    evidenceRequired: ['logging-requirements-agreement', 'log-capture-configuration', 'retention-controls'],
    estimatedHours: 0, // Already implemented
  },
  {
    id: 'SEC-010',
    name: 'SaaS Tooling Account Access',
    category: 'security',
    description:
      'Third-party SaaS tools accessing customer AWS accounts use IAM Roles with external IDs',
    priority: 'high',
    cisControls: ['6'],
    awsServices: ['IAM', 'STS'],
    evidenceRequired: ['saas-tool-list', 'external-id-policies', 'trust-policy-examples'],
    estimatedHours: 8,
  },

  // ============================================================================
  // OPERATIONS (OPS) - 18 requirements
  // ============================================================================
  {
    id: 'OPS-001',
    name: 'Service Level Management',
    category: 'operations',
    description:
      'Defines SLAs for service offerings including response times, remediation times, and change turnaround with review process',
    priority: 'critical',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['sla-documentation', 'sla-reports', 'customer-review-process'],
    estimatedHours: 12,
  },
  {
    id: 'OPS-002',
    name: 'AWS Support Plan (Partner Accounts)',
    category: 'operations',
    description:
      'All Organizations management and production member accounts have Business, Enterprise, or PLS Support',
    priority: 'critical',
    cisControls: [],
    awsServices: ['Support'],
    evidenceRequired: ['account-support-level-list', 'organization-documentation'],
    estimatedHours: 4,
  },
  {
    id: 'OPS-003',
    name: 'AWS Support Plan (Customer Accounts)',
    category: 'operations',
    description:
      'Communicates value of AWS Premium Support, recommends Business/Enterprise for production, documents risks for opt-outs',
    priority: 'high',
    cisControls: [],
    awsServices: ['Support'],
    evidenceRequired: ['customer-support-recommendations', 'opt-out-risk-documentation', 'account-support-list'],
    estimatedHours: 4,
  },
  {
    id: 'OPS-004',
    name: 'Service Desk Operations',
    category: 'operations',
    description:
      '24x7 service desk function available via multiple communication means with documented after-hours procedures',
    priority: 'critical',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['service-desk-documentation', 'customer-agreement', 'after-hours-procedures'],
    estimatedHours: 16,
  },
  {
    id: 'OPS-005',
    name: 'ITSM Platform',
    category: 'operations',
    description:
      'Comprehensive ITSM platform with incident/problem management, change management, service requests, reporting, and automation integration',
    priority: 'critical',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['itsm-platform-demo', 'integration-documentation', 'workflow-examples'],
    estimatedHours: 24,
  },
  {
    id: 'OPS-006',
    name: 'Release Management',
    category: 'operations',
    description:
      'Comprehensive release management with version control, testing procedures, approval system, and IaC deployment',
    priority: 'high',
    cisControls: ['2', '4'],
    awsServices: ['CodePipeline', 'CodeDeploy', 'CloudFormation', 'CDK'],
    evidenceRequired: ['release-process-documentation', 'customer-example', 'iac-templates'],
    estimatedHours: 8,
  },
  {
    id: 'OPS-007',
    name: 'Configuration Management',
    category: 'operations',
    description:
      'Records of environment configuration changes with unified view of resources, timestamps, status, individual, and approval',
    priority: 'high',
    cisControls: ['2', '4'],
    awsServices: ['Config', 'CloudFormation'],
    evidenceRequired: ['cmdb-demo', 'configuration-records', 'change-tracking-view'],
    estimatedHours: 16,
  },
  {
    id: 'OPS-008',
    name: 'Patch Management',
    category: 'operations',
    description:
      'Automated patching process for OS, applications, and security/compliance patches',
    priority: 'high',
    cisControls: ['7'],
    awsServices: ['Systems Manager', 'Inspector'],
    evidenceRequired: ['patch-automation-demo', 'patch-status-reports'],
    estimatedHours: 8,
  },
  {
    id: 'OPS-009',
    name: 'Customer Deployment Pipelines',
    category: 'operations',
    description:
      'Supports automated deployments and rollbacks without manual involvement (manual approvals acceptable)',
    priority: 'high',
    cisControls: ['2', '4'],
    awsServices: ['CodePipeline', 'CodeDeploy', 'CodeBuild'],
    evidenceRequired: ['pipeline-demo', 'deployment-history', 'automation-logs'],
    estimatedHours: 16,
  },
  {
    id: 'OPS-010',
    name: 'Event Management and Dynamic Monitoring',
    category: 'operations',
    description:
      'Define, monitor, and analyze workload/infrastructure health KPIs with metrics, logs, traces, alarms, and dashboards',
    priority: 'critical',
    cisControls: ['8', '13'],
    awsServices: ['CloudWatch', 'X-Ray', 'SNS', 'EventBridge'],
    evidenceRequired: ['monitoring-demo', 'metrics-dashboards', 'alarm-configuration'],
    estimatedHours: 0, // Already implemented
  },
  {
    id: 'OPS-011',
    name: 'Operational Runbooks',
    category: 'operations',
    description:
      'Runbooks for responding to specific workload/infrastructure/security alerts',
    priority: 'high',
    cisControls: ['17'],
    awsServices: [],
    evidenceRequired: ['operational-runbooks', 'alert-response-procedures'],
    estimatedHours: 0, // Already implemented
  },
  {
    id: 'OPS-012',
    name: 'Anomaly Detection',
    category: 'operations',
    description:
      'Statistical or ML anomaly detection models across infrastructure and application metrics to reduce false positives',
    priority: 'high',
    cisControls: ['8', '13'],
    awsServices: ['CloudWatch Anomaly Detection'],
    evidenceRequired: ['anomaly-detection-demo', 'customer-example'],
    estimatedHours: 12,
  },
  {
    id: 'OPS-013',
    name: 'Predictive Monitoring and AIOps',
    category: 'operations',
    description:
      'Predictive models that identify trends and alert before anomalies or threshold breaches (Recommended)',
    priority: 'medium',
    cisControls: ['8', '13'],
    awsServices: ['DevOps Guru'],
    evidenceRequired: ['predictive-monitoring-demo', 'customer-example', 'aiops-implementation'],
    estimatedHours: 16,
  },
  {
    id: 'OPS-014',
    name: 'Knowledge Management',
    category: 'operations',
    description:
      'Knowledge management system for operational processes and customer workload details with content lifecycle',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['knowledge-management-demo', 'content-management-process'],
    estimatedHours: 12,
  },
  {
    id: 'OPS-015',
    name: 'Disaster Recovery',
    category: 'operations',
    description:
      'Automated backups and recovery tests for all workloads against predefined RTO/RPO',
    priority: 'critical',
    cisControls: ['11'],
    awsServices: ['Backup', 'RDS', 'S3', 'DRS'],
    evidenceRequired: ['backup-jobs', 'recovery-test-reports', 'rto-rpo-documentation'],
    estimatedHours: 6, // Extend existing
  },
  {
    id: 'OPS-016',
    name: 'Cloud Financial Management',
    category: 'operations',
    description:
      'Methodology and tooling for TCO analysis, cloud spend monitoring, and customer-specific rate billing',
    priority: 'high',
    cisControls: [],
    awsServices: ['Cost Explorer', 'Budgets', 'Cost and Usage Reports'],
    evidenceRequired: ['finops-demo', 'tco-analysis-examples', 'billing-tools'],
    estimatedHours: 16,
  },
  {
    id: 'OPS-017',
    name: 'Migrations',
    category: 'operations',
    description:
      'Capabilities for migrating/modernizing workloads using standard methodology covering portfolio discovery, governance, people/skills, landing zone, operations, security, and application migration (exempt with Migration Competency)',
    priority: 'high',
    cisControls: [],
    awsServices: ['MGN', 'Migration Hub', 'DMS'],
    evidenceRequired: ['migration-methodology', 'customer-examples', '7r-strategy-documentation'],
    estimatedHours: 40,
  },
  {
    id: 'OPS-018',
    name: 'Artificial Intelligence',
    category: 'operations',
    description:
      'Use of Generative AI for internal operations or customer projects (Recommended)',
    priority: 'medium',
    cisControls: [],
    awsServices: ['Bedrock', 'SageMaker'],
    evidenceRequired: ['genai-use-cases', 'project-documentation', 'sow-examples'],
    estimatedHours: 24,
  },
];

/**
 * Get requirement by ID
 */
export function getRequirement(id: string): MSPRequirement | undefined {
  return MSP_REQUIREMENTS.find(req => req.id === id);
}

/**
 * Get requirements by category
 */
export function getRequirementsByCategory(category: string): MSPRequirement[] {
  return MSP_REQUIREMENTS.filter(req => req.category === category);
}

/**
 * Get requirements by priority
 */
export function getRequirementsByPriority(priority: string): MSPRequirement[] {
  return MSP_REQUIREMENTS.filter(req => req.priority === priority);
}

/**
 * Get requirements by CIS Control
 */
export function getRequirementsByCISControl(cisControl: string): MSPRequirement[] {
  return MSP_REQUIREMENTS.filter(req =>
    req.cisControls?.some(control => control === cisControl || control.startsWith(`${cisControl}.`))
  );
}

/**
 * Get requirements by automation potential
 */
export function getRequirementsByAutomation(): {
  fullyAutomatable: MSPRequirement[];
  semiAutomatable: MSPRequirement[];
  manualOnly: MSPRequirement[];
} {
  const fullyAutomatable = MSP_REQUIREMENTS.filter(
    req => req.awsServices && req.awsServices.length > 0 && req.category === 'security' || req.category === 'operations'
  );

  const manualOnly = MSP_REQUIREMENTS.filter(
    req => req.category === 'business' || req.category === 'people' || req.category === 'governance' || req.category === 'platform'
  );

  const semiAutomatable = MSP_REQUIREMENTS.filter(
    req => !fullyAutomatable.includes(req) && !manualOnly.includes(req)
  );

  return { fullyAutomatable, semiAutomatable, manualOnly };
}

/**
 * Summary statistics
 */
export const MSP_REQUIREMENTS_SUMMARY = {
  total: MSP_REQUIREMENTS.length,
  byCategory: {
    business: MSP_REQUIREMENTS.filter(r => r.category === 'business').length,
    people: MSP_REQUIREMENTS.filter(r => r.category === 'people').length,
    governance: MSP_REQUIREMENTS.filter(r => r.category === 'governance').length,
    platform: MSP_REQUIREMENTS.filter(r => r.category === 'platform').length,
    security: MSP_REQUIREMENTS.filter(r => r.category === 'security').length,
    operations: MSP_REQUIREMENTS.filter(r => r.category === 'operations').length,
  },
  byPriority: {
    critical: MSP_REQUIREMENTS.filter(r => r.priority === 'critical').length,
    high: MSP_REQUIREMENTS.filter(r => r.priority === 'high').length,
    medium: MSP_REQUIREMENTS.filter(r => r.priority === 'medium').length,
  },
};
