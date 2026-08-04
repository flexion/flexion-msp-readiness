#!/usr/bin/env node

/**
 * Validate that the build process completed successfully
 * This script checks that:
 * 1. The dist directory exists
 * 2. TypeScript files were compiled to JavaScript
 * 3. Template files (.hbs, .html) were copied
 */

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const errors = [];

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  errors.push('❌ dist directory does not exist');
  console.error(errors.join('\n'));
  process.exit(1);
}

// Check for compiled JavaScript files
const cliJs = path.join(distPath, 'cli.js');
if (!fs.existsSync(cliJs)) {
  errors.push('❌ dist/cli.js not found - TypeScript compilation may have failed');
}

// Check for template files
const templatesChecks = [
  { path: 'playbooks/incident-response.hbs', name: 'Incident Response playbook' },
  { path: 'playbooks/change-management.hbs', name: 'Change Management playbook' },
  { path: 'runbooks/access-key-rotation.hbs', name: 'Access Key Rotation runbook' },
];

templatesChecks.forEach(({ path: templatePath, name }) => {
  const fullPath = path.join(distPath, templatePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`❌ Template missing: ${templatePath} (${name})`);
  }
});

// Report results
if (errors.length > 0) {
  console.error('\n❌ Build validation failed:\n');
  console.error(errors.join('\n'));
  console.error('\nPlease ensure:');
  console.error('1. TypeScript compilation completed without errors');
  console.error('2. Template files are being copied from templates/ to dist/');
  console.error('3. The copy-templates script is working correctly\n');
  process.exit(1);
}

console.log('✅ Build validation passed:');
console.log(`  - dist directory exists`);
console.log(`  - TypeScript files compiled`);
console.log(`  - ${templatesChecks.length} template files copied`);
console.log('');
