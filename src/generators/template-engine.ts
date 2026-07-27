/**
 * Template Engine - Handlebars-based template rendering
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export interface TemplateContext {
  projectName: string;
  organization: string;
  region: string;
  stage: string;
  contact: string;
  slackChannel?: string;
  awsAccountId?: string;
  [key: string]: any;
}

/**
 * Initialize template engine
 */
export function initializeTemplateEngine(): void {
  // Register helpers
  Handlebars.registerHelper('uppercase', (str: string) => str.toUpperCase());
  Handlebars.registerHelper('lowercase', (str: string) => str.toLowerCase());
  Handlebars.registerHelper('date', () => new Date().toISOString().split('T')[0]);
  Handlebars.registerHelper('year', () => new Date().getFullYear());
}

/**
 * Load template from file
 */
export function loadTemplate(templatePath: string): HandlebarsTemplateDelegate {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  return Handlebars.compile(templateContent);
}

/**
 * Render template with context
 */
export function renderTemplate(
  templatePath: string,
  context: TemplateContext
): string {
  const template = loadTemplate(templatePath);
  return template(context);
}

/**
 * Render template string directly
 */
export function renderTemplateString(
  templateString: string,
  context: TemplateContext
): string {
  const template = Handlebars.compile(templateString);
  return template(context);
}

/**
 * List available templates in directory
 */
export function listTemplates(templatesDir: string): string[] {
  if (!fs.existsSync(templatesDir)) {
    return [];
  }

  return fs
    .readdirSync(templatesDir)
    .filter((file) => file.endsWith('.hbs') || file.endsWith('.md'))
    .map((file) => path.join(templatesDir, file));
}

/**
 * Save rendered template to file
 */
export function saveRenderedTemplate(
  content: string,
  outputPath: string
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, content, 'utf-8');
}

// Initialize on import
initializeTemplateEngine();
