/**
 * OPS-002: AWS Support Plan Evidence Collector
 * Collects evidence of AWS Support plan subscription via AWS Support API
 */

import { SupportClient, DescribeSeverityLevelsCommand } from '@aws-sdk/client-support';
import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface SupportPlanEvidence {
  supportPlan: SupportPlanInfo;
  severityLevels: SeverityLevel[];
  summary: {
    hasSupportPlan: boolean;
    planTier: string;
    meetsRequirement: boolean;
    compliant: boolean;
  };
}

export interface SupportPlanInfo {
  tier: 'Basic' | 'Developer' | 'Business' | 'Enterprise' | 'Unknown';
  features: string[];
  hasBusinessOrHigher: boolean;
}

export interface SeverityLevel {
  code: string;
  name: string;
}

/**
 * Collect AWS Support plan evidence
 */
export async function collectSupportPlanEvidence(
  region: string
): Promise<SupportPlanEvidence> {
  // Note: Support API requires us-east-1 region
  const supportRegion = 'us-east-1';
  const client = new SupportClient({ region: supportRegion });

  try {
    // Attempt to get severity levels - this indicates support plan access
    const severityLevels = await describeSeverityLevels(client);

    // Determine support plan tier based on available severity levels
    const supportPlan = determineSupportPlan(severityLevels);

    const summary = {
      hasSupportPlan: supportPlan.tier !== 'Unknown',
      planTier: supportPlan.tier,
      meetsRequirement: supportPlan.hasBusinessOrHigher,
      compliant: supportPlan.hasBusinessOrHigher,
    };

    return {
      supportPlan,
      severityLevels,
      summary,
    };
  } catch (error: any) {
    console.error(`Failed to collect support plan evidence: ${error}`);

    // Check error type
    let tier: 'Basic' | 'Developer' | 'Business' | 'Enterprise' | 'Unknown' = 'Unknown';
    let hasBusinessOrHigher = false;

    if (error.name === 'SubscriptionRequiredException') {
      // No support plan (basic)
      tier = 'Basic';
      hasBusinessOrHigher = false;
    }

    return {
      supportPlan: {
        tier,
        features: [],
        hasBusinessOrHigher,
      },
      severityLevels: [],
      summary: {
        hasSupportPlan: tier !== 'Unknown',
        planTier: tier,
        meetsRequirement: hasBusinessOrHigher,
        compliant: hasBusinessOrHigher,
      },
    };
  }
}

/**
 * Describe severity levels available in the support plan
 */
async function describeSeverityLevels(
  client: SupportClient
): Promise<SeverityLevel[]> {
  try {
    const response = await client.send(new DescribeSeverityLevelsCommand({}));

    return (response.severityLevels ?? []).map(level => ({
      code: level.code ?? 'unknown',
      name: level.name ?? 'unknown',
    }));
  } catch (error) {
    console.error(`Failed to describe severity levels: ${error}`);
    throw error;
  }
}

/**
 * Determine support plan tier based on available severity levels
 */
function determineSupportPlan(severityLevels: SeverityLevel[]): SupportPlanInfo {
  const features: string[] = [];
  let tier: 'Basic' | 'Developer' | 'Business' | 'Enterprise' | 'Unknown' = 'Unknown';

  // Basic: No Support API access
  // Developer: Has Support API, limited severity levels
  // Business: Has critical severity, 24/7 phone support
  // Enterprise: Has all severity levels, TAM access

  if (severityLevels.length === 0) {
    tier = 'Basic';
    features.push('Community forums');
  } else {
    const hasCritical = severityLevels.some(s => s.code === 'critical');
    const hasUrgent = severityLevels.some(s => s.code === 'urgent');

    if (hasCritical && hasUrgent) {
      // Likely Business or Enterprise
      tier = 'Business'; // Conservative estimate
      features.push('24/7 phone support');
      features.push('< 1 hour response for critical issues');
      features.push('Architecture support');
      features.push('Third-party software support');
    } else if (severityLevels.length >= 3) {
      tier = 'Developer';
      features.push('Business hours email support');
      features.push('< 12 hour response for system impaired');
    } else {
      tier = 'Developer';
      features.push('Business hours email support');
    }
  }

  return {
    tier,
    features,
    hasBusinessOrHigher: tier === 'Business',
  };
}

/**
 * Save support plan evidence to file
 */
export function saveOPS002Evidence(
  evidence: SupportPlanEvidence,
  outputPath: string
): EvidenceArtifact {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save evidence as JSON
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'AWS Support plan tier and features',
    requirementIds: ['OPS-002'],
    collectedAt: new Date(),
    metadata: {
      planTier: evidence.summary.planTier,
      meetsRequirement: evidence.summary.meetsRequirement,
      compliant: evidence.summary.compliant,
    },
  };
}
