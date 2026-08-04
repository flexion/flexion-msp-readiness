/**
 * Playbook Generator - Generates playbooks and runbooks from templates
 */

import * as fs from 'fs';
import * as path from 'path';
import { renderTemplate, TemplateContext, saveRenderedTemplate } from './template-engine';
import { GeneratedPlaybook } from '../types';
import { Config } from '../types';
import {
  addFrontmatter,
  isUserModified,
  DocumentMetadata,
} from '../utils/frontmatter';

export interface PlaybookSpec {
  name: string;
  type: 'playbook' | 'runbook';
  template: string;
  requirementIds: string[];
  cisControls: string[];
}

// Available playbooks and runbooks
export const AVAILABLE_PLAYBOOKS: PlaybookSpec[] = [
  {
    name: 'Incident Response',
    type: 'playbook',
    template: 'incident-response.hbs',
    requirementIds: ['OPSP-001', 'SEC-010'],
    cisControls: ['17'],
  },
  {
    name: 'Change Management',
    type: 'playbook',
    template: 'change-management.hbs',
    requirementIds: ['OPS-006', 'OPSP-003'],
    cisControls: ['2', '4'],
  },
  {
    name: 'Monitoring and Alerting',
    type: 'playbook',
    template: 'monitoring-alerting.hbs',
    requirementIds: ['OPS-003'],
    cisControls: ['8', '13'],
  },
  {
    name: 'Backup and Recovery',
    type: 'playbook',
    template: 'backup-recovery.hbs',
    requirementIds: ['OPS-005'],
    cisControls: ['11'],
  },
  {
    name: 'Patch Management',
    type: 'playbook',
    template: 'patch-management.hbs',
    requirementIds: ['OPS-008'],
    cisControls: ['7'],
  },
  {
    name: 'Vulnerability Remediation',
    type: 'playbook',
    template: 'vulnerability-remediation.hbs',
    requirementIds: ['SEC-008'],
    cisControls: ['7'],
  },
  {
    name: 'Data Protection',
    type: 'playbook',
    template: 'data-protection.hbs',
    requirementIds: ['SEC-009'],
    cisControls: ['3'],
  },
  {
    name: 'Security Policies and Procedures',
    type: 'playbook',
    template: 'security-policies.hbs',
    requirementIds: ['SEC-001'],
    cisControls: ['1', '2', '3', '4', '5', '6', '7', '8', '11', '12', '13', '17'],
  },
  {
    name: 'AWS Account Configuration',
    type: 'playbook',
    template: 'aws-account-config.hbs',
    requirementIds: ['SEC-003'],
    cisControls: ['4', '5', '6', '8', '12', '13'],
  },
  {
    name: 'IAM Management',
    type: 'playbook',
    template: 'iam-management.hbs',
    requirementIds: ['SEC-004'],
    cisControls: ['5', '6'],
  },
  {
    name: 'Problem Management',
    type: 'playbook',
    template: 'problem-management.hbs',
    requirementIds: ['OPSP-002'],
    cisControls: ['17'],
  },
  {
    name: 'Deployment Risk Management',
    type: 'playbook',
    template: 'deployment-risk.hbs',
    requirementIds: ['OPSP-003'],
    cisControls: ['2', '4', '16'],
  },
  {
    name: 'Service Continuity',
    type: 'playbook',
    template: 'service-continuity.hbs',
    requirementIds: ['OPSP-005'],
    cisControls: ['11'],
  },
  {
    name: 'Logging',
    type: 'playbook',
    template: 'logging.hbs',
    requirementIds: ['OPS-004'],
    cisControls: ['8'],
  },
  {
    name: 'Availability Management',
    type: 'playbook',
    template: 'availability-management.hbs',
    requirementIds: ['OPS-011'],
    cisControls: ['11', '12'],
  },
  {
    name: 'Vulnerability Scanning',
    type: 'playbook',
    template: 'vulnerability-scanning.hbs',
    requirementIds: ['SEC-007'],
    cisControls: ['7'],
  },
];

export const AVAILABLE_RUNBOOKS: PlaybookSpec[] = [
  {
    name: 'Access Key Rotation',
    type: 'runbook',
    template: 'access-key-rotation.hbs',
    requirementIds: ['SECP-001', 'SEC-004'],
    cisControls: ['6'],
  },
  {
    name: 'Access Key Exposure Detection',
    type: 'runbook',
    template: 'access-key-exposure.hbs',
    requirementIds: ['SECP-001'],
    cisControls: ['6'],
  },
  {
    name: 'Public Resources Detection',
    type: 'runbook',
    template: 'public-resources.hbs',
    requirementIds: ['SECP-002'],
    cisControls: ['4'],
  },
];

export interface GenerateOptions {
  force?: boolean;
  dryRun?: boolean;
}

/**
 * Generate playbooks/runbooks
 */
export async function generatePlaybooks(
  config: Config,
  specs: PlaybookSpec[],
  outputDir: string,
  options: GenerateOptions = {}
): Promise<GeneratedPlaybook[]> {
  const generated: GeneratedPlaybook[] = [];
  const skipped: string[] = [];

  // Build template context
  const context: TemplateContext = {
    projectName: config.project.name,
    organization: config.msp.organization.name,
    region: config.aws.region,
    stage: config.aws.stage,
    contact: config.msp.organization.contact,
    slackChannel: config.templates?.variables?.slackChannel || '#support',
  };

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const spec of specs) {
    try {
      // Determine template path
      const templateDir =
        config.templates?.custom_templates_path || path.join(__dirname, '../../templates');

      const templateSubdir = spec.type === 'playbook' ? 'playbooks' : 'runbooks';
      const templatePath = path.join(templateDir, templateSubdir, spec.template);

      // Check if template exists
      if (!fs.existsSync(templatePath)) {
        console.warn(`Template not found: ${templatePath}`);
        continue;
      }

      // Render template
      const content = renderTemplate(templatePath, context);

      // Save to output
      const fileName = spec.template.replace('.hbs', '.md');
      const outputPath = path.join(outputDir, fileName);

      // Check if file exists and is user-modified (unless --force)
      if (!options.force && fs.existsSync(outputPath) && isUserModified(outputPath)) {
        console.log(`⚠ Skipped ${spec.type}: ${spec.name} (user modified, use --force to overwrite)`);
        skipped.push(spec.name);
        continue;
      }

      // Dry run - just report what would happen
      if (options.dryRun) {
        console.log(`✓ Would generate ${spec.type}: ${spec.name} → ${fileName}`);
        continue;
      }

      // Add frontmatter metadata
      const metadata: DocumentMetadata = {
        generated: new Date().toISOString(),
        template_version: '1.0',
        status: 'draft',
        requirement_id: spec.requirementIds[0],
      };
      const contentWithFrontmatter = addFrontmatter(content, metadata);

      saveRenderedTemplate(contentWithFrontmatter, outputPath);

      generated.push({
        title: spec.name,
        type: spec.type,
        path: outputPath,
        requirementIds: spec.requirementIds,
        cisControls: spec.cisControls,
        template: spec.template,
        variables: context,
        generatedAt: new Date(),
      });

      console.log(`✓ Generated ${spec.type}: ${spec.name} → ${fileName}`);
    } catch (error) {
      console.error(`Failed to generate ${spec.name}: ${error}`);
    }
  }

  // Print summary
  if (options.dryRun) {
    console.log(
      `\n📋 Dry run complete: Would generate ${generated.length} files, skip ${skipped.length} files`
    );
  } else if (skipped.length > 0) {
    console.log(
      `\n⚠️  Skipped ${skipped.length} user-modified file(s). Use --force to overwrite.`
    );
  }

  return generated;
}

/**
 * Identify missing playbooks based on requirements
 */
export function identifyMissingPlaybooks(
  existingDocs: string[],
  includePlaybooks: boolean = true,
  includeRunbooks: boolean = true
): PlaybookSpec[] {
  const missing: PlaybookSpec[] = [];
  const existingLower = existingDocs.map(d => d.toLowerCase());

  // Check playbooks
  if (includePlaybooks) {
    for (const spec of AVAILABLE_PLAYBOOKS) {
      const expectedFileName = spec.template.replace('.hbs', '');
      const exists = existingLower.some(
        doc => doc.includes(expectedFileName) || doc.includes(spec.name.toLowerCase())
      );

      if (!exists) {
        missing.push(spec);
      }
    }
  }

  // Check runbooks
  if (includeRunbooks) {
    for (const spec of AVAILABLE_RUNBOOKS) {
      const expectedFileName = spec.template.replace('.hbs', '');
      const exists = existingLower.some(
        doc => doc.includes(expectedFileName) || doc.includes(spec.name.toLowerCase())
      );

      if (!exists) {
        missing.push(spec);
      }
    }
  }

  return missing;
}

/**
 * Print generation summary
 */
export function printGenerationSummary(generated: GeneratedPlaybook[]): void {
  console.log('\nGeneration Summary:');
  console.log(`  Total generated: ${generated.length}`);

  const playbooks = generated.filter(g => g.type === 'playbook').length;
  const runbooks = generated.filter(g => g.type === 'runbook').length;

  console.log(`  Playbooks: ${playbooks}`);
  console.log(`  Runbooks: ${runbooks}`);
  console.log('');
}
