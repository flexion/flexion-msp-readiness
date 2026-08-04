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
  // Load template
  const templatePath = path.join(__dirname, 'templates', 'dashboard.html');
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
      name: 'Business',
      total: dashboardData.byCategory.business.total,
      addressed: dashboardData.byCategory.business.addressed,
      partial: dashboardData.byCategory.business.partial,
      gap: dashboardData.byCategory.business.gap,
      percent:
        dashboardData.byCategory.business.total > 0
          ? Math.round(
              (dashboardData.byCategory.business.addressed /
                dashboardData.byCategory.business.total) *
                100
            )
          : 0,
    },
    {
      name: 'People',
      total: dashboardData.byCategory.people.total,
      addressed: dashboardData.byCategory.people.addressed,
      partial: dashboardData.byCategory.people.partial,
      gap: dashboardData.byCategory.people.gap,
      percent:
        dashboardData.byCategory.people.total > 0
          ? Math.round(
              (dashboardData.byCategory.people.addressed / dashboardData.byCategory.people.total) *
                100
            )
          : 0,
    },
    {
      name: 'Governance',
      total: dashboardData.byCategory.governance.total,
      addressed: dashboardData.byCategory.governance.addressed,
      partial: dashboardData.byCategory.governance.partial,
      gap: dashboardData.byCategory.governance.gap,
      percent:
        dashboardData.byCategory.governance.total > 0
          ? Math.round(
              (dashboardData.byCategory.governance.addressed /
                dashboardData.byCategory.governance.total) *
                100
            )
          : 0,
    },
    {
      name: 'Platform',
      total: dashboardData.byCategory.platform.total,
      addressed: dashboardData.byCategory.platform.addressed,
      partial: dashboardData.byCategory.platform.partial,
      gap: dashboardData.byCategory.platform.gap,
      percent:
        dashboardData.byCategory.platform.total > 0
          ? Math.round(
              (dashboardData.byCategory.platform.addressed /
                dashboardData.byCategory.platform.total) *
                100
            )
          : 0,
    },
    {
      name: 'Security',
      total: dashboardData.byCategory.security.total,
      addressed: dashboardData.byCategory.security.addressed,
      partial: dashboardData.byCategory.security.partial,
      gap: dashboardData.byCategory.security.gap,
      percent:
        dashboardData.byCategory.security.total > 0
          ? Math.round(
              (dashboardData.byCategory.security.addressed /
                dashboardData.byCategory.security.total) *
                100
            )
          : 0,
    },
    {
      name: 'Operations',
      total: dashboardData.byCategory.operations.total,
      addressed: dashboardData.byCategory.operations.addressed,
      partial: dashboardData.byCategory.operations.partial,
      gap: dashboardData.byCategory.operations.gap,
      percent:
        dashboardData.byCategory.operations.total > 0
          ? Math.round(
              (dashboardData.byCategory.operations.addressed /
                dashboardData.byCategory.operations.total) *
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
