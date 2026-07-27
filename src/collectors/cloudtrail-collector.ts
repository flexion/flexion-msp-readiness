/**
 * CloudTrail Evidence Collector
 * Collects evidence of CloudTrail configuration for OPS-004
 */

import {
  CloudTrailClient,
  DescribeTrailsCommand,
  GetTrailStatusCommand,
  GetEventSelectorsCommand,
} from '@aws-sdk/client-cloudtrail';
import {
  S3Client,
  GetBucketVersioningCommand,
  GetBucketEncryptionCommand,
  GetBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3';
import { EvidenceArtifact } from '../types';

export interface CloudTrailEvidence {
  trails: TrailInfo[];
  s3BucketInfo: S3BucketInfo[];
  summary: {
    totalTrails: number;
    activeTrails: number;
    multiRegionTrails: number;
    logFileValidationEnabled: number;
    s3BucketsEncrypted: number;
  };
}

export interface TrailInfo {
  name: string;
  arn: string;
  s3BucketName: string;
  isMultiRegion: boolean;
  isLogging: boolean;
  logFileValidationEnabled: boolean;
  includeGlobalEvents: boolean;
  eventSelectors?: string[];
}

export interface S3BucketInfo {
  bucketName: string;
  versioningEnabled: boolean;
  encryptionEnabled: boolean;
  retentionDays?: number;
}

/**
 * Collect CloudTrail evidence
 */
export async function collectCloudTrailEvidence(
  region: string,
  profile: string
): Promise<CloudTrailEvidence> {
  const clientConfig = { region };
  const cloudTrailClient = new CloudTrailClient(clientConfig);
  const s3Client = new S3Client(clientConfig);

  const trails: TrailInfo[] = [];
  const s3BucketInfo: S3BucketInfo[] = [];

  try {
    // Get all trails
    const trailsResponse = await cloudTrailClient.send(new DescribeTrailsCommand({}));

    for (const trail of trailsResponse.trailList ?? []) {
      if (!trail.Name || !trail.TrailARN) continue;

      // Get trail status
      let isLogging = false;
      try {
        const statusResponse = await cloudTrailClient.send(
          new GetTrailStatusCommand({ Name: trail.Name })
        );
        isLogging = statusResponse.IsLogging ?? false;
      } catch {
        // Trail might not be accessible
      }

      // Get event selectors
      let eventSelectors: string[] = [];
      try {
        const selectorsResponse = await cloudTrailClient.send(
          new GetEventSelectorsCommand({ TrailName: trail.Name })
        );
        eventSelectors = (selectorsResponse.EventSelectors ?? []).map(
          s => `${s.ReadWriteType} - ${s.IncludeManagementEvents ? 'Mgmt' : 'Data'}`
        );
      } catch {
        // Event selectors might not be accessible
      }

      trails.push({
        name: trail.Name,
        arn: trail.TrailARN,
        s3BucketName: trail.S3BucketName ?? 'unknown',
        isMultiRegion: trail.IsMultiRegionTrail ?? false,
        isLogging,
        logFileValidationEnabled: trail.LogFileValidationEnabled ?? false,
        includeGlobalEvents: trail.IncludeGlobalServiceEvents ?? false,
        eventSelectors: eventSelectors.length > 0 ? eventSelectors : undefined,
      });

      // Get S3 bucket info if not already collected
      if (trail.S3BucketName && !s3BucketInfo.find(b => b.bucketName === trail.S3BucketName)) {
        const bucketInfo = await collectS3BucketInfo(s3Client, trail.S3BucketName);
        if (bucketInfo) {
          s3BucketInfo.push(bucketInfo);
        }
      }
    }

    const summary = {
      totalTrails: trails.length,
      activeTrails: trails.filter(t => t.isLogging).length,
      multiRegionTrails: trails.filter(t => t.isMultiRegion).length,
      logFileValidationEnabled: trails.filter(t => t.logFileValidationEnabled).length,
      s3BucketsEncrypted: s3BucketInfo.filter(b => b.encryptionEnabled).length,
    };

    return {
      trails,
      s3BucketInfo,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect CloudTrail evidence: ${error}`);
    return {
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
  }
}

/**
 * Collect S3 bucket information
 */
async function collectS3BucketInfo(
  s3Client: S3Client,
  bucketName: string
): Promise<S3BucketInfo | null> {
  try {
    // Check versioning
    let versioningEnabled = false;
    try {
      const versioningResponse = await s3Client.send(
        new GetBucketVersioningCommand({ Bucket: bucketName })
      );
      versioningEnabled = versioningResponse.Status === 'Enabled';
    } catch {
      // Bucket might not be accessible
    }

    // Check encryption
    let encryptionEnabled = false;
    try {
      await s3Client.send(new GetBucketEncryptionCommand({ Bucket: bucketName }));
      encryptionEnabled = true;
    } catch {
      // Encryption might not be configured
    }

    // Check lifecycle/retention
    let retentionDays: number | undefined;
    try {
      const lifecycleResponse = await s3Client.send(
        new GetBucketLifecycleConfigurationCommand({ Bucket: bucketName })
      );
      const rules = lifecycleResponse.Rules ?? [];
      // Get the longest expiration period
      for (const rule of rules) {
        if (rule.Expiration?.Days) {
          retentionDays = Math.max(retentionDays ?? 0, rule.Expiration.Days);
        }
      }
    } catch {
      // Lifecycle might not be configured
    }

    return {
      bucketName,
      versioningEnabled,
      encryptionEnabled,
      retentionDays,
    };
  } catch {
    return null;
  }
}

/**
 * Save CloudTrail evidence to file
 */
export function saveCloudTrailEvidence(
  evidence: CloudTrailEvidence,
  outputPath: string
): EvidenceArtifact {
  const fs = require('fs');
  const path = require('path');

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save evidence as JSON
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'CloudTrail configuration and S3 bucket settings',
    requirementIds: ['OPS-004', 'SEC-003'],
    collectedAt: new Date(),
    metadata: {
      region: evidence.trails[0]?.arn?.split(':')[3] ?? 'unknown',
      trailCount: evidence.trails.length,
      activeTrails: evidence.summary.activeTrails,
    },
  };
}

/**
 * Print CloudTrail evidence summary
 */
export function printCloudTrailEvidenceSummary(evidence: CloudTrailEvidence): void {
  console.log('CloudTrail Evidence:');
  console.log(`  Total trails: ${evidence.summary.totalTrails}`);
  console.log(`  Active trails: ${evidence.summary.activeTrails}`);
  console.log(`  Multi-region: ${evidence.summary.multiRegionTrails}`);
  console.log(`  Log validation: ${evidence.summary.logFileValidationEnabled}`);
  console.log(`  S3 buckets encrypted: ${evidence.summary.s3BucketsEncrypted}`);
  console.log('');
}
