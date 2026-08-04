/**
 * Tests for Non-Technical Evidence Collector
 */

import {
  collectNonTechnicalEvidence,
  convertToEvidenceArtifacts,
  saveNonTechnicalEvidence,
  filterByCategory,
  getMissingByCategory,
  type NonTechnicalCollectorResult,
  type NonTechnicalEvidence,
} from '../../collectors/non-technical-collector';
import * as fs from 'fs';
import * as path from 'path';

describe('non-technical-collector', () => {
  const testProjectDir = path.join(__dirname, '../fixtures/test-project');
  const testDocsDir = path.join(testProjectDir, 'docs');
  const testOutputDir = path.join(__dirname, '../fixtures/output');

  beforeAll(() => {
    // Create test directory structure
    fs.mkdirSync(path.join(testDocsDir, 'msp'), { recursive: true });
    fs.mkdirSync(path.join(testDocsDir, 'policies'), { recursive: true });
    fs.mkdirSync(path.join(testDocsDir, 'processes'), { recursive: true });
    fs.mkdirSync(testOutputDir, { recursive: true });

    // Create sample documents for testing
    // BUS-001: Company overview
    fs.writeFileSync(
      path.join(testDocsDir, 'msp', 'company-overview.md'),
      `---
requirementId: BUS-001
category: business
---

# Company Overview

## About Us
We are a leading managed service provider...

## History
Founded in 2020...

## Services
- Cloud migration
- Managed services
- DevOps consulting
`.repeat(5), // Make it >500 chars
      'utf-8'
    );

    // GOV-001: Risk register
    fs.writeFileSync(
      path.join(testDocsDir, 'policies', 'risk-register.md'),
      `---
requirementId: GOV-001
category: governance
---

# Risk Register

## Overview
This document outlines business risks...

## Risk Assessment Framework
- Risk identification
- Risk analysis
- Mitigation planning

## Active Risks
1. Market risk
2. Operational risk
3. Technology risk
`.repeat(3),
      'utf-8'
    );

    // GOV-003: Data governance (minimal document)
    fs.writeFileSync(
      path.join(testDocsDir, 'policies', 'data-governance.md'),
      `# Data Governance

Short doc.`,
      'utf-8'
    );

    // PEO-003: Offboarding (old document)
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 1); // 1 year old
    fs.writeFileSync(
      path.join(testDocsDir, 'processes', 'offboarding.md'),
      `---
requirementId: PEO-003
---

# Personnel Offboarding

## Process
1. Notify HR
2. Revoke access
3. Collect equipment
`.repeat(5),
      'utf-8'
    );
    fs.utimesSync(
      path.join(testDocsDir, 'processes', 'offboarding.md'),
      oldDate,
      oldDate
    );
  });

  afterAll(() => {
    // Cleanup test directories
    fs.rmSync(testProjectDir, { recursive: true, force: true });
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  });

  describe('collectNonTechnicalEvidence', () => {
    it('should find existing documents', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      expect(result.evidence).toBeDefined();
      expect(result.evidence.length).toBe(18); // All 18 non-technical requirements

      // Should find BUS-001
      const bus001 = result.evidence.find(e => e.requirementId === 'BUS-001');
      expect(bus001).toBeDefined();
      expect(bus001?.found).toBe(true);
      expect(bus001?.documentPath).toContain('company-overview.md');
      expect(bus001?.category).toBe('business');

      // Should find GOV-001
      const gov001 = result.evidence.find(e => e.requirementId === 'GOV-001');
      expect(gov001).toBeDefined();
      expect(gov001?.found).toBe(true);
      expect(gov001?.documentPath).toContain('risk-register.md');
      expect(gov001?.category).toBe('governance');
    });

    it('should mark missing documents as not found', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      // Should not find BUS-002 (growth docs)
      const bus002 = result.evidence.find(e => e.requirementId === 'BUS-002');
      expect(bus002).toBeDefined();
      expect(bus002?.found).toBe(false);
      expect(bus002?.documentPath).toBeUndefined();

      // Should not find PLAT-004 (WAFR)
      const plat004 = result.evidence.find(e => e.requirementId === 'PLAT-004');
      expect(plat004).toBeDefined();
      expect(plat004?.found).toBe(false);
    });

    it('should calculate completeness scores', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      // BUS-001 should have high completeness (frontmatter + headers + length + recent)
      const bus001 = result.evidence.find(e => e.requirementId === 'BUS-001');
      expect(bus001?.completeness).toBeGreaterThanOrEqual(75);

      // GOV-003 should have low completeness (no frontmatter, short)
      const gov003 = result.evidence.find(e => e.requirementId === 'GOV-003');
      expect(gov003?.completeness).toBeLessThan(75);

      // PEO-003 should lose points for being old
      const peo003 = result.evidence.find(e => e.requirementId === 'PEO-003');
      expect(peo003?.completeness).toBeLessThanOrEqual(75);
    });

    it('should include last modified dates', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      const bus001 = result.evidence.find(e => e.requirementId === 'BUS-001');
      expect(bus001?.lastModified).toBeDefined();
      // lastModified should be a valid date (either Date object or parseable string)
      const dateValue = bus001?.lastModified;
      expect(dateValue).toBeTruthy();
      expect(new Date(dateValue as any).getTime()).not.toBeNaN();
    });

    it('should generate accurate summary', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      expect(result.summary.totalRequirements).toBe(18);
      expect(result.summary.found).toBeGreaterThan(0);
      expect(result.summary.missing).toBe(18 - result.summary.found);
      expect(result.summary.found + result.summary.missing).toBe(18);
    });

    it('should categorize evidence correctly', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      expect(result.summary.byCategory.business).toBeDefined();
      expect(result.summary.byCategory.people).toBeDefined();
      expect(result.summary.byCategory.governance).toBeDefined();
      expect(result.summary.byCategory.platform).toBeDefined();

      // Check that category totals are correct
      expect(result.summary.byCategory.business.total).toBe(4);
      expect(result.summary.byCategory.people.total).toBe(3);
      expect(result.summary.byCategory.governance.total).toBe(6);
      expect(result.summary.byCategory.platform.total).toBe(5);
    });

    it('should handle missing directories gracefully', async () => {
      const nonExistentPath = path.join(testProjectDir, 'nonexistent');
      const result = await collectNonTechnicalEvidence(nonExistentPath, nonExistentPath);

      expect(result.evidence.length).toBe(18);
      expect(result.summary.found).toBe(0);
      expect(result.summary.missing).toBe(18);
    });
  });

  describe('convertToEvidenceArtifacts', () => {
    it('should convert found evidence to artifacts', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);
      const artifacts = convertToEvidenceArtifacts(result.evidence);

      expect(artifacts.length).toBeGreaterThan(0);

      const bus001Artifact = artifacts.find(a => a.requirementIds.includes('BUS-001'));
      expect(bus001Artifact).toBeDefined();
      expect(bus001Artifact?.type).toBe('document');
      expect(bus001Artifact?.path).toContain('company-overview.md');
      expect(bus001Artifact?.description).toBe('Company overview presentation');
      expect(bus001Artifact?.collectedAt).toBeInstanceOf(Date);
      expect(bus001Artifact?.metadata?.completeness).toBeDefined();
      expect(bus001Artifact?.metadata?.category).toBe('business');
    });

    it('should not include missing documents in artifacts', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);
      const artifacts = convertToEvidenceArtifacts(result.evidence);

      // Should not have artifacts for documents that weren't found
      const missingCount = result.evidence.filter(e => !e.found).length;
      expect(artifacts.length).toBe(result.summary.found);
      expect(artifacts.length).toBeLessThan(18);
    });

    it('should include metadata in artifacts', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);
      const artifacts = convertToEvidenceArtifacts(result.evidence);

      for (const artifact of artifacts) {
        expect(artifact.metadata).toBeDefined();
        expect(artifact.metadata?.found).toBe(true);
        expect(artifact.metadata?.completeness).toBeDefined();
        expect(artifact.metadata?.category).toBeDefined();
      }
    });
  });

  describe('saveNonTechnicalEvidence', () => {
    it('should save evidence to JSON file', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);
      const outputPath = path.join(testOutputDir, 'non-technical-evidence.json');

      const artifact = saveNonTechnicalEvidence(result, outputPath);

      // Check that file was created
      expect(fs.existsSync(outputPath)).toBe(true);

      // Check artifact metadata
      expect(artifact.type).toBe('document');
      expect(artifact.path).toBe(outputPath);
      expect(artifact.requirementIds.length).toBe(18);
      expect(artifact.metadata?.totalRequirements).toBe(18);
      expect(artifact.metadata?.found).toBeGreaterThan(0);

      // Check file content
      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(content.evidence).toBeDefined();
      expect(content.summary).toBeDefined();
      expect(content.evidence.length).toBe(18);
    });

    it('should create output directory if missing', () => {
      const result: NonTechnicalCollectorResult = {
        evidence: [],
        summary: {
          totalRequirements: 0,
          found: 0,
          missing: 0,
          byCategory: {
            business: { found: 0, total: 0 },
            people: { found: 0, total: 0 },
            governance: { found: 0, total: 0 },
            platform: { found: 0, total: 0 },
          },
        },
      };

      const outputPath = path.join(testOutputDir, 'nested', 'dir', 'evidence.json');
      saveNonTechnicalEvidence(result, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(fs.existsSync(path.dirname(outputPath))).toBe(true);
    });
  });

  describe('filterByCategory', () => {
    it('should filter evidence by category', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      const business = filterByCategory(result, 'business');
      expect(business.length).toBe(4);
      expect(business.every(e => e.category === 'business')).toBe(true);

      const people = filterByCategory(result, 'people');
      expect(people.length).toBe(3);
      expect(people.every(e => e.category === 'people')).toBe(true);

      const governance = filterByCategory(result, 'governance');
      expect(governance.length).toBe(6);
      expect(governance.every(e => e.category === 'governance')).toBe(true);

      const platform = filterByCategory(result, 'platform');
      expect(platform.length).toBe(5);
      expect(platform.every(e => e.category === 'platform')).toBe(true);
    });
  });

  describe('getMissingByCategory', () => {
    it('should return only missing evidence for category', async () => {
      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      const missingBusiness = getMissingByCategory(result, 'business');
      expect(missingBusiness.every(e => e.category === 'business' && !e.found)).toBe(true);

      const missingGovernance = getMissingByCategory(result, 'governance');
      expect(missingGovernance.every(e => e.category === 'governance' && !e.found)).toBe(true);
    });

    it('should return empty array if all found', () => {
      const mockResult: NonTechnicalCollectorResult = {
        evidence: [
          {
            requirementId: 'BUS-001',
            category: 'business',
            found: true,
            documentPath: '/path/to/doc.md',
            documentType: 'Test',
          },
          {
            requirementId: 'BUS-002',
            category: 'business',
            found: true,
            documentPath: '/path/to/doc2.md',
            documentType: 'Test 2',
          },
        ],
        summary: {
          totalRequirements: 2,
          found: 2,
          missing: 0,
          byCategory: {
            business: { found: 2, total: 2 },
            people: { found: 0, total: 0 },
            governance: { found: 0, total: 0 },
            platform: { found: 0, total: 0 },
          },
        },
      };

      const missing = getMissingByCategory(mockResult, 'business');
      expect(missing.length).toBe(0);
    });
  });

  describe('case-insensitive matching', () => {
    it('should find documents with different casing', async () => {
      // Create a document with different casing
      fs.writeFileSync(
        path.join(testDocsDir, 'msp', 'COMPANY-PROFILE.MD'),
        '# Company Profile\n\nThis is a company profile document.',
        'utf-8'
      );

      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      // Should still find BUS-001 (pattern includes company-profile)
      const bus001 = result.evidence.find(e => e.requirementId === 'BUS-001');
      expect(bus001?.found).toBe(true);
    });
  });

  describe('multiple pattern matching', () => {
    it('should match any of the specified patterns', async () => {
      // PEO-002 has patterns: ccoe, cloud-center, center-of-excellence
      fs.writeFileSync(
        path.join(testDocsDir, 'processes', 'center-of-excellence.md'),
        `---
requirementId: PEO-002
---

# Cloud Center of Excellence

## Overview
`.repeat(5),
        'utf-8'
      );

      const result = await collectNonTechnicalEvidence(testProjectDir, testDocsDir);

      const peo002 = result.evidence.find(e => e.requirementId === 'PEO-002');
      expect(peo002?.found).toBe(true);
      expect(peo002?.documentPath).toContain('center-of-excellence.md');
    });
  });
});
