/**
 * OPS-007: Configuration Management Evidence Collector
 * Collects evidence of configuration management via AWS Systems Manager and documentation
 */

import {
  SSMClient,
  ListAssociationsCommand,
  DescribeAssociationCommand,
  ListDocumentsCommand,
  GetInventoryCommand,
} from '@aws-sdk/client-ssm';
import { ConfigServiceClient, DescribeConfigurationRecordersCommand } from '@aws-sdk/client-config-service';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface ConfigManagementEvidence {
  stateManagerAssociations: StateManagerAssociation[];
  configRecorders: ConfigRecorder[];
  configDocs: ConfigDocument[];
  inventoryData: InventoryInfo;
  summary: {
    totalAssociations: number;
    activeAssociations: number;
    hasConfigRecorder: boolean;
    hasDocumentation: boolean;
    hasInventory: boolean;
    compliant: boolean;
  };
}

export interface StateManagerAssociation {
  name: string;
  id?: string;
  status: string;
  documentName: string;
  targets: number;
  lastExecutionDate?: Date;
}

export interface ConfigRecorder {
  name: string;
  roleArn: string;
  recording: boolean;
  resourceTypes: string[];
}

export interface ConfigDocument {
  fileName: string;
  filePath: string;
  hasChangeManagement: boolean;
  hasCMDB: boolean;
}

export interface InventoryInfo {
  totalManagedInstances: number;
  instanceTypes: Record<string, number>;
}

/**
 * Collect configuration management evidence
 */
export async function collectConfigManagementEvidence(
  region: string,
  docsPath: string
): Promise<ConfigManagementEvidence> {
  const ssmClient = new SSMClient({ region });
  const configClient = new ConfigServiceClient({ region });

  try {
    // Get Systems Manager State Manager associations
    const stateManagerAssociations = await listStateManagerAssociations(ssmClient);

    // Get AWS Config recorders
    const configRecorders = await describeConfigRecorders(configClient);

    // Get inventory data
    const inventoryData = await getInventoryData(ssmClient);

    // Scan for configuration management documentation
    const configDocs = scanForConfigDocs(docsPath);

    const summary = {
      totalAssociations: stateManagerAssociations.length,
      activeAssociations: stateManagerAssociations.filter(a => a.status === 'Success').length,
      hasConfigRecorder: configRecorders.length > 0,
      hasDocumentation: configDocs.length > 0,
      hasInventory: inventoryData.totalManagedInstances > 0,
      compliant:
        (stateManagerAssociations.length > 0 || configRecorders.length > 0) &&
        configDocs.length > 0,
    };

    return {
      stateManagerAssociations,
      configRecorders,
      configDocs,
      inventoryData,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect configuration management evidence: ${error}`);
    return {
      stateManagerAssociations: [],
      configRecorders: [],
      configDocs: [],
      inventoryData: {
        totalManagedInstances: 0,
        instanceTypes: {},
      },
      summary: {
        totalAssociations: 0,
        activeAssociations: 0,
        hasConfigRecorder: false,
        hasDocumentation: false,
        hasInventory: false,
        compliant: false,
      },
    };
  }
}

/**
 * List Systems Manager State Manager associations
 */
async function listStateManagerAssociations(
  client: SSMClient
): Promise<StateManagerAssociation[]> {
  const associations: StateManagerAssociation[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListAssociationsCommand({ NextToken: nextToken })
      );

      for (const assoc of response.Associations ?? []) {
        associations.push({
          name: assoc.Name ?? assoc.AssociationId ?? 'unknown',
          id: assoc.AssociationId,
          status: assoc.Overview?.Status ?? 'unknown',
          documentName: assoc.DocumentVersion ?? assoc.Name ?? 'unknown',
          targets: assoc.Targets?.length ?? 0,
          lastExecutionDate: assoc.LastExecutionDate,
        });
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list State Manager associations: ${error}`);
  }

  return associations;
}

/**
 * Describe AWS Config recorders
 */
async function describeConfigRecorders(
  client: ConfigServiceClient
): Promise<ConfigRecorder[]> {
  try {
    const response = await client.send(new DescribeConfigurationRecordersCommand({}));

    return (response.ConfigurationRecorders ?? []).map(recorder => ({
      name: recorder.name ?? 'unknown',
      roleArn: recorder.roleARN ?? 'unknown',
      recording: recorder.recordingGroup?.allSupported ?? false,
      resourceTypes: recorder.recordingGroup?.resourceTypes ?? [],
    }));
  } catch (error) {
    console.error(`Failed to describe Config recorders: ${error}`);
    return [];
  }
}

/**
 * Get Systems Manager inventory data
 */
async function getInventoryData(client: SSMClient): Promise<InventoryInfo> {
  try {
    const response = await client.send(new GetInventoryCommand({}));

    const instanceTypes: Record<string, number> = {};
    let totalManagedInstances = 0;

    for (const entity of response.Entities ?? []) {
      totalManagedInstances++;

      // Count by instance type if available
      const typeData = entity.Data?.['AWS:InstanceInformation'];
      if (typeData && Array.isArray(typeData) && typeData.length > 0) {
        const content = typeData[0].Content as Record<string, any>;
        if (content) {
          const instanceType = content['InstanceType'] || 'unknown';
          instanceTypes[instanceType] = (instanceTypes[instanceType] || 0) + 1;
        }
      }
    }

    return {
      totalManagedInstances,
      instanceTypes,
    };
  } catch (error) {
    console.error(`Failed to get inventory data: ${error}`);
    return {
      totalManagedInstances: 0,
      instanceTypes: {},
    };
  }
}

/**
 * Scan for configuration management documentation
 */
function scanForConfigDocs(docsPath: string): ConfigDocument[] {
  const documents: ConfigDocument[] = [];

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

      // Look for configuration management documentation
      if (
        lowerFile.includes('config') ||
        lowerFile.includes('cmdb') ||
        lowerFile.includes('change-management') ||
        lowerFile.includes('change_management') ||
        lowerFile.includes('configuration-management')
      ) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();

          documents.push({
            fileName: path.basename(file),
            filePath,
            hasChangeManagement:
              lowerContent.includes('change management') ||
              lowerContent.includes('change control'),
            hasCMDB: lowerContent.includes('cmdb') || lowerContent.includes('configuration database'),
          });
        } catch (error) {
          // File might not be readable
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan for config docs: ${error}`);
  }

  return documents;
}

/**
 * Save configuration management evidence to file
 */
export function saveOPS007Evidence(
  evidence: ConfigManagementEvidence,
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
    description: 'Configuration management via Systems Manager and AWS Config',
    requirementIds: ['OPS-007'],
    collectedAt: new Date(),
    metadata: {
      totalAssociations: evidence.summary.totalAssociations,
      hasConfigRecorder: evidence.summary.hasConfigRecorder,
      compliant: evidence.summary.compliant,
    },
  };
}
