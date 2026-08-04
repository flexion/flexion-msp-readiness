/**
 * Cross-Requirement Validator
 * Validates consistency across multiple requirements
 */

import {
  RequirementAssessment,
  CrossValidationResult,
  ValidationIssue,
  MSPRequirement,
} from '../types';

/**
 * Validate cross-requirement consistency
 */
export async function validateCrossRequirements(
  assessments: RequirementAssessment[]
): Promise<CrossValidationResult> {
  const conflicts: ValidationIssue[] = [];
  const missingReferences: ValidationIssue[] = [];
  const versionMismatches: ValidationIssue[] = [];

  // Check 1: Related security requirements consistency
  checkSecurityConsistency(assessments, conflicts);

  // Check 2: IAM requirements consistency
  checkIAMConsistency(assessments, conflicts);

  // Check 3: Backup and DR consistency
  checkBackupConsistency(assessments, conflicts);

  // Check 4: Monitoring and logging consistency
  checkMonitoringConsistency(assessments, conflicts);

  // Check 5: Referenced documents exist
  checkReferencedDocuments(assessments, missingReferences);

  // Check 6: Version consistency across requirements
  checkVersionConsistency(assessments, versionMismatches);

  // Check 7: CIS Controls consistency
  checkCISControlsConsistency(assessments, conflicts);

  const valid =
    conflicts.length === 0 &&
    missingReferences.length === 0 &&
    versionMismatches.length === 0;

  const summary = generateSummary(
    valid,
    conflicts,
    missingReferences,
    versionMismatches
  );

  return {
    valid,
    conflicts,
    missingReferences,
    versionMismatches,
    summary,
  };
}

/**
 * Check security requirements consistency
 */
function checkSecurityConsistency(
  assessments: RequirementAssessment[],
  conflicts: ValidationIssue[]
): void {
  // SEC-003 (AWS Account Configuration) should be addressed if SEC-004 (IAM) is addressed
  const sec003 = assessments.find(a => a.requirement.id === 'SEC-003');
  const sec004 = assessments.find(a => a.requirement.id === 'SEC-004');

  if (
    sec004 &&
    sec004.status === 'addressed' &&
    sec003 &&
    sec003.status === 'gap'
  ) {
    conflicts.push({
      type: 'invalid',
      severity: 'error',
      message:
        'SEC-004 (IAM) is addressed but SEC-003 (AWS Account Configuration) has gaps',
      recommendation:
        'SEC-003 must be addressed as it provides the foundational security controls for IAM',
      affectedRequirements: ['SEC-003', 'SEC-004'],
    });
  }

  // SEC-007 (MFA) should be addressed if SEC-004 (IAM) is addressed
  const sec007 = assessments.find(a => a.requirement.id === 'SEC-007');

  if (
    sec004 &&
    sec004.status === 'addressed' &&
    sec007 &&
    sec007.status !== 'addressed'
  ) {
    conflicts.push({
      type: 'invalid',
      severity: 'warning',
      message:
        'SEC-004 (IAM) is addressed but SEC-007 (MFA) is not fully addressed',
      recommendation: 'MFA is a critical component of IAM security',
      affectedRequirements: ['SEC-004', 'SEC-007'],
    });
  }
}

/**
 * Check IAM requirements consistency
 */
function checkIAMConsistency(
  assessments: RequirementAssessment[],
  conflicts: ValidationIssue[]
): void {
  // PEO-003 (Personnel Offboarding) should be consistent with SEC-004 (IAM)
  const peo003 = assessments.find(a => a.requirement.id === 'PEO-003');
  const sec004 = assessments.find(a => a.requirement.id === 'SEC-004');

  if (
    peo003 &&
    peo003.status === 'gap' &&
    sec004 &&
    sec004.status === 'addressed'
  ) {
    conflicts.push({
      type: 'invalid',
      severity: 'warning',
      message:
        'SEC-004 (IAM) is addressed but PEO-003 (Personnel Offboarding) has gaps',
      recommendation:
        'Offboarding procedures should include IAM access revocation',
      affectedRequirements: ['PEO-003', 'SEC-004'],
    });
  }

  // SEC-006 (Role-Based Access) should be consistent with SEC-004 (IAM)
  const sec006 = assessments.find(a => a.requirement.id === 'SEC-006');

  if (
    sec006 &&
    sec006.status !== 'addressed' &&
    sec004 &&
    sec004.status === 'addressed'
  ) {
    conflicts.push({
      type: 'invalid',
      severity: 'error',
      message:
        'SEC-004 (IAM) is addressed but SEC-006 (Role-Based Access) is not',
      recommendation:
        'Role-based access is a core component of IAM implementation',
      affectedRequirements: ['SEC-004', 'SEC-006'],
    });
  }
}

/**
 * Check backup and disaster recovery consistency
 */
function checkBackupConsistency(
  assessments: RequirementAssessment[],
  conflicts: ValidationIssue[]
): void {
  // OPS-015 (Disaster Recovery) should have evidence if backups are addressed
  const ops015 = assessments.find(a => a.requirement.id === 'OPS-015');

  if (ops015 && ops015.status === 'addressed') {
    // Check that backup evidence exists
    const hasBackupEvidence = ops015.evidence.some(e =>
      e.description.toLowerCase().includes('backup')
    );

    if (!hasBackupEvidence) {
      conflicts.push({
        type: 'incomplete',
        severity: 'warning',
        message:
          'OPS-015 (Disaster Recovery) is addressed but lacks backup evidence',
        recommendation:
          'Ensure backup configurations are documented as evidence',
        affectedRequirements: ['OPS-015'],
      });
    }
  }
}

/**
 * Check monitoring and logging consistency
 */
function checkMonitoringConsistency(
  assessments: RequirementAssessment[],
  conflicts: ValidationIssue[]
): void {
  // SEC-009 (Security Event Logging) should be addressed if OPS-010 (Event Management) is addressed
  const sec009 = assessments.find(a => a.requirement.id === 'SEC-009');
  const ops010 = assessments.find(a => a.requirement.id === 'OPS-010');

  if (
    ops010 &&
    ops010.status === 'addressed' &&
    sec009 &&
    sec009.status !== 'addressed'
  ) {
    conflicts.push({
      type: 'invalid',
      severity: 'warning',
      message:
        'OPS-010 (Event Management) is addressed but SEC-009 (Security Logging) is not',
      recommendation:
        'Security event logging is essential for effective event management',
      affectedRequirements: ['SEC-009', 'OPS-010'],
    });
  }

  // OPS-011 (Operational Runbooks) should reference monitoring from OPS-010
  const ops011 = assessments.find(a => a.requirement.id === 'OPS-011');

  if (
    ops011 &&
    ops011.status === 'addressed' &&
    ops010 &&
    ops010.status !== 'addressed'
  ) {
    conflicts.push({
      type: 'invalid',
      severity: 'warning',
      message:
        'OPS-011 (Runbooks) is addressed but OPS-010 (Event Management) is not',
      recommendation:
        'Runbooks should be based on monitoring and alerting capabilities',
      affectedRequirements: ['OPS-010', 'OPS-011'],
    });
  }
}

/**
 * Check that referenced documents exist
 */
function checkReferencedDocuments(
  assessments: RequirementAssessment[],
  missingReferences: ValidationIssue[]
): void {
  // Build a set of available documents
  const availableDocs = new Set<string>();
  assessments.forEach(a => {
    a.evidence
      .filter(e => e.type === 'document')
      .forEach(e => availableDocs.add(e.path));
  });

  // Check for references in findings
  assessments.forEach(assessment => {
    assessment.findings.forEach(finding => {
      // Simple check: look for markdown links [text](path)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;

      while ((match = linkRegex.exec(finding.details || '')) !== null) {
        const referencedPath = match[2];

        // Skip external URLs
        if (
          referencedPath.startsWith('http://') ||
          referencedPath.startsWith('https://')
        ) {
          continue;
        }

        // Check if referenced document exists
        const exists = Array.from(availableDocs).some(doc =>
          doc.includes(referencedPath)
        );

        if (!exists) {
          missingReferences.push({
            type: 'missing',
            severity: 'warning',
            message: `Referenced document not found: ${referencedPath}`,
            recommendation: `Create the referenced document or update the reference in ${assessment.requirement.id}`,
            affectedRequirements: [assessment.requirement.id],
            location: finding.source,
          });
        }
      }
    });
  });
}

/**
 * Check version consistency across requirements
 */
function checkVersionConsistency(
  assessments: RequirementAssessment[],
  versionMismatches: ValidationIssue[]
): void {
  // Check for version information in evidence metadata
  const versionMap = new Map<string, Set<string>>();

  assessments.forEach(assessment => {
    assessment.evidence.forEach(evidence => {
      if (evidence.metadata?.version) {
        const service = evidence.description.split(' ')[0]; // First word as service name
        if (!versionMap.has(service)) {
          versionMap.set(service, new Set());
        }
        versionMap
          .get(service)!
          .add(evidence.metadata.version as string);
      }
    });
  });

  // Report if multiple versions found for same service
  versionMap.forEach((versions, service) => {
    if (versions.size > 1) {
      versionMismatches.push({
        type: 'invalid',
        severity: 'warning',
        message: `Multiple versions found for ${service}: ${Array.from(versions).join(', ')}`,
        recommendation: `Ensure ${service} version is consistent across all requirements`,
        affectedRequirements: assessments
          .filter(a =>
            a.evidence.some(
              e =>
                e.description.includes(service) &&
                e.metadata?.version
            )
          )
          .map(a => a.requirement.id),
      });
    }
  });
}

/**
 * Check CIS Controls consistency
 */
function checkCISControlsConsistency(
  assessments: RequirementAssessment[],
  conflicts: ValidationIssue[]
): void {
  // Build a map of CIS Controls to requirements
  const cisMap = new Map<string, MSPRequirement[]>();

  assessments.forEach(assessment => {
    assessment.requirement.cisControls?.forEach(control => {
      if (!cisMap.has(control)) {
        cisMap.set(control, []);
      }
      cisMap.get(control)!.push(assessment.requirement);
    });
  });

  // Check that if one requirement for a CIS Control is addressed, others should be too
  cisMap.forEach((requirements, cisControl) => {
    if (requirements.length > 1) {
      const statuses = requirements.map(req => {
        const assessment = assessments.find(
          a => a.requirement.id === req.id
        );
        return {
          requirementId: req.id,
          status: assessment?.status || 'not-started',
        };
      });

      const hasAddressed = statuses.some(s => s.status === 'addressed');
      const hasGaps = statuses.some(s => s.status === 'gap');

      if (hasAddressed && hasGaps) {
        const addressedReqs = statuses
          .filter(s => s.status === 'addressed')
          .map(s => s.requirementId);
        const gapReqs = statuses
          .filter(s => s.status === 'gap')
          .map(s => s.requirementId);

        conflicts.push({
          type: 'invalid',
          severity: 'warning',
          message: `CIS Control ${cisControl}: Some requirements addressed (${addressedReqs.join(', ')}) but others have gaps (${gapReqs.join(', ')})`,
          recommendation: `Ensure all requirements for CIS Control ${cisControl} are consistently implemented`,
          affectedRequirements: requirements.map(r => r.id),
        });
      }
    }
  });
}

/**
 * Generate summary text
 */
function generateSummary(
  valid: boolean,
  conflicts: ValidationIssue[],
  missingReferences: ValidationIssue[],
  versionMismatches: ValidationIssue[]
): string {
  if (valid) {
    return 'Cross-requirement validation passed with no conflicts';
  }

  const parts: string[] = [];

  if (conflicts.length > 0) {
    parts.push(`${conflicts.length} conflict(s)`);
  }

  if (missingReferences.length > 0) {
    parts.push(`${missingReferences.length} missing reference(s)`);
  }

  if (versionMismatches.length > 0) {
    parts.push(`${versionMismatches.length} version mismatch(es)`);
  }

  return `Cross-requirement validation found: ${parts.join(', ')}`;
}
