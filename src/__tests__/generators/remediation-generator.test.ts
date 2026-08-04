/**
 * Tests for Remediation Generator
 */

import {
  enrichFindingsWithRemediation,
  generateRemediationReport,
  generateRemediationMarkdown,
} from '../../generators/remediation-generator';
import { RequirementAssessment, AssessmentFinding } from '../../types';
import { MSP_REQUIREMENTS } from '../../data/msp-requirements';

describe('RemediationGenerator', () => {
  describe('enrichFindingsWithRemediation', () => {
    it('should add remediation to gap findings that match known types', () => {
      const findings: AssessmentFinding[] = [
        {
          type: 'aws-config',
          source: 'AWS Config',
          summary: 'AWS Config not enabled in region',
          supportive: false,
          timestamp: new Date(),
        },
        {
          type: 'aws-config',
          source: 'CloudTrail',
          summary: 'CloudTrail not logging API calls',
          supportive: false,
          timestamp: new Date(),
        },
        {
          type: 'documentation',
          source: 'docs/security.md',
          summary: 'Security documentation exists',
          supportive: true,
          timestamp: new Date(),
        },
      ];

      const assessment: RequirementAssessment = {
        requirement: MSP_REQUIREMENTS[0],
        status: 'gap',
        confidence: 0.5,
        findings,
        evidence: [],
        gaps: ['Missing Config', 'Missing CloudTrail'],
        recommendations: [],
      };

      const enriched = enrichFindingsWithRemediation([assessment]);

      expect(enriched).toHaveLength(1);
      expect(enriched[0].findings).toHaveLength(3);

      // Check that gap findings have remediation
      const configFinding = enriched[0].findings[0];
      expect(configFinding.remediation).toBeDefined();
      expect(configFinding.remediation?.findingType).toBe('config-not-enabled');

      const cloudtrailFinding = enriched[0].findings[1];
      expect(cloudtrailFinding.remediation).toBeDefined();
      expect(cloudtrailFinding.remediation?.findingType).toBe('cloudtrail-not-logging');

      // Supportive finding should not have remediation
      const supportiveFinding = enriched[0].findings[2];
      expect(supportiveFinding.remediation).toBeUndefined();
    });

    it('should handle findings without matching remediation', () => {
      const findings: AssessmentFinding[] = [
        {
          type: 'manual',
          source: 'Manual review',
          summary: 'Some custom gap without known remediation',
          supportive: false,
          timestamp: new Date(),
        },
      ];

      const assessment: RequirementAssessment = {
        requirement: MSP_REQUIREMENTS[0],
        status: 'gap',
        confidence: 0.5,
        findings,
        evidence: [],
        gaps: [],
        recommendations: [],
      };

      const enriched = enrichFindingsWithRemediation([assessment]);

      expect(enriched[0].findings[0].remediation).toBeUndefined();
    });

    it('should match remediation from gap descriptions', () => {
      const findings: AssessmentFinding[] = [
        {
          type: 'aws-config',
          source: 'Assessment',
          summary: 'Compliance issue detected',
          supportive: false,
          timestamp: new Date(),
        },
      ];

      const assessment: RequirementAssessment = {
        requirement: MSP_REQUIREMENTS[0],
        status: 'gap',
        confidence: 0.5,
        findings,
        evidence: [],
        gaps: ['AWS Backup plan not configured'],
        recommendations: [],
      };

      const enriched = enrichFindingsWithRemediation([assessment]);

      const finding = enriched[0].findings[0];
      expect(finding.remediation).toBeDefined();
      expect(finding.remediation?.findingType).toBe('no-backup-plans');
    });
  });

  describe('generateRemediationReport', () => {
    it('should generate report with categorized findings', () => {
      const findings: AssessmentFinding[] = [
        {
          type: 'aws-config',
          source: 'AWS Config',
          summary: 'AWS Config not enabled',
          supportive: false,
          timestamp: new Date(),
          remediation: {
            findingType: 'config-not-enabled',
            rootCause: 'Config not enabled',
            impact: 'No compliance monitoring',
            riskLevel: 'critical',
            steps: [],
            estimatedEffort: 2,
            awsDocs: [],
            iacSnippets: [],
          },
        },
        {
          type: 'iam',
          source: 'IAM',
          summary: 'Old access keys detected',
          supportive: false,
          timestamp: new Date(),
          remediation: {
            findingType: 'old-access-keys',
            rootCause: 'Keys not rotated',
            impact: 'Security risk',
            riskLevel: 'high',
            steps: [],
            estimatedEffort: 2,
            awsDocs: [],
            iacSnippets: [],
          },
        },
        {
          type: 'aws-config',
          source: 'ALB',
          summary: 'Invalid headers not dropped',
          supportive: false,
          timestamp: new Date(),
          remediation: {
            findingType: 'alb-invalid-headers',
            rootCause: 'ALB misconfigured',
            impact: 'Security vulnerability',
            riskLevel: 'medium',
            steps: [],
            estimatedEffort: 0.5,
            awsDocs: [],
            iacSnippets: [],
          },
        },
      ];

      const assessment: RequirementAssessment = {
        requirement: MSP_REQUIREMENTS[0],
        status: 'gap',
        confidence: 0.5,
        findings,
        evidence: [],
        gaps: [],
        recommendations: [],
      };

      const report = generateRemediationReport([assessment]);

      expect(report.totalFindings).toBe(3);
      expect(report.findingsWithRemediation).toBe(3);
      expect(report.findingsWithoutRemediation).toBe(0);
      expect(report.totalEstimatedEffort).toBe(4.5);

      // Check categorization
      expect(report.criticalFindings).toHaveLength(1);
      expect(report.highFindings).toHaveLength(1);
      expect(report.mediumFindings).toHaveLength(1);
      expect(report.lowFindings).toHaveLength(0);
    });

    it('should count findings without remediation', () => {
      const findings: AssessmentFinding[] = [
        {
          type: 'manual',
          source: 'Manual',
          summary: 'Custom gap',
          supportive: false,
          timestamp: new Date(),
        },
      ];

      const assessment: RequirementAssessment = {
        requirement: MSP_REQUIREMENTS[0],
        status: 'gap',
        confidence: 0.5,
        findings,
        evidence: [],
        gaps: [],
        recommendations: [],
      };

      const report = generateRemediationReport([assessment]);

      expect(report.totalFindings).toBe(1);
      expect(report.findingsWithRemediation).toBe(0);
      expect(report.findingsWithoutRemediation).toBe(1);
    });
  });

  describe('generateRemediationMarkdown', () => {
    it('should generate markdown with all sections', () => {
      const finding: AssessmentFinding = {
        type: 'aws-config',
        source: 'AWS Config',
        summary: 'AWS Config not enabled',
        supportive: false,
        timestamp: new Date(),
        remediation: {
          findingType: 'config-not-enabled',
          rootCause: 'Config service not enabled in region',
          impact: 'Cannot track compliance',
          riskLevel: 'critical',
          estimatedEffort: 2,
          prerequisites: ['S3 bucket', 'IAM permissions'],
          steps: [
            {
              order: 1,
              action: 'Create S3 bucket',
              command: 'aws s3 mb s3://config-bucket',
              consoleSteps: ['Go to S3', 'Create bucket'],
            },
            {
              order: 2,
              action: 'Enable Config',
              details: 'Enable the Config service',
            },
          ],
          validation: ['Check Config status', 'Verify resources appear'],
          awsDocs: ['https://docs.aws.amazon.com/config/'],
          iacSnippets: [
            {
              language: 'cdk-typescript',
              description: 'Enable Config with CDK',
              code: 'new config.CfnConfigurationRecorder(...)',
              filePath: 'lib/config-stack.ts',
            },
          ],
        },
      };

      const assessment: RequirementAssessment = {
        requirement: MSP_REQUIREMENTS[0],
        status: 'gap',
        confidence: 0.5,
        findings: [finding],
        evidence: [],
        gaps: [],
        recommendations: [],
      };

      const report = generateRemediationReport([assessment]);
      const markdown = generateRemediationMarkdown(report);

      // Check sections exist
      expect(markdown).toContain('# Remediation Guidance Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('### Findings by Risk Level');
      expect(markdown).toContain('## 🔴 Critical Priority Remediations');
      expect(markdown).toContain('### AWS Config not enabled');
      expect(markdown).toContain('#### Root Cause');
      expect(markdown).toContain('#### Impact');
      expect(markdown).toContain('#### Prerequisites');
      expect(markdown).toContain('#### Remediation Steps');
      expect(markdown).toContain('#### Validation');
      expect(markdown).toContain('#### Infrastructure as Code');
      expect(markdown).toContain('#### AWS Documentation');

      // Check content
      expect(markdown).toContain('Config service not enabled in region');
      expect(markdown).toContain('Create S3 bucket');
      expect(markdown).toContain('aws s3 mb s3://config-bucket');
      expect(markdown).toContain('S3 bucket');
      expect(markdown).toContain('Check Config status');
      expect(markdown).toContain('cdk-typescript');
      expect(markdown).toContain('https://docs.aws.amazon.com/config/');
    });

    it('should handle empty report', () => {
      const report = generateRemediationReport([]);
      const markdown = generateRemediationMarkdown(report);

      expect(markdown).toContain('# Remediation Guidance Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('**Total Findings**: 0');
    });
  });
});
