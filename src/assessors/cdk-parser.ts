/**
 * CDK Infrastructure Parser
 * Parses AWS CDK TypeScript code to extract security-relevant resources
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CDKResource {
  type: string; // e.g., 's3.Bucket', 'ec2.SecurityGroup'
  file: string;
  line?: number;
  properties: Record<string, any>;
  securityFindings: CDKSecurityFinding[];
}

export interface CDKSecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  remediation?: string;
  mspRequirements: string[]; // e.g., ['SEC-009', 'SECP-002']
}

export interface CDKParseResult {
  resources: CDKResource[];
  securityFindings: CDKSecurityFinding[];
  stackFiles: string[];
  totalFiles: number;
  findingsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

/**
 * Parse CDK infrastructure code
 */
export async function parseCDKInfrastructure(infraPath: string): Promise<CDKParseResult> {
  const stackFiles = findCDKStackFiles(infraPath);
  const resources: CDKResource[] = [];
  const allFindings: CDKSecurityFinding[] = [];

  for (const filePath of stackFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileResources = extractResourcesFromFile(filePath, content);
    resources.push(...fileResources);

    // Analyze each resource for security issues
    for (const resource of fileResources) {
      const findings = analyzeResourceSecurity(resource);
      resource.securityFindings = findings;
      allFindings.push(...findings);
    }
  }

  // Count findings by severity
  const findingsBySeverity = {
    critical: allFindings.filter(f => f.severity === 'critical').length,
    high: allFindings.filter(f => f.severity === 'high').length,
    medium: allFindings.filter(f => f.severity === 'medium').length,
    low: allFindings.filter(f => f.severity === 'low').length,
    info: allFindings.filter(f => f.severity === 'info').length,
  };

  return {
    resources,
    securityFindings: allFindings,
    stackFiles,
    totalFiles: stackFiles.length,
    findingsBySeverity,
  };
}

/**
 * Find all CDK stack TypeScript files
 */
function findCDKStackFiles(infraPath: string): string[] {
  const files: string[] = [];

  function traverse(currentPath: string) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Skip common directories
        if (['node_modules', '.git', 'dist', 'build', 'cdk.out', 'test'].includes(entry.name)) {
          continue;
        }
        traverse(fullPath);
      } else if (entry.isFile()) {
        // Look for TypeScript files (excluding .d.ts)
        if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          // Prioritize files in lib/stacks, lib/constructs, or with 'stack' in name
          if (
            fullPath.includes('/lib/stacks/') ||
            fullPath.includes('/lib/constructs/') ||
            entry.name.toLowerCase().includes('stack')
          ) {
            files.push(fullPath);
          }
        }
      }
    }
  }

  traverse(infraPath);
  return files;
}

/**
 * Extract resources from CDK TypeScript file using simple pattern matching
 * Note: This is a simplified parser. A full solution would use TypeScript AST
 */
function extractResourcesFromFile(filePath: string, content: string): CDKResource[] {
  const resources: CDKResource[] = [];
  const lines = content.split('\n');

  // Common CDK resource patterns
  const resourcePatterns = [
    { pattern: /new\s+s3\.Bucket\s*\(/, type: 's3.Bucket' },
    { pattern: /new\s+ec2\.SecurityGroup\s*\(/, type: 'ec2.SecurityGroup' },
    { pattern: /new\s+ec2\.Vpc\s*\(/, type: 'ec2.Vpc' },
    { pattern: /new\s+rds\.DatabaseInstance\s*\(/, type: 'rds.DatabaseInstance' },
    { pattern: /new\s+rds\.DatabaseCluster\s*\(/, type: 'rds.DatabaseCluster' },
    { pattern: /new\s+kms\.Key\s*\(/, type: 'kms.Key' },
    { pattern: /new\s+iam\.Role\s*\(/, type: 'iam.Role' },
    { pattern: /new\s+iam\.Policy\s*\(/, type: 'iam.Policy' },
    { pattern: /new\s+lambda\.Function\s*\(/, type: 'lambda.Function' },
    { pattern: /new\s+ecs\.Cluster\s*\(/, type: 'ecs.Cluster' },
    { pattern: /new\s+elb\.ApplicationLoadBalancer\s*\(/, type: 'elb.ApplicationLoadBalancer' },
    { pattern: /new\s+logs\.LogGroup\s*\(/, type: 'logs.LogGroup' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { pattern, type } of resourcePatterns) {
      if (pattern.test(line)) {
        // Extract properties from the resource definition (simplified)
        const properties = extractResourceProperties(lines, i);

        const resource: CDKResource = {
          type,
          file: path.basename(filePath),
          line: i + 1,
          properties,
          securityFindings: [],
        };

        resources.push(resource);
      }
    }
  }

  return resources;
}

/**
 * Extract properties from resource definition (simplified)
 * Looks for common property patterns in the next ~50 lines
 */
function extractResourceProperties(lines: string[], startLine: number): Record<string, any> {
  const properties: Record<string, any> = {};
  const maxLines = Math.min(startLine + 50, lines.length);

  for (let i = startLine; i < maxLines; i++) {
    const line = lines[i].trim();

    // Look for encryption properties
    if (line.includes('encryption:') || line.includes('encrypted:')) {
      properties.encryption = line.includes('true') || line.includes('Encryption');
    }

    // Look for public access
    if (line.includes('publicReadAccess:') || line.includes('publicAccess')) {
      properties.publicAccess = line.includes('true') || line.includes('PUBLIC');
    }

    // Look for versioning
    if (line.includes('versioned:')) {
      properties.versioned = line.includes('true');
    }

    // Look for logging
    if (line.includes('logging:') || line.includes('accessControl')) {
      properties.logging = !line.includes('false');
    }

    // Stop at end of resource definition (closing brace with semicolon)
    if (line.match(/^\}\);?$/)) {
      break;
    }
  }

  return properties;
}

/**
 * Analyze resource for security issues
 */
function analyzeResourceSecurity(resource: CDKResource): CDKSecurityFinding[] {
  const findings: CDKSecurityFinding[] = [];

  // S3 Bucket checks
  if (resource.type === 's3.Bucket') {
    if (resource.properties.encryption === false || !resource.properties.encryption) {
      findings.push({
        severity: 'high',
        title: 'S3 bucket not encrypted',
        description: `S3 bucket in ${resource.file}:${resource.line} does not have encryption enabled`,
        remediation:
          'Enable S3 bucket encryption using encryption: s3.BucketEncryption.S3_MANAGED or KMS',
        mspRequirements: ['SEC-009'],
      });
    }

    if (resource.properties.versioned === false) {
      findings.push({
        severity: 'medium',
        title: 'S3 bucket versioning not enabled',
        description: `S3 bucket in ${resource.file}:${resource.line} does not have versioning enabled`,
        remediation: 'Enable versioning: versioned: true',
        mspRequirements: ['OPS-005'],
      });
    }

    if (resource.properties.publicAccess === true) {
      findings.push({
        severity: 'critical',
        title: 'S3 bucket allows public access',
        description: `S3 bucket in ${resource.file}:${resource.line} allows public access`,
        remediation:
          'Remove publicReadAccess: true and use blockPublicAccess: BlockPublicAccess.BLOCK_ALL',
        mspRequirements: ['SECP-002', 'SEC-009'],
      });
    }
  }

  // RDS checks
  if (resource.type.includes('rds.Database')) {
    if (resource.properties.encryption === false || !resource.properties.encryption) {
      findings.push({
        severity: 'high',
        title: 'RDS database not encrypted',
        description: `RDS database in ${resource.file}:${resource.line} does not have encryption enabled`,
        remediation: 'Enable storage encryption: storageEncrypted: true',
        mspRequirements: ['SEC-009'],
      });
    }

    if (resource.properties.publicAccess === true) {
      findings.push({
        severity: 'critical',
        title: 'RDS database is publicly accessible',
        description: `RDS database in ${resource.file}:${resource.line} is publicly accessible`,
        remediation: 'Set publiclyAccessible: false',
        mspRequirements: ['SECP-002', 'SEC-003'],
      });
    }
  }

  // Security Group checks
  if (resource.type === 'ec2.SecurityGroup') {
    // Note: Would need more sophisticated parsing to check ingress rules
    findings.push({
      severity: 'info',
      title: 'Security Group detected',
      description: `Security Group in ${resource.file}:${resource.line} - manual review recommended`,
      remediation:
        'Verify ingress rules do not allow 0.0.0.0/0 access except for legitimate use cases',
      mspRequirements: ['SEC-003', 'SECP-002'],
    });
  }

  return findings;
}

/**
 * Print CDK parse summary
 */
export function printCDKSummary(result: CDKParseResult): void {
  console.log(`CDK Infrastructure analysis:`);
  console.log(`  Stack files: ${result.totalFiles}`);
  console.log(`  Resources found: ${result.resources.length}`);
  console.log(`  Security findings: ${result.securityFindings.length}`);
  if (result.securityFindings.length > 0) {
    console.log(`    Critical: ${result.findingsBySeverity.critical}`);
    console.log(`    High: ${result.findingsBySeverity.high}`);
    console.log(`    Medium: ${result.findingsBySeverity.medium}`);
    console.log(`    Low: ${result.findingsBySeverity.low}`);
  }
  console.log('');
}
