/**
 * OPS-016: Cloud Financial Management (FinOps) Evidence Collector
 * Collects evidence of cost anomaly detection, budgets, and FinOps practices
 */

import {
  CostExplorerClient,
  GetAnomaliesCommand,
  GetCostAndUsageCommand,
} from '@aws-sdk/client-cost-explorer';
import {
  BudgetsClient,
  DescribeBudgetsCommand,
  DescribeNotificationsForBudgetCommand,
} from '@aws-sdk/client-budgets';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface FinOpsEvidence {
  costAnomalies: CostAnomaly[];
  budgets: BudgetInfo[];
  finOpsDocs: FinOpsDocument[];
  summary: {
    totalAnomalies: number;
    recentAnomalies: number;
    totalBudgets: number;
    budgetsWithAlerts: number;
    hasFinOpsDocumentation: boolean;
    compliant: boolean;
  };
}

export interface CostAnomaly {
  anomalyId: string;
  anomalyScore: number;
  impact: number;
  rootCauses: string[];
  detectionDate?: Date;
}

export interface BudgetInfo {
  name: string;
  amount: number;
  unit: string;
  timeUnit: string;
  budgetType: string;
  notifications: number;
  hasAlerts: boolean;
}

export interface FinOpsDocument {
  fileName: string;
  filePath: string;
  hasCostOptimization: boolean;
  hasBudgetTracking: boolean;
  hasFinOpsPolicy: boolean;
}

/**
 * Collect FinOps evidence
 */
export async function collectFinOpsEvidence(
  region: string,
  docsPath: string,
  accountId: string
): Promise<FinOpsEvidence> {
  // Note: Cost Explorer and Budgets APIs require us-east-1
  const ceRegion = 'us-east-1';
  const ceClient = new CostExplorerClient({ region: ceRegion });
  const budgetsClient = new BudgetsClient({ region: ceRegion });

  try {
    // Get cost anomalies
    const costAnomalies = await getCostAnomalies(ceClient);

    // Get budgets
    const budgets = await getBudgets(budgetsClient, accountId);

    // Scan for FinOps documentation
    const finOpsDocs = scanForFinOpsDocs(docsPath);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentAnomalies = costAnomalies.filter(
      a => a.detectionDate && a.detectionDate > thirtyDaysAgo
    );

    const summary = {
      totalAnomalies: costAnomalies.length,
      recentAnomalies: recentAnomalies.length,
      totalBudgets: budgets.length,
      budgetsWithAlerts: budgets.filter(b => b.hasAlerts).length,
      hasFinOpsDocumentation: finOpsDocs.length > 0,
      compliant:
        budgets.length >= 1 &&
        budgets.some(b => b.hasAlerts) &&
        finOpsDocs.length > 0,
    };

    return {
      costAnomalies,
      budgets,
      finOpsDocs,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect FinOps evidence: ${error}`);
    return {
      costAnomalies: [],
      budgets: [],
      finOpsDocs: [],
      summary: {
        totalAnomalies: 0,
        recentAnomalies: 0,
        totalBudgets: 0,
        budgetsWithAlerts: 0,
        hasFinOpsDocumentation: false,
        compliant: false,
      },
    };
  }
}

/**
 * Get cost anomalies
 */
async function getCostAnomalies(client: CostExplorerClient): Promise<CostAnomaly[]> {
  try {
    // Get anomalies from the last 90 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const response = await client.send(
      new GetAnomaliesCommand({
        DateInterval: {
          StartDate: startDate.toISOString().split('T')[0],
          EndDate: endDate.toISOString().split('T')[0],
        },
      })
    );

    return (response.Anomalies ?? []).map(anomaly => ({
      anomalyId: anomaly.AnomalyId ?? 'unknown',
      anomalyScore: anomaly.AnomalyScore?.MaxScore ?? 0,
      impact: anomaly.Impact?.MaxImpact ?? 0,
      rootCauses: (anomaly.RootCauses ?? []).map(rc => rc.Service ?? 'unknown'),
      detectionDate: anomaly.AnomalyStartDate
        ? new Date(anomaly.AnomalyStartDate)
        : undefined,
    }));
  } catch (error) {
    console.error(`Failed to get cost anomalies: ${error}`);
    return [];
  }
}

/**
 * Get budgets
 */
async function getBudgets(
  client: BudgetsClient,
  accountId: string
): Promise<BudgetInfo[]> {
  const budgets: BudgetInfo[] = [];

  try {
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new DescribeBudgetsCommand({
          AccountId: accountId,
          NextToken: nextToken,
        })
      );

      for (const budget of response.Budgets ?? []) {
        if (!budget.BudgetName) continue;

        // Get notifications for this budget
        let notifications = 0;
        try {
          const notifResponse = await client.send(
            new DescribeNotificationsForBudgetCommand({
              AccountId: accountId,
              BudgetName: budget.BudgetName,
            })
          );
          notifications = notifResponse.Notifications?.length ?? 0;
        } catch (error) {
          // Notifications might not be accessible
        }

        budgets.push({
          name: budget.BudgetName,
          amount: budget.BudgetLimit?.Amount
            ? parseFloat(budget.BudgetLimit.Amount)
            : 0,
          unit: budget.BudgetLimit?.Unit ?? 'USD',
          timeUnit: budget.TimeUnit ?? 'MONTHLY',
          budgetType: budget.BudgetType ?? 'COST',
          notifications,
          hasAlerts: notifications > 0,
        });
      }

      nextToken = response.NextToken;
    } while (nextToken);
  } catch (error) {
    console.error(`Failed to get budgets: ${error}`);
  }

  return budgets;
}

/**
 * Scan for FinOps documentation
 */
function scanForFinOpsDocs(docsPath: string): FinOpsDocument[] {
  const documents: FinOpsDocument[] = [];

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

      // Look for FinOps-related documentation
      if (
        lowerFile.includes('finops') ||
        lowerFile.includes('cost') ||
        lowerFile.includes('budget') ||
        lowerFile.includes('financial') ||
        lowerFile.includes('optimization')
      ) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();

          documents.push({
            fileName: path.basename(file),
            filePath,
            hasCostOptimization:
              lowerContent.includes('cost optimization') ||
              lowerContent.includes('cost savings'),
            hasBudgetTracking:
              lowerContent.includes('budget') || lowerContent.includes('spending'),
            hasFinOpsPolicy:
              lowerContent.includes('finops') || lowerContent.includes('financial management'),
          });
        } catch (error) {
          // File might not be readable
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan for FinOps docs: ${error}`);
  }

  return documents;
}

/**
 * Save FinOps evidence to file
 */
export function saveOPS016Evidence(
  evidence: FinOpsEvidence,
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
    description: 'Cloud Financial Management (FinOps) practices and cost monitoring',
    requirementIds: ['OPS-016'],
    collectedAt: new Date(),
    metadata: {
      totalBudgets: evidence.summary.totalBudgets,
      budgetsWithAlerts: evidence.summary.budgetsWithAlerts,
      compliant: evidence.summary.compliant,
    },
  };
}
