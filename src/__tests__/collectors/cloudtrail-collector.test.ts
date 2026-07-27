/**
 * Tests for CloudTrail evidence collector
 */

import { saveCloudTrailEvidence } from '../../collectors/cloudtrail-collector';
import * as fs from 'fs';
import * as path from 'path';

describe('cloudtrail-collector', () => {
  const testOutputDir = path.join(__dirname, '../fixtures/output');
  const testFilePath = path.join(testOutputDir, 'cloudtrail-test.json');

  beforeAll(() => {
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  });

  describe('saveCloudTrailEvidence', () => {
    it('should save evidence to JSON file', () => {
      const mockEvidence = {
        region: 'us-east-1',
        trails: [
          {
            name: 'test-trail',
            s3BucketName: 'test-bucket',
            isMultiRegion: true,
            logFileValidationEnabled: true,
            isLogging: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const artifact = saveCloudTrailEvidence(mockEvidence, testFilePath);

      // Check that file was created
      expect(fs.existsSync(testFilePath)).toBe(true);

      // Check artifact metadata
      expect(artifact.type).toBe('aws-snapshot');
      expect(artifact.path).toBe(testFilePath);
      expect(artifact.requirementIds).toContain('SEC-004');

      // Check file content
      const content = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
      expect(content.region).toBe('us-east-1');
      expect(content.trails.length).toBe(1);
    });

    it('should include correct requirement IDs', () => {
      const mockEvidence = {
        region: 'us-east-1',
        trails: [],
        timestamp: new Date().toISOString(),
      };

      const artifact = saveCloudTrailEvidence(mockEvidence, testFilePath);

      // CloudTrail evidence relates to SEC-004 and SECP-002
      expect(artifact.requirementIds).toContain('SEC-004');
    });
  });
});
