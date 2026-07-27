/**
 * Backup Evidence Collector - OPS-005, OPS-011
 */

import { BackupClient, ListBackupPlansCommand, ListRecoveryPointsByBackupVaultCommand, ListBackupVaultsCommand } from '@aws-sdk/client-backup';
import { EvidenceArtifact } from '../types';

export interface BackupEvidence {
  backupVaults: BackupVaultInfo[];
  backupPlans: BackupPlanInfo[];
  recentRecoveryPoints: RecoveryPointInfo[];
  summary: { totalVaults: number; totalPlans: number; totalRecoveryPoints: number };
  timestamp: Date;
}

export interface BackupVaultInfo {
  name: string;
  arn: string;
  numberOfRecoveryPoints: number;
  encrypted: boolean;
}

export interface BackupPlanInfo {
  name: string;
  arn: string;
  versionId: string;
}

export interface RecoveryPointInfo {
  arn: string;
  resourceType: string;
  createdAt: Date;
  status: string;
}

export async function collectBackupEvidence(region: string, profile: string): Promise<BackupEvidence> {
  const clientConfig = { region };
  const backupClient = new BackupClient(clientConfig);
  const timestamp = new Date();

  try {
    const vaultsResponse = await backupClient.send(new ListBackupVaultsCommand({}));
    const backupVaults: BackupVaultInfo[] = [];
    const recentRecoveryPoints: RecoveryPointInfo[] = [];

    for (const vault of vaultsResponse.BackupVaultList ?? []) {
      if (!vault.BackupVaultName) continue;

      backupVaults.push({
        name: vault.BackupVaultName,
        arn: vault.BackupVaultArn ?? '',
        numberOfRecoveryPoints: vault.NumberOfRecoveryPoints ?? 0,
        encrypted: !!vault.EncryptionKeyArn,
      });

      // Get recent recovery points
      try {
        const pointsResponse = await backupClient.send(
          new ListRecoveryPointsByBackupVaultCommand({
            BackupVaultName: vault.BackupVaultName,
            MaxResults: 10,
          })
        );

        for (const point of pointsResponse.RecoveryPoints ?? []) {
          recentRecoveryPoints.push({
            arn: point.RecoveryPointArn ?? '',
            resourceType: point.ResourceType ?? 'UNKNOWN',
            createdAt: point.CreationDate ?? new Date(),
            status: point.Status ?? 'UNKNOWN',
          });
        }
      } catch {}
    }

    const plansResponse = await backupClient.send(new ListBackupPlansCommand({}));
    const backupPlans: BackupPlanInfo[] = (plansResponse.BackupPlansList ?? []).map(plan => ({
      name: plan.BackupPlanName ?? '',
      arn: plan.BackupPlanArn ?? '',
      versionId: plan.VersionId ?? '',
    }));

    return {
      backupVaults,
      backupPlans,
      recentRecoveryPoints,
      summary: {
        totalVaults: backupVaults.length,
        totalPlans: backupPlans.length,
        totalRecoveryPoints: recentRecoveryPoints.length,
      },
      timestamp,
    };
  } catch (error) {
    console.error(`Failed to collect backup evidence: ${error}`);
    return {
      backupVaults: [],
      backupPlans: [],
      recentRecoveryPoints: [],
      summary: { totalVaults: 0, totalPlans: 0, totalRecoveryPoints: 0 },
      timestamp,
    };
  }
}

export function saveBackupEvidence(evidence: BackupEvidence, outputPath: string): EvidenceArtifact {
  const fs = require('fs');
  const path = require('path');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'AWS Backup vaults, plans, and recovery points',
    requirementIds: ['OPS-005', 'OPS-011'],
    collectedAt: new Date(),
    metadata: evidence.summary,
  };
}

export function printBackupEvidenceSummary(evidence: BackupEvidence): void {
  console.log('Backup Evidence:');
  console.log(`  Backup vaults: ${evidence.summary.totalVaults}`);
  console.log(`  Backup plans: ${evidence.summary.totalPlans}`);
  console.log(`  Recovery points: ${evidence.summary.totalRecoveryPoints}`);
  console.log('');
}
