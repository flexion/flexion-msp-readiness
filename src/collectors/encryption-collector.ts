/**
 * Encryption Evidence Collector
 * Collects evidence for SEC-009
 */

import { KMSClient, ListKeysCommand, DescribeKeyCommand } from '@aws-sdk/client-kms';
import { S3Client, ListBucketsCommand, GetBucketEncryptionCommand } from '@aws-sdk/client-s3';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { EC2Client, DescribeVolumesCommand } from '@aws-sdk/client-ec2';
import { EvidenceArtifact } from '../types';

export interface EncryptionEvidence {
  kmsKeys: KMSKeyInfo[];
  s3Buckets: S3EncryptionInfo[];
  rdsInstances: RDSEncryptionInfo[];
  ebsVolumes: EBSEncryptionInfo[];
  summary: {
    totalKMSKeys: number;
    customerManagedKeys: number;
    s3BucketsEncrypted: number;
    s3BucketsUnencrypted: number;
    rdsInstancesEncrypted: number;
    rdsInstancesUnencrypted: number;
    ebsVolumesEncrypted: number;
    ebsVolumesUnencrypted: number;
  };
}

export interface KMSKeyInfo {
  keyId: string;
  keyArn: string;
  description?: string;
  keyManager: string;
  keyState: string;
  creationDate?: string;
}

export interface S3EncryptionInfo {
  bucketName: string;
  encrypted: boolean;
  encryptionType?: string;
  kmsKeyId?: string;
}

export interface RDSEncryptionInfo {
  dbInstanceIdentifier: string;
  engine: string;
  encrypted: boolean;
  kmsKeyId?: string;
}

export interface EBSEncryptionInfo {
  volumeId: string;
  volumeType: string;
  size: number;
  encrypted: boolean;
  kmsKeyId?: string;
  state: string;
}

/**
 * Collect encryption evidence
 */
export async function collectEncryptionEvidence(
  region: string,
  profile: string
): Promise<EncryptionEvidence> {
  const kmsClient = new KMSClient({ region });
  const s3Client = new S3Client({ region });
  const rdsClient = new RDSClient({ region });
  const ec2Client = new EC2Client({ region });

  const kmsKeys: KMSKeyInfo[] = [];
  const s3Buckets: S3EncryptionInfo[] = [];
  const rdsInstances: RDSEncryptionInfo[] = [];
  const ebsVolumes: EBSEncryptionInfo[] = [];

  try {
    // Collect KMS keys
    const keysResponse = await kmsClient.send(new ListKeysCommand({}));

    for (const key of keysResponse.Keys ?? []) {
      if (!key.KeyId) continue;

      try {
        const keyDetails = await kmsClient.send(new DescribeKeyCommand({ KeyId: key.KeyId }));

        const metadata = keyDetails.KeyMetadata;
        kmsKeys.push({
          keyId: metadata?.KeyId ?? 'unknown',
          keyArn: metadata?.Arn ?? 'unknown',
          description: metadata?.Description,
          keyManager: metadata?.KeyManager ?? 'unknown',
          keyState: metadata?.KeyState ?? 'unknown',
          creationDate: metadata?.CreationDate?.toISOString(),
        });
      } catch {
        // Key might not be accessible
      }
    }

    // Check S3 bucket encryption
    const bucketsResponse = await s3Client.send(new ListBucketsCommand({}));

    for (const bucket of bucketsResponse.Buckets ?? []) {
      if (!bucket.Name) continue;

      try {
        const encryptionResponse = await s3Client.send(
          new GetBucketEncryptionCommand({ Bucket: bucket.Name })
        );

        const rules = encryptionResponse.ServerSideEncryptionConfiguration?.Rules ?? [];
        const defaultEncryption = rules[0]?.ApplyServerSideEncryptionByDefault;

        s3Buckets.push({
          bucketName: bucket.Name,
          encrypted: true,
          encryptionType: defaultEncryption?.SSEAlgorithm,
          kmsKeyId: defaultEncryption?.KMSMasterKeyID,
        });
      } catch {
        // No encryption configured
        s3Buckets.push({
          bucketName: bucket.Name,
          encrypted: false,
        });
      }
    }

    // Check RDS instance encryption
    const rdsResponse = await rdsClient.send(new DescribeDBInstancesCommand({}));

    for (const dbInstance of rdsResponse.DBInstances ?? []) {
      rdsInstances.push({
        dbInstanceIdentifier: dbInstance.DBInstanceIdentifier ?? 'unknown',
        engine: dbInstance.Engine ?? 'unknown',
        encrypted: dbInstance.StorageEncrypted ?? false,
        kmsKeyId: dbInstance.KmsKeyId,
      });
    }

    // Check EBS volume encryption
    const volumesResponse = await ec2Client.send(new DescribeVolumesCommand({}));

    for (const volume of volumesResponse.Volumes ?? []) {
      ebsVolumes.push({
        volumeId: volume.VolumeId ?? 'unknown',
        volumeType: volume.VolumeType ?? 'unknown',
        size: volume.Size ?? 0,
        encrypted: volume.Encrypted ?? false,
        kmsKeyId: volume.KmsKeyId,
        state: volume.State ?? 'unknown',
      });
    }

    const summary = {
      totalKMSKeys: kmsKeys.length,
      customerManagedKeys: kmsKeys.filter(k => k.keyManager === 'CUSTOMER').length,
      s3BucketsEncrypted: s3Buckets.filter(b => b.encrypted).length,
      s3BucketsUnencrypted: s3Buckets.filter(b => !b.encrypted).length,
      rdsInstancesEncrypted: rdsInstances.filter(r => r.encrypted).length,
      rdsInstancesUnencrypted: rdsInstances.filter(r => !r.encrypted).length,
      ebsVolumesEncrypted: ebsVolumes.filter(v => v.encrypted).length,
      ebsVolumesUnencrypted: ebsVolumes.filter(v => !v.encrypted).length,
    };

    return {
      kmsKeys,
      s3Buckets,
      rdsInstances,
      ebsVolumes,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect encryption evidence: ${error}`);
    return {
      kmsKeys: [],
      s3Buckets: [],
      rdsInstances: [],
      ebsVolumes: [],
      summary: {
        totalKMSKeys: 0,
        customerManagedKeys: 0,
        s3BucketsEncrypted: 0,
        s3BucketsUnencrypted: 0,
        rdsInstancesEncrypted: 0,
        rdsInstancesUnencrypted: 0,
        ebsVolumesEncrypted: 0,
        ebsVolumesUnencrypted: 0,
      },
    };
  }
}

/**
 * Save encryption evidence to file
 */
export function saveEncryptionEvidence(
  evidence: EncryptionEvidence,
  outputPath: string
): EvidenceArtifact {
  const fs = require('fs');
  const path = require('path');

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'Encryption at rest configuration (KMS, S3, RDS, EBS)',
    requirementIds: ['SEC-009'],
    collectedAt: new Date(),
    metadata: {
      kmsKeys: evidence.summary.totalKMSKeys,
      s3Encrypted: evidence.summary.s3BucketsEncrypted,
      rdsEncrypted: evidence.summary.rdsInstancesEncrypted,
      ebsEncrypted: evidence.summary.ebsVolumesEncrypted,
    },
  };
}

/**
 * Print encryption evidence summary
 */
export function printEncryptionEvidenceSummary(evidence: EncryptionEvidence): void {
  console.log('Encryption Evidence:');
  console.log(`  KMS keys: ${evidence.summary.totalKMSKeys}`);
  console.log(`  Customer-managed keys: ${evidence.summary.customerManagedKeys}`);
  console.log(
    `  S3 buckets: ${evidence.summary.s3BucketsEncrypted} encrypted, ${evidence.summary.s3BucketsUnencrypted} unencrypted`
  );
  console.log(
    `  RDS instances: ${evidence.summary.rdsInstancesEncrypted} encrypted, ${evidence.summary.rdsInstancesUnencrypted} unencrypted`
  );
  console.log(
    `  EBS volumes: ${evidence.summary.ebsVolumesEncrypted} encrypted, ${evidence.summary.ebsVolumesUnencrypted} unencrypted`
  );
  console.log('');
}
