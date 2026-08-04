/**
 * Dashboard Builder
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { DashboardData } from '../types';

export async function buildDashboard(
  dashboardData: DashboardData,
  outputPath: string
): Promise<void> {
  // Load template - check both locations for backwards compatibility
  let templatePath = path.join(__dirname, '..', '..', 'templates', 'dashboard', 'dashboard.hbs');
  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(__dirname, 'templates', 'dashboard.hbs');
  }
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = Handlebars.compile(templateContent);

  // Prepare data for template
  const total =
    dashboardData.assessment.overallStatus.addressed +
    dashboardData.assessment.overallStatus.partial +
    dashboardData.assessment.overallStatus.gap +
    dashboardData.assessment.overallStatus.notStarted;

  const overallPercent = Math.round(
    (dashboardData.assessment.overallStatus.addressed / total) * 100
  );

  const categories = [
    {
      name: 'Security',
      total: dashboardData.byCategory.security.total,
      addressed: dashboardData.byCategory.security.addressed,
      partial: dashboardData.byCategory.security.partial,
      gap: dashboardData.byCategory.security.gap,
      percent: Math.round(
        (dashboardData.byCategory.security.addressed / dashboardData.byCategory.security.total) *
          100
      ),
    },
    {
      name: 'Operations',
      total: dashboardData.byCategory.operations.total,
      addressed: dashboardData.byCategory.operations.addressed,
      partial: dashboardData.byCategory.operations.partial,
      gap: dashboardData.byCategory.operations.gap,
      percent: Math.round(
        (dashboardData.byCategory.operations.addressed /
          dashboardData.byCategory.operations.total) *
          100
      ),
    },
    {
      name: 'Support',
      total: dashboardData.byCategory.support.total,
      addressed: dashboardData.byCategory.support.addressed,
      partial: dashboardData.byCategory.support.partial,
      gap: dashboardData.byCategory.support.gap,
      percent:
        dashboardData.byCategory.support.total > 0
          ? Math.round(
              (dashboardData.byCategory.support.addressed /
                dashboardData.byCategory.support.total) *
                100
            )
          : 0,
    },
  ];

  const requirements = dashboardData.assessment.requirementAssessments.map(r => ({
    id: r.requirement.id,
    name: r.requirement.name,
    category: r.requirement.category,
    status: r.status,
    effort: r.estimatedEffort || 0,
  }));

  const criticalGaps = dashboardData.criticalPath.map(c => ({
    id: c.requirement.id,
    name: c.requirement.name,
    priority: c.requirement.priority,
    effort: c.effort,
    description: c.requirement.description,
  }));

  // Prepare trend data if available
  let trendContext;
  if (dashboardData.trend && dashboardData.trend.history.length >= 2) {
    const history = dashboardData.trend.history;
    trendContext = {
      hasTrend: true,
      direction: dashboardData.trend.direction,
      directionIcon:
        dashboardData.trend.direction === 'improving'
          ? '📈'
          : dashboardData.trend.direction === 'declining'
            ? '📉'
            : '➡️',
      directionClass:
        dashboardData.trend.direction === 'improving'
          ? 'trend-up'
          : dashboardData.trend.direction === 'declining'
            ? 'trend-down'
            : 'trend-stable',
      averageChange: dashboardData.trend.averageChangePerWeek.toFixed(2),
      projectedCompletion: dashboardData.trend.projectedCompletion
        ? dashboardData.trend.projectedCompletion.toLocaleDateString()
        : null,
      chartLabels: JSON.stringify(history.map(h => h.date.toLocaleDateString())),
      chartData: JSON.stringify(history.map(h => h.completionPercent)),
      chartAddressed: JSON.stringify(history.map(h => h.addressed)),
      chartPartial: JSON.stringify(history.map(h => h.partial)),
      chartGap: JSON.stringify(history.map(h => h.gap)),
    };
  } else {
    trendContext = {
      hasTrend: false,
    };
  }

  const context = {
    projectName: dashboardData.assessment.projectName,
    date: new Date().toISOString().split('T')[0],
    overallPercent,
    total,
    addressed: dashboardData.assessment.overallStatus.addressed,
    partial: dashboardData.assessment.overallStatus.partial,
    gap: dashboardData.assessment.overallStatus.gap,
    categories,
    requirements,
    criticalGaps,
    hasCriticalGaps: criticalGaps.length > 0,
    evidenceCount: dashboardData.evidenceInventory.total,
    trend: trendContext,
  };

  // Render template
  const html = template(context);

  // Save to file
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, html, 'utf-8');
}
