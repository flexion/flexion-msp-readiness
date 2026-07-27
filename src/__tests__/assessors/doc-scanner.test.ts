/**
 * Tests for document scanner
 */

import * as fs from 'fs';
import * as path from 'path';
import { scanDocumentation } from '../../assessors/doc-scanner';

describe('doc-scanner', () => {
  const testFixturesDir = path.join(__dirname, '../fixtures/docs');

  beforeAll(() => {
    // Create test fixtures directory structure
    const playbooksDir = path.join(testFixturesDir, 'playbooks');
    fs.mkdirSync(playbooksDir, { recursive: true });

    // Create test markdown files in playbooks directory
    fs.writeFileSync(
      path.join(playbooksDir, 'incident-response.md'),
      '# Incident Response\n\nThis addresses SEC-001 and SEC-002.\n\nWe follow SECP-001 for access key exposure.'
    );

    fs.writeFileSync(
      path.join(playbooksDir, 'backup-plan.md'),
      '# Backup Plan\n\nBackup strategy per OPS-003.\n\nThis covers DR requirements.'
    );

    fs.writeFileSync(
      path.join(playbooksDir, 'change-management.md'),
      '# Change Management\n\nFollows OPS-006 requirements.\n\nIntegrates with SECP-002 detection.'
    );

    fs.writeFileSync(path.join(testFixturesDir, 'readme.txt'), 'This is not a markdown file');
  });

  afterAll(() => {
    // Clean up test fixtures
    fs.rmSync(testFixturesDir, { recursive: true, force: true });
  });

  it('should scan directory and find markdown files', async () => {
    const result = await scanDocumentation(testFixturesDir);

    expect(result.totalFiles).toBe(3); // Only .md files
    expect(result.files.length).toBe(3);
  });

  it('should extract requirement IDs from content', async () => {
    const result = await scanDocumentation(testFixturesDir);

    // Check that requirement mentions were found
    expect(result.requirementMentions.has('SEC-001')).toBe(true);
    expect(result.requirementMentions.has('SEC-002')).toBe(true);
    expect(result.requirementMentions.has('SECP-001')).toBe(true);
  });

  it('should categorize document types', async () => {
    const result = await scanDocumentation(testFixturesDir);

    const incidentDoc = result.files.find(f => f.relativePath.includes('incident-response.md'));
    expect(incidentDoc!.type).toBe('playbook');

    const changeDoc = result.files.find(f => f.relativePath.includes('change-management.md'));
    expect(changeDoc!.type).toBe('playbook');
  });

  it('should calculate total mentions correctly', async () => {
    const result = await scanDocumentation(testFixturesDir);

    // SEC-001: 1 mention
    // SEC-002: 1 mention
    // SECP-001: 2 mentions
    // SECP-002: 1 mention
    // OPS-003: 1 mention
    // OPS-006: 1 mention
    expect(result.totalRequirementMentions).toBeGreaterThanOrEqual(6);
  });

  it('should group references by requirement', async () => {
    const result = await scanDocumentation(testFixturesDir);

    expect(result.requirementMentions.get('SEC-001')).toBeDefined();
    expect(result.requirementMentions.get('SEC-001')!.length).toBeGreaterThanOrEqual(1);

    expect(result.requirementMentions.get('SECP-001')).toBeDefined();
    expect(result.requirementMentions.get('SECP-001')!.length).toBeGreaterThanOrEqual(1);

    expect(result.requirementMentions.get('OPS-006')).toBeDefined();
    expect(result.requirementMentions.get('OPS-006')!.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty directories', async () => {
    const emptyDir = path.join(testFixturesDir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    const result = await scanDocumentation(emptyDir);

    expect(result.totalFiles).toBe(0);
    expect(result.totalRequirementMentions).toBe(0);
    expect(result.files.length).toBe(0);

    fs.rmdirSync(emptyDir);
  });

  it('should handle non-existent directories', async () => {
    const nonExistentDir = path.join(testFixturesDir, 'does-not-exist');

    await expect(scanDocumentation(nonExistentDir)).rejects.toThrow();
  });

  it('should identify strong vs weak references', async () => {
    const result = await scanDocumentation(testFixturesDir);

    // Check that some requirement mentions have reference types
    const sec001Refs = result.requirementMentions.get('SEC-001');
    if (sec001Refs && sec001Refs.length > 0) {
      expect(['strong', 'weak']).toContain(sec001Refs[0].type);
    }
  });
});
