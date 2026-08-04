/**
 * Tests for IAM Access Analyzer evidence collector
 */

import { saveIAMAnalyzerEvidence } from '../../collectors/iam-analyzer-collector';
import type { IAMAnalyzerEvidence } from '../../collectors/iam-analyzer-collector';
import * as fs from 'fs';
import * as path from 'path';

describe('iam-analyzer-collector', () => {
  const testOutputDir = path.join(__dirname, '../fixtures/output');
  const testFilePath = path.join(testOutputDir, 'iam-analyzer-test.json');

  beforeAll(() => {
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  });

  describe('saveIAMAnalyzerEvidence', () => {
    it('should save evidence to JSON file', () => {
      const mockEvidence: IAMAnalyzerEvidence = {
        analyzers: [
          {
            name: 'test-analyzer',
            arn: 'arn:aws:access-analyzer:us-east-1:123456789012:analyzer/test-analyzer',
            status: 'ACTIVE',
            type: 'ACCOUNT',
            createdAt: new Date(),
          },
        ],
        findings: [
          {
            id: 'finding-1',
            resourceType: 'AWS::S3::Bucket',
            resourceOwnerAccount: '123456789012',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
            principal: '*',
            action: ['s3:GetObject'],
            isPublic: true,
          },
        ],
        findingsByType: {
          ACTIVE: 1,
        },
        findingsByResourceType: {
          'AWS::S3::Bucket': 1,
        },
        timestamp: new Date(),
      };

      const artifact = saveIAMAnalyzerEvidence(mockEvidence, testFilePath);

      // Check that file was created
      expect(fs.existsSync(testFilePath)).toBe(true);

      // Check artifact metadata
      expect(artifact.type).toBe('aws-snapshot');
      expect(artifact.path).toBe(testFilePath);
      expect(artifact.requirementIds).toContain('SEC-001');
      expect(artifact.requirementIds).toContain('SECP-001');

      // Check file content
      const content = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
      expect(content.analyzers.length).toBe(1);
      expect(content.findings.length).toBe(1);
      expect(content.findings[0].isPublic).toBe(true);
    });

    it('should include correct requirement IDs', () => {
      const mockEvidence: IAMAnalyzerEvidence = {
        analyzers: [],
        findings: [],
        findingsByType: {},
        findingsByResourceType: {},
        timestamp: new Date(),
      };

      const artifact = saveIAMAnalyzerEvidence(mockEvidence, testFilePath);

      // IAM Access Analyzer evidence relates to SEC-001 and SECP-001
      expect(artifact.requirementIds).toContain('SEC-001');
      expect(artifact.requirementIds).toContain('SECP-001');
    });

    it('should count public findings correctly', () => {
      const mockEvidence: IAMAnalyzerEvidence = {
        analyzers: [],
        findings: [
          {
            id: '1',
            resourceType: 'AWS::S3::Bucket',
            resourceOwnerAccount: '123456789012',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
            principal: '*',
            isPublic: true,
          },
          {
            id: '2',
            resourceType: 'AWS::IAM::Role',
            resourceOwnerAccount: '123456789012',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
            principal: 'arn:aws:iam::999999999999:root',
            isPublic: false,
          },
        ],
        findingsByType: {
          ACTIVE: 2,
        },
        findingsByResourceType: {
          'AWS::S3::Bucket': 1,
          'AWS::IAM::Role': 1,
        },
        timestamp: new Date(),
      };

      const artifact = saveIAMAnalyzerEvidence(mockEvidence, testFilePath);

      expect(artifact.metadata?.totalFindings).toBe(2);
      expect(artifact.metadata?.publicFindings).toBe(1);
    });
  });
});
