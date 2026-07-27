/**
 * Tests for configuration loader
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, ConfigError } from '../src/config/loader';

describe('Config Loader', () => {
  const testConfigDir = path.join(__dirname, 'fixtures');
  const testConfigPath = path.join(testConfigDir, 'test-config.yaml');

  beforeAll(() => {
    // Create test fixtures directory
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // Create dummy docs and infra directories
    const docsPath = path.join(testConfigDir, 'docs');
    const infraPath = path.join(testConfigDir, 'infra');
    if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });
    if (!fs.existsSync(infraPath)) fs.mkdirSync(infraPath, { recursive: true });
  });

  afterAll(() => {
    // Clean up test fixtures
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  test('loads valid configuration', () => {
    const configContent = `
project:
  name: "Test Project"
  docs_path: "./docs"
  infra_path: "./infra"

aws:
  profile: "default"
  region: "us-east-1"
  stage: "test"

msp:
  version: "Feb2026-Aug2026"
  ig_level: 1
  organization:
    name: "Test Org"
    contact: "test@example.com"

output:
  evidence_path: "./evidence"
  playbooks_path: "./playbooks"
  dashboard_path: "./dashboard.html"
  report_format: "both"

assessment:
  skip_requirements: []
  custom_priorities: {}
  include_recommended: true
  auto_collect_evidence: true
  auto_generate_docs: true
`;

    fs.writeFileSync(testConfigPath, configContent);

    const config = loadConfig(testConfigPath);

    expect(config.project.name).toBe('Test Project');
    expect(config.aws.profile).toBe('default');
    expect(config.aws.region).toBe('us-east-1');
    expect(config.aws.stage).toBe('test');
    expect(config.msp.version).toBe('Feb2026-Aug2026');
    expect(config.msp.ig_level).toBe(1);
  });

  test('throws error when config file not found', () => {
    expect(() => {
      loadConfig('nonexistent.yaml');
    }).toThrow(ConfigError);
  });

  test('throws error when docs path does not exist', () => {
    const configContent = `
project:
  name: "Test Project"
  docs_path: "./nonexistent-docs"
  infra_path: "./infra"

aws:
  profile: "default"
  region: "us-east-1"
  stage: "test"

msp:
  version: "Feb2026-Aug2026"
  ig_level: 1

output:
  evidence_path: "./evidence"
  playbooks_path: "./playbooks"
  dashboard_path: "./dashboard.html"

assessment:
  skip_requirements: []
  custom_priorities: {}
`;

    fs.writeFileSync(testConfigPath, configContent);

    expect(() => {
      loadConfig(testConfigPath);
    }).toThrow(ConfigError);
    expect(() => {
      loadConfig(testConfigPath);
    }).toThrow(/Documentation path does not exist/);
  });

  test('applies defaults for optional fields', () => {
    const configContent = `
project:
  name: "Test Project"
  docs_path: "./docs"
  infra_path: "./infra"

aws:
  profile: "default"
  region: "us-east-1"
  stage: "test"

msp: {}

output:
  evidence_path: "./evidence"

assessment: {}
`;

    fs.writeFileSync(testConfigPath, configContent);

    const config = loadConfig(testConfigPath);

    expect(config.msp.version).toBe('Feb2026-Aug2026');
    expect(config.msp.ig_level).toBe(1);
    expect(config.assessment.skip_requirements).toEqual([]);
    expect(config.assessment.include_recommended).toBe(true);
  });

  test('throws error for missing required fields', () => {
    const configContent = `
project:
  name: "Test Project"

aws:
  profile: "default"
`;

    fs.writeFileSync(testConfigPath, configContent);

    expect(() => {
      loadConfig(testConfigPath);
    }).toThrow(ConfigError);
  });
});
