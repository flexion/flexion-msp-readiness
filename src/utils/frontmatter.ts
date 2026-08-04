/**
 * Frontmatter utilities for tracking document metadata
 */

import * as fs from 'fs';

export interface DocumentMetadata {
  generated: string;
  template_version: string;
  last_modified?: string;
  status: 'draft' | 'in-progress' | 'approved' | 'complete' | 'needs-remediation';
  requirement_id: string;
  custom_sections?: string[];
  // Auto-approval metadata
  approved_at?: string;
  approval_method?: 'auto' | 'manual';
  validation_passed?: boolean;
  last_validated?: string;
  validation_failures?: string[];
  remediation_required?: boolean;
  // Playbook metadata
  playbook_mode?: 'technical' | 'process' | 'mixed';
  automation_type?: 'full' | 'partial' | 'manual';
  automation_percentage?: number;
}

/**
 * Parse frontmatter from a markdown document
 */
export function parseFrontmatter(content: string): {
  metadata: DocumentMetadata | null;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: null, body: content };
  }

  const [, yamlContent, body] = match;

  try {
    const metadata = parseYaml(yamlContent);
    return { metadata, body };
  } catch (error) {
    return { metadata: null, body: content };
  }
}

/**
 * Simple YAML parser for frontmatter (limited to our needs)
 */
function parseYaml(yaml: string): DocumentMetadata {
  const lines = yaml.split('\n');
  const metadata: any = {};
  let currentKey: string | null = null;
  let arrayValues: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Array items
    if (trimmed.startsWith('- ')) {
      if (currentKey) {
        arrayValues.push(trimmed.substring(2).replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    // If we were collecting array values, store them
    if (currentKey && arrayValues.length > 0) {
      metadata[currentKey] = arrayValues;
      arrayValues = [];
    }

    // Key-value pairs
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex !== -1) {
      currentKey = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (value && value !== '') {
        metadata[currentKey] = value.replace(/^["']|["']$/g, '');
      } else {
        // Empty value, might be starting an array
        arrayValues = [];
      }
    }
  }

  // Store any remaining array values
  if (currentKey && arrayValues.length > 0) {
    metadata[currentKey] = arrayValues;
  }

  return metadata as DocumentMetadata;
}

/**
 * Serialize metadata to YAML frontmatter
 */
export function serializeFrontmatter(metadata: DocumentMetadata): string {
  const lines = ['---'];

  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - "${item}"`);
      }
    } else {
      lines.push(`${key}: "${value}"`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Add or update frontmatter in a document
 */
export function addFrontmatter(content: string, metadata: DocumentMetadata): string {
  const { body } = parseFrontmatter(content);
  const frontmatter = serializeFrontmatter(metadata);
  return `${frontmatter}\n\n${body}`;
}

/**
 * Check if a file has been modified by the user (not just generated)
 */
export function isUserModified(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { metadata } = parseFrontmatter(content);

  if (!metadata) {
    // No frontmatter means it's a user-created file or legacy
    return true;
  }

  // Check if last_modified is after generated
  if (metadata.last_modified) {
    const generated = new Date(metadata.generated);
    const modified = new Date(metadata.last_modified);
    return modified > generated;
  }

  // Check if status has been manually updated
  if (metadata.status === 'approved' || metadata.status === 'in-progress') {
    return true;
  }

  return false;
}

/**
 * Update the last_modified timestamp in frontmatter
 */
export function updateLastModified(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { metadata, body } = parseFrontmatter(content);

  if (!metadata) {
    return; // Can't update if no frontmatter
  }

  metadata.last_modified = new Date().toISOString();
  const updated = addFrontmatter(body, metadata);
  fs.writeFileSync(filePath, updated, 'utf-8');
}

/**
 * Get document status from file
 */
export function getDocumentStatus(filePath: string): DocumentMetadata['status'] | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { metadata } = parseFrontmatter(content);

  return metadata?.status || null;
}

/**
 * Update document status
 */
export function updateDocumentStatus(
  filePath: string,
  status: DocumentMetadata['status']
): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { metadata, body } = parseFrontmatter(content);

  if (!metadata) {
    return;
  }

  metadata.status = status;
  metadata.last_modified = new Date().toISOString();

  const updated = addFrontmatter(body, metadata);
  fs.writeFileSync(filePath, updated, 'utf-8');
}
