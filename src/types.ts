/**
 * Core type definitions for MSP Readiness automation
 */

export type RequirementStatus = 'addressed' | 'partial' | 'gap' | 'not-applicable' | 'not-started';
export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';
export type RequirementCategory = 'security' | 'operations' | 'support';

/**
 * MSP Program requirement definition
 */
export interface MSPRequirement {
  id: string;
  name: string;
  category: RequirementCategory;
  description: string;
  priority: RequirementPriority;
  cisControls?: string[]; // Related CIS Controls (e.g., ["4", "5.1", "5.3"])
  awsServices?: string[]; // AWS services involved
  evidenceRequired: string[];
  estimatedHours?: number;
}

/**
 * Assessment result for a single requirement
 */
export interface RequirementAssessment {
  requirement: MSPRequirement;
  status: RequirementStatus;
  confidence: number; // 0-1 score
  findings: AssessmentFinding[];
  evidence: EvidenceArtifact[];
  gaps: string[];
  recommendations: string[];
  estimatedEffort?: number; // hours
}

/**
 * Finding from assessment
 */
export interface AssessmentFinding {
  type: 'documentation' | 'aws-config' | 'iam' | 'security-hub' | 'manual';
  source: string; // File path, AWS ARN, etc.
  summary: string;
  details?: string;
  supportive: boolean; // true if supports compliance, false if gap
  timestamp: Date;
  remediation?: RemediationGuidance; // Optional remediation for gap findings
}

/**
 * Remediation guidance for a finding
 */
export interface RemediationGuidance {
  findingType: string; // e.g., "config-not-enabled", "cloudtrail-not-logging"
  rootCause: string;
  impact: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  steps: RemediationStep[];
  estimatedEffort: number; // hours
  awsDocs: string[]; // Links to AWS documentation
  iacSnippets: IaCSnippet[];
  prerequisites?: string[];
  validation?: string[]; // Steps to verify the fix worked
}

/**
 * Single remediation step
 */
export interface RemediationStep {
  order: number;
  action: string;
  details?: string;
  command?: string; // CLI command if applicable
  consoleSteps?: string[]; // Steps in AWS Console
}

/**
 * Infrastructure as Code snippet
 */
export interface IaCSnippet {
  language: 'cdk-typescript' | 'cdk-python' | 'cloudformation' | 'terraform';
  description: string;
  code: string;
  filePath?: string; // Suggested file path
}

/**
 * Evidence artifact
 */
export interface EvidenceArtifact {
  type: 'document' | 'aws-snapshot' | 'log-excerpt' | 'screenshot';
  path: string;
  description: string;
  requirementIds: string[];
  collectedAt: Date;
  expiresAt?: Date; // For time-sensitive evidence
  metadata?: Record<string, unknown>;
}

/**
 * Evidence validation result
 */
export interface ValidationResult {
  requirementId: string;
  passed: boolean;
  checks: ValidationCheck[];
  summary: string;
  validatedAt: Date;
}

/**
 * Individual validation check
 */
export interface ValidationCheck {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message?: string;
}

/**
 * Evidence validator interface
 */
export interface EvidenceValidator {
  /**
   * Validate evidence for a requirement
   */
  validate(requirement: MSPRequirement, evidencePaths: string[]): Promise<ValidationResult>;

  /**
   * Get supported requirement IDs
   */
  getSupportedRequirements(): string[];
}

/**
 * Overall project assessment
 */
export interface ProjectAssessment {
  projectName: string;
  assessmentDate: Date;
  version: string; // MSP checklist version
  overallStatus: {
    addressed: number;
    partial: number;
    gap: number;
    notApplicable: number;
    notStarted: number;
  };
  requirementAssessments: RequirementAssessment[];
  criticalGaps: RequirementAssessment[];
  totalEstimatedEffort: number;
  summary: string;
}

/**
 * Generated playbook metadata
 */
export interface GeneratedPlaybook {
  title: string;
  type: 'playbook' | 'runbook';
  path: string;
  requirementIds: string[];
  cisControls: string[];
  template: string;
  variables: Record<string, unknown>;
  generatedAt: Date;
}

/**
 * AWS infrastructure snapshot
 */
export interface AWSSnapshot {
  region: string;
  timestamp: Date;
  resources: {
    vpc?: unknown;
    ec2?: unknown;
    rds?: unknown;
    s3?: unknown;
    iam?: unknown;
    cloudtrail?: unknown;
    config?: unknown;
    securityHub?: unknown;
    backup?: unknown;
  };
}

/**
 * Dashboard data structure
 */
export interface DashboardData {
  assessment: ProjectAssessment;
  byCategory: Record<
    RequirementCategory,
    {
      total: number;
      addressed: number;
      partial: number;
      gap: number;
    }
  >;
  criticalPath: {
    requirement: MSPRequirement;
    effort: number;
    blockers: string[];
  }[];
  evidenceInventory: {
    total: number;
    byType: Record<string, number>;
    recentlyCollected: EvidenceArtifact[];
  };
  generatedArtifacts: {
    playbooks: number;
    runbooks: number;
    evidenceFiles: number;
  };
  timeline: {
    week: number;
    tasks: string[];
    effort: number;
  }[];
}

/**
 * Configuration structure
 */
export interface Config {
  project: {
    name: string;
    docs_path: string;
    infra_path: string;
    repo_url?: string;
  };
  aws: {
    profile: string;
    region: string;
    stage: string;
    additional_regions?: string[];
  };
  msp: {
    version: string;
    ig_level: number;
    organization: {
      name: string;
      contact: string;
    };
  };
  output: {
    evidence_path: string;
    playbooks_path: string;
    dashboard_path: string;
    report_format: 'markdown' | 'html' | 'both';
  };
  assessment: {
    mode?: 'self' | 'external'; // self = assess workspace, external = assess target project
    skip_requirements: string[];
    custom_priorities: Record<string, RequirementPriority>;
    include_recommended: boolean;
    auto_collect_evidence: boolean;
    auto_generate_docs: boolean;
  };
  templates?: {
    custom_templates_path?: string;
    variables: Record<string, string>;
  };
  monitoring?: {
    enabled: boolean;
    schedule: string; // Cron expression
    baseline_path?: string; // Path to baseline assessment
    store_history: boolean; // Store historical assessments
    history_path?: string; // Where to store history
  };
  notifications?: {
    slack?: {
      webhook_url: string;
      channel?: string;
      alert_on: {
        compliance_drop: number; // Percentage drop to trigger alert
        new_gaps: boolean; // Alert on new gaps
        critical_findings: boolean; // Alert on new critical findings
      };
    };
    email?: {
      smtp_host: string;
      smtp_port: number;
      smtp_secure: boolean;
      smtp_user: string;
      smtp_password: string;
      from: string;
      to: string[];
      alert_on: {
        compliance_drop: number;
        new_gaps: boolean;
        critical_findings: boolean;
      };
    };
    cloudwatch?: {
      enabled: boolean;
      namespace: string; // CloudWatch namespace
      dimensions?: Record<string, string>;
    };
  };
}

/**
 * Drift detection result
 */
export interface DriftDetectionResult {
  timestamp: Date;
  baselineDate: Date;
  currentAssessment: ProjectAssessment;
  baselineAssessment: ProjectAssessment;
  drifts: Drift[];
  summary: DriftSummary;
}

/**
 * Individual drift item
 */
export interface Drift {
  requirementId: string;
  requirementName: string;
  type: 'status_change' | 'new_gap' | 'new_finding' | 'compliance_drop' | 'compliance_improve';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  previousValue?: string;
  currentValue?: string;
  description: string;
  impact: string;
}

/**
 * Drift summary
 */
export interface DriftSummary {
  totalDrifts: number;
  byCriticality: Record<string, number>;
  byType: Record<string, number>;
  complianceChange: number; // Percentage change
  newGaps: number;
  resolvedGaps: number;
  newCriticalFindings: number;
}

/**
 * Historical assessment record
 */
export interface AssessmentHistory {
  timestamp: Date;
  assessmentPath: string;
  summary: {
    addressed: number;
    partial: number;
    gap: number;
    notApplicable: number;
    totalEffort: number;
    complianceScore: number; // Percentage
  };
}
