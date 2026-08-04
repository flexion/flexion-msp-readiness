/**
 * Tests for Document Validator
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateDocument,
  getDefaultDocumentRequirements,
  determineDocumentType,
} from '../../validators/document-validator';
import { MSPRequirement } from '../../types';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Document Validator', () => {
  const testFilePath = '/test/docs/security-policy.md';

  const mockRequirement: MSPRequirement = {
    id: 'SEC-001',
    name: 'Security Policies',
    category: 'security',
    description: 'Test requirement',
    priority: 'critical',
    evidenceRequired: ['security-policies'],
    estimatedHours: 8,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDocument', () => {
    it('should fail if document does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await validateDocument(
        testFilePath,
        { requireFrontmatter: false },
        mockRequirement
      );

      expect(result.valid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.checks[0].name).toBe('Document exists');
      expect(result.checks[0].passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('missing');
    });

    it('should pass basic validation for valid document', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 1024,
        mtime: new Date(),
      } as fs.Stats);
      mockFs.readFileSync.mockReturnValue('# Test Document\n\nThis is a test document with enough content.');

      const result = await validateDocument(
        testFilePath,
        { minimumLength: 5 },
        mockRequirement
      );

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.metadata?.exists).toBe(true);
    });

    it('should detect empty document', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 0,
        mtime: new Date(),
      } as fs.Stats);
      mockFs.readFileSync.mockReturnValue('');

      const result = await validateDocument(
        testFilePath,
        {},
        mockRequirement
      );

      expect(result.valid).toBe(false);
      const contentCheck = result.checks.find(c => c.name === 'Document has content');
      expect(contentCheck?.passed).toBe(false);
    });

    it('should detect document below minimum length', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 100,
        mtime: new Date(),
      } as fs.Stats);
      mockFs.readFileSync.mockReturnValue('Short content');

      const result = await validateDocument(
        testFilePath,
        { minimumLength: 100 },
        mockRequirement
      );

      const lengthCheck = result.checks.find(c => c.name === 'Minimum content length');
      expect(lengthCheck?.passed).toBe(false);
    });

    it('should detect stale document', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 1); // 12 months ago

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 1024,
        mtime: oldDate,
      } as fs.Stats);
      mockFs.readFileSync.mockReturnValue('# Test\n\nContent here with enough words to pass minimum length requirements.');

      const result = await validateDocument(
        testFilePath,
        { maximumAge: 6, minimumLength: 5 },
        mockRequirement
      );

      const freshnessCheck = result.checks.find(c => c.name === 'Document freshness');
      expect(freshnessCheck?.passed).toBe(false);
    });

    it('should validate required sections', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 1024,
        mtime: new Date(),
      } as fs.Stats);
      mockFs.readFileSync.mockReturnValue(`
# Security Policy

## Purpose
This is the purpose

## Scope
This is the scope

Some more content to meet minimum length requirements.
      `);

      const result = await validateDocument(
        testFilePath,
        {
          requiredSections: ['Purpose', 'Scope', 'Controls'],
          minimumLength: 10,
        },
        mockRequirement
      );

      const sectionsCheck = result.checks.find(c => c.name === 'Required sections present');
      expect(sectionsCheck?.passed).toBe(false); // Missing 'Controls'
      expect(sectionsCheck?.actual).toContain('Controls');
    });

    it('should validate frontmatter presence', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 1024,
        mtime: new Date(),
      } as fs.Stats);
      mockFs.readFileSync.mockReturnValue(`---
title: Security Policy
requirementId: SEC-001
---

# Security Policy

Content here.
      `);

      const result = await validateDocument(
        testFilePath,
        { requireFrontmatter: true, minimumLength: 5 },
        mockRequirement
      );

      const frontmatterCheck = result.checks.find(c => c.name === 'YAML frontmatter present');
      expect(frontmatterCheck?.passed).toBe(true);
    });

    it('should detect TODO markers', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 1024,
        mtime: new Date(),
      } as fs.Stats);
      mockFs.readFileSync.mockReturnValue(`
# Security Policy

TODO: Complete this section
FIXME: Update this content

Some additional content to meet minimum requirements.
      `);

      const result = await validateDocument(
        testFilePath,
        { allowTodos: false, minimumLength: 5 },
        mockRequirement
      );

      const todoCheck = result.checks.find(c => c.name === 'No TODO markers');
      expect(todoCheck?.passed).toBe(false);
      expect(todoCheck?.actual).toContain('2');
    });
  });

  describe('getDefaultDocumentRequirements', () => {
    it('should return stricter requirements for critical priority', () => {
      const req: MSPRequirement = {
        ...mockRequirement,
        priority: 'critical',
      };

      const reqs = getDefaultDocumentRequirements(req, 'policy');

      expect(reqs.maximumAge).toBe(6); // 6 months
    });

    it('should return relaxed requirements for medium priority', () => {
      const req: MSPRequirement = {
        ...mockRequirement,
        priority: 'medium',
      };

      const reqs = getDefaultDocumentRequirements(req, 'policy');

      expect(reqs.maximumAge).toBe(18); // 18 months
    });

    it('should set appropriate minimums for policy documents', () => {
      const reqs = getDefaultDocumentRequirements(mockRequirement, 'policy');

      expect(reqs.minimumLength).toBe(500);
      expect(reqs.requiredSections).toContain('Purpose');
      expect(reqs.requiredSections).toContain('Scope');
    });

    it('should set appropriate minimums for playbooks', () => {
      const reqs = getDefaultDocumentRequirements(mockRequirement, 'playbook');

      expect(reqs.minimumLength).toBe(500);
      expect(reqs.requiredSections).toContain('Overview');
      expect(reqs.requiredSections).toContain('Procedures');
    });

    it('should set appropriate minimums for runbooks', () => {
      const reqs = getDefaultDocumentRequirements(mockRequirement, 'runbook');

      expect(reqs.minimumLength).toBe(300);
      expect(reqs.requiredSections).toContain('Prerequisites');
      expect(reqs.requiredSections).toContain('Steps');
    });
  });

  describe('determineDocumentType', () => {
    it('should detect policy documents', () => {
      expect(determineDocumentType('/docs/security-policy.md')).toBe('policy');
      expect(determineDocumentType('/docs/policies/access.md')).toBe('policy');
    });

    it('should detect playbooks', () => {
      expect(determineDocumentType('/docs/incident-response-playbook.md')).toBe('playbook');
      expect(determineDocumentType('/playbooks/security.md')).toBe('playbook');
    });

    it('should detect runbooks', () => {
      expect(determineDocumentType('/docs/deployment-runbook.md')).toBe('runbook');
      expect(determineDocumentType('/runbooks/backup.md')).toBe('runbook');
    });

    it('should detect templates', () => {
      expect(determineDocumentType('/templates/policy-template.md')).toBe('template');
    });

    it('should default to playbook for unknown types', () => {
      expect(determineDocumentType('/docs/unknown.md')).toBe('playbook');
    });
  });
});
