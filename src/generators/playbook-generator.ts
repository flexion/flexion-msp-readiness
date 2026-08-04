/**
 * Playbook Generator - Generates playbooks and runbooks from templates
 */

import * as fs from 'fs';
import * as path from 'path';
import { renderTemplate, TemplateContext, saveRenderedTemplate } from './template-engine';
import { GeneratedPlaybook, PlaybookMode, AutomationType, MSPRequirement } from '../types';
import { Config } from '../types';
import { addFrontmatter, isUserModified, DocumentMetadata } from '../utils/frontmatter';
import { getRequirement } from '../data/msp-requirements';

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
 * Determine the playbook type based on requirement characteristics
 */
export function determinePlaybookMode(requirement: MSPRequirement): PlaybookMode {
  const hasAWSServices = requirement.awsServices && requirement.awsServices.length > 0;
  const hasProcessDocs = requirement.evidenceRequired.some(
    e =>
      e.includes('documentation') ||
      e.includes('policy') ||
      e.includes('procedure') ||
      e.includes('checklist') ||
      e.includes('process') ||
      e.includes('charter') ||
      e.includes('plan') ||
      e.includes('overview')
  );

  if (hasAWSServices && hasProcessDocs) return 'mixed';
  if (hasAWSServices) return 'technical';
  return 'process';
}

/**
 * Calculate automation percentage for a requirement
 *
 * This estimates what percentage of the requirement can be automated based on:
 * - If no AWS services: 0% automation
 * - If AWS services exist: percentage based on automated vs manual evidence
 */
export function calculateAutomationPercentage(requirement: MSPRequirement): number {
  const hasAWSServices = requirement.awsServices && requirement.awsServices.length > 0;
  if (!hasAWSServices) return 0;

  const totalEvidence = requirement.evidenceRequired.length;
  if (totalEvidence === 0) return 0;

  // Count evidence that can be automated (those that are AWS-related)
  const automatedEvidence = requirement.evidenceRequired.filter(
    e =>
      !e.includes('documentation') &&
      !e.includes('policy') &&
      !e.includes('procedure') &&
      !e.includes('checklist') &&
      !e.includes('process') &&
      !e.includes('charter') &&
      !e.includes('plan') &&
      !e.includes('overview') &&
      !e.includes('presentation') &&
      !e.includes('contract') &&
      !e.includes('agreement') &&
      !e.includes('certification') &&
      !e.includes('sow') &&
      !e.includes('example')
  ).length;

  return Math.round((automatedEvidence / totalEvidence) * 100);
}

/**
 * Determine automation type
 */
export function determineAutomationType(percentage: number): AutomationType {
  if (percentage >= 80) return 'full';
  if (percentage > 0) return 'partial';
  return 'manual';
}

/**
 * Get template path reference for a requirement
 */
export function getTemplateReference(requirementId: string): string | undefined {
  // This would integrate with template loader from issue #49
  // For now, return undefined
  return undefined;
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
        console.log(
          `⚠ Skipped ${spec.type}: ${spec.name} (user modified, use --force to overwrite)`
        );
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
    console.log(`\n⚠️  Skipped ${skipped.length} user-modified file(s). Use --force to overwrite.`);
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
 * Generate a playbook for a specific requirement
 */
export async function generatePlaybookForRequirement(
  config: Config,
  requirementId: string,
  outputDir: string,
  options: GenerateOptions = {}
): Promise<GeneratedPlaybook | null> {
  const requirement = getRequirement(requirementId);
  if (!requirement) {
    console.error(`Requirement ${requirementId} not found`);
    return null;
  }

  // Determine playbook characteristics
  const mode = determinePlaybookMode(requirement);
  const automationPercentage = calculateAutomationPercentage(requirement);
  const automationType = determineAutomationType(automationPercentage);
  const templateReference = getTemplateReference(requirementId);

  // Select appropriate template
  let templateName: string;
  if (mode === 'process') {
    templateName = 'process-playbook.hbs';
  } else if (mode === 'mixed') {
    templateName = 'mixed-playbook.hbs';
  } else {
    // For technical playbooks, check if we have a specific template
    const existingSpec = AVAILABLE_PLAYBOOKS.find(spec =>
      spec.requirementIds.includes(requirementId)
    );
    if (existingSpec) {
      templateName = existingSpec.template;
    } else {
      // Use a generic technical template (could be created later)
      console.warn(`No specific template for ${requirementId}, using process template`);
      templateName = 'process-playbook.hbs';
    }
  }

  // Build template context
  const context: TemplateContext & Record<string, unknown> = {
    projectName: config.project.name,
    organization: config.msp.organization.name,
    region: config.aws.region,
    stage: config.aws.stage,
    contact: config.msp.organization.contact,
    slackChannel: config.templates?.variables?.slackChannel || '#support',
    date: new Date().toISOString().split('T')[0],

    // Requirement-specific data
    requirementId: requirement.id,
    title: requirement.name,
    description: requirement.description,
    category: requirement.category,
    priority: requirement.priority,
    cisControls: requirement.cisControls || [],
    awsServices: requirement.awsServices || [],
    evidenceRequired: requirement.evidenceRequired,
    estimatedHours: requirement.estimatedHours || 0,

    // Playbook metadata
    mode,
    automationType,
    automationPercentage,
    templatePath: templateReference,

    // Additional context for templates
    informationNeeded: [
      { name: 'Project Details', description: 'Specific project information and context' },
      { name: 'Current State', description: 'Existing processes and documentation' },
      { name: 'Stakeholders', description: 'Key contacts and responsible parties' },
    ],
    documentSections: [
      { name: 'Overview', description: 'Purpose and scope of the documentation' },
      { name: 'Procedures', description: 'Step-by-step processes and workflows' },
      { name: 'Policies', description: 'Rules, standards, and guidelines' },
      { name: 'Responsibilities', description: 'Roles and ownership' },
    ],
    keyPoints: [
      'Be specific to your project and organization',
      'Include measurable criteria where applicable',
      'Reference related documentation and systems',
      'Define clear ownership and accountability',
    ],
    bestPractices: [
      'Keep documentation concise and actionable',
      'Use templates and examples where available',
      'Review and update regularly',
      'Ensure accessibility to all relevant stakeholders',
    ],
    freshnessMonths: 6,
    maintenanceFrequency: 'Quarterly',
    maintenanceOwner: 'Operations Team',
    updateTriggers: [
      'Significant infrastructure changes',
      'New team members or role changes',
      'Audit findings or compliance requirements',
      'Process improvements identified',
    ],
  };

  // Determine template path
  const templateDir =
    config.templates?.custom_templates_path || path.join(__dirname, '../../templates');
  const templatePath = path.join(templateDir, 'playbooks', templateName);

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    console.warn(`Template not found: ${templatePath}`);
    return null;
  }

  // Render template
  const content = renderTemplate(templatePath, context);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate filename from requirement name
  const fileName = `${requirement.id.toLowerCase()}-${requirement.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}.md`;
  const outputPath = path.join(outputDir, fileName);

  // Check if file exists and is user-modified
  if (!options.force && fs.existsSync(outputPath) && isUserModified(outputPath)) {
    console.log(
      `⚠ Skipped playbook: ${requirement.name} (user modified, use --force to overwrite)`
    );
    return null;
  }

  // Dry run
  if (options.dryRun) {
    console.log(`✓ Would generate playbook: ${requirement.name} → ${fileName}`);
    return null;
  }

  // Add frontmatter metadata
  const metadata: DocumentMetadata = {
    generated: new Date().toISOString(),
    template_version: '1.0',
    status: 'draft',
    requirement_id: requirement.id,
    playbook_mode: mode,
    automation_type: automationType,
    automation_percentage: automationPercentage,
  };
  const contentWithFrontmatter = addFrontmatter(content, metadata);

  saveRenderedTemplate(contentWithFrontmatter, outputPath);

  const generatedPlaybook: GeneratedPlaybook = {
    title: requirement.name,
    type: 'playbook',
    path: outputPath,
    requirementIds: [requirement.id],
    cisControls: requirement.cisControls || [],
    template: templateName,
    variables: context,
    generatedAt: new Date(),
    mode,
    automationType,
    automationPercentage,
  };

  console.log(`✓ Generated playbook: ${requirement.name} → ${fileName}`);
  return generatedPlaybook;
}

/**
 * Generate playbooks for all requirements
 */
export async function generateAllRequirementPlaybooks(
  config: Config,
  outputDir: string,
  options: GenerateOptions = {}
): Promise<GeneratedPlaybook[]> {
  const { MSP_REQUIREMENTS } = await import('../data/msp-requirements');
  const generated: GeneratedPlaybook[] = [];

  for (const requirement of MSP_REQUIREMENTS) {
    const playbook = await generatePlaybookForRequirement(
      config,
      requirement.id,
      outputDir,
      options
    );
    if (playbook) {
      generated.push(playbook);
    }
  }

  return generated;
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

  // Summary by mode
  const technical = generated.filter(g => g.mode === 'technical').length;
  const process = generated.filter(g => g.mode === 'process').length;
  const mixed = generated.filter(g => g.mode === 'mixed').length;

  if (technical || process || mixed) {
    console.log('\n  By Mode:');
    if (technical) console.log(`    Technical: ${technical}`);
    if (process) console.log(`    Process: ${process}`);
    if (mixed) console.log(`    Mixed: ${mixed}`);
  }

  console.log('');
}
