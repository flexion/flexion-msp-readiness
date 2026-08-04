/**
 * OPS-009: Customer Deployment Pipelines Evidence Collector
 * Collects evidence of CI/CD pipeline configurations
 */

import {
  CodePipelineClient,
  ListPipelinesCommand,
  GetPipelineCommand,
} from '@aws-sdk/client-codepipeline';
import {
  CodeBuildClient,
  ListProjectsCommand,
  BatchGetProjectsCommand,
} from '@aws-sdk/client-codebuild';
import {
  CodeDeployClient,
  ListApplicationsCommand,
  GetApplicationCommand,
} from '@aws-sdk/client-codedeploy';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface PipelineEvidence {
  codePipelines: PipelineInfo[];
  codeBuildProjects: BuildProjectInfo[];
  codeDeployApps: DeployAppInfo[];
  cicdConfigFiles: CICDConfigFile[];
  summary: {
    totalPipelines: number;
    activePipelines: number;
    totalBuildProjects: number;
    totalDeployApps: number;
    hasCICDAutomation: boolean;
    compliant: boolean;
  };
}

export interface PipelineInfo {
  name: string;
  arn?: string;
  version: number;
  stageCount: number;
  created?: Date;
  updated?: Date;
}

export interface BuildProjectInfo {
  name: string;
  arn: string;
  source: string;
  environment: string;
  artifacts: string;
}

export interface DeployAppInfo {
  name: string;
  deploymentGroups: number;
}

export interface CICDConfigFile {
  fileName: string;
  filePath: string;
  type: 'github-actions' | 'gitlab-ci' | 'buildspec' | 'other';
  hasDeployment: boolean;
}

/**
 * Collect deployment pipeline evidence
 */
export async function collectPipelineEvidence(
  region: string,
  infraPath: string
): Promise<PipelineEvidence> {
  const pipelineClient = new CodePipelineClient({ region });
  const buildClient = new CodeBuildClient({ region });
  const deployClient = new CodeDeployClient({ region });

  try {
    // Get CodePipeline pipelines
    const codePipelines = await listCodePipelines(pipelineClient);

    // Get CodeBuild projects
    const codeBuildProjects = await listCodeBuildProjects(buildClient);

    // Get CodeDeploy applications
    const codeDeployApps = await listCodeDeployApps(deployClient);

    // Scan for CI/CD config files
    const cicdConfigFiles = scanForCICDConfigs(infraPath);

    const summary = {
      totalPipelines: codePipelines.length,
      activePipelines: codePipelines.length, // All listed pipelines are assumed active
      totalBuildProjects: codeBuildProjects.length,
      totalDeployApps: codeDeployApps.length,
      hasCICDAutomation:
        codePipelines.length > 0 ||
        codeBuildProjects.length > 0 ||
        cicdConfigFiles.length > 0,
      compliant:
        (codePipelines.length > 0 || cicdConfigFiles.length > 0) &&
        cicdConfigFiles.some(f => f.hasDeployment),
    };

    return {
      codePipelines,
      codeBuildProjects,
      codeDeployApps,
      cicdConfigFiles,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect pipeline evidence: ${error}`);
    return {
      codePipelines: [],
      codeBuildProjects: [],
      codeDeployApps: [],
      cicdConfigFiles: [],
      summary: {
        totalPipelines: 0,
        activePipelines: 0,
        totalBuildProjects: 0,
        totalDeployApps: 0,
        hasCICDAutomation: false,
        compliant: false,
      },
    };
  }
}

/**
 * List CodePipeline pipelines
 */
async function listCodePipelines(client: CodePipelineClient): Promise<PipelineInfo[]> {
  const pipelines: PipelineInfo[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListPipelinesCommand({ nextToken })
      );

      for (const pipeline of response.pipelines ?? []) {
        if (!pipeline.name) continue;

        // Get pipeline details
        try {
          const detailResponse = await client.send(
            new GetPipelineCommand({ name: pipeline.name })
          );

          pipelines.push({
            name: pipeline.name,
            arn: detailResponse.metadata?.pipelineArn,
            version: pipeline.version ?? 0,
            stageCount: detailResponse.pipeline?.stages?.length ?? 0,
            created: pipeline.created,
            updated: pipeline.updated,
          });
        } catch (error) {
          // Pipeline might not be accessible
          pipelines.push({
            name: pipeline.name,
            version: pipeline.version ?? 0,
            stageCount: 0,
            created: pipeline.created,
            updated: pipeline.updated,
          });
        }
      }

      nextToken = response.nextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list CodePipeline pipelines: ${error}`);
  }

  return pipelines;
}

/**
 * List CodeBuild projects
 */
async function listCodeBuildProjects(client: CodeBuildClient): Promise<BuildProjectInfo[]> {
  const projects: BuildProjectInfo[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListProjectsCommand({ nextToken })
      );

      if (response.projects && response.projects.length > 0) {
        // Get project details in batch
        const detailResponse = await client.send(
          new BatchGetProjectsCommand({ names: response.projects })
        );

        for (const project of detailResponse.projects ?? []) {
          if (!project.name || !project.arn) continue;

          projects.push({
            name: project.name,
            arn: project.arn,
            source: project.source?.type ?? 'unknown',
            environment: project.environment?.type ?? 'unknown',
            artifacts: project.artifacts?.type ?? 'unknown',
          });
        }
      }

      nextToken = response.nextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list CodeBuild projects: ${error}`);
  }

  return projects;
}

/**
 * List CodeDeploy applications
 */
async function listCodeDeployApps(client: CodeDeployClient): Promise<DeployAppInfo[]> {
  const apps: DeployAppInfo[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListApplicationsCommand({ nextToken })
      );

      for (const appName of response.applications ?? []) {
        try {
          const detailResponse = await client.send(
            new GetApplicationCommand({ applicationName: appName })
          );

          apps.push({
            name: appName,
            deploymentGroups: 0, // Would need another API call to count
          });
        } catch (error) {
          // App might not be accessible
        }
      }

      nextToken = response.nextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list CodeDeploy applications: ${error}`);
  }

  return apps;
}

/**
 * Scan for CI/CD configuration files
 */
function scanForCICDConfigs(infraPath: string): CICDConfigFile[] {
  const configs: CICDConfigFile[] = [];

  // Check common CI/CD file locations
  const searchPaths = [
    infraPath,
    path.join(infraPath, '..'),
    path.join(infraPath, '../..'),
  ];

  for (const searchPath of searchPaths) {
    if (!fs.existsSync(searchPath)) continue;

    try {
      // Look for GitHub Actions
      const githubWorkflowPath = path.join(searchPath, '.github/workflows');
      if (fs.existsSync(githubWorkflowPath)) {
        const workflowFiles = fs.readdirSync(githubWorkflowPath);
        for (const file of workflowFiles) {
          if (file.endsWith('.yml') || file.endsWith('.yaml')) {
            const filePath = path.join(githubWorkflowPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            configs.push({
              fileName: file,
              filePath,
              type: 'github-actions',
              hasDeployment: content.includes('deploy') || content.includes('Deploy'),
            });
          }
        }
      }

      // Look for GitLab CI
      const gitlabCIPath = path.join(searchPath, '.gitlab-ci.yml');
      if (fs.existsSync(gitlabCIPath)) {
        const content = fs.readFileSync(gitlabCIPath, 'utf-8');
        configs.push({
          fileName: '.gitlab-ci.yml',
          filePath: gitlabCIPath,
          type: 'gitlab-ci',
          hasDeployment: content.includes('deploy') || content.includes('Deploy'),
        });
      }

      // Look for buildspec.yml
      const buildspecPath = path.join(searchPath, 'buildspec.yml');
      if (fs.existsSync(buildspecPath)) {
        const content = fs.readFileSync(buildspecPath, 'utf-8');
        configs.push({
          fileName: 'buildspec.yml',
          filePath: buildspecPath,
          type: 'buildspec',
          hasDeployment: content.includes('deploy') || content.includes('Deploy'),
        });
      }
    } catch (error) {
      console.error(`Failed to scan for CI/CD configs in ${searchPath}: ${error}`);
    }
  }

  return configs;
}

/**
 * Save pipeline evidence to file
 */
export function saveOPS009Evidence(
  evidence: PipelineEvidence,
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
    description: 'CI/CD deployment pipelines configuration and automation',
    requirementIds: ['OPS-009'],
    collectedAt: new Date(),
    metadata: {
      totalPipelines: evidence.summary.totalPipelines,
      hasCICDAutomation: evidence.summary.hasCICDAutomation,
      compliant: evidence.summary.compliant,
    },
  };
}
