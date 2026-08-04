/**
 * Gaps Command
 * Analyze compliance gaps and provide actionable insights
 */

import * as fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config/loader';
import { assessWorkspace, WorkspaceRequirementStatus } from '../assessors/workspace-assessor';
import { RequirementCategory } from '../types';

interface GapsOptions {
  config: string;
  byPriority?: boolean;
  byEffort?: boolean;
  byAutomation?: boolean;
  category?: RequirementCategory;
  automatedOnly?: boolean;
  format: 'text' | 'json' | 'csv';
}

interface GapInfo {
  requirementId: string;
  requirementName: string;
  category: string;
  priority: string;
  status: string;
  completionPercentage: number;
  missingItems: string[];
  estimatedHours: number;
  automationType: 'automated' | 'semi-automated' | 'manual';
}

/**
 * Determine automation type for a requirement
 */
function getAutomationType(
  category: RequirementCategory
): 'automated' | 'semi-automated' | 'manual' {
  // Platform requirements are highly automated
  if (category === 'platform') {
    return 'automated';
  }

  // Security and operations are semi-automated
  if (category === 'security' || category === 'operations') {
    return 'semi-automated';
  }

  // Business, people, governance are manual
  return 'manual';
}

/**
 * Get missing items for a gap
 */
function getMissingItems(gap: WorkspaceRequirementStatus): string[] {
  const missing: string[] = [];

  if (!gap.hasPlaybook) {
    missing.push('playbook or documentation');
  }

  if (!gap.hasEvidence) {
    missing.push('evidence artifacts');
  }

  if (gap.validated === false) {
    missing.push('validation passing');
  }

  if (gap.playbookStatus !== 'approved') {
    missing.push('approval');
  }

  return missing;
}

/**
 * Sort gaps by priority
 */
function sortByPriority(a: GapInfo, b: GapInfo): number {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const aOrder = priorityOrder[a.priority as keyof typeof priorityOrder] || 4;
  const bOrder = priorityOrder[b.priority as keyof typeof priorityOrder] || 4;
  return aOrder - bOrder;
}

/**
 * Sort gaps by effort
 */
function sortByEffort(a: GapInfo, b: GapInfo): number {
  return a.estimatedHours - b.estimatedHours;
}

/**
 * Sort gaps by automation potential
 */
function sortByAutomation(a: GapInfo, b: GapInfo): number {
  const automationOrder = { automated: 0, 'semi-automated': 1, manual: 2 };
  const aOrder = automationOrder[a.automationType];
  const bOrder = automationOrder[b.automationType];
  return aOrder - bOrder;
}

/**
 * Generate text format output
 */
function generateTextOutput(gaps: GapInfo[]): string {
  if (gaps.length === 0) {
    return chalk.green('\n✅ No compliance gaps found! All requirements are complete.\n');
  }

  const lines: string[] = [];

  lines.push(chalk.bold.blue(`\n🔍 Compliance Gaps Analysis (${gaps.length} gaps)\n`));

  // Group by priority
  const critical = gaps.filter(g => g.priority === 'critical');
  const high = gaps.filter(g => g.priority === 'high');
  const medium = gaps.filter(g => g.priority === 'medium');
  const low = gaps.filter(g => g.priority === 'low');

  if (critical.length > 0) {
    lines.push(chalk.bold.red(`🔴 CRITICAL GAPS (${critical.length})`));
    lines.push('');
    for (const gap of critical) {
      lines.push(chalk.red(`  ${gap.requirementId}: ${gap.requirementName}`));
      lines.push(chalk.gray(`    Category: ${gap.category}`));
      lines.push(chalk.gray(`    Status: ${gap.status} (${gap.completionPercentage}% complete)`));
      lines.push(chalk.gray(`    Missing: ${gap.missingItems.join(', ')}`));
      lines.push(chalk.gray(`    Effort: ${gap.estimatedHours} hours`));
      lines.push(chalk.gray(`    Automation: ${gap.automationType}`));
      lines.push('');
    }
  }

  if (high.length > 0) {
    lines.push(chalk.bold.yellow(`🟠 HIGH PRIORITY GAPS (${high.length})`));
    lines.push('');
    for (const gap of high) {
      lines.push(chalk.yellow(`  ${gap.requirementId}: ${gap.requirementName}`));
      lines.push(chalk.gray(`    Category: ${gap.category}`));
      lines.push(chalk.gray(`    Status: ${gap.status} (${gap.completionPercentage}% complete)`));
      lines.push(chalk.gray(`    Missing: ${gap.missingItems.join(', ')}`));
      lines.push(chalk.gray(`    Effort: ${gap.estimatedHours} hours`));
      lines.push(chalk.gray(`    Automation: ${gap.automationType}`));
      lines.push('');
    }
  }

  if (medium.length > 0) {
    lines.push(chalk.bold.cyan(`🟡 MEDIUM PRIORITY GAPS (${medium.length})`));
    lines.push('');
    for (const gap of medium) {
      lines.push(chalk.cyan(`  ${gap.requirementId}: ${gap.requirementName}`));
      lines.push(chalk.gray(`    Missing: ${gap.missingItems.join(', ')}`));
      lines.push(
        chalk.gray(`    Effort: ${gap.estimatedHours}h | Automation: ${gap.automationType}`)
      );
      lines.push('');
    }
  }

  if (low.length > 0) {
    lines.push(chalk.bold.gray(`⬜ LOW PRIORITY GAPS (${low.length})`));
    lines.push('');
    for (const gap of low) {
      lines.push(chalk.gray(`  ${gap.requirementId}: ${gap.requirementName}`));
      lines.push(chalk.gray(`    Missing: ${gap.missingItems.join(', ')}`));
      lines.push('');
    }
  }

  // Summary
  const totalEffort = gaps.reduce((sum, g) => sum + g.estimatedHours, 0);
  const automated = gaps.filter(g => g.automationType !== 'manual').length;

  lines.push(chalk.bold('\n📊 Summary:'));
  lines.push(chalk.gray(`  Total gaps: ${gaps.length}`));
  lines.push(chalk.gray(`  Total effort: ${totalEffort} hours`));
  lines.push(
    chalk.gray(`  Automatable: ${automated} (${Math.round((automated / gaps.length) * 100)}%)`)
  );
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate JSON format output
 */
function generateJsonOutput(gaps: GapInfo[]): string {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      total: gaps.length,
      totalEffort: gaps.reduce((sum, g) => sum + g.estimatedHours, 0),
      gaps,
    },
    null,
    2
  );
}

/**
 * Generate CSV format output
 */
function generateCsvOutput(gaps: GapInfo[]): string {
  const lines: string[] = [];

  // Header
  lines.push(
    'Requirement ID,Name,Category,Priority,Status,Completion %,Missing Items,Estimated Hours,Automation Type'
  );

  // Data
  for (const gap of gaps) {
    lines.push(
      [
        gap.requirementId,
        `"${gap.requirementName}"`,
        gap.category,
        gap.priority,
        gap.status,
        gap.completionPercentage,
        `"${gap.missingItems.join(', ')}"`,
        gap.estimatedHours,
        gap.automationType,
      ].join(',')
    );
  }

  return lines.join('\n');
}

/**
 * Execute gaps command
 */
export async function executeGaps(options: GapsOptions): Promise<void> {
  console.log(chalk.bold.blue('\n🔍 Analyzing Compliance Gaps\n'));

  // Load configuration
  const spinner = ora('Loading configuration...').start();
  const config = loadConfig(options.config);
  spinner.succeed('Configuration loaded');

  // Run workspace assessment
  spinner.text = 'Assessing workspace...';
  spinner.start();

  const assessment = await assessWorkspace(
    config.output.playbooks_path,
    config.output.evidence_path,
    true // Enable validation
  );

  spinner.succeed('Assessment complete');

  // Filter to gaps only (not complete)
  let gaps = assessment.requirements.filter(r => r.overallStatus !== 'complete');

  // Apply category filter
  if (options.category) {
    gaps = gaps.filter(g => g.requirement.category === options.category);
  }

  // Apply automation filter
  if (options.automatedOnly) {
    gaps = gaps.filter(g => {
      const automationType = getAutomationType(g.requirement.category);
      return automationType !== 'manual';
    });
  }

  // Build gap info
  const gapInfos: GapInfo[] = gaps.map(gap => ({
    requirementId: gap.requirement.id,
    requirementName: gap.requirement.name,
    category: gap.requirement.category,
    priority: gap.requirement.priority,
    status: gap.overallStatus,
    completionPercentage: gap.completionPercentage,
    missingItems: getMissingItems(gap),
    estimatedHours: gap.requirement.estimatedHours || 0,
    automationType: getAutomationType(gap.requirement.category),
  }));

  // Sort gaps
  if (options.byPriority) {
    gapInfos.sort(sortByPriority);
  } else if (options.byEffort) {
    gapInfos.sort(sortByEffort);
  } else if (options.byAutomation) {
    gapInfos.sort(sortByAutomation);
  } else {
    // Default: sort by priority then effort
    gapInfos.sort((a, b) => {
      const priorityCompare = sortByPriority(a, b);
      if (priorityCompare !== 0) return priorityCompare;
      return sortByEffort(a, b);
    });
  }

  // Generate output
  let output: string;

  switch (options.format) {
    case 'json':
      output = generateJsonOutput(gapInfos);
      break;
    case 'csv':
      output = generateCsvOutput(gapInfos);
      break;
    default:
      output = generateTextOutput(gapInfos);
  }

  console.log(output);

  // Exit with error code if there are gaps
  if (gapInfos.length > 0) {
    process.exit(1);
  }
}
