/**
 * Template Loader Utility
 *
 * Loads and manages documentation templates for non-technical MSP requirements
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Template metadata from index
 */
export interface TemplateMetadata {
  requirementId: string;
  path: string;
  title: string;
  category: string;
  description: string;
}

/**
 * Template index structure
 */
export interface TemplateIndex {
  templates: TemplateMetadata[];
  metadata: {
    version: string;
    lastUpdated: string;
    totalTemplates: number;
    categories: Record<string, number>;
  };
}

/**
 * Loaded template with content
 */
export interface Template {
  metadata: TemplateMetadata;
  content: string;
  frontmatter: Record<string, any>;
}

/**
 * Template loader class
 */
export class TemplateLoader {
  private templatesDir: string;
  private index: TemplateIndex | null = null;

  constructor(templatesDir?: string) {
    // Default to templates directory at project root
    this.templatesDir = templatesDir || path.join(__dirname, '../../templates');
  }

  /**
   * Load the template index
   */
  private loadIndex(): TemplateIndex {
    if (this.index) {
      return this.index;
    }

    const indexPath = path.join(this.templatesDir, 'template-index.json');

    if (!fs.existsSync(indexPath)) {
      throw new Error(`Template index not found at: ${indexPath}`);
    }

    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const parsedIndex = JSON.parse(indexContent) as TemplateIndex;
    this.index = parsedIndex;

    return parsedIndex;
  }

  /**
   * Get all available templates
   */
  listTemplates(): TemplateMetadata[] {
    const index = this.loadIndex();
    return index.templates;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): TemplateMetadata[] {
    const templates = this.listTemplates();
    return templates.filter(t => t.category === category);
  }

  /**
   * Get template metadata by requirement ID
   */
  getTemplateMetadata(requirementId: string): TemplateMetadata | undefined {
    const templates = this.listTemplates();
    return templates.find(t => t.requirementId === requirementId);
  }

  /**
   * Load a template by requirement ID
   */
  loadTemplate(requirementId: string): Template {
    const metadata = this.getTemplateMetadata(requirementId);

    if (!metadata) {
      throw new Error(`Template not found for requirement: ${requirementId}`);
    }

    const templatePath = path.join(this.templatesDir, metadata.path);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, 'utf-8');
    const frontmatter = this.parseFrontmatter(content);

    return {
      metadata,
      content,
      frontmatter,
    };
  }

  /**
   * Parse frontmatter from markdown template
   */
  private parseFrontmatter(content: string): Record<string, any> {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return {};
    }

    const frontmatterText = match[1];
    const frontmatter: Record<string, any> = {};

    // Simple YAML parsing (key: value)
    frontmatterText.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        frontmatter[key.trim()] = value;
      }
    });

    return frontmatter;
  }

  /**
   * Copy template to destination with optional variable substitution
   */
  copyTemplate(
    requirementId: string,
    destinationPath: string,
    variables?: Record<string, string>
  ): void {
    const template = this.loadTemplate(requirementId);
    let content = template.content;

    // Simple variable substitution if provided
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `[${key}]`;
        content = content.split(placeholder).join(value);
      });
    }

    // Ensure destination directory exists
    const destinationDir = path.dirname(destinationPath);
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    fs.writeFileSync(destinationPath, content, 'utf-8');
  }

  /**
   * Get template statistics
   */
  getStatistics(): {
    totalTemplates: number;
    byCategory: Record<string, number>;
    categories: string[];
  } {
    const index = this.loadIndex();
    return {
      totalTemplates: index.metadata.totalTemplates,
      byCategory: index.metadata.categories,
      categories: Object.keys(index.metadata.categories),
    };
  }

  /**
   * Validate that all templates exist
   */
  validateTemplates(): {
    valid: boolean;
    missing: TemplateMetadata[];
    errors: string[];
  } {
    const templates = this.listTemplates();
    const missing: TemplateMetadata[] = [];
    const errors: string[] = [];

    templates.forEach(template => {
      const templatePath = path.join(this.templatesDir, template.path);
      if (!fs.existsSync(templatePath)) {
        missing.push(template);
        errors.push(`Missing template file: ${templatePath}`);
      }
    });

    return {
      valid: missing.length === 0,
      missing,
      errors,
    };
  }
}

/**
 * Create a default template loader instance
 */
export function createTemplateLoader(templatesDir?: string): TemplateLoader {
  return new TemplateLoader(templatesDir);
}

/**
 * Helper function to list all templates
 */
export function listTemplates(templatesDir?: string): TemplateMetadata[] {
  const loader = createTemplateLoader(templatesDir);
  return loader.listTemplates();
}

/**
 * Helper function to load a specific template
 */
export function loadTemplate(requirementId: string, templatesDir?: string): Template {
  const loader = createTemplateLoader(templatesDir);
  return loader.loadTemplate(requirementId);
}

/**
 * Helper function to copy a template to a destination
 */
export function copyTemplate(
  requirementId: string,
  destinationPath: string,
  variables?: Record<string, string>,
  templatesDir?: string
): void {
  const loader = createTemplateLoader(templatesDir);
  loader.copyTemplate(requirementId, destinationPath, variables);
}
