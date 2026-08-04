/**
 * Systems Manager (SSM) Evidence Collector - OPS-003, OPS-005, SECP-002
 */

import {
  SSMClient,
  DescribeInstanceInformationCommand,
  DescribeInstanceInformationCommandInput,
  DescribeInstancePatchStatesCommand,
  DescribeInstancePatchStatesCommandInput,
  DescribePatchBaselinesCommand,
  DescribePatchGroupsCommand,
  GetInventoryCommand,
  GetInventoryCommandInput,
} from '@aws-sdk/client-ssm';
import { EvidenceArtifact } from '../types';

export interface SSMEvidence {
  instances: ManagedInstanceInfo[];
  patchCompliance: PatchComplianceInfo[];
  patchBaselines: PatchBaselineInfo[];
  patchGroups: PatchGroupInfo[];
  summary: SSMSummary;
  timestamp: Date;
}

export interface ManagedInstanceInfo {
  instanceId: string;
  name?: string;
  platformType: string;
  platformName?: string;
  platformVersion?: string;
  agentVersion: string;
  pingStatus: string;
  lastPingDateTime?: Date;
  associationStatus?: string;
}

export interface PatchComplianceInfo {
  instanceId: string;
  patchGroup?: string;
  baselineId?: string;
  installedCount: number;
  installedOtherCount: number;
  missingCount: number;
  failedCount: number;
  notApplicableCount: number;
  operationStartTime?: Date;
  operationEndTime?: Date;
  operation?: string;
}

export interface PatchBaselineInfo {
  baselineId: string;
  name: string;
  operatingSystem: string;
  description?: string;
  defaultBaseline: boolean;
}

export interface PatchGroupInfo {
  patchGroup: string;
  baselineIdentity?: {
    baselineId: string;
    baselineName: string;
  };
}

export interface SSMSummary {
  totalInstances: number;
  onlineInstances: number;
  instancesWithPatches: number;
  totalMissingPatches: number;
  totalFailedPatches: number;
  patchBaselines: number;
  patchGroups: number;
}

export async function collectSSMEvidence(
  region: string,
  profile: string
): Promise<SSMEvidence> {
  const clientConfig = { region };
  const ssmClient = new SSMClient(clientConfig);
  const timestamp = new Date();

  try {
    // Get managed instances with pagination
    const instances: ManagedInstanceInfo[] = [];
    let nextToken: string | undefined;
    let pageCount = 0;
    const maxPages = 10;

    do {
      const instancesInput: DescribeInstanceInformationCommandInput = {
        MaxResults: 50,
        NextToken: nextToken,
      };

      const instancesResponse = await ssmClient.send(
        new DescribeInstanceInformationCommand(instancesInput)
      );

      for (const instance of instancesResponse.InstanceInformationList ?? []) {
        instances.push({
          instanceId: instance.InstanceId ?? '',
          name: instance.Name,
          platformType: instance.PlatformType ?? 'UNKNOWN',
          platformName: instance.PlatformName,
          platformVersion: instance.PlatformVersion,
          agentVersion: instance.AgentVersion ?? '',
          pingStatus: instance.PingStatus ?? 'UNKNOWN',
          lastPingDateTime: instance.LastPingDateTime,
          associationStatus: instance.AssociationStatus,
        });
      }

      nextToken = instancesResponse.NextToken;
      pageCount++;
    } while (nextToken && pageCount < maxPages);

    // Get patch compliance for instances
    const patchCompliance: PatchComplianceInfo[] = [];
    const instanceIds = instances.map(i => i.instanceId);

    if (instanceIds.length > 0) {
      nextToken = undefined;
      pageCount = 0;

      do {
        const patchInput: DescribeInstancePatchStatesCommandInput = {
          InstanceIds: instanceIds.slice(0, 50), // API limit
          MaxResults: 50,
          NextToken: nextToken,
        };

        try {
          const patchResponse = await ssmClient.send(
            new DescribeInstancePatchStatesCommand(patchInput)
          );

          for (const patch of patchResponse.InstancePatchStates ?? []) {
            patchCompliance.push({
              instanceId: patch.InstanceId ?? '',
              patchGroup: patch.PatchGroup,
              baselineId: patch.BaselineId,
              installedCount: patch.InstalledCount ?? 0,
              installedOtherCount: patch.InstalledOtherCount ?? 0,
              missingCount: patch.MissingCount ?? 0,
              failedCount: patch.FailedCount ?? 0,
              notApplicableCount: patch.NotApplicableCount ?? 0,
              operationStartTime: patch.OperationStartTime,
              operationEndTime: patch.OperationEndTime,
              operation: patch.Operation,
            });
          }

          nextToken = patchResponse.NextToken;
          pageCount++;
        } catch (error) {
          console.warn(`Could not get patch states: ${error}`);
          break;
        }
      } while (nextToken && pageCount < maxPages);
    }

    // Get patch baselines
    const baselinesResponse = await ssmClient.send(new DescribePatchBaselinesCommand({}));
    const patchBaselines: PatchBaselineInfo[] = (
      baselinesResponse.BaselineIdentities ?? []
    ).map(baseline => ({
      baselineId: baseline.BaselineId ?? '',
      name: baseline.BaselineName ?? '',
      operatingSystem: baseline.OperatingSystem ?? 'UNKNOWN',
      description: baseline.BaselineDescription,
      defaultBaseline: baseline.DefaultBaseline ?? false,
    }));

    // Get patch groups
    const groupsResponse = await ssmClient.send(new DescribePatchGroupsCommand({}));
    const patchGroups: PatchGroupInfo[] = (groupsResponse.Mappings ?? []).map(mapping => ({
      patchGroup: mapping.PatchGroup ?? '',
      baselineIdentity: mapping.BaselineIdentity
        ? {
            baselineId: mapping.BaselineIdentity.BaselineId ?? '',
            baselineName: mapping.BaselineIdentity.BaselineName ?? '',
          }
        : undefined,
    }));

    const summary: SSMSummary = {
      totalInstances: instances.length,
      onlineInstances: instances.filter(i => i.pingStatus === 'Online').length,
      instancesWithPatches: patchCompliance.length,
      totalMissingPatches: patchCompliance.reduce((sum, p) => sum + p.missingCount, 0),
      totalFailedPatches: patchCompliance.reduce((sum, p) => sum + p.failedCount, 0),
      patchBaselines: patchBaselines.length,
      patchGroups: patchGroups.length,
    };

    return {
      instances,
      patchCompliance,
      patchBaselines,
      patchGroups,
      summary,
      timestamp,
    };
  } catch (error) {
    console.error(`Failed to collect SSM evidence: ${error}`);
    return {
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
      timestamp,
    };
  }
}

export function saveSSMEvidence(evidence: SSMEvidence, outputPath: string): EvidenceArtifact {
  const fs = require('fs');
  const path = require('path');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'Systems Manager managed instances and patch compliance data',
    requirementIds: ['OPS-003', 'OPS-005', 'OPS-008', 'SECP-002'],
    collectedAt: new Date(),
    metadata: evidence.summary as unknown as Record<string, unknown>,
  };
}

export function printSSMEvidenceSummary(evidence: SSMEvidence): void {
  console.log('Systems Manager Evidence:');
  console.log(`  Managed instances: ${evidence.summary.totalInstances}`);
  console.log(`  Online instances: ${evidence.summary.onlineInstances}`);
  console.log(`  Instances with patch data: ${evidence.summary.instancesWithPatches}`);
  console.log(`  Missing patches: ${evidence.summary.totalMissingPatches}`);
  console.log(`  Failed patches: ${evidence.summary.totalFailedPatches}`);
  console.log(`  Patch baselines: ${evidence.summary.patchBaselines}`);
  console.log(`  Patch groups: ${evidence.summary.patchGroups}`);
  console.log('');
}
