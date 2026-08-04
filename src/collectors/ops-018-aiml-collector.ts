/**
 * OPS-018: AI/ML Capabilities Evidence Collector (Recommended)
 * Collects evidence of AI/ML services in use and responsible AI policies
 */

import { SageMakerClient, ListModelsCommand, ListNotebookInstancesCommand } from '@aws-sdk/client-sagemaker';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface AIMLEvidence {
  sageMakerModels: SageMakerModel[];
  sageMakerNotebooks: SageMakerNotebook[];
  aimlServices: AIMLService[];
  responsibleAIDocs: ResponsibleAIDoc[];
  summary: {
    totalModels: number;
    totalNotebooks: number;
    totalServices: number;
    hasResponsibleAIPolicy: boolean;
    compliant: boolean;
  };
}

export interface SageMakerModel {
  name: string;
  arn: string;
  creationTime?: Date;
}

export interface SageMakerNotebook {
  name: string;
  arn: string;
  instanceType: string;
  status: string;
}

export interface AIMLService {
  service: string;
  description: string;
  evidenceType: 'detected' | 'documented';
}

export interface ResponsibleAIDoc {
  fileName: string;
  filePath: string;
  hasBiasMitigation: boolean;
  hasExplainability: boolean;
  hasPrivacy: boolean;
  hasGovernance: boolean;
}

/**
 * Collect AI/ML capabilities evidence
 */
export async function collectAIMLEvidence(
  region: string,
  docsPath: string
): Promise<AIMLEvidence> {
  const sageMakerClient = new SageMakerClient({ region });

  try {
    // Get SageMaker models
    const sageMakerModels = await listSageMakerModels(sageMakerClient);

    // Get SageMaker notebooks
    const sageMakerNotebooks = await listSageMakerNotebooks(sageMakerClient);

    // Identify AI/ML services in use
    const aimlServices = identifyAIMLServices(sageMakerModels, sageMakerNotebooks);

    // Scan for responsible AI documentation
    const responsibleAIDocs = scanForResponsibleAIDocs(docsPath);

    const summary = {
      totalModels: sageMakerModels.length,
      totalNotebooks: sageMakerNotebooks.length,
      totalServices: aimlServices.length,
      hasResponsibleAIPolicy: responsibleAIDocs.length > 0,
      compliant:
        (sageMakerModels.length > 0 || sageMakerNotebooks.length > 0) &&
        responsibleAIDocs.some(d => d.hasGovernance),
    };

    return {
      sageMakerModels,
      sageMakerNotebooks,
      aimlServices,
      responsibleAIDocs,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect AI/ML evidence: ${error}`);
    return {
      sageMakerModels: [],
      sageMakerNotebooks: [],
      aimlServices: [],
      responsibleAIDocs: [],
      summary: {
        totalModels: 0,
        totalNotebooks: 0,
        totalServices: 0,
        hasResponsibleAIPolicy: false,
        compliant: false,
      },
    };
  }
}

/**
 * List SageMaker models
 */
async function listSageMakerModels(client: SageMakerClient): Promise<SageMakerModel[]> {
  const models: SageMakerModel[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListModelsCommand({ NextToken: nextToken })
      );

      for (const model of response.Models ?? []) {
        if (!model.ModelName || !model.ModelArn) continue;

        models.push({
          name: model.ModelName,
          arn: model.ModelArn,
          creationTime: model.CreationTime,
        });
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list SageMaker models: ${error}`);
  }

  return models;
}

/**
 * List SageMaker notebook instances
 */
async function listSageMakerNotebooks(
  client: SageMakerClient
): Promise<SageMakerNotebook[]> {
  const notebooks: SageMakerNotebook[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListNotebookInstancesCommand({ NextToken: nextToken })
      );

      for (const notebook of response.NotebookInstances ?? []) {
        if (!notebook.NotebookInstanceName || !notebook.NotebookInstanceArn) continue;

        notebooks.push({
          name: notebook.NotebookInstanceName,
          arn: notebook.NotebookInstanceArn,
          instanceType: notebook.InstanceType ?? 'unknown',
          status: notebook.NotebookInstanceStatus ?? 'unknown',
        });
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list SageMaker notebooks: ${error}`);
  }

  return notebooks;
}

/**
 * Identify AI/ML services in use
 */
function identifyAIMLServices(
  models: SageMakerModel[],
  notebooks: SageMakerNotebook[]
): AIMLService[] {
  const services: AIMLService[] = [];

  if (models.length > 0 || notebooks.length > 0) {
    services.push({
      service: 'Amazon SageMaker',
      description: 'Machine learning model training and deployment',
      evidenceType: 'detected',
    });
  }

  // Additional AI/ML services could be detected through other means
  // (CloudTrail logs, Cost Explorer, etc.) but would require more API calls

  return services;
}

/**
 * Scan for responsible AI documentation
 */
function scanForResponsibleAIDocs(docsPath: string): ResponsibleAIDoc[] {
  const documents: ResponsibleAIDoc[] = [];

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

      // Look for AI/ML governance documentation
      if (
        lowerFile.includes('ai') ||
        lowerFile.includes('ml') ||
        lowerFile.includes('machine-learning') ||
        lowerFile.includes('responsible') ||
        lowerFile.includes('ethics') ||
        lowerFile.includes('bias')
      ) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();

          documents.push({
            fileName: path.basename(file),
            filePath,
            hasBiasMitigation:
              lowerContent.includes('bias') ||
              lowerContent.includes('fairness') ||
              lowerContent.includes('mitigation'),
            hasExplainability:
              lowerContent.includes('explainability') ||
              lowerContent.includes('interpretability') ||
              lowerContent.includes('transparency'),
            hasPrivacy:
              lowerContent.includes('privacy') ||
              lowerContent.includes('data protection') ||
              lowerContent.includes('pii'),
            hasGovernance:
              lowerContent.includes('governance') ||
              lowerContent.includes('responsible ai') ||
              lowerContent.includes('ai policy'),
          });
        } catch (error) {
          // File might not be readable
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan for responsible AI docs: ${error}`);
  }

  return documents;
}

/**
 * Save AI/ML evidence to file
 */
export function saveOPS018Evidence(
  evidence: AIMLEvidence,
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
    description: 'AI/ML capabilities and responsible AI governance',
    requirementIds: ['OPS-018'],
    collectedAt: new Date(),
    metadata: {
      totalModels: evidence.summary.totalModels,
      totalServices: evidence.summary.totalServices,
      hasResponsibleAIPolicy: evidence.summary.hasResponsibleAIPolicy,
      compliant: evidence.summary.compliant,
    },
  };
}
