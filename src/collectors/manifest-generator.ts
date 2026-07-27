/**
 * Evidence Manifest Generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { EvidenceArtifact } from '../types';

export interface EvidenceManifest {
  generatedAt: Date;
  evidenceCount: number;
  evidenceByRequirement: Map<string, EvidenceArtifact[]>;
  evidenceByType: Map<string, number>;
  artifacts: EvidenceArtifact[];
}

export function generateManifest(artifacts: EvidenceArtifact[]): EvidenceManifest {
  const evidenceByRequirement = new Map<string, EvidenceArtifact[]>();
  const evidenceByType = new Map<string, number>();

  for (const artifact of artifacts) {
    // Group by requirement
    for (const reqId of artifact.requirementIds) {
      if (!evidenceByRequirement.has(reqId)) {
        evidenceByRequirement.set(reqId, []);
      }
      evidenceByRequirement.get(reqId)!.push(artifact);
    }

    // Count by type
    evidenceByType.set(artifact.type, (evidenceByType.get(artifact.type) || 0) + 1);
  }

  return {
    generatedAt: new Date(),
    evidenceCount: artifacts.length,
    evidenceByRequirement,
    evidenceByType,
    artifacts,
  };
}

export function saveManifest(manifest: EvidenceManifest, outputPath: string): void {
  const md: string[] = [];

  md.push('# Evidence Manifest\n');
  md.push(`**Generated**: ${manifest.generatedAt.toISOString()}\n`);
  md.push(`**Total Evidence Files**: ${manifest.evidenceCount}\n\n`);

  // Summary by type
  md.push('## Evidence by Type\n\n');
  for (const [type, count] of manifest.evidenceByType.entries()) {
    md.push(`- **${type}**: ${count} file(s)\n`);
  }
  md.push('\n');

  // Evidence by requirement
  md.push('## Evidence by Requirement\n\n');
  const sortedReqs = Array.from(manifest.evidenceByRequirement.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [reqId, artifacts] of sortedReqs) {
    md.push(`### ${reqId}\n\n`);
    for (const artifact of artifacts) {
      md.push(`- **${artifact.description}**\n`);
      md.push(`  - Path: \`${artifact.path}\`\n`);
      md.push(`  - Collected: ${artifact.collectedAt.toISOString().split('T')[0]}\n`);
      if (artifact.expiresAt) {
        md.push(`  - Expires: ${artifact.expiresAt.toISOString().split('T')[0]}\n`);
      }
    }
    md.push('\n');
  }

  // All artifacts
  md.push('## All Evidence Files\n\n');
  md.push('| File | Type | Description | Requirements | Collected |\n');
  md.push('|------|------|-------------|--------------|----------|\n');

  for (const artifact of manifest.artifacts) {
    const fileName = path.basename(artifact.path);
    const reqs = artifact.requirementIds.join(', ');
    const date = artifact.collectedAt.toISOString().split('T')[0];
    md.push(`| ${fileName} | ${artifact.type} | ${artifact.description} | ${reqs} | ${date} |\n`);
  }

  fs.writeFileSync(outputPath, md.join(''), 'utf-8');
}

export function printManifestSummary(manifest: EvidenceManifest): void {
  console.log('Evidence Manifest:');
  console.log(`  Total evidence files: ${manifest.evidenceCount}`);
  console.log(`  Requirements covered: ${manifest.evidenceByRequirement.size}`);
  console.log('  By type:');
  for (const [type, count] of manifest.evidenceByType.entries()) {
    console.log(`    ${type}: ${count}`);
  }
  console.log('');
}
