/**
 * Safe generation with overwrite protection
 */

import * as fs from 'fs';
import {
  addFrontmatter,
  isUserModified,
  DocumentMetadata,
} from '../utils/frontmatter';

export interface SafeGenerationOptions {
  force?: boolean;
  dryRun?: boolean;
}

export interface SafeGenerationResult {
  generated: string[];
  skipped: string[];
  wouldGenerate?: string[]; // For dry-run
}

/**
 * Safely write content to a file, respecting user modifications
 */
export function safeWriteFile(
  filePath: string,
  content: string,
  metadata: DocumentMetadata,
  options: SafeGenerationOptions = {}
): 'generated' | 'skipped' | 'would-generate' {
  const { force = false, dryRun = false } = options;

  // Dry run - just report what would happen
  if (dryRun) {
    if (fs.existsSync(filePath) && !force && isUserModified(filePath)) {
      return 'skipped';
    }
    return 'would-generate';
  }

  // Check if file exists and has been modified by user
  if (!force && fs.existsSync(filePath) && isUserModified(filePath)) {
    return 'skipped';
  }

  // Add frontmatter to content
  const contentWithFrontmatter = addFrontmatter(content, metadata);

  // Write the file
  fs.writeFileSync(filePath, contentWithFrontmatter, 'utf-8');

  return 'generated';
}

/**
 * Print safe generation summary
 */
export function printSafeGenerationSummary(result: SafeGenerationResult): void {
  if (result.wouldGenerate) {
    // Dry run output
    console.log(`\n📋 Dry Run Results:`);
    console.log(`  Would generate: ${result.wouldGenerate.length} files`);
    console.log(`  Would skip: ${result.skipped.length} files (user-modified)`);

    if (result.wouldGenerate.length > 0) {
      console.log(`\n✅ Would generate:`);
      result.wouldGenerate.forEach(f => console.log(`  - ${f}`));
    }

    if (result.skipped.length > 0) {
      console.log(`\n⚠️  Would skip (user-modified):`);
      result.skipped.forEach(f => console.log(`  - ${f}`));
      console.log(`\nUse --force to regenerate all files (will overwrite changes)`);
    }
  } else {
    // Actual generation output
    console.log(`\n✅ Generated: ${result.generated.length} files`);

    if (result.skipped.length > 0) {
      console.log(`\n⚠️  Skipped: ${result.skipped.length} user-modified files`);
      result.skipped.forEach(f => console.log(`  - ${f}`));
      console.log(`\nUse --force to regenerate all files (will overwrite changes)`);
    }
  }
}
