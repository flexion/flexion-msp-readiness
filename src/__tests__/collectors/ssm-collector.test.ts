/**
 * Tests for Systems Manager (SSM) evidence collector
 */

import { saveSSMEvidence } from '../../collectors/ssm-collector';
import type { SSMEvidence } from '../../collectors/ssm-collector';
import * as fs from 'fs';
import * as path from 'path';

describe('ssm-collector', () => {
  const testOutputDir = path.join(__dirname, '../fixtures/output');
  const testFilePath = path.join(testOutputDir, 'ssm-test.json');

  beforeAll(() => {
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  });

  describe('saveSSMEvidence', () => {
    it('should save evidence to JSON file', () => {
      const mockEvidence: SSMEvidence = {
        instances: [
          {
            instanceId: 'i-1234567890abcdef0',
            name: 'test-instance',
            platformType: 'Linux',
            platformName: 'Amazon Linux',
            platformVersion: '2023',
            agentVersion: '3.1.1',
            pingStatus: 'Online',
            lastPingDateTime: new Date(),
            associationStatus: 'Success',
          },
        ],
        patchCompliance: [
          {
            instanceId: 'i-1234567890abcdef0',
            patchGroup: 'default',
            baselineId: 'pb-1234567890abcdef0',
            installedCount: 50,
            installedOtherCount: 10,
            missingCount: 5,
            failedCount: 1,
            notApplicableCount: 100,
            operationStartTime: new Date(),
            operationEndTime: new Date(),
            operation: 'Scan',
          },
        ],
        patchBaselines: [
          {
            baselineId: 'pb-1234567890abcdef0',
            name: 'AWS-DefaultPatchBaseline',
            operatingSystem: 'AMAZON_LINUX_2',
            description: 'Default patch baseline',
            defaultBaseline: true,
          },
        ],
        patchGroups: [
          {
            patchGroup: 'default',
            baselineIdentity: {
              baselineId: 'pb-1234567890abcdef0',
              baselineName: 'AWS-DefaultPatchBaseline',
            },
          },
        ],
        summary: {
          totalInstances: 1,
          onlineInstances: 1,
          instancesWithPatches: 1,
          totalMissingPatches: 5,
          totalFailedPatches: 1,
          patchBaselines: 1,
          patchGroups: 1,
        },
        timestamp: new Date(),
      };

      const artifact = saveSSMEvidence(mockEvidence, testFilePath);

      // Check that file was created
      expect(fs.existsSync(testFilePath)).toBe(true);

      // Check artifact metadata
      expect(artifact.type).toBe('aws-snapshot');
      expect(artifact.path).toBe(testFilePath);
      expect(artifact.requirementIds).toContain('OPS-003');
      expect(artifact.requirementIds).toContain('OPS-005');

      // Check file content
      const content = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
      expect(content.instances.length).toBe(1);
      expect(content.patchCompliance.length).toBe(1);
      expect(content.summary.totalMissingPatches).toBe(5);
    });

    it('should include correct requirement IDs', () => {
      const mockEvidence: SSMEvidence = {
        instances: [],
        patchCompliance: [],
        patchBaselines: [],
        patchGroups: [],
        summary: {
          totalInstances: 0,
          onlineInstances: 0,
          instancesWithPatches: 0,
          totalMissingPatches: 0,
          totalFailedPatches: 0,
          patchBaselines: 0,
          patchGroups: 0,
        },
        timestamp: new Date(),
      };

      const artifact = saveSSMEvidence(mockEvidence, testFilePath);

      // SSM evidence relates to OPS-003, OPS-005, SECP-002
      expect(artifact.requirementIds).toContain('OPS-003');
      expect(artifact.requirementIds).toContain('OPS-005');
      expect(artifact.requirementIds).toContain('SECP-002');
    });

    it('should include summary metadata', () => {
      const mockEvidence: SSMEvidence = {
        instances: [
          {
            instanceId: 'i-1',
            platformType: 'Linux',
            agentVersion: '3.1.1',
            pingStatus: 'Online',
          },
          {
            instanceId: 'i-2',
            platformType: 'Windows',
            agentVersion: '3.1.1',
            pingStatus: 'ConnectionLost',
          },
        ],
        patchCompliance: [
          {
            instanceId: 'i-1',
            installedCount: 50,
            installedOtherCount: 10,
            missingCount: 5,
            failedCount: 1,
            notApplicableCount: 100,
          },
        ],
        patchBaselines: [],
        patchGroups: [],
        summary: {
          totalInstances: 2,
          onlineInstances: 1,
          instancesWithPatches: 1,
          totalMissingPatches: 5,
          totalFailedPatches: 1,
          patchBaselines: 0,
          patchGroups: 0,
        },
        timestamp: new Date(),
      };

      const artifact = saveSSMEvidence(mockEvidence, testFilePath);

      expect(artifact.metadata).toBeDefined();
      expect(artifact.metadata?.totalInstances).toBe(2);
      expect(artifact.metadata?.onlineInstances).toBe(1);
      expect(artifact.metadata?.totalMissingPatches).toBe(5);
    });
  });
});
