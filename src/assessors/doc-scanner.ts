/**
 * Documentation scanner - scans project docs for MSP content
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DocumentFile {
  path: string;
  relativePath: string;
  content: string;
  frontmatter?: Record<string, any>;
  type: 'playbook' | 'runbook' | 'evidence' | 'assessment' | 'general';
}

export interface DocumentReference {
  file: string;
  line: number;
  context: string;
  type: 'strong' | 'weak'; // strong = in heading/title, weak = in body
}

export interface DocScanResult {
  files: DocumentFile[];
  requirementMentions: Map<string, DocumentReference[]>;
  playbooksFound: string[];
  runbooksFound: string[];
  evidenceFound: string[];
  assessmentFiles: string[];
  totalFiles: number;
  totalRequirementMentions: number;
}

/**
 * Scan documentation directory for MSP-related content
 */
export async function scanDocumentation(docsPath: string): Promise<DocScanResult> {
  const files: DocumentFile[] = [];
  const requirementMentions = new Map<string, DocumentReference[]>();

  // Recursively find all markdown files
  const markdownFiles = findMarkdownFiles(docsPath);

  for (const filePath of markdownFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(docsPath, filePath);

    // Parse frontmatter if present
    const { frontmatter, body } = parseFrontmatter(content);

    // Determine document type
    const docType = determineDocumentType(relativePath, body, frontmatter);

    const docFile: DocumentFile = {
      path: filePath,
      relativePath,
      content: body,
      frontmatter,
      type: docType,
    };

    files.push(docFile);

    // Extract requirement references
    extractRequirementReferences(docFile, requirementMentions);
  }

  // Categorize files
  const playbooksFound = files.filter(f => f.type === 'playbook').map(f => f.relativePath);

  const runbooksFound = files.filter(f => f.type === 'runbook').map(f => f.relativePath);

  const evidenceFound = files.filter(f => f.type === 'evidence').map(f => f.relativePath);

  const assessmentFiles = files.filter(f => f.type === 'assessment').map(f => f.relativePath);

  const totalRequirementMentions = Array.from(requirementMentions.values()).reduce(
    (sum, refs) => sum + refs.length,
    0
  );

  return {
    files,
    requirementMentions,
    playbooksFound,
    runbooksFound,
    evidenceFound,
    assessmentFiles,
    totalFiles: files.length,
    totalRequirementMentions,
  };
}

/**
 * Recursively find all markdown files in directory
 */
function findMarkdownFiles(dirPath: string): string[] {
  const files: string[] = [];

  function traverse(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Skip common directories
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          continue;
        }
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dirPath);
  return files;
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter?: Record<string, any>;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];

  // Simple YAML parsing for common cases
  const frontmatter: Record<string, any> = {};
  const lines = frontmatterText.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Determine document type based on path and content
 */
function determineDocumentType(
  relativePath: string,
  content: string,
  frontmatter?: Record<string, any>
): 'playbook' | 'runbook' | 'evidence' | 'assessment' | 'general' {
  const lowerPath = relativePath.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Check frontmatter first
  if (frontmatter?.type) {
    const type = frontmatter.type.toLowerCase();
    if (['playbook', 'runbook', 'evidence', 'assessment'].includes(type)) {
      return type as any;
    }
  }

  // Check path
  if (lowerPath.includes('playbook')) return 'playbook';
  if (lowerPath.includes('runbook')) return 'runbook';
  if (lowerPath.includes('evidence')) return 'evidence';
  if (lowerPath.includes('assessment') || lowerPath.includes('checklist')) return 'assessment';

  // Check content patterns
  if (lowerContent.includes('## playbook') || lowerContent.includes('# playbook')) {
    return 'playbook';
  }
  if (
    (lowerContent.includes('## runbook') || lowerContent.includes('# runbook')) &&
    lowerContent.includes('step')
  ) {
    return 'runbook';
  }
  if (lowerContent.includes('evidence') && lowerContent.includes('requirement')) {
    return 'evidence';
  }
  if (lowerContent.includes('self-assessment') || lowerContent.includes('checklist')) {
    return 'assessment';
  }

  return 'general';
}

/**
 * Extract MSP requirement references from document
 */
function extractRequirementReferences(
  doc: DocumentFile,
  requirementMentions: Map<string, DocumentReference[]>
): void {
  // Regex for MSP requirement IDs (e.g., SECP-001, OPS-003, SEC-004, OPSP-001)
  const requirementRegex = /\b([A-Z]{3,4}-\d{3})\b/g;

  const lines = doc.content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;

    while ((match = requirementRegex.exec(line)) !== null) {
      const requirementId = match[1];
      const lineNumber = i + 1;

      // Determine if this is a strong or weak reference
      const isHeading = line.trim().startsWith('#');
      const isBold = line.includes(`**${requirementId}**`);
      const isStrong = isHeading || isBold;

      // Get context (surrounding text)
      const context = line.trim().substring(0, 150);

      const reference: DocumentReference = {
        file: doc.relativePath,
        line: lineNumber,
        context,
        type: isStrong ? 'strong' : 'weak',
      };

      if (!requirementMentions.has(requirementId)) {
        requirementMentions.set(requirementId, []);
      }
      requirementMentions.get(requirementId)!.push(reference);
    }
  }
}

/**
 * Print scan summary
 */
export function printScanSummary(result: DocScanResult): void {
  console.log(`Documentation scan complete:`);
  console.log(`  Total files: ${result.totalFiles}`);
  console.log(`  Playbooks: ${result.playbooksFound.length}`);
  console.log(`  Runbooks: ${result.runbooksFound.length}`);
  console.log(`  Evidence files: ${result.evidenceFound.length}`);
  console.log(`  Assessment files: ${result.assessmentFiles.length}`);
  console.log(`  Requirement mentions: ${result.totalRequirementMentions}`);
  console.log(`  Unique requirements found: ${result.requirementMentions.size}`);
  console.log('');
}
