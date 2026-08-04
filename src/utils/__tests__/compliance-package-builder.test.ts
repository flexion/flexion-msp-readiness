/**
 * Tests for Compliance Package Builder
 */

import { CompliancePackageBuilder, buildCompliancePackage } from '../compliance-package-builder';
import { WorkspaceAssessment } from '../../assessors/workspace-assessor';
import { Config } from '../../types';

describe('Compliance Package Builder', () => {
  const mockConfig: Config = {
    project: {
      name: 'Test Project',
      docs_path: './docs',
      infra_path: './infra',
    },
    aws: {
      profile: 'default',
      region: 'us-east-1',
      stage: 'test',
    },
    msp: {
      version: '1.0',
      ig_level: 2,
      organization: {
        name: 'Test Org',
        contact: 'test@example.com',
      },
    },
    output: {
      evidence_path: './evidence',
      playbooks_path: './playbooks',
      dashboard_path: './dashboard.html',
      report_format: 'both',
    },
    assessment: {
      skip_requirements: [],
      custom_priorities: {},
      include_recommended: true,
      auto_collect_evidence: true,
      auto_generate_docs: true,
    },
  };

  const mockAssessment: WorkspaceAssessment = {
    requirements: [
      {
        requirement: {
          id: 'SEC-001',
          name: 'Security Policies',
          category: 'security',
          description: 'Security policies',
          priority: 'critical',
          cisControls: ['1'],
          awsServices: ['IAM'],
          evidenceRequired: ['policies'],
          estimatedHours: 8,
        },
        hasPlaybook: true,
        playbookPath: './playbooks/security-policies.md',
        playbookStatus: 'approved',
        hasEvidence: true,
        evidencePaths: ['./evidence/iam-policies.json'],
        overallStatus: 'complete',
        completionPercentage: 100,
      },
    ],
    summary: {
      total: 1,
      complete: 1,
      inProgress: 0,
      notStarted: 0,
      completionPercentage: 100,
    },
  };

  describe('CompliancePackageBuilder', () => {
    it('should instantiate with config and assessment', () => {
      const builder = new CompliancePackageBuilder(mockConfig, mockAssessment);
      expect(builder).toBeDefined();
    });

    // Note: File system operations are tested via integration tests
    // Unit tests focus on builder instantiation and configuration
  });

  describe('buildCompliancePackage', () => {
    it('should be defined', () => {
      expect(buildCompliancePackage).toBeDefined();
    });
  });
});
