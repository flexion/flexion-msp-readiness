import * as fs from 'fs';
import * as path from 'path';
import {
  parseFrontmatter,
  serializeFrontmatter,
  addFrontmatter,
  isUserModified,
  updateLastModified,
  getDocumentStatus,
  updateDocumentStatus,
  DocumentMetadata,
} from '../frontmatter';

describe('frontmatter', () => {
  const testDir = path.join(__dirname, '__test_files__');
  const testFile = path.join(testDir, 'test-doc.md');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  describe('parseFrontmatter', () => {
    it('should parse valid frontmatter', () => {
      const content = `---
generated: "2026-08-04T10:00:00Z"
template_version: "1.0"
status: "draft"
requirement_id: "SEC-001"
---

# Document Content

This is the body.`;

      const { metadata, body } = parseFrontmatter(content);

      expect(metadata).toBeDefined();
      expect(metadata?.generated).toBe('2026-08-04T10:00:00Z');
      expect(metadata?.template_version).toBe('1.0');
      expect(metadata?.status).toBe('draft');
      expect(metadata?.requirement_id).toBe('SEC-001');
      expect(body).toContain('# Document Content');
    });

    it('should handle documents without frontmatter', () => {
      const content = '# Document\n\nNo frontmatter here.';
      const { metadata, body } = parseFrontmatter(content);

      expect(metadata).toBeNull();
      expect(body).toBe(content);
    });

    it('should parse arrays in frontmatter', () => {
      const content = `---
generated: "2026-08-04"
template_version: "1.0"
status: "in-progress"
requirement_id: "SEC-001"
custom_sections:
  - "Section 1"
  - "Section 2"
---

Body content`;

      const { metadata } = parseFrontmatter(content);

      expect(metadata?.custom_sections).toEqual(['Section 1', 'Section 2']);
    });
  });

  describe('serializeFrontmatter', () => {
    it('should serialize metadata to YAML', () => {
      const metadata: DocumentMetadata = {
        generated: '2026-08-04T10:00:00Z',
        template_version: '1.0',
        status: 'draft',
        requirement_id: 'SEC-001',
      };

      const yaml = serializeFrontmatter(metadata);

      expect(yaml).toContain('---');
      expect(yaml).toContain('generated: "2026-08-04T10:00:00Z"');
      expect(yaml).toContain('template_version: "1.0"');
      expect(yaml).toContain('status: "draft"');
      expect(yaml).toContain('requirement_id: "SEC-001"');
    });

    it('should serialize arrays', () => {
      const metadata: DocumentMetadata = {
        generated: '2026-08-04',
        template_version: '1.0',
        status: 'draft',
        requirement_id: 'SEC-001',
        custom_sections: ['Section 1', 'Section 2'],
      };

      const yaml = serializeFrontmatter(metadata);

      expect(yaml).toContain('custom_sections:');
      expect(yaml).toContain('- "Section 1"');
      expect(yaml).toContain('- "Section 2"');
    });
  });

  describe('addFrontmatter', () => {
    it('should add frontmatter to document without it', () => {
      const content = '# Title\n\nBody content';
      const metadata: DocumentMetadata = {
        generated: '2026-08-04',
        template_version: '1.0',
        status: 'draft',
        requirement_id: 'SEC-001',
      };

      const result = addFrontmatter(content, metadata);

      expect(result).toContain('---');
      expect(result).toContain('generated: "2026-08-04"');
      expect(result).toContain('# Title');
      expect(result).toContain('Body content');
    });

    it('should replace existing frontmatter', () => {
      const content = `---
old: "data"
---

# Title`;

      const metadata: DocumentMetadata = {
        generated: '2026-08-04',
        template_version: '1.0',
        status: 'draft',
        requirement_id: 'SEC-001',
      };

      const result = addFrontmatter(content, metadata);

      expect(result).not.toContain('old:');
      expect(result).toContain('generated: "2026-08-04"');
    });
  });

  describe('isUserModified', () => {
    it('should return false for non-existent file', () => {
      expect(isUserModified('/nonexistent/file.md')).toBe(false);
    });

    it('should return true for file without frontmatter', () => {
      fs.writeFileSync(testFile, '# Document\n\nNo frontmatter');
      expect(isUserModified(testFile)).toBe(true);
    });

    it('should return false for freshly generated file', () => {
      const metadata: DocumentMetadata = {
        generated: new Date().toISOString(),
        template_version: '1.0',
        status: 'draft',
        requirement_id: 'SEC-001',
      };
      const content = addFrontmatter('# Title\n\nBody', metadata);
      fs.writeFileSync(testFile, content);

      expect(isUserModified(testFile)).toBe(false);
    });

    it('should return true for modified file', () => {
      const past = new Date(Date.now() - 60000).toISOString();
      const metadata: DocumentMetadata = {
        generated: past,
        template_version: '1.0',
        status: 'draft',
        requirement_id: 'SEC-001',
        last_modified: new Date().toISOString(),
      };
      const content = addFrontmatter('# Title\n\nBody', metadata);
      fs.writeFileSync(testFile, content);

      expect(isUserModified(testFile)).toBe(true);
    });

    it('should return true for approved documents', () => {
      const metadata: DocumentMetadata = {
        generated: new Date().toISOString(),
        template_version: '1.0',
        status: 'approved',
        requirement_id: 'SEC-001',
      };
      const content = addFrontmatter('# Title\n\nBody', metadata);
      fs.writeFileSync(testFile, content);

      expect(isUserModified(testFile)).toBe(true);
    });
  });

  describe('getDocumentStatus', () => {
    it('should return null for non-existent file', () => {
      expect(getDocumentStatus('/nonexistent/file.md')).toBeNull();
    });

    it('should return null for file without frontmatter', () => {
      fs.writeFileSync(testFile, '# Document\n\nNo frontmatter');
      expect(getDocumentStatus(testFile)).toBeNull();
    });

    it('should return status from frontmatter', () => {
      const metadata: DocumentMetadata = {
        generated: new Date().toISOString(),
        template_version: '1.0',
        status: 'approved',
        requirement_id: 'SEC-001',
      };
      const content = addFrontmatter('# Title\n\nBody', metadata);
      fs.writeFileSync(testFile, content);

      expect(getDocumentStatus(testFile)).toBe('approved');
    });
  });

  describe('updateDocumentStatus', () => {
    it('should update status in frontmatter', () => {
      const metadata: DocumentMetadata = {
        generated: new Date().toISOString(),
        template_version: '1.0',
        status: 'draft',
        requirement_id: 'SEC-001',
      };
      const content = addFrontmatter('# Title\n\nBody', metadata);
      fs.writeFileSync(testFile, content);

      updateDocumentStatus(testFile, 'approved');

      const updated = fs.readFileSync(testFile, 'utf-8');
      expect(updated).toContain('status: "approved"');
      expect(updated).toContain('last_modified:');
    });

    it('should not fail on non-existent file', () => {
      expect(() => updateDocumentStatus('/nonexistent/file.md', 'approved')).not.toThrow();
    });
  });

  describe('updateLastModified', () => {
    it('should update last_modified timestamp', () => {
      const metadata: DocumentMetadata = {
        generated: new Date().toISOString(),
        template_version: '1.0',
        status: 'draft',
        requirement_id: 'SEC-001',
      };
      const content = addFrontmatter('# Title\n\nBody', metadata);
      fs.writeFileSync(testFile, content);

      updateLastModified(testFile);

      const updated = fs.readFileSync(testFile, 'utf-8');
      const { metadata: updatedMetadata } = parseFrontmatter(updated);

      expect(updatedMetadata?.last_modified).toBeDefined();
    });
  });
});
