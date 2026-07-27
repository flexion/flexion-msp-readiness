/**
 * AWS MSP Program Requirements (Feb 2026 - Aug 2026)
 *
 * Based on the AWS MSP Self-Assessment Checklist and mapped to CIS Controls v8
 */

import { MSPRequirement } from '../types';

export const MSP_REQUIREMENTS: MSPRequirement[] = [
  // Operations - Service Management
  {
    id: 'OPSP-001',
    name: 'Incident Management',
    category: 'operations',
    description: 'IT and Security incident management process with defined severity levels, response times, and escalation procedures',
    priority: 'critical',
    cisControls: ['17'],
    awsServices: ['CloudWatch', 'SNS', 'EventBridge'],
    evidenceRequired: ['incident-response-playbook', 'incident-tickets', 'sla-documentation'],
    estimatedHours: 12
  },
  {
    id: 'OPSP-002',
    name: 'Problem Management',
    category: 'operations',
    description: 'Post-incident analysis and customer communication process',
    priority: 'high',
    cisControls: ['17'],
    awsServices: [],
    evidenceRequired: ['post-incident-reports', 'customer-communication-templates'],
    estimatedHours: 6
  },
  {
    id: 'OPSP-003',
    name: 'Deployment Risk Management',
    category: 'operations',
    description: 'Process for assessing and managing deployment risks',
    priority: 'high',
    cisControls: ['2', '4', '16'],
    awsServices: ['CodePipeline', 'CodeDeploy'],
    evidenceRequired: ['deployment-playbook', 'risk-assessment-checklist'],
    estimatedHours: 8
  },
  {
    id: 'OPSP-005',
    name: 'Service Continuity',
    category: 'operations',
    description: 'Business continuity testing conducted annually',
    priority: 'high',
    cisControls: ['11'],
    awsServices: ['Backup', 'RDS', 'S3'],
    evidenceRequired: ['dr-test-reports', 'bc-test-schedule'],
    estimatedHours: 16
  },

  // Operations - Monitoring & Logging
  {
    id: 'OPS-003',
    name: 'Monitoring and Alerting',
    category: 'operations',
    description: 'Comprehensive monitoring and alerting for infrastructure and applications',
    priority: 'critical',
    cisControls: ['8', '13'],
    awsServices: ['CloudWatch', 'SNS', 'EventBridge'],
    evidenceRequired: ['cloudwatch-alarms', 'monitoring-dashboard', 'alert-config'],
    estimatedHours: 0  // Already implemented
  },
  {
    id: 'OPS-004',
    name: 'Logging',
    category: 'operations',
    description: 'Centralized logging with 90-day minimum retention',
    priority: 'high',
    cisControls: ['8'],
    awsServices: ['CloudTrail', 'CloudWatch Logs', 'S3'],
    evidenceRequired: ['cloudtrail-config', 'log-retention-policy', 'log-archives'],
    estimatedHours: 4  // Need to extend retention
  },
  {
    id: 'OPS-005',
    name: 'Backup and Recovery',
    category: 'operations',
    description: 'Automated backup processes with documented recovery procedures',
    priority: 'critical',
    cisControls: ['11'],
    awsServices: ['Backup', 'RDS', 'S3'],
    evidenceRequired: ['backup-config', 'recovery-procedures', 'backup-verification-logs'],
    estimatedHours: 6  // Need to extend retention
  },
  {
    id: 'OPS-006',
    name: 'Change Management',
    category: 'operations',
    description: 'Documented change management process',
    priority: 'high',
    cisControls: ['2', '4'],
    awsServices: [],
    evidenceRequired: ['change-management-playbook', 'change-records'],
    estimatedHours: 8
  },
  {
    id: 'OPS-008',
    name: 'Patch Management',
    category: 'operations',
    description: 'Regular patching process with vulnerability remediation',
    priority: 'high',
    cisControls: ['7'],
    awsServices: ['Inspector', 'Systems Manager'],
    evidenceRequired: ['patch-management-playbook', 'patch-records', 'vulnerability-reports'],
    estimatedHours: 8
  },
  {
    id: 'OPS-011',
    name: 'Availability Management',
    category: 'operations',
    description: 'High availability architecture and disaster recovery capabilities',
    priority: 'high',
    cisControls: ['11', '12'],
    awsServices: ['Multi-region', 'RDS', 'S3', 'Route53'],
    evidenceRequired: ['dr-procedures', 'multi-region-config', 'rto-rpo-documentation'],
    estimatedHours: 0  // Already implemented
  },

  // Security - Policies & Procedures
  {
    id: 'SEC-001',
    name: 'Security Policies and Procedures',
    category: 'security',
    description: 'Documented security policies aligned to recognized framework (CIS, NIST, etc.)',
    priority: 'critical',
    cisControls: ['1', '2', '3', '4', '5', '6', '7', '8', '11', '12', '13', '17'],
    awsServices: [],
    evidenceRequired: ['security-playbook', 'cis-controls-mapping'],
    estimatedHours: 0  // Already implemented
  },
  {
    id: 'SEC-003',
    name: 'AWS Account Configuration',
    category: 'security',
    description: 'AWS account configured per Appendix A minimum requirements',
    priority: 'critical',
    cisControls: ['4', '5', '6', '8', '12', '13'],
    awsServices: ['Control Tower', 'Config', 'CloudTrail', 'GuardDuty', 'Security Hub'],
    evidenceRequired: ['config-rules', 'security-hub-findings', 'guardduty-config'],
    estimatedHours: 0  // Control Tower deployed
  },
  {
    id: 'SEC-004',
    name: 'Identity and Access Management',
    category: 'security',
    description: 'Strong IAM controls with MFA and least privilege',
    priority: 'critical',
    cisControls: ['5', '6'],
    awsServices: ['IAM', 'IAM Identity Center', 'Cognito'],
    evidenceRequired: ['iam-policies', 'mfa-enforcement', 'access-review-logs'],
    estimatedHours: 0  // Already implemented
  },
  {
    id: 'SEC-007',
    name: 'Vulnerability Scanning',
    category: 'security',
    description: 'Continuous vulnerability scanning of infrastructure and applications',
    priority: 'high',
    cisControls: ['7'],
    awsServices: ['Inspector', 'ECR'],
    evidenceRequired: ['inspector-config', 'scan-reports', 'scan-schedules'],
    estimatedHours: 4  // Need daily scan config
  },
  {
    id: 'SEC-008',
    name: 'Vulnerability Remediation',
    category: 'security',
    description: 'Documented vulnerability remediation process with SLAs',
    priority: 'high',
    cisControls: ['7'],
    awsServices: ['Inspector', 'Systems Manager'],
    evidenceRequired: ['remediation-procedures', 'sla-documentation', 'remediation-records'],
    estimatedHours: 6
  },
  {
    id: 'SEC-009',
    name: 'Data Protection',
    category: 'security',
    description: 'Data encrypted at rest and in transit',
    priority: 'critical',
    cisControls: ['3'],
    awsServices: ['KMS', 'ACM', 'RDS', 'S3'],
    evidenceRequired: ['encryption-config', 'kms-key-policies', 'tls-config'],
    estimatedHours: 0  // Already implemented
  },
  {
    id: 'SEC-010',
    name: 'Incident Response',
    category: 'security',
    description: 'Security incident response procedures',
    priority: 'critical',
    cisControls: ['17'],
    awsServices: ['Security Hub', 'GuardDuty', 'Detective'],
    evidenceRequired: ['security-incident-procedures', 'incident-tickets'],
    estimatedHours: 4  // Need to expand existing playbook
  },

  // Security - Program Requirements
  {
    id: 'SECP-001',
    name: 'Access Key Exposure Detection',
    category: 'security',
    description: 'Automated detection and response to exposed AWS access keys',
    priority: 'critical',
    cisControls: ['6'],
    awsServices: ['Health', 'EventBridge', 'Lambda'],
    evidenceRequired: ['health-event-config', 'automated-response-lambda', 'detection-logs'],
    estimatedHours: 12
  },
  {
    id: 'SECP-002',
    name: 'Public Resources Detection',
    category: 'security',
    description: 'Detection and prevention of unintentionally public resources',
    priority: 'critical',
    cisControls: ['4'],
    awsServices: ['Config', 'Security Hub'],
    evidenceRequired: ['config-rules', 'public-resource-findings', 'remediation-procedure'],
    estimatedHours: 10
  }
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
