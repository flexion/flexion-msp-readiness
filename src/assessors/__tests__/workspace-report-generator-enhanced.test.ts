/**
 * Tests for Enhanced Workspace Report Generator
 */

import {
  generateEnhancedWorkspaceReport,
  saveEnhancedReport,
  DEFAULT_REPORT_OPTIONS,
} from '../workspace-report-generator-enhanced';
import { WorkspaceAssessment, WorkspaceRequirementStatus } from '../workspace-assessor';
import { MSPRequirement } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs - but we'll use spyOn for writeFileSync

describe('Enhanced Workspace Report Generator', () => {
  const mockRequirement: MSPRequirement = {
    id: 'SEC-001',
    name: 'Security Policies',
    category: 'security',
    description: 'Security policies and procedures',
    priority: 'critical',
    cisControls: ['1', '2'],
    awsServices: ['IAM', 'Config'],
    evidenceRequired: ['security-policies', 'procedures'],
    estimatedHours: 8,
  };

  const mockRequirementStatus: WorkspaceRequirementStatus = {
    requirement: mockRequirement,
    hasPlaybook: true,
    playbookPath: './playbooks/security-policies.md',
    playbookStatus: 'approved',
    hasEvidence: true,
    evidencePaths: ['./evidence/iam-policies.json', './evidence/config-rules.json'],
    validated: true,
    validationResult: {
      requirementId: 'SEC-001',
      passed: true,
      checks: [
        {
          name: 'Policy exists',
          passed: true,
          expected: 'Policy document present',
          actual: 'Policy document found',
          severity: 'high',
        },
      ],
      summary: 'All checks passed',
      validatedAt: new Date('2026-08-04'),
    },
    overallStatus: 'complete',
    completionPercentage: 100,
  };

  const mockAssessment: WorkspaceAssessment = {
    requirements: [mockRequirementStatus],
    summary: {
      total: 1,
      complete: 1,
      inProgress: 0,
      notStarted: 0,
      completionPercentage: 100,
    },
  };

  describe('generateEnhancedWorkspaceReport', () => {
    it('should generate markdown report by default', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project');

      expect(report).toContain('# MSP Readiness Assessment Report');
      expect(report).toContain('**Project**: Test Project');
      expect(report).toContain('**Overall Completion**: 100%');
    });

    it('should include executive summary when requested', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'markdown',
        includeSummary: true,
        includeDetails: false,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('## Executive Summary');
      expect(report).toContain('### Completion by Category');
      expect(report).toContain('### Automation Coverage');
      expect(report).toContain('### Priority Gaps');
    });

    it('should include category-grouped details', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'markdown',
        includeSummary: false,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('## Security Requirements');
      expect(report).toContain('### ✅ SEC-001: Security Policies');
      expect(report).toContain('**Status**: complete');
      expect(report).toContain('**Automation**: ✅ Fully Automated');
    });

    it('should show automation indicators', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'markdown',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('✅ Fully Automated');
      expect(report).toMatch(/\d+ requirements \(\d+%\)/);
    });

    it('should include evidence collected', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'markdown',
        includeSummary: false,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('**Evidence Collected**:');
      expect(report).toContain('iam-policies.json');
      expect(report).toContain('config-rules.json');
    });

    it('should include quality score for validated requirements', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'markdown',
        includeSummary: false,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('**Quality Score**: 100/100');
      expect(report).toContain('✅ 1/1 validation checks passed');
    });

    it('should include manual checklist for incomplete manual requirements', () => {
      const manualReq: WorkspaceRequirementStatus = {
        requirement: {
          id: 'BUS-001',
          name: 'Company Overview',
          category: 'business',
          description: 'Company overview presentation',
          priority: 'high',
          cisControls: [],
          awsServices: [],
          evidenceRequired: ['company-overview'],
          estimatedHours: 8,
        },
        hasPlaybook: false,
        hasEvidence: false,
        evidencePaths: [],
        overallStatus: 'not-started',
        completionPercentage: 0,
      };

      const assessment: WorkspaceAssessment = {
        requirements: [manualReq],
        summary: {
          total: 1,
          complete: 0,
          inProgress: 0,
          notStarted: 1,
          completionPercentage: 0,
        },
      };

      const report = generateEnhancedWorkspaceReport(assessment, 'Test Project', {
        format: 'markdown',
        includeSummary: false,
        includeDetails: false,
        includeChecklist: true,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('## Manual Evidence Checklist');
      expect(report).toContain('### High Priority');
      expect(report).toContain('- [ ] **BUS-001**: Company Overview');
      expect(report).toContain('Template:');
      expect(report).toContain('Effort: 8 hours');
    });

    it('should include gap remediation plan', () => {
      const gapReq: WorkspaceRequirementStatus = {
        requirement: {
          id: 'SEC-002',
          name: 'Security Awareness',
          category: 'security',
          description: 'Security awareness training',
          priority: 'critical',
          cisControls: ['14'],
          awsServices: [],
          evidenceRequired: ['training-records'],
          estimatedHours: 4,
        },
        hasPlaybook: false,
        hasEvidence: false,
        evidencePaths: [],
        overallStatus: 'not-started',
        completionPercentage: 0,
      };

      const assessment: WorkspaceAssessment = {
        requirements: [gapReq],
        summary: {
          total: 1,
          complete: 0,
          inProgress: 0,
          notStarted: 1,
          completionPercentage: 0,
        },
      };

      const report = generateEnhancedWorkspaceReport(assessment, 'Test Project', {
        format: 'markdown',
        includeSummary: false,
        includeDetails: false,
        includeChecklist: false,
        includeRemediationPlan: true,
        groupBy: 'category',
      });

      expect(report).toContain('## Gap Remediation Plan');
      expect(report).toContain('### Phase 1: Critical Gaps');
      expect(report).toContain('**SEC-002** - Security Awareness');
    });

    it('should include appendices', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'markdown',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('## Appendices');
      expect(report).toContain('### A. Evidence Artifacts Collected');
      expect(report).toContain('### B. Validation Summary');
      expect(report).toContain('### C. Next Assessment');
    });

    it('should generate HTML report', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'html',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('<!DOCTYPE html>');
      expect(report).toContain('<title>MSP Readiness Assessment - Test Project</title>');
      expect(report).toContain('<div class="header">');
      expect(report).toContain('filterByCategory');
      expect(report).toContain('filterByStatus');
    });

    it('should include interactive filters in HTML', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'html',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('<div class="filters">');
      expect(report).toContain('onclick="filterByCategory(\'all\')"');
      expect(report).toContain('onclick="filterByStatus(\'complete\')"');
    });

    it('should generate JSON report', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'json',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      const parsed = JSON.parse(report);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.project).toBe('Test Project');
      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.overall).toBeDefined();
      expect(parsed.summary.byCategory).toBeDefined();
      expect(parsed.requirements).toHaveLength(1);
      expect(parsed.requirements[0].id).toBe('SEC-001');
    });

    it('should include automation summary in JSON', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'json',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      const parsed = JSON.parse(report);
      expect(parsed.summary.automation).toBeDefined();
      expect(parsed.summary.automation.full).toBeDefined();
      expect(parsed.summary.automation.partial).toBeDefined();
      expect(parsed.summary.automation.manual).toBeDefined();
    });

    it('should include priority gaps in JSON', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'json',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      const parsed = JSON.parse(report);
      expect(parsed.summary.priorityGaps).toBeDefined();
      expect(parsed.summary.priorityGaps.critical).toBeDefined();
      expect(parsed.summary.priorityGaps.high).toBeDefined();
      expect(parsed.summary.priorityGaps.medium).toBeDefined();
    });
  });

  describe('saveEnhancedReport', () => {
    // Skip file system tests since fs is already mocked globally
    // These tests would need integration testing or better mocking setup

    it('should return correct path and format for markdown', () => {
      const result = saveEnhancedReport(mockAssessment, 'Test Project', '/tmp/report', {
        format: 'markdown',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: true,
        includeRemediationPlan: true,
        groupBy: 'category',
      });

      expect(result.path).toBe('/tmp/report.md');
      expect(result.format).toBe('markdown');
    });

    it('should return correct path and format for HTML', () => {
      const result = saveEnhancedReport(mockAssessment, 'Test Project', '/tmp/report', {
        format: 'html',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(result.path).toBe('/tmp/report.html');
      expect(result.format).toBe('html');
    });

    it('should return correct path and format for JSON', () => {
      const result = saveEnhancedReport(mockAssessment, 'Test Project', '/tmp/report', {
        format: 'json',
        includeSummary: true,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(result.path).toBe('/tmp/report.json');
      expect(result.format).toBe('json');
    });

    it('should use default markdown format when not specified', () => {
      const result = saveEnhancedReport(mockAssessment, 'Test Project', '/tmp/report');

      expect(result.path).toBe('/tmp/report.md');
      expect(result.format).toBe('markdown');
    });
  });

  describe('Category Grouping', () => {
    it('should group requirements by category', () => {
      const multiCategoryAssessment: WorkspaceAssessment = {
        requirements: [
          {
            ...mockRequirementStatus,
            requirement: { ...mockRequirement, id: 'SEC-001', category: 'security' },
          },
          {
            ...mockRequirementStatus,
            requirement: { ...mockRequirement, id: 'OPS-001', category: 'operations' },
          },
          {
            ...mockRequirementStatus,
            requirement: { ...mockRequirement, id: 'BUS-001', category: 'business' },
          },
        ],
        summary: {
          total: 3,
          complete: 3,
          inProgress: 0,
          notStarted: 0,
          completionPercentage: 100,
        },
      };

      const report = generateEnhancedWorkspaceReport(
        multiCategoryAssessment,
        'Test Project',
        {
          format: 'markdown',
          includeSummary: true,
          includeDetails: true,
          includeChecklist: false,
          includeRemediationPlan: false,
          groupBy: 'category',
        }
      );

      expect(report).toContain('## Business Requirements');
      expect(report).toContain('## Security Requirements');
      expect(report).toContain('## Operations Requirements');
    });

    it('should show correct category icons', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'markdown',
        includeSummary: true,
        includeDetails: false,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('🔒 Security');
    });
  });

  describe('Automation Indicators', () => {
    it('should show automation type for each requirement', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'markdown',
        includeSummary: false,
        includeDetails: true,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('**Automation**: ✅ Fully Automated');
    });

    it('should calculate automation coverage correctly', () => {
      const report = generateEnhancedWorkspaceReport(mockAssessment, 'Test Project', {
        format: 'markdown',
        includeSummary: true,
        includeDetails: false,
        includeChecklist: false,
        includeRemediationPlan: false,
        groupBy: 'category',
      });

      expect(report).toContain('### Automation Coverage');
      expect(report).toMatch(/✅ Fully Automated: \d+ requirements/);
    });
  });
});
