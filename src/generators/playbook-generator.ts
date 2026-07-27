/**
 * Playbook Generator - Generates playbooks and runbooks from templates
 */

import * as fs from 'fs';
import * as path from 'path';
import { renderTemplate, TemplateContext, saveRenderedTemplate } from './template-engine';
import { GeneratedPlaybook } from '../types';
import { Config } from '../types';

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
];

export const AVAILABLE_RUNBOOKS: PlaybookSpec[] = [
  {
    name: 'Access Key Rotation',
    type: 'runbook',
    template: 'access-key-rotation.hbs',
    requirementIds: ['SECP-001', 'SEC-004'],
    cisControls: ['6'],
  },
];

/**
 * Generate playbooks/runbooks
 */
export async function generatePlaybooks(
  config: Config,
  specs: PlaybookSpec[],
  outputDir: string
): Promise<GeneratedPlaybook[]> {
  const generated: GeneratedPlaybook[] = [];

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
        config.templates?.custom_templates_path ||
        path.join(__dirname, '../../templates');

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
      saveRenderedTemplate(content, outputPath);

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
  const existingLower = existingDocs.map((d) => d.toLowerCase());

  // Check playbooks
  if (includePlaybooks) {
    for (const spec of AVAILABLE_PLAYBOOKS) {
      const expectedFileName = spec.template.replace('.hbs', '');
      const exists = existingLower.some((doc) =>
        doc.includes(expectedFileName) || doc.includes(spec.name.toLowerCase())
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
      const exists = existingLower.some((doc) =>
        doc.includes(expectedFileName) || doc.includes(spec.name.toLowerCase())
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

  const playbooks = generated.filter((g) => g.type === 'playbook').length;
  const runbooks = generated.filter((g) => g.type === 'runbook').length;

  console.log(`  Playbooks: ${playbooks}`);
  console.log(`  Runbooks: ${runbooks}`);
  console.log('');
}
