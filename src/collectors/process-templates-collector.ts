/**
 * Process Templates Evidence Collector
 * Collects/generates evidence for process-based requirements:
 * OPSP-001, OPSP-002, OPSP-003, OPSP-005, OPS-006, SEC-001
 */

import * as fs from 'fs';
import * as path from 'path';
import { EvidenceArtifact } from '../types';

export interface ProcessTemplatesEvidence {
  templates: ProcessTemplate[];
  existingDocuments: ExistingDocument[];
  summary: {
    templatesGenerated: number;
    existingDocumentsFound: number;
    requirementsCovered: string[];
  };
}

export interface ProcessTemplate {
  requirementId: string;
  templateName: string;
  templatePath: string;
  description: string;
  generated: boolean;
}

export interface ExistingDocument {
  requirementId: string;
  documentPath: string;
  documentType: string;
  found: boolean;
}

/**
 * Collect process templates and existing documentation
 */
export async function collectProcessTemplatesEvidence(
  projectPath: string,
  docsPath: string
): Promise<ProcessTemplatesEvidence> {
  const templates: ProcessTemplate[] = [];
  const existingDocuments: ExistingDocument[] = [];

  // Define expected process documents
  const expectedDocs = [
    {
      requirementId: 'OPSP-001',
      paths: [
        path.join(docsPath, 'incident-response-playbook.md'),
        path.join(docsPath, 'runbooks', 'incident-response.md'),
      ],
      templateName: 'incident-response-template.md',
      description: 'Incident management procedures and SLA documentation',
    },
    {
      requirementId: 'OPSP-002',
      paths: [
        path.join(docsPath, 'post-mortem-template.md'),
        path.join(docsPath, 'problem-management.md'),
      ],
      templateName: 'post-mortem-template.md',
      description: 'Post-incident analysis and customer communication',
    },
    {
      requirementId: 'OPSP-003',
      paths: [
        path.join(docsPath, 'deployment-playbook.md'),
        path.join(docsPath, 'runbooks', 'deployment-procedures.md'),
      ],
      templateName: 'deployment-playbook-template.md',
      description: 'Deployment risk assessment and rollback procedures',
    },
    {
      requirementId: 'OPSP-005',
      paths: [
        path.join(docsPath, 'disaster-recovery-test-results.md'),
        path.join(docsPath, 'business-continuity-plan.md'),
      ],
      templateName: 'dr-test-template.md',
      description: 'Business continuity and DR test documentation',
    },
    {
      requirementId: 'OPS-006',
      paths: [
        path.join(docsPath, 'change-management.md'),
        path.join(projectPath, '.github', 'PULL_REQUEST_TEMPLATE.md'),
      ],
      templateName: 'change-management-template.md',
      description: 'Change management process and approval workflows',
    },
    {
      requirementId: 'SEC-001',
      paths: [
        path.join(docsPath, 'security-policies.md'),
        path.join(docsPath, 'security-framework.md'),
      ],
      templateName: 'security-policies-template.md',
      description: 'Security policies mapped to CIS Controls',
    },
  ];

  // Check for existing documents
  for (const doc of expectedDocs) {
    let found = false;
    let foundPath = '';

    for (const docPath of doc.paths) {
      if (fs.existsSync(docPath)) {
        found = true;
        foundPath = docPath;
        break;
      }
    }

    existingDocuments.push({
      requirementId: doc.requirementId,
      documentPath: foundPath || doc.paths[0],
      documentType: doc.description,
      found,
    });

    // If document doesn't exist, we'll need to generate a template
    if (!found) {
      templates.push({
        requirementId: doc.requirementId,
        templateName: doc.templateName,
        templatePath: doc.paths[0],
        description: doc.description,
        generated: false,
      });
    }
  }

  // Check for Git history (evidence of change management)
  const gitHistoryPath = path.join(projectPath, '.git');
  if (fs.existsSync(gitHistoryPath)) {
    existingDocuments.push({
      requirementId: 'OPS-006',
      documentPath: path.join(projectPath, '.git'),
      documentType: 'Git version control history',
      found: true,
    });
  }

  const summary = {
    templatesGenerated: templates.length,
    existingDocumentsFound: existingDocuments.filter(d => d.found).length,
    requirementsCovered: Array.from(
      new Set([
        ...existingDocuments.filter(d => d.found).map(d => d.requirementId),
        ...templates.map(t => t.requirementId),
      ])
    ),
  };

  return {
    templates,
    existingDocuments,
    summary,
  };
}

/**
 * Generate Git history summary for change management
 */
export function generateGitHistorySummary(projectPath: string, outputPath: string): void {
  const { execSync } = require('child_process');

  try {
    // Get recent commit history
    const commits = execSync('git log --oneline --no-decorate -n 50', {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    // Get branch information
    const branches = execSync('git branch -a', {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    // Get contributor stats
    const contributors = execSync('git shortlog -sn --all --no-merges', {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    const summary = {
      recentCommits: commits.split('\n').filter((line: string) => line.trim()),
      branches: branches.split('\n').filter((line: string) => line.trim()),
      contributors: contributors.split('\n').filter((line: string) => line.trim()),
      collectedAt: new Date().toISOString(),
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to generate Git history summary: ${error}`);
  }
}

/**
 * Save process templates evidence to file
 */
export function saveProcessTemplatesEvidence(
  evidence: ProcessTemplatesEvidence,
  outputPath: string
): EvidenceArtifact {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'document',
    path: outputPath,
    description: 'Process templates and existing documentation inventory',
    requirementIds: ['OPSP-001', 'OPSP-002', 'OPSP-003', 'OPSP-005', 'OPS-006', 'SEC-001'],
    collectedAt: new Date(),
    metadata: {
      templatesGenerated: evidence.summary.templatesGenerated,
      existingDocumentsFound: evidence.summary.existingDocumentsFound,
      requirementsCovered: evidence.summary.requirementsCovered.length,
    },
  };
}

/**
 * Print process templates evidence summary
 */
export function printProcessTemplatesEvidenceSummary(evidence: ProcessTemplatesEvidence): void {
  console.log('Process Templates Evidence:');
  console.log(`  Existing documents found: ${evidence.summary.existingDocumentsFound}`);
  console.log(`  Templates to generate: ${evidence.summary.templatesGenerated}`);
  console.log(`  Requirements covered: ${evidence.summary.requirementsCovered.join(', ')}`);
  console.log('');

  if (evidence.existingDocuments.length > 0) {
    console.log('  Existing documents:');
    for (const doc of evidence.existingDocuments) {
      if (doc.found) {
        console.log(`    ✓ ${doc.requirementId}: ${doc.documentPath}`);
      }
    }
  }

  if (evidence.templates.length > 0) {
    console.log('  Templates needed:');
    for (const template of evidence.templates) {
      console.log(`    ✗ ${template.requirementId}: ${template.templateName}`);
    }
  }
  console.log('');
}
