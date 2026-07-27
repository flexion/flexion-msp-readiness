/**
 * Quick test of doc scanner on fipco-infra
 */

import { scanDocumentation, printScanSummary } from './assessors/doc-scanner';

async function main() {
  const docsPath = '../fipco-infra/docs/managed-service-provider';

  console.log(`Scanning: ${docsPath}\n`);

  const result = await scanDocumentation(docsPath);

  printScanSummary(result);

  console.log('Requirements found:');
  const sortedReqs = Array.from(result.requirementMentions.entries())
    .sort((a, b) => b[1].length - a[1].length);

  for (const [reqId, refs] of sortedReqs.slice(0, 10)) {
    const strongRefs = refs.filter(r => r.type === 'strong').length;
    const weakRefs = refs.filter(r => r.type === 'weak').length;
    console.log(`  ${reqId}: ${refs.length} mentions (${strongRefs} strong, ${weakRefs} weak)`);
  }
}

main().catch(console.error);
