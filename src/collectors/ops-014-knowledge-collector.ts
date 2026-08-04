/**
 * OPS-014: Knowledge Management Evidence Collector
 * Collects evidence of runbooks, documentation, and knowledge base
 */

import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeManagementEvidence {
  runbooks: RunbookInfo[];
  documentation: DocumentInfo[];
  knowledgeBase: KnowledgeBaseInfo;
  summary: {
    totalRunbooks: number;
    totalDocs: number;
    hasProcedures: boolean;
    hasTroubleshooting: boolean;
    hasArchitecture: boolean;
    compliant: boolean;
  };
}

export interface RunbookInfo {
  fileName: string;
  filePath: string;
  type: 'runbook' | 'playbook' | 'sop';
  hasSteps: boolean;
  hasOwner: boolean;
  lastModified?: Date;
}

export interface DocumentInfo {
  fileName: string;
  filePath: string;
  category: string;
  wordCount: number;
  lastModified?: Date;
}

export interface KnowledgeBaseInfo {
  totalFiles: number;
  totalSize: number;
  categories: Record<string, number>;
  hasWiki: boolean;
  wikiUrl?: string;
}

/**
 * Collect knowledge management evidence
 */
export async function collectKnowledgeManagementEvidence(
  docsPath: string
): Promise<KnowledgeManagementEvidence> {
  try {
    // Scan for runbooks
    const runbooks = scanForRunbooks(docsPath);

    // Scan for general documentation
    const documentation = scanForDocumentation(docsPath);

    // Build knowledge base info
    const knowledgeBase = buildKnowledgeBaseInfo(runbooks, documentation, docsPath);

    const summary = {
      totalRunbooks: runbooks.length,
      totalDocs: documentation.length,
      hasProcedures: runbooks.some(r => r.hasSteps),
      hasTroubleshooting: documentation.some(d =>
        d.fileName.toLowerCase().includes('troubleshoot')
      ),
      hasArchitecture: documentation.some(d =>
        d.fileName.toLowerCase().includes('architecture')
      ),
      compliant:
        runbooks.length >= 5 &&
        documentation.length >= 10 &&
        knowledgeBase.categories['operations'] > 0,
    };

    return {
      runbooks,
      documentation,
      knowledgeBase,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect knowledge management evidence: ${error}`);
    return {
      runbooks: [],
      documentation: [],
      knowledgeBase: {
        totalFiles: 0,
        totalSize: 0,
        categories: {},
        hasWiki: false,
      },
      summary: {
        totalRunbooks: 0,
        totalDocs: 0,
        hasProcedures: false,
        hasTroubleshooting: false,
        hasArchitecture: false,
        compliant: false,
      },
    };
  }
}

/**
 * Scan for runbooks
 */
function scanForRunbooks(docsPath: string): RunbookInfo[] {
  const runbooks: RunbookInfo[] = [];

  if (!fs.existsSync(docsPath)) {
    return runbooks;
  }

  try {
    const files = fs.readdirSync(docsPath, { recursive: true }) as string[];

    for (const file of files) {
      const filePath = path.join(docsPath, file);

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) continue;

      const lowerFile = file.toLowerCase();
      const stats = fs.statSync(filePath);

      // Look for runbooks, playbooks, SOPs
      if (
        lowerFile.includes('runbook') ||
        lowerFile.includes('playbook') ||
        lowerFile.includes('sop') ||
        lowerFile.includes('procedure') ||
        (lowerFile.includes('how-to') && (lowerFile.endsWith('.md') || lowerFile.endsWith('.txt')))
      ) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();

          // Determine type
          let type: 'runbook' | 'playbook' | 'sop' = 'runbook';
          if (lowerFile.includes('playbook')) type = 'playbook';
          else if (lowerFile.includes('sop')) type = 'sop';

          // Check for structured steps
          const hasSteps =
            lowerContent.includes('step 1') ||
            lowerContent.includes('## step') ||
            content.match(/\d+\.\s+\w/g) !== null;

          // Check for owner
          const hasOwner =
            lowerContent.includes('owner:') ||
            lowerContent.includes('maintainer:') ||
            lowerContent.includes('author:');

          runbooks.push({
            fileName: path.basename(file),
            filePath,
            type,
            hasSteps,
            hasOwner,
            lastModified: stats.mtime,
          });
        } catch (error) {
          // File might not be readable
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan for runbooks: ${error}`);
  }

  return runbooks;
}

/**
 * Scan for general documentation
 */
function scanForDocumentation(docsPath: string): DocumentInfo[] {
  const documentation: DocumentInfo[] = [];

  if (!fs.existsSync(docsPath)) {
    return documentation;
  }

  try {
    const files = fs.readdirSync(docsPath, { recursive: true }) as string[];

    for (const file of files) {
      const filePath = path.join(docsPath, file);

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) continue;

      // Only include text-based documentation
      const ext = path.extname(file).toLowerCase();
      if (!['.md', '.txt', '.rst', '.adoc'].includes(ext)) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        const lowerFile = file.toLowerCase();

        // Categorize document
        let category = 'general';
        if (lowerFile.includes('architecture')) category = 'architecture';
        else if (lowerFile.includes('operations') || lowerFile.includes('ops'))
          category = 'operations';
        else if (lowerFile.includes('security') || lowerFile.includes('sec'))
          category = 'security';
        else if (lowerFile.includes('troubleshoot')) category = 'troubleshooting';
        else if (lowerFile.includes('guide')) category = 'guide';
        else if (lowerFile.includes('api')) category = 'api';

        // Count words (approximate)
        const wordCount = content.split(/\s+/).length;

        documentation.push({
          fileName: path.basename(file),
          filePath,
          category,
          wordCount,
          lastModified: stats.mtime,
        });
      } catch (error) {
        // File might not be readable
      }
    }
  } catch (error) {
    console.error(`Failed to scan for documentation: ${error}`);
  }

  return documentation;
}

/**
 * Build knowledge base info
 */
function buildKnowledgeBaseInfo(
  runbooks: RunbookInfo[],
  documentation: DocumentInfo[],
  docsPath: string
): KnowledgeBaseInfo {
  const categories: Record<string, number> = {};
  let totalSize = 0;

  // Count by category
  for (const doc of documentation) {
    categories[doc.category] = (categories[doc.category] || 0) + 1;
  }

  // Calculate total size
  try {
    const calculateSize = (dirPath: string): number => {
      let size = 0;
      if (fs.existsSync(dirPath)) {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            size += calculateSize(itemPath);
          } else {
            size += stats.size;
          }
        }
      }
      return size;
    };

    totalSize = calculateSize(docsPath);
  } catch (error) {
    console.error(`Failed to calculate knowledge base size: ${error}`);
  }

  // Check for wiki references
  let hasWiki = false;
  let wikiUrl: string | undefined;

  for (const doc of documentation) {
    try {
      const content = fs.readFileSync(doc.filePath, 'utf-8');
      const wikiMatch = content.match(/wiki[:\s]+([https?:\/\/\S+]+)/i);
      if (wikiMatch) {
        hasWiki = true;
        wikiUrl = wikiMatch[1];
        break;
      }
    } catch (error) {
      // Ignore
    }
  }

  return {
    totalFiles: runbooks.length + documentation.length,
    totalSize,
    categories,
    hasWiki,
    wikiUrl,
  };
}

/**
 * Save knowledge management evidence to file
 */
export function saveOPS014Evidence(
  evidence: KnowledgeManagementEvidence,
  outputPath: string
): EvidenceArtifact {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save evidence as JSON
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'document',
    path: outputPath,
    description: 'Knowledge management: runbooks, documentation, and knowledge base',
    requirementIds: ['OPS-014'],
    collectedAt: new Date(),
    metadata: {
      totalRunbooks: evidence.summary.totalRunbooks,
      totalDocs: evidence.summary.totalDocs,
      compliant: evidence.summary.compliant,
    },
  };
}
