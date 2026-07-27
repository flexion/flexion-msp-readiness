/**
 * Dashboard Data Aggregator
 */

import { ProjectAssessment, DashboardData, RequirementCategory } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export function aggregateDashboardData(
  assessment: ProjectAssessment,
  evidencePath: string
): DashboardData {
  // By category statistics
  const byCategory: DashboardData['byCategory'] = {
    security: { total: 0, addressed: 0, partial: 0, gap: 0 },
    operations: { total: 0, addressed: 0, partial: 0, gap: 0 },
    support: { total: 0, addressed: 0, partial: 0, gap: 0 },
  };

  for (const reqAssessment of assessment.requirementAssessments) {
    const category = reqAssessment.requirement.category as RequirementCategory;
    const stats = byCategory[category];

    stats.total++;
    if (reqAssessment.status === 'addressed') stats.addressed++;
    else if (reqAssessment.status === 'partial') stats.partial++;
    else if (reqAssessment.status === 'gap' || reqAssessment.status === 'not-started') stats.gap++;
  }

  // Critical path (top 10 gaps by effort)
  const criticalPath = assessment.criticalGaps.slice(0, 10).map(gap => ({
    requirement: gap.requirement,
    effort: gap.estimatedEffort || 0,
    blockers: gap.gaps,
  }));

  // Evidence inventory
  const evidenceInventory = {
    total: 0,
    byType: {} as Record<string, number>,
    recentlyCollected: [] as any[],
  };

  if (fs.existsSync(evidencePath)) {
    const files = fs.readdirSync(evidencePath).filter(f => f.endsWith('.json'));
    evidenceInventory.total = files.length;

    for (const file of files) {
      evidenceInventory.byType['aws-snapshot'] =
        (evidenceInventory.byType['aws-snapshot'] || 0) + 1;
    }
  }

  // Generated artifacts count
  const generatedArtifacts = {
    playbooks: 0,
    runbooks: 0,
    evidenceFiles: evidenceInventory.total,
  };

  // Timeline (simple 6-week projection)
  const timeline: DashboardData['timeline'] = [];
  let remainingEffort = assessment.totalEstimatedEffort;
  const hoursPerWeek = 20; // Assume 20 hours/week capacity

  for (let week = 1; week <= 6 && remainingEffort > 0; week++) {
    const weekEffort = Math.min(remainingEffort, hoursPerWeek);
    const tasks = assessment.criticalGaps
      .filter(g => (g.estimatedEffort || 0) > 0)
      .slice(0, 3)
      .map(g => g.requirement.id);

    timeline.push({
      week,
      tasks,
      effort: weekEffort,
    });

    remainingEffort -= weekEffort;
  }

  return {
    assessment,
    byCategory,
    criticalPath,
    evidenceInventory,
    generatedArtifacts,
    timeline,
  };
}
