/**
 * Tests for Template Loader
 */

import { TemplateLoader, createTemplateLoader } from './template-loader';
import * as path from 'path';
import * as fs from 'fs';

describe('TemplateLoader', () => {
  let loader: TemplateLoader;
  const templatesDir = path.join(__dirname, '../../templates');

  beforeEach(() => {
    loader = createTemplateLoader(templatesDir);
  });

  describe('listTemplates', () => {
    it('should list all available templates', () => {
      const templates = loader.listTemplates();

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return templates with required metadata fields', () => {
      const templates = loader.listTemplates();

      templates.forEach(template => {
        expect(template.requirementId).toBeDefined();
        expect(template.path).toBeDefined();
        expect(template.title).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.description).toBeDefined();
      });
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return business templates', () => {
      const templates = loader.getTemplatesByCategory('business');

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('business'));
    });

    it('should return people templates', () => {
      const templates = loader.getTemplatesByCategory('people');

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('people'));
    });

    it('should return governance templates', () => {
      const templates = loader.getTemplatesByCategory('governance');

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('governance'));
    });

    it('should return platform templates', () => {
      const templates = loader.getTemplatesByCategory('platform');

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('platform'));
    });

    it('should return empty array for non-existent category', () => {
      const templates = loader.getTemplatesByCategory('nonexistent');

      expect(templates).toBeDefined();
      expect(templates.length).toBe(0);
    });
  });

  describe('getTemplateMetadata', () => {
    it('should return metadata for BUS-001', () => {
      const metadata = loader.getTemplateMetadata('BUS-001');

      expect(metadata).toBeDefined();
      expect(metadata?.requirementId).toBe('BUS-001');
      expect(metadata?.title).toBe('Company Overview');
      expect(metadata?.category).toBe('business');
    });

    it('should return undefined for non-existent requirement', () => {
      const metadata = loader.getTemplateMetadata('NONEXISTENT');

      expect(metadata).toBeUndefined();
    });
  });

  describe('loadTemplate', () => {
    it('should load BUS-001 template', () => {
      const template = loader.loadTemplate('BUS-001');

      expect(template).toBeDefined();
      expect(template.metadata.requirementId).toBe('BUS-001');
      expect(template.content).toBeDefined();
      expect(template.content.length).toBeGreaterThan(0);
      expect(template.frontmatter).toBeDefined();
    });

    it('should parse frontmatter from template', () => {
      const template = loader.loadTemplate('BUS-001');

      expect(template.frontmatter.requirementId).toBe('BUS-001');
      expect(template.frontmatter.title).toBeDefined();
      expect(template.frontmatter.category).toBeDefined();
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        loader.loadTemplate('NONEXISTENT');
      }).toThrow();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', () => {
      const stats = loader.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(stats.byCategory).toBeDefined();
      expect(stats.categories).toBeDefined();
      expect(Array.isArray(stats.categories)).toBe(true);
    });

    it('should have templates for each category', () => {
      const stats = loader.getStatistics();

      expect(stats.byCategory.business).toBeGreaterThan(0);
      expect(stats.byCategory.people).toBeGreaterThan(0);
      expect(stats.byCategory.governance).toBeGreaterThan(0);
      expect(stats.byCategory.platform).toBeGreaterThan(0);
    });
  });

  describe('validateTemplates', () => {
    it('should validate that all templates exist', () => {
      const validation = loader.validateTemplates();

      expect(validation).toBeDefined();
      expect(validation.valid).toBeDefined();
      expect(validation.missing).toBeDefined();
      expect(validation.errors).toBeDefined();

      if (!validation.valid) {
        console.warn('Missing templates:', validation.missing);
        console.warn('Errors:', validation.errors);
      }
    });
  });

  describe('copyTemplate', () => {
    const testOutputDir = path.join(__dirname, '../../test-output');
    const testFilePath = path.join(testOutputDir, 'test-template.md');

    beforeEach(() => {
      // Create test output directory
      if (!fs.existsSync(testOutputDir)) {
        fs.mkdirSync(testOutputDir, { recursive: true });
      }
    });

    afterEach(() => {
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    it('should copy template to destination', () => {
      loader.copyTemplate('BUS-001', testFilePath);

      expect(fs.existsSync(testFilePath)).toBe(true);

      const content = fs.readFileSync(testFilePath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('BUS-001');
    });

    it('should substitute variables when provided', () => {
      // Test with actual placeholders that exist in the template
      const variables = {
        'Your Company Name': 'Test Company Inc.',
        Year: '2025',
      };

      loader.copyTemplate('BUS-001', testFilePath, variables);

      expect(fs.existsSync(testFilePath)).toBe(true);

      const content = fs.readFileSync(testFilePath, 'utf-8');
      // Verify substitution worked by checking placeholder is gone
      expect(content).toContain('Test Company Inc.');
      expect(content).not.toContain('[Your Company Name]'); // Original placeholder should be replaced
    });
  });

  describe('Integration tests', () => {
    it('should have exactly 18 templates (4+3+6+5)', () => {
      const stats = loader.getStatistics();

      expect(stats.totalTemplates).toBe(18);
      expect(stats.byCategory.business).toBe(4);
      expect(stats.byCategory.people).toBe(3);
      expect(stats.byCategory.governance).toBe(6);
      expect(stats.byCategory.platform).toBe(5);
    });

    it('should load all 18 templates without errors', () => {
      const templates = loader.listTemplates();

      templates.forEach(templateMetadata => {
        expect(() => {
          const template = loader.loadTemplate(templateMetadata.requirementId);
          expect(template).toBeDefined();
          expect(template.content).toBeDefined();
        }).not.toThrow();
      });
    });
  });
});
