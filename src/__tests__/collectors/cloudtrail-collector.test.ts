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
        trails: [
          {
            name: 'test-trail',
            arn: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/test-trail',
            s3BucketName: 'test-bucket',
            isMultiRegion: true,
            logFileValidationEnabled: true,
            isLogging: true,
            includeGlobalEvents: true,
          },
        ],
        s3BucketInfo: [
          {
            bucketName: 'test-bucket',
            versioningEnabled: true,
            encryptionEnabled: true,
          },
        ],
        summary: {
          totalTrails: 1,
          activeTrails: 1,
          multiRegionTrails: 1,
          logFileValidationEnabled: 1,
          s3BucketsEncrypted: 1,
        },
      };

      const artifact = saveCloudTrailEvidence(mockEvidence, testFilePath);

      // Check that file was created
      expect(fs.existsSync(testFilePath)).toBe(true);

      // Check artifact metadata
      expect(artifact.type).toBe('aws-snapshot');
      expect(artifact.path).toBe(testFilePath);
      expect(artifact.requirementIds).toContain('OPS-004');

      // Check file content
      const content = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
      expect(content.trails.length).toBe(1);
    });

    it('should include correct requirement IDs', () => {
      const mockEvidence = {
        trails: [],
        s3BucketInfo: [],
        summary: {
          totalTrails: 0,
          activeTrails: 0,
          multiRegionTrails: 0,
          logFileValidationEnabled: 0,
          s3BucketsEncrypted: 0,
        },
      };

      const artifact = saveCloudTrailEvidence(mockEvidence, testFilePath);

      // CloudTrail evidence relates to OPS-004 and SEC-003
      expect(artifact.requirementIds).toContain('OPS-004');
    });
  });
});
