/**
 * OPS-001: Service Level Management Evidence Collector
 * Collects evidence of SLA/SLO documentation and CloudWatch monitoring
 */

import { CloudWatchClient, ListDashboardsCommand, GetDashboardCommand } from '@aws-sdk/client-cloudwatch';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface SLAEvidence {
  slaDocs: SLADocument[];
  cloudwatchDashboards: DashboardInfo[];
  sloMetrics: SLOMetric[];
  summary: {
    hasDocumentation: boolean;
    hasMonitoring: boolean;
    totalDashboards: number;
    slosCovered: number;
    compliant: boolean;
  };
}

export interface SLADocument {
  fileName: string;
  filePath: string;
  content: string;
  hasSLOs: boolean;
  hasResponseTimes: boolean;
  hasAvailabilityTargets: boolean;
}

export interface DashboardInfo {
  name: string;
  arn?: string;
  lastModified?: Date;
  widgetCount: number;
  monitorsSLO: boolean;
}

export interface SLOMetric {
  name: string;
  target: string;
  metric?: string;
  source: 'documentation' | 'dashboard';
}

/**
 * Collect SLA evidence
 */
export async function collectSLAEvidence(
  region: string,
  docsPath: string
): Promise<SLAEvidence> {
  try {
    // Scan for SLA documentation
    const slaDocs = scanForSLADocuments(docsPath);

    // Get CloudWatch dashboards
    const client = new CloudWatchClient({ region });
    const cloudwatchDashboards = await listDashboards(client);

    // Extract SLO metrics from docs and dashboards
    const sloMetrics = extractSLOMetrics(slaDocs, cloudwatchDashboards);

    const summary = {
      hasDocumentation: slaDocs.length > 0,
      hasMonitoring: cloudwatchDashboards.length > 0,
      totalDashboards: cloudwatchDashboards.length,
      slosCovered: sloMetrics.length,
      compliant: slaDocs.length > 0 && cloudwatchDashboards.length > 0 && sloMetrics.length >= 3,
    };

    return {
      slaDocs,
      cloudwatchDashboards,
      sloMetrics,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect SLA evidence: ${error}`);
    return {
      slaDocs: [],
      cloudwatchDashboards: [],
      sloMetrics: [],
      summary: {
        hasDocumentation: false,
        hasMonitoring: false,
        totalDashboards: 0,
        slosCovered: 0,
        compliant: false,
      },
    };
  }
}

/**
 * Scan for SLA documentation
 */
function scanForSLADocuments(docsPath: string): SLADocument[] {
  const documents: SLADocument[] = [];

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

      // Look for SLA/SLO documentation
      if (
        lowerFile.includes('sla') ||
        lowerFile.includes('slo') ||
        lowerFile.includes('service-level') ||
        lowerFile.includes('service_level')
      ) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');

          // Check for SLO indicators
          const hasSLOs =
            content.includes('SLO') ||
            content.includes('Service Level Objective') ||
            content.includes('service level objective');

          const hasResponseTimes =
            content.includes('response time') ||
            content.includes('Response Time') ||
            content.includes('latency') ||
            content.includes('Latency');

          const hasAvailabilityTargets =
            content.includes('availability') ||
            content.includes('Availability') ||
            content.includes('uptime') ||
            content.includes('Uptime');

          documents.push({
            fileName: path.basename(file),
            filePath,
            content: content.substring(0, 1000), // First 1000 chars
            hasSLOs,
            hasResponseTimes,
            hasAvailabilityTargets,
          });
        } catch (error) {
          // File might not be readable
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan for SLA documents: ${error}`);
  }

  return documents;
}

/**
 * List CloudWatch dashboards
 */
async function listDashboards(client: CloudWatchClient): Promise<DashboardInfo[]> {
  const dashboards: DashboardInfo[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListDashboardsCommand({ NextToken: nextToken })
      );

      for (const dashboard of response.DashboardEntries ?? []) {
        if (!dashboard.DashboardName) continue;

        // Get dashboard details
        let widgetCount = 0;
        let monitorsSLO = false;

        try {
          const detailResponse = await client.send(
            new GetDashboardCommand({ DashboardName: dashboard.DashboardName })
          );

          if (detailResponse.DashboardBody) {
            const body = JSON.parse(detailResponse.DashboardBody);
            widgetCount = body.widgets?.length || 0;

            // Check if dashboard monitors SLO-related metrics
            const bodyStr = JSON.stringify(body).toLowerCase();
            monitorsSLO =
              bodyStr.includes('slo') ||
              bodyStr.includes('availability') ||
              bodyStr.includes('latency') ||
              bodyStr.includes('error rate');
          }
        } catch (error) {
          // Dashboard might not be accessible
        }

        dashboards.push({
          name: dashboard.DashboardName,
          arn: dashboard.DashboardArn,
          lastModified: dashboard.LastModified,
          widgetCount,
          monitorsSLO,
        });
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to list CloudWatch dashboards: ${error}`);
  }

  return dashboards;
}

/**
 * Extract SLO metrics from documentation and dashboards
 */
function extractSLOMetrics(
  docs: SLADocument[],
  dashboards: DashboardInfo[]
): SLOMetric[] {
  const metrics: SLOMetric[] = [];

  // Extract from documentation
  for (const doc of docs) {
    if (doc.hasAvailabilityTargets) {
      // Look for availability percentages
      const availabilityMatch = doc.content.match(/(\d+(?:\.\d+)?)\s*%?\s*availability/i);
      if (availabilityMatch) {
        metrics.push({
          name: 'Availability',
          target: `${availabilityMatch[1]}%`,
          source: 'documentation',
        });
      }
    }

    if (doc.hasResponseTimes) {
      // Look for response time targets
      const responseMatch = doc.content.match(/(\d+)\s*(ms|milliseconds|seconds)/i);
      if (responseMatch) {
        metrics.push({
          name: 'Response Time',
          target: `${responseMatch[1]} ${responseMatch[2]}`,
          source: 'documentation',
        });
      }
    }
  }

  // Add dashboard-based metrics
  for (const dashboard of dashboards) {
    if (dashboard.monitorsSLO) {
      metrics.push({
        name: dashboard.name,
        target: 'Monitored in CloudWatch',
        source: 'dashboard',
      });
    }
  }

  return metrics;
}

/**
 * Save SLA evidence to file
 */
export function saveOPS001Evidence(
  evidence: SLAEvidence,
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
    description: 'Service Level Agreement (SLA) documentation and monitoring',
    requirementIds: ['OPS-001'],
    collectedAt: new Date(),
    metadata: {
      hasDocumentation: evidence.summary.hasDocumentation,
      hasMonitoring: evidence.summary.hasMonitoring,
      slosCovered: evidence.summary.slosCovered,
      compliant: evidence.summary.compliant,
    },
  };
}
