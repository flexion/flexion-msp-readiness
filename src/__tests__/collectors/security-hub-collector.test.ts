/**
 * Tests for Security Hub evidence collector
 */

import { saveSecurityHubEvidence } from '../../collectors/security-hub-collector';
import type { SecurityHubEvidence } from '../../collectors/security-hub-collector';
import * as fs from 'fs';
import * as path from 'path';

describe('security-hub-collector', () => {
  const testOutputDir = path.join(__dirname, '../fixtures/output');
  const testFilePath = path.join(testOutputDir, 'security-hub-test.json');

  beforeAll(() => {
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  });

  describe('saveSecurityHubEvidence', () => {
    it('should save evidence to JSON file', () => {
      const mockEvidence: SecurityHubEvidence = {
        hubStatus: {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default',
          autoEnableControls: true,
        },
        enabledStandards: [
          {
            name: 'aws-foundational-security-best-practices',
            arn: 'arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0',
            enabled: true,
          },
        ],
        findings: [
          {
            id: 'finding-1',
            title: 'Test finding',
            severity: 'high',
            complianceStatus: 'FAILED',
            resourceType: 'AWS::S3::Bucket',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        findingsBySeverity: {
          critical: 0,
          high: 1,
          medium: 0,
          low: 0,
          informational: 0,
        },
        complianceStatus: {
          passed: 10,
          failed: 5,
          warning: 2,
          notAvailable: 0,
        },
        timestamp: new Date(),
      };

      const artifact = saveSecurityHubEvidence(mockEvidence, testFilePath);

      // Check that file was created
      expect(fs.existsSync(testFilePath)).toBe(true);

      // Check artifact metadata
      expect(artifact.type).toBe('aws-snapshot');
      expect(artifact.path).toBe(testFilePath);
      expect(artifact.requirementIds).toContain('SEC-001');
      expect(artifact.requirementIds).toContain('SECP-001');

      // Check file content
      const content = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
      expect(content.hubStatus.hubArn).toBe(
        'arn:aws:securityhub:us-east-1:123456789012:hub/default'
      );
      expect(content.findings.length).toBe(1);
      expect(content.findingsBySeverity.high).toBe(1);
    });

    it('should include correct requirement IDs', () => {
      const mockEvidence: SecurityHubEvidence = {
        hubStatus: { hubArn: '', autoEnableControls: false },
        enabledStandards: [],
        findings: [],
        findingsBySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          informational: 0,
        },
        complianceStatus: {
          passed: 0,
          failed: 0,
          warning: 0,
          notAvailable: 0,
        },
        timestamp: new Date(),
      };

      const artifact = saveSecurityHubEvidence(mockEvidence, testFilePath);

      // Security Hub evidence relates to SEC-001, SEC-003, SEC-004, SECP-001, SECP-002
      expect(artifact.requirementIds).toContain('SEC-001');
      expect(artifact.requirementIds).toContain('SEC-003');
      expect(artifact.requirementIds).toContain('SEC-004');
      expect(artifact.requirementIds).toContain('SECP-001');
      expect(artifact.requirementIds).toContain('SECP-002');
    });

    it('should include metadata summary', () => {
      const mockEvidence: SecurityHubEvidence = {
        hubStatus: { hubArn: '', autoEnableControls: false },
        enabledStandards: [{ name: 'test', arn: 'arn', enabled: true }],
        findings: [
          {
            id: '1',
            title: 'Finding 1',
            severity: 'critical',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '2',
            title: 'Finding 2',
            severity: 'high',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        findingsBySeverity: {
          critical: 1,
          high: 1,
          medium: 0,
          low: 0,
          informational: 0,
        },
        complianceStatus: {
          passed: 0,
          failed: 0,
          warning: 0,
          notAvailable: 0,
        },
        timestamp: new Date(),
      };

      const artifact = saveSecurityHubEvidence(mockEvidence, testFilePath);

      expect(artifact.metadata).toBeDefined();
      expect(artifact.metadata?.totalFindings).toBe(2);
      expect(artifact.metadata?.criticalFindings).toBe(1);
      expect(artifact.metadata?.highFindings).toBe(1);
      expect(artifact.metadata?.enabledStandards).toBe(1);
    });
  });
});
