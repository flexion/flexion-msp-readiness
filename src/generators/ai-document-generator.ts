/**
 * AI Document Generator
 *
 * Generates MSP documentation using AI by:
 * 1. Collecting comprehensive project context
 * 2. Outputting structured context for Claude to see
 * 3. Letting Claude generate high-quality, project-specific documents
 *
 * This is "interactive AI mode" - the tool does automated analysis,
 * then Claude (in conversation) writes the actual documents.
 */

import { MSPRequirement } from '../types.js';
import { ProjectContext } from './document-completer.js';

export interface DocumentGenerationRequest {
  requirement: MSPRequirement;
  context: ProjectContext;
  existingDocumentation?: string[];
  awsFindings?: string[];
}

export interface DocumentGenerationBatch {
  projectSummary: string;
  requests: DocumentGenerationRequest[];
  totalRequirements: number;
  estimatedSavings: string;
}

/**
 * Prepare a batch of requirements for AI generation
 * Returns structured context that Claude can see and use
 */
export function prepareGenerationBatch(
  requirements: MSPRequirement[],
  context: ProjectContext,
  requirementsNeedingDocs: MSPRequirement[]
): DocumentGenerationBatch {
  const requests: DocumentGenerationRequest[] = [];

  for (const req of requirementsNeedingDocs) {
    requests.push({
      requirement: req,
      context,
      existingDocumentation: [],
      awsFindings: [],
    });
  }

  // Calculate time savings
  const hoursPerDoc = 4; // Average time to write one doc manually
  const totalHours = requests.length * hoursPerDoc;
  const estimatedSavings = `${totalHours} hours (${requests.length} documents × ${hoursPerDoc}h each)`;

  // Generate project summary
  const projectSummary = generateProjectSummary(context);

  return {
    projectSummary,
    requests,
    totalRequirements: requirements.length,
    estimatedSavings,
  };
}

/**
 * Generate a comprehensive project summary for AI context
 */
function generateProjectSummary(context: ProjectContext): string {
  const sections: string[] = [];

  // Project basics
  sections.push(`# Project: ${context.projectName}`);
  if (context.description) {
    sections.push(`\n${context.description}`);
  }
  sections.push(`\nVersion: ${context.version}`);
  if (context.repository) {
    sections.push(`Repository: ${context.repository}`);
  }

  // Technology stack
  sections.push(`\n## Technology Stack`);
  sections.push(`\n**Runtime**: ${context.runtime}`);

  if (context.awsServices.length > 0) {
    sections.push(`\n**AWS Services (${context.awsServices.length})**:`);
    context.awsServices.slice(0, 20).forEach(svc => {
      sections.push(`  - ${svc}`);
    });
    if (context.awsServices.length > 20) {
      sections.push(`  ... and ${context.awsServices.length - 20} more`);
    }
  }

  if (context.dependencies.length > 0) {
    sections.push(`\n**Key Dependencies**:`);
    const keyDeps = context.dependencies
      .filter(d =>
        d.includes('aws') || d.includes('react') || d.includes('express') ||
        d.includes('next') || d.includes('typescript') || d.includes('postgres')
      )
      .slice(0, 15);
    keyDeps.forEach(dep => sections.push(`  - ${dep}`));
  }

  // Infrastructure
  if (context.cdkStacks.length > 0) {
    sections.push(`\n## Infrastructure (${context.cdkStacks.length} CDK Stacks)`);

    // Group by resource type
    const resourceCounts = new Map<string, number>();
    context.cdkStacks.forEach(stack => {
      stack.resources.forEach(resource => {
        resourceCounts.set(resource, (resourceCounts.get(resource) || 0) + 1);
      });
    });

    sections.push(`\n**Resource Distribution**:`);
    Array.from(resourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([resource, count]) => {
        sections.push(`  - ${resource}: ${count} stack(s)`);
      });

    sections.push(`\n**Stacks**:`);
    context.cdkStacks.slice(0, 15).forEach(stack => {
      const resources = stack.resources.slice(0, 5).join(', ');
      const more = stack.resources.length > 5 ? `, +${stack.resources.length - 5} more` : '';
      sections.push(`  - ${stack.name}: ${resources}${more}`);
    });
    if (context.cdkStacks.length > 15) {
      sections.push(`  ... and ${context.cdkStacks.length - 15} more stacks`);
    }
  }

  // Team structure
  if (context.teams.length > 0) {
    sections.push(`\n## Team Structure`);
    context.teams.forEach(team => {
      sections.push(`  - ${team.name}`);
    });
  }

  if (context.codeOwners.size > 0) {
    sections.push(`\n**Code Ownership** (${context.codeOwners.size} patterns defined)`);
    const owners = new Set<string>();
    context.codeOwners.forEach(ownerList => {
      ownerList.forEach(owner => owners.add(owner));
    });
    Array.from(owners).slice(0, 10).forEach(owner => {
      sections.push(`  - ${owner}`);
    });
  }

  // Deployment
  sections.push(`\n## Deployment`);
  sections.push(`\n**Regions**: ${context.regions.join(', ')}`);
  if (context.awsAccounts.length > 0) {
    sections.push(`**AWS Accounts**: ${context.awsAccounts.length}`);
  }

  // Operations
  sections.push(`\n## Operations`);
  sections.push(`\n**CI/CD**: ${context.cicdPipeline ? 'Configured' : 'To be configured'}`);

  if (context.monitoringTools.length > 0) {
    sections.push(`**Monitoring**: ${context.monitoringTools.join(', ')}`);
  }

  if (context.loggingDestinations.length > 0) {
    sections.push(`**Logging**: ${context.loggingDestinations.join(', ')}`);
  }

  // Security
  sections.push(`\n## Security Posture`);
  sections.push(`\n**Encryption**: ${context.encryptionEnabled ? '✅ Enabled' : '⚠️  To be configured'}`);
  sections.push(`**Backups**: ${context.backupEnabled ? '✅ Configured' : '⚠️  To be configured'}`);
  if (context.securityFindings > 0) {
    sections.push(`**Security Findings**: ${context.securityFindings} findings to address`);
  }

  return sections.join('\n');
}

/**
 * Format requirements list for AI review
 */
export function formatRequirementsForAI(requests: DocumentGenerationRequest[]): string {
  const lines: string[] = [];

  lines.push('# Requirements Ready for AI Generation\n');

  // Group by category
  const byCategory = new Map<string, DocumentGenerationRequest[]>();
  requests.forEach(req => {
    const cat = req.requirement.category;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(req);
  });

  // Sort categories
  const categoryOrder = ['business', 'people', 'governance', 'platform', 'security', 'operations'];
  const sortedCategories = Array.from(byCategory.keys()).sort((a, b) => {
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
  });

  for (const category of sortedCategories) {
    const reqs = byCategory.get(category)!;
    lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)} (${reqs.length})`);
    lines.push('');

    reqs.forEach(({ requirement }) => {
      lines.push(`### ${requirement.id}: ${requirement.name}`);
      lines.push(`**Description**: ${requirement.description}`);
      lines.push(`**Priority**: ${requirement.priority}`);

      if (requirement.evidenceRequired && requirement.evidenceRequired.length > 0) {
        lines.push(`**Evidence Required**: ${requirement.evidenceRequired.join(', ')}`);
      }

      if (requirement.cisControls && requirement.cisControls.length > 0) {
        lines.push(`**CIS Controls**: ${requirement.cisControls.join(', ')}`);
      }

      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Generate document template that Claude should fill
 */
export function generateDocumentTemplate(req: MSPRequirement): string {
  return `---
requirement_id: ${req.id}
title: ${req.name}
category: ${req.category}
status: completed
generated_at: ${new Date().toISOString()}
ai_generated: true
---

# ${req.name}

**Requirement ID**: ${req.id}
**Category**: ${req.category.charAt(0).toUpperCase() + req.category.slice(1)}
**Priority**: ${req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}

## Overview

[Write a comprehensive overview explaining this requirement's purpose and importance for the project]

## Current Implementation

[Based on the project context, describe how this requirement is currently addressed or what needs to be implemented]

### Key Components

[List the specific components, practices, or systems that support this requirement]

## Procedures

[Document specific step-by-step procedures, if applicable]

## Responsibilities

[Define roles and ownership for this requirement]

## Evidence and Validation

[Describe what evidence demonstrates compliance and how to validate]

**Evidence Artifacts**:
${req.evidenceRequired ? req.evidenceRequired.map(e => `- ${e}`).join('\n') : '- To be documented'}

## Related Requirements

[Link to related MSP requirements if applicable]

${req.cisControls && req.cisControls.length > 0 ? `## CIS Controls\n\nThis requirement maps to:\n${req.cisControls.map(c => `- ${c}`).join('\n')}` : ''}

## Maintenance

**Review Schedule**: ${req.category === 'security' ? 'Monthly' : 'Quarterly'}
**Owner**: [Specify team or role]
**Last Updated**: ${new Date().toISOString().split('T')[0]}

---
*Generated with AI by MSP Readiness Automation*
`;
}

/**
 * Output formatted context for Claude to use in interactive generation
 */
export function outputInteractiveContext(batch: DocumentGenerationBatch): string {
  const sections: string[] = [];

  sections.push('='.repeat(80));
  sections.push('📊 MSP READINESS - INTERACTIVE AI GENERATION MODE');
  sections.push('='.repeat(80));
  sections.push('');

  sections.push('✅ **Project Analysis Complete**');
  sections.push('');
  sections.push(`Found ${batch.requests.length} requirements ready for AI-powered documentation.`);
  sections.push(`Estimated time savings: ${batch.estimatedSavings}`);
  sections.push('');

  sections.push('-'.repeat(80));
  sections.push('PROJECT CONTEXT');
  sections.push('-'.repeat(80));
  sections.push('');
  sections.push(batch.projectSummary);
  sections.push('');

  sections.push('-'.repeat(80));
  sections.push('REQUIREMENTS NEEDING DOCUMENTATION');
  sections.push('-'.repeat(80));
  sections.push('');
  sections.push(formatRequirementsForAI(batch.requests));
  sections.push('');

  sections.push('='.repeat(80));
  sections.push('🤖 READY FOR AI GENERATION');
  sections.push('='.repeat(80));
  sections.push('');
  sections.push('Claude can now generate high-quality, project-specific documentation for these');
  sections.push('requirements using the context above.');
  sections.push('');
  sections.push('Each document will:');
  sections.push('  ✅ Use real project details (CDK stacks, AWS services, team structure)');
  sections.push('  ✅ Address specific MSP requirements');
  sections.push('  ✅ Include proper frontmatter and structure');
  sections.push('  ✅ Be actionable and specific (not generic templates)');
  sections.push('');

  return sections.join('\n');
}
