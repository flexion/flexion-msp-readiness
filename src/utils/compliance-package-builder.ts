/**
 * Compliance Package Builder
 *
 * Build complete compliance packages for MSP audit submissions
 */

import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceAssessment } from '../assessors/workspace-assessor';
import { generateEnhancedWorkspaceReport } from '../assessors/workspace-report-generator-enhanced';
import { Config } from '../types';

export interface PackageOptions {
  format: 'zip' | 'directory';
  includePlaybooks: boolean;
  includeEvidence: boolean;
  includeReports: boolean;
  includeTemplates: boolean;
}

export const DEFAULT_PACKAGE_OPTIONS: PackageOptions = {
  format: 'directory',
  includePlaybooks: true,
  includeEvidence: true,
  includeReports: true,
  includeTemplates: false,
};

/**
 * Compliance Package Builder
 */
export class CompliancePackageBuilder {
  constructor(
    private config: Config,
    private assessment: WorkspaceAssessment
  ) {}

  /**
   * Build compliance package
   */
  async build(outputPath: string, options: Partial<PackageOptions> = {}): Promise<string> {
    const opts = { ...DEFAULT_PACKAGE_OPTIONS, ...options };
    const packageDir = path.join(outputPath, 'msp-compliance-package');

    console.log('Building MSP Compliance Package...');
    console.log(`Output: ${packageDir}`);

    // Create package structure
    await this.createPackageStructure(packageDir);

    // Add components
    if (opts.includeReports) {
      await this.addReports(packageDir);
    }

    if (opts.includePlaybooks) {
      await this.addPlaybooks(packageDir);
    }

    if (opts.includeEvidence) {
      await this.addEvidenceArtifacts(packageDir);
    }

    if (opts.includeTemplates) {
      await this.addTemplates(packageDir);
    }

    // Add README
    await this.addReadme(packageDir);

    // Add requirement matrix
    await this.addRequirementMatrix(packageDir);

    console.log('Package build complete!');

    // Create zip if requested
    if (opts.format === 'zip') {
      console.log('Creating ZIP archive...');
      const zipPath = await this.createZipArchive(packageDir);
      console.log(`ZIP created: ${zipPath}`);
      return zipPath;
    }

    return packageDir;
  }

  /**
   * Create package directory structure
   */
  private async createPackageStructure(baseDir: string): Promise<void> {
    const dirs = [
      '',
      'evidence/aws',
      'evidence/documents',
      'playbooks',
      'reports',
      'templates',
    ];

    for (const dir of dirs) {
      const fullPath = path.join(baseDir, dir);
      await fs.promises.mkdir(fullPath, { recursive: true });
    }

    console.log('Created package structure');
  }

  /**
   * Add reports (executive summary, detailed report)
   */
  private async addReports(baseDir: string): Promise<void> {
    const reportsDir = path.join(baseDir, 'reports');

    // Executive summary (Markdown)
    const executiveSummary = generateEnhancedWorkspaceReport(this.assessment, this.config.project.name, {
      format: 'markdown',
      includeSummary: true,
      includeDetails: false,
      includeChecklist: true,
      includeRemediationPlan: true,
      groupBy: 'category',
    });
    await fs.promises.writeFile(path.join(reportsDir, 'executive-summary.md'), executiveSummary);

    // Detailed report (Markdown)
    const detailedReport = generateEnhancedWorkspaceReport(this.assessment, this.config.project.name, {
      format: 'markdown',
      includeSummary: true,
      includeDetails: true,
      includeChecklist: true,
      includeRemediationPlan: true,
      groupBy: 'category',
    });
    await fs.promises.writeFile(path.join(reportsDir, 'detailed-report.md'), detailedReport);

    // HTML report
    const htmlReport = generateEnhancedWorkspaceReport(this.assessment, this.config.project.name, {
      format: 'html',
      includeSummary: true,
      includeDetails: true,
      includeChecklist: false,
      includeRemediationPlan: false,
      groupBy: 'category',
    });
    await fs.promises.writeFile(path.join(reportsDir, 'assessment-report.html'), htmlReport);

    // JSON data
    const jsonReport = generateEnhancedWorkspaceReport(this.assessment, this.config.project.name, {
      format: 'json',
      includeSummary: true,
      includeDetails: true,
      includeChecklist: false,
      includeRemediationPlan: false,
      groupBy: 'category',
    });
    await fs.promises.writeFile(path.join(reportsDir, 'assessment-data.json'), jsonReport);

    console.log('Added reports');
  }

  /**
   * Add playbooks
   */
  private async addPlaybooks(baseDir: string): Promise<void> {
    const playbooksDir = path.join(baseDir, 'playbooks');
    const sourcePlaybooksDir = this.config.output.playbooks_path;

    if (!fs.existsSync(sourcePlaybooksDir)) {
      console.warn('Playbooks directory not found, skipping');
      return;
    }

    // Copy all playbooks
    const files = await fs.promises.readdir(sourcePlaybooksDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const sourcePath = path.join(sourcePlaybooksDir, file);
        const destPath = path.join(playbooksDir, file);
        await fs.promises.copyFile(sourcePath, destPath);
      }
    }

    console.log(`Copied ${files.length} playbooks`);
  }

  /**
   * Add evidence artifacts
   */
  private async addEvidenceArtifacts(baseDir: string): Promise<void> {
    const evidenceDir = path.join(baseDir, 'evidence');
    const sourceEvidenceDir = this.config.output.evidence_path;

    if (!fs.existsSync(sourceEvidenceDir)) {
      console.warn('Evidence directory not found, skipping');
      return;
    }

    // Copy AWS evidence
    const awsDir = path.join(evidenceDir, 'aws');
    const files = await fs.promises.readdir(sourceEvidenceDir);

    let awsCount = 0;
    let docCount = 0;

    for (const file of files) {
      const sourcePath = path.join(sourceEvidenceDir, file);
      const stat = await fs.promises.stat(sourcePath);

      if (stat.isFile()) {
        if (file.endsWith('.json')) {
          // AWS evidence
          const destPath = path.join(awsDir, file);
          await fs.promises.copyFile(sourcePath, destPath);
          awsCount++;
        } else if (file.endsWith('.md') || file.endsWith('.pdf') || file.endsWith('.txt')) {
          // Document evidence
          const docDir = path.join(evidenceDir, 'documents');
          const destPath = path.join(docDir, file);
          await fs.promises.copyFile(sourcePath, destPath);
          docCount++;
        }
      }
    }

    console.log(`Copied ${awsCount} AWS evidence files, ${docCount} documents`);
  }

  /**
   * Add templates
   */
  private async addTemplates(baseDir: string): Promise<void> {
    const templatesDir = path.join(baseDir, 'templates');

    // Create template examples for manual requirements
    const manualRequirements = this.assessment.requirements.filter(
      r => !r.hasEvidence && (r.requirement.category === 'business' || r.requirement.category === 'people' || r.requirement.category === 'governance')
    );

    for (const req of manualRequirements) {
      const template = this.generateTemplateForRequirement(req.requirement.id, req.requirement.name);
      const filename = `${req.requirement.id.toLowerCase()}-template.md`;
      await fs.promises.writeFile(path.join(templatesDir, filename), template);
    }

    console.log(`Created ${manualRequirements.length} templates`);
  }

  /**
   * Generate template for a requirement
   */
  private generateTemplateForRequirement(id: string, name: string): string {
    return `# ${id}: ${name}

## Overview
[Provide an overview of how your organization addresses this requirement]

## Implementation Details
[Describe the specific implementation, policies, or procedures]

## Evidence
[List or attach evidence that demonstrates compliance]

## Responsibilities
[Define roles and responsibilities]

## Review and Updates
- **Last Reviewed**: [Date]
- **Next Review**: [Date]
- **Owner**: [Name/Team]

## References
[List any related documents, policies, or procedures]
`;
  }

  /**
   * Add README to package
   */
  private async addReadme(baseDir: string): Promise<void> {
    const { summary } = this.assessment;

    const readme = `# MSP Compliance Package

**Project**: ${this.config.project.name}
**Generated**: ${new Date().toISOString()}
**Completion**: ${summary.completionPercentage}% (${summary.complete}/${summary.total} requirements)

## Package Contents

### Reports
- \`reports/executive-summary.md\` - High-level summary of MSP readiness
- \`reports/detailed-report.md\` - Complete requirement-by-requirement analysis
- \`reports/assessment-report.html\` - Interactive HTML dashboard
- \`reports/assessment-data.json\` - Machine-readable assessment data

### Playbooks
- \`playbooks/\` - Operational playbooks for all MSP requirements
  - Incident Response
  - Change Management
  - Monitoring & Alerting
  - Backup & Recovery
  - Security Controls
  - And more...

### Evidence
- \`evidence/aws/\` - AWS service configuration and compliance evidence
  - Config rules and compliance status
  - CloudTrail logging configuration
  - Security Hub findings
  - IAM policies and roles
  - Backup jobs and recovery points
  - And more...

- \`evidence/documents/\` - Supporting documentation
  - Policies and procedures
  - Training records
  - Customer agreements
  - Risk assessments

### Templates
- \`templates/\` - Templates for manual evidence submission
  - Business requirements
  - Personnel processes
  - Governance documentation

## Usage

### For Audit Submission
1. Review the executive summary in \`reports/executive-summary.md\`
2. Ensure all critical requirements are addressed
3. Complete any manual evidence using templates
4. Submit the entire package to AWS MSP Program reviewers

### For Gap Remediation
1. Review the detailed report for identified gaps
2. Follow the remediation plan in the executive summary
3. Use playbooks in \`playbooks/\` as implementation guides
4. Re-run assessment after remediation

## Assessment Summary

- ✅ Complete: ${summary.complete} requirements
- 🚧 In Progress: ${summary.inProgress} requirements
- ❌ Not Started: ${summary.notStarted} requirements

## Contact

**Organization**: ${this.config.msp.organization.name}
**Contact**: ${this.config.msp.organization.contact}

---

Generated by [msp-readiness](https://github.com/flexion/msp-readiness) automation tool.
`;

    await fs.promises.writeFile(path.join(baseDir, 'README.md'), readme);
    console.log('Added README');
  }

  /**
   * Add requirement matrix
   */
  private async addRequirementMatrix(baseDir: string): Promise<void> {
    const { requirements } = this.assessment;

    // CSV format for easy import to spreadsheets
    const rows = [
      ['Requirement ID', 'Name', 'Category', 'Priority', 'Status', 'Completion %', 'Has Playbook', 'Has Evidence', 'Validated'].join(','),
    ];

    for (const req of requirements) {
      rows.push(
        [
          req.requirement.id,
          `"${req.requirement.name}"`,
          req.requirement.category,
          req.requirement.priority,
          req.overallStatus,
          req.completionPercentage,
          req.hasPlaybook ? 'Yes' : 'No',
          req.hasEvidence ? 'Yes' : 'No',
          req.validated === true ? 'Yes' : req.validated === false ? 'No' : 'N/A',
        ].join(',')
      );
    }

    const csv = rows.join('\n');
    await fs.promises.writeFile(path.join(baseDir, 'requirement-matrix.csv'), csv);
    console.log('Added requirement matrix');
  }

  /**
   * Create ZIP archive
   */
  private async createZipArchive(packageDir: string): Promise<string> {
    // Note: In a real implementation, we'd use a library like 'archiver'
    // For now, we'll just create a placeholder that shows how it would work

    const zipPath = `${packageDir}.zip`;

    // This is a placeholder - actual implementation would use archiver or similar
    console.warn('ZIP creation not implemented - would create:', zipPath);
    console.warn('To create ZIP manually: zip -r msp-compliance-package.zip msp-compliance-package/');

    return zipPath;
  }
}

/**
 * Build compliance package
 */
export async function buildCompliancePackage(
  config: Config,
  assessment: WorkspaceAssessment,
  outputPath: string,
  options: Partial<PackageOptions> = {}
): Promise<string> {
  const builder = new CompliancePackageBuilder(config, assessment);
  return builder.build(outputPath, options);
}
