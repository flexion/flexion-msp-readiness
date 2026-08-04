/**
 * OPS-015: Disaster Recovery Evidence Collector
 * Collects evidence of disaster recovery planning, backup validation, and RTO/RPO metrics
 */

import { BackupClient, ListBackupPlansCommand, GetBackupPlanCommand } from '@aws-sdk/client-backup';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { S3Client, GetBucketReplicationCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface DREvidence {
  backupPlans: BackupPlanInfo[];
  rdsBackups: RDSBackupInfo[];
  s3Replication: S3ReplicationInfo[];
  drDocuments: DRDocument[];
  summary: {
    totalBackupPlans: number;
    totalRDSBackups: number;
    totalS3Replication: number;
    hasDRDocumentation: boolean;
    hasRTORPO: boolean;
    compliant: boolean;
  };
}

export interface BackupPlanInfo {
  name: string;
  arn: string;
  ruleCount: number;
  vaultName?: string;
}

export interface RDSBackupInfo {
  dbIdentifier: string;
  backupRetentionPeriod: number;
  hasAutomatedBackups: boolean;
  multiAZ: boolean;
}

export interface S3ReplicationInfo {
  bucket: string;
  replicationEnabled: boolean;
  destinationBuckets: string[];
}

export interface DRDocument {
  fileName: string;
  filePath: string;
  hasDRPlan: boolean;
  hasRTO: boolean;
  hasRPO: boolean;
  rtoValue?: string;
  rpoValue?: string;
}

/**
 * Collect disaster recovery evidence
 */
export async function collectDREvidence(
  region: string,
  docsPath: string
): Promise<DREvidence> {
  const backupClient = new BackupClient({ region });
  const rdsClient = new RDSClient({ region });
  const s3Client = new S3Client({ region });

  try {
    // Get AWS Backup plans
    const backupPlans = await listBackupPlans(backupClient);

    // Get RDS backup configurations
    const rdsBackups = await getRDSBackupConfig(rdsClient);

    // Get S3 replication configurations
    const s3Replication = await getS3Replication(s3Client);

    // Scan for DR documentation
    const drDocuments = scanForDRDocuments(docsPath);

    const summary = {
      totalBackupPlans: backupPlans.length,
      totalRDSBackups: rdsBackups.length,
      totalS3Replication: s3Replication.filter(s => s.replicationEnabled).length,
      hasDRDocumentation: drDocuments.length > 0,
      hasRTORPO: drDocuments.some(d => d.hasRTO && d.hasRPO),
      compliant:
        backupPlans.length > 0 &&
        drDocuments.length > 0 &&
        drDocuments.some(d => d.hasRTO && d.hasRPO),
    };

    return {
      backupPlans,
      rdsBackups,
      s3Replication,
      drDocuments,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect DR evidence: ${error}`);
    return {
      backupPlans: [],
      rdsBackups: [],
      s3Replication: [],
      drDocuments: [],
      summary: {
        totalBackupPlans: 0,
        totalRDSBackups: 0,
        totalS3Replication: 0,
        hasDRDocumentation: false,
        hasRTORPO: false,
        compliant: false,
      },
    };
  }
}

/**
 * List AWS Backup plans
 */
async function listBackupPlans(client: BackupClient): Promise<BackupPlanInfo[]> {
  const plans: BackupPlanInfo[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListBackupPlansCommand({ NextToken: nextToken })
      );

      for (const plan of response.BackupPlansList ?? []) {
        if (!plan.BackupPlanId || !plan.BackupPlanName) continue;

        // Get plan details
        try {
          const detailResponse = await client.send(
            new GetBackupPlanCommand({ BackupPlanId: plan.BackupPlanId })
          );

          plans.push({
            name: plan.BackupPlanName,
            arn: plan.BackupPlanArn ?? 'unknown',
            ruleCount: detailResponse.BackupPlan?.Rules?.length ?? 0,
            vaultName: detailResponse.BackupPlan?.Rules?.[0]?.TargetBackupVaultName,
          });
        } catch (error) {
          // Plan details might not be accessible
          plans.push({
            name: plan.BackupPlanName,
            arn: plan.BackupPlanArn ?? 'unknown',
            ruleCount: 0,
          });
        }
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list backup plans: ${error}`);
  }

  return plans;
}

/**
 * Get RDS backup configurations
 */
async function getRDSBackupConfig(client: RDSClient): Promise<RDSBackupInfo[]> {
  const backups: RDSBackupInfo[] = [];

  try {
    const response = await client.send(new DescribeDBInstancesCommand({}));

    for (const instance of response.DBInstances ?? []) {
      if (!instance.DBInstanceIdentifier) continue;

      backups.push({
        dbIdentifier: instance.DBInstanceIdentifier,
        backupRetentionPeriod: instance.BackupRetentionPeriod ?? 0,
        hasAutomatedBackups: (instance.BackupRetentionPeriod ?? 0) > 0,
        multiAZ: instance.MultiAZ ?? false,
      });
    }
  } catch (error) {
    console.error(`Failed to get RDS backup config: ${error}`);
  }

  return backups;
}

/**
 * Get S3 replication configurations
 */
async function getS3Replication(client: S3Client): Promise<S3ReplicationInfo[]> {
  const replication: S3ReplicationInfo[] = [];

  try {
    // List buckets
    const bucketsResponse = await client.send(new ListBucketsCommand({}));

    for (const bucket of bucketsResponse.Buckets ?? []) {
      if (!bucket.Name) continue;

      try {
        // Check replication configuration
        const replicationResponse = await client.send(
          new GetBucketReplicationCommand({ Bucket: bucket.Name })
        );

        const rules = replicationResponse.ReplicationConfiguration?.Rules ?? [];
        const destinationBuckets = rules
          .map(r => r.Destination?.Bucket ?? '')
          .filter(b => b !== '');

        replication.push({
          bucket: bucket.Name,
          replicationEnabled: rules.length > 0,
          destinationBuckets,
        });
      } catch (error: any) {
        // Replication might not be configured (ReplicationConfigurationNotFoundError is expected)
        if (error.name !== 'ReplicationConfigurationNotFoundError') {
          console.error(`Failed to get replication for bucket ${bucket.Name}: ${error}`);
        }
        replication.push({
          bucket: bucket.Name,
          replicationEnabled: false,
          destinationBuckets: [],
        });
      }
    }
  } catch (error) {
    console.error(`Failed to get S3 replication: ${error}`);
  }

  return replication;
}

/**
 * Scan for DR documentation
 */
function scanForDRDocuments(docsPath: string): DRDocument[] {
  const documents: DRDocument[] = [];

  if (!fs.existsSync(docsPath)) {
    return documents;
  }

  try {
    const files = fs.readdirSync(docsPath, { recursive: true }) as string[];

    for (const file of files) {
      const filePath = path.join(docsPath, file);

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) continue;

      const lowerFile = file.toLowerCase();

      // Look for DR documentation
      if (
        lowerFile.includes('dr') ||
        lowerFile.includes('disaster') ||
        lowerFile.includes('recovery') ||
        lowerFile.includes('backup') ||
        lowerFile.includes('business-continuity') ||
        lowerFile.includes('bcdr')
      ) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();

          // Extract RTO and RPO values if present
          const rtoMatch = content.match(/RTO[:\s]*(\d+\s*(?:hours?|minutes?|days?))/i);
          const rpoMatch = content.match(/RPO[:\s]*(\d+\s*(?:hours?|minutes?|days?))/i);

          documents.push({
            fileName: path.basename(file),
            filePath,
            hasDRPlan:
              lowerContent.includes('disaster recovery plan') ||
              lowerContent.includes('dr plan'),
            hasRTO: lowerContent.includes('rto') || lowerContent.includes('recovery time objective'),
            hasRPO: lowerContent.includes('rpo') || lowerContent.includes('recovery point objective'),
            rtoValue: rtoMatch ? rtoMatch[1] : undefined,
            rpoValue: rpoMatch ? rpoMatch[1] : undefined,
          });
        } catch (error) {
          // File might not be readable
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan for DR documents: ${error}`);
  }

  return documents;
}

/**
 * Save DR evidence to file
 */
export function saveOPS015Evidence(
  evidence: DREvidence,
  outputPath: string
): EvidenceArtifact {
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
    description: 'Disaster recovery planning, backup schedules, and RTO/RPO documentation',
    requirementIds: ['OPS-015'],
    collectedAt: new Date(),
    metadata: {
      totalBackupPlans: evidence.summary.totalBackupPlans,
      hasDRDocumentation: evidence.summary.hasDRDocumentation,
      hasRTORPO: evidence.summary.hasRTORPO,
      compliant: evidence.summary.compliant,
    },
  };
}
