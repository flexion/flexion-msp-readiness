/**
 * MSP Prerequisites Assessor
 *
 * Assesses completion status of MSP Prerequisites (requirements that must be met
 * BEFORE the technical validation/ISSI audit).
 *
 * Prerequisites cover:
 * - Business: Web presence, case studies, sales/marketing accreditations
 * - People: Personnel skills and training
 * - Governance: Supplier management, operations improvement, sustainability
 * - Platform: Expert design review processes
 * - Security: Access key detection, public resource prevention
 * - Operations: Incident/problem management, deployment, continuity
 */

import * as fs from 'fs';
import * as path from 'path';
import { MSP_PREREQUISITES, MSPPrerequisite } from '../data/msp-prerequisites';
import { Config } from '../types';

export interface PrerequisiteStatus {
  prerequisite: MSPPrerequisite;
  status: 'met' | 'partial' | 'not-met' | 'not-applicable';
  confidence: number;
  findings: string[];
  evidence: string[];
  estimatedEffort: number;
}

export interface PrerequisiteAssessment {
  prerequisites: PrerequisiteStatus[];
  summary: {
    total: number;
    met: number;
    partial: number;
    notMet: number;
    notApplicable: number;
    completionPercentage: number;
    totalEffortHours: number;
  };
  byCategory: {
    [category: string]: {
      total: number;
      met: number;
      partial: number;
      notMet: number;
      completionPercentage: number;
    };
  };
}

export class PrerequisiteAssessor {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async assess(): Promise<PrerequisiteAssessment> {
    console.log('\n📋 Assessing MSP Prerequisites...\n');

    const statuses: PrerequisiteStatus[] = [];

    for (const prereq of MSP_PREREQUISITES) {
      const status = await this.assessPrerequisite(prereq);
      statuses.push(status);

      const icon = this.getStatusIcon(status.status);
      console.log(`${icon} ${prereq.id}: ${prereq.name} - ${status.status} (${status.confidence}%)`);
      if (status.findings.length > 0) {
        status.findings.forEach(f => console.log(`    ${f}`));
      }
    }

    const summary = this.calculateSummary(statuses);
    const byCategory = this.calculateByCategory(statuses);

    return {
      prerequisites: statuses,
      summary,
      byCategory,
    };
  }

  private async assessPrerequisite(prereq: MSPPrerequisite): Promise<PrerequisiteStatus> {
    const findings: string[] = [];
    const evidence: string[] = [];
    let status: 'met' | 'partial' | 'not-met' | 'not-applicable' = 'not-met';
    let confidence = 0;

    // Check for documentation in docs/msp/prerequisites/{prereq-id}.md
    const docPath = path.join(
      this.config.project.docs_path || './docs/msp',
      'prerequisites',
      `${prereq.id.toLowerCase()}.md`
    );

    if (fs.existsSync(docPath)) {
      findings.push('✅ Documentation exists');
      evidence.push(docPath);

      // Check frontmatter status
      const content = fs.readFileSync(docPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const statusMatch = frontmatter.match(/status:\s*(\w+)/);
        const docStatus = statusMatch ? statusMatch[1] : '';

        if (docStatus === 'met' || docStatus === 'completed' || docStatus === 'approved') {
          status = 'met';
          confidence = 90;
          findings.push('✅ Marked as met/completed in documentation');
        } else if (docStatus === 'partial' || docStatus === 'in-progress') {
          status = 'partial';
          confidence = 50;
          findings.push('⚠️  Marked as partial/in-progress');
        }
      } else {
        // Has documentation but no clear status
        status = 'partial';
        confidence = 40;
        findings.push('⚠️  Documentation exists but no status indicator');
      }
    } else {
      findings.push('❌ No documentation found');
    }

    // Category-specific checks
    switch (prereq.category) {
      case 'business':
        if (prereq.id === 'BUSP-001') {
          // Web Presence - check if README or docs mention public website
          const readme = this.checkFileForKeywords(
            path.join(process.cwd(), 'README.md'),
            ['website', 'landing page', 'msp practice', 'case studies']
          );
          if (readme > 0) {
            findings.push(`ℹ️  README mentions relevant content (${readme} keywords)`);
            confidence = Math.max(confidence, 30);
          }
        }
        break;

      case 'security':
        if (prereq.id === 'SECP-001' || prereq.id === 'SECP-002') {
          // Check for security playbooks
          const secPlaybooks = this.findPlaybooks('security');
          if (secPlaybooks.length > 0) {
            findings.push(`✅ Found ${secPlaybooks.length} security playbook(s)`);
            evidence.push(...secPlaybooks);
            if (status === 'not-met') {
              status = 'partial';
              confidence = Math.max(confidence, 40);
            }
          }
        }
        break;

      case 'operations':
        // Check for operations playbooks
        const opsPlaybooks = this.findPlaybooks('operations');
        if (opsPlaybooks.length > 0) {
          findings.push(`✅ Found ${opsPlaybooks.length} operations playbook(s)`);
          evidence.push(...opsPlaybooks);
          if (status === 'not-met') {
            status = 'partial';
            confidence = Math.max(confidence, 40);
          }
        }
        break;
    }

    // Estimate effort if not met
    const estimatedEffort = status === 'met' ? 0 : status === 'partial' ? prereq.estimatedHours / 2 : prereq.estimatedHours;

    return {
      prerequisite: prereq,
      status,
      confidence,
      findings,
      evidence,
      estimatedEffort,
    };
  }

  private checkFileForKeywords(filePath: string, keywords: string[]): number {
    if (!fs.existsSync(filePath)) return 0;

    const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();
    return keywords.filter(kw => content.includes(kw.toLowerCase())).length;
  }

  private findPlaybooks(category: string): string[] {
    const playbooks: string[] = [];
    const playbooksDir = path.join(this.config.project.docs_path || './docs/msp', category);

    if (fs.existsSync(playbooksDir)) {
      const files = fs.readdirSync(playbooksDir);
      files.forEach(file => {
        if (file.endsWith('.md')) {
          playbooks.push(path.join(playbooksDir, file));
        }
      });
    }

    return playbooks;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'met':
        return '✅';
      case 'partial':
        return '⚠️ ';
      case 'not-met':
        return '❌';
      case 'not-applicable':
        return '⬜';
      default:
        return '❓';
    }
  }

  private calculateSummary(statuses: PrerequisiteStatus[]) {
    const met = statuses.filter(s => s.status === 'met').length;
    const partial = statuses.filter(s => s.status === 'partial').length;
    const notMet = statuses.filter(s => s.status === 'not-met').length;
    const notApplicable = statuses.filter(s => s.status === 'not-applicable').length;
    const total = statuses.length;

    const completionPercentage = Math.round(((met + partial * 0.5) / (total - notApplicable)) * 100);
    const totalEffortHours = statuses.reduce((sum, s) => sum + s.estimatedEffort, 0);

    return {
      total,
      met,
      partial,
      notMet,
      notApplicable,
      completionPercentage: isNaN(completionPercentage) ? 0 : completionPercentage,
      totalEffortHours,
    };
  }

  private calculateByCategory(statuses: PrerequisiteStatus[]) {
    const categories: { [key: string]: PrerequisiteStatus[] } = {};

    statuses.forEach(status => {
      const cat = status.prerequisite.category;
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(status);
    });

    const byCategory: PrerequisiteAssessment['byCategory'] = {};

    Object.keys(categories).forEach(cat => {
      const catStatuses = categories[cat];
      const met = catStatuses.filter(s => s.status === 'met').length;
      const partial = catStatuses.filter(s => s.status === 'partial').length;
      const notMet = catStatuses.filter(s => s.status === 'not-met').length;
      const total = catStatuses.length;
      const completionPercentage = Math.round(((met + partial * 0.5) / total) * 100);

      byCategory[cat] = {
        total,
        met,
        partial,
        notMet,
        completionPercentage,
      };
    });

    return byCategory;
  }
}

/**
 * Format prerequisite assessment as markdown report
 */
export function formatPrerequisiteReport(assessment: PrerequisiteAssessment): string {
  let report = '# MSP Prerequisites Assessment\n\n';
  report += `**Assessment Date**: ${new Date().toISOString().split('T')[0]}\n\n`;

  // Summary
  report += '## Summary\n\n';
  report += '| Metric | Value |\n';
  report += '|--------|-------|\n';
  report += `| **Total Prerequisites** | ${assessment.summary.total} |\n`;
  report += `| **Met** | ${assessment.summary.met} ✅ |\n`;
  report += `| **Partial** | ${assessment.summary.partial} ⚠️  |\n`;
  report += `| **Not Met** | ${assessment.summary.notMet} ❌ |\n`;
  report += `| **Completion** | ${assessment.summary.completionPercentage}% |\n`;
  report += `| **Estimated Effort** | ${assessment.summary.totalEffortHours}h |\n\n`;

  // By Category
  report += '## By Category\n\n';
  report += '| Category | Total | Met | Partial | Not Met | Completion |\n';
  report += '|----------|-------|-----|---------|---------|------------|\n';

  Object.keys(assessment.byCategory).forEach(cat => {
    const stats = assessment.byCategory[cat];
    report += `| ${cat} | ${stats.total} | ${stats.met} | ${stats.partial} | ${stats.notMet} | ${stats.completionPercentage}% |\n`;
  });

  report += '\n## Detailed Results\n\n';

  // Group by category
  const categories: { [key: string]: PrerequisiteStatus[] } = {};
  assessment.prerequisites.forEach(status => {
    const cat = status.prerequisite.category;
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(status);
  });

  Object.keys(categories).sort().forEach(cat => {
    report += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n\n`;

    categories[cat].forEach(status => {
      const icon = status.status === 'met' ? '✅' : status.status === 'partial' ? '⚠️ ' : '❌';
      report += `#### ${icon} ${status.prerequisite.id}: ${status.prerequisite.name}\n\n`;
      report += `**Status**: ${status.status} (${status.confidence}% confidence)\n\n`;
      report += `**Description**: ${status.prerequisite.description}\n\n`;

      if (status.findings.length > 0) {
        report += '**Findings**:\n';
        status.findings.forEach(f => {
          report += `- ${f}\n`;
        });
        report += '\n';
      }

      if (status.evidence.length > 0) {
        report += '**Evidence**:\n';
        status.evidence.forEach(e => {
          report += `- \`${e}\`\n`;
        });
        report += '\n';
      }

      if (status.estimatedEffort > 0) {
        report += `**Estimated Effort**: ${status.estimatedEffort}h\n\n`;
      }

      report += '---\n\n';
    });
  });

  return report;
}
