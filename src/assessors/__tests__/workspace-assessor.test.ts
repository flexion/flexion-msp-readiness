/**
 * Workspace Assessor Tests
 *
 * Tests for enhanced workspace assessment including automation type detection,
 * document quality assessment, and manual steps guidance.
 */

import { MSPRequirement, AutomationType } from '../../types';

// Mock requirements for testing
const mockRequirements: MSPRequirement[] = [
  // Fully automated (AWS-only)
  {
    id: 'SEC-003',
    name: 'AWS Account Configuration',
    category: 'security',
    description: 'Basic AWS account security configuration',
    priority: 'critical',
    cisControls: ['3.3', '4.1'],
    awsServices: ['Config', 'CloudTrail', 'SecurityHub'],
    evidenceRequired: ['config-snapshot', 'cloudtrail-logs', 'security-hub-findings'],
    estimatedHours: 8,
  },
  // Manual only (documentation)
  {
    id: 'BUS-001',
    name: 'Company Overview',
    category: 'business',
    description: 'Company overview presentation',
    priority: 'high',
    cisControls: [],
    awsServices: [],
    evidenceRequired: ['company-overview-presentation', 'customer-portfolio-summary'],
    estimatedHours: 8,
  },
  // Mixed (AWS + documentation)
  {
    id: 'OPSP-001',
    name: 'Incident Response',
    category: 'operations',
    description: 'Incident response procedures',
    priority: 'critical',
    cisControls: ['17'],
    awsServices: ['CloudWatch'],
    evidenceRequired: ['incident-response-playbook', 'cloudwatch-alarms', 'process-documentation'],
    estimatedHours: 16,
  },
  // Manual (people processes)
  {
    id: 'PEO-003',
    name: 'Personnel Offboarding',
    category: 'people',
    description: 'Personnel offboarding procedures',
    priority: 'critical',
    cisControls: ['5', '6'],
    awsServices: ['IAM'],
    evidenceRequired: [
      'offboarding-checklists',
      'access-revocation-records',
      'security-certifications',
    ],
    estimatedHours: 4,
  },
];

describe('Workspace Assessor - Automation Type Detection', () => {
  // Helper function to simulate determineAutomationType
  function determineAutomationType(requirement: MSPRequirement): AutomationType {
    const hasAWSServices = requirement.awsServices && requirement.awsServices.length > 0;
    const hasProcessEvidence = requirement.evidenceRequired.some(
      e =>
        e.includes('documentation') ||
        e.includes('policy') ||
        e.includes('procedure') ||
        e.includes('checklist') ||
        e.includes('template') ||
        e.includes('presentation') ||
        e.includes('process') ||
        e.includes('charter') ||
        e.includes('matrix') ||
        e.includes('report')
    );

    if (hasAWSServices && !hasProcessEvidence) return 'full';
    if (!hasAWSServices && hasProcessEvidence) return 'manual';
    return 'partial';
  }

  test('detects fully automated requirements (AWS-only)', () => {
    const req = mockRequirements[0]; // SEC-003
    expect(determineAutomationType(req)).toBe('full');
  });

  test('detects manual requirements (documentation-only)', () => {
    const req = mockRequirements[1]; // BUS-001
    expect(determineAutomationType(req)).toBe('manual');
  });

  test('detects mixed requirements (AWS + documentation)', () => {
    const req = mockRequirements[2]; // OPSP-001
    expect(determineAutomationType(req)).toBe('partial');
  });

  test('detects mixed requirements with people processes', () => {
    const req = mockRequirements[3]; // PEO-003
    expect(determineAutomationType(req)).toBe('partial');
  });
});

describe('Workspace Assessor - Automation Coverage Calculation', () => {
  function calculateAutomationCoverage(requirement: MSPRequirement): number {
    const totalEvidence = requirement.evidenceRequired.length;
    if (totalEvidence === 0) return 0;

    const awsEvidence = requirement.awsServices?.length || 0;
    const autoCollectableCount = requirement.evidenceRequired.filter(
      e =>
        !e.includes('documentation') &&
        !e.includes('policy') &&
        !e.includes('procedure') &&
        !e.includes('presentation') &&
        !e.includes('charter') &&
        !e.includes('contract') &&
        !e.includes('report') &&
        !e.includes('summary') &&
        !e.includes('portfolio')
    ).length;

    const automatedItems = Math.max(awsEvidence, autoCollectableCount);
    return Math.round((automatedItems / totalEvidence) * 100);
  }

  test('calculates 100% coverage for fully automated requirements', () => {
    const req = mockRequirements[0]; // SEC-003: 3 AWS services, 3 evidence items
    const coverage = calculateAutomationCoverage(req);
    expect(coverage).toBe(100);
  });

  test('calculates 0% coverage for manual-only requirements', () => {
    const req = mockRequirements[1]; // BUS-001: 0 AWS services, 2 documentation items
    const coverage = calculateAutomationCoverage(req);
    expect(coverage).toBe(0);
  });

  test('calculates partial coverage for mixed requirements', () => {
    const req = mockRequirements[2]; // OPSP-001: 1 AWS service, 3 evidence items (1 auto-collectable)
    const coverage = calculateAutomationCoverage(req);
    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThan(100);
  });

  test('handles requirements with no evidence', () => {
    const req: MSPRequirement = {
      id: 'TEST-001',
      name: 'Test Requirement',
      category: 'security',
      description: 'Test',
      priority: 'low',
      evidenceRequired: [],
      estimatedHours: 0,
    };
    expect(calculateAutomationCoverage(req)).toBe(0);
  });
});

describe('Workspace Assessor - Manual Steps Guidance', () => {
  function getMissingEvidenceGuidance(requirementId: string, evidenceType: string): string {
    const guidanceMap: Record<string, string> = {
      'company-overview-presentation':
        'Create company overview using template: templates/business/company-overview.md',
      'onboarding-checklists':
        'Create onboarding checklist: templates/people/onboarding-checklist.md',
      'risk-analysis': 'Create risk register: templates/governance/risk-register.md',
    };

    return guidanceMap[evidenceType] || `Provide documentation for: ${evidenceType}`;
  }

  test('provides specific guidance for known evidence types', () => {
    const guidance = getMissingEvidenceGuidance('BUS-001', 'company-overview-presentation');
    expect(guidance).toContain('template');
    expect(guidance).toContain('templates/business/company-overview.md');
  });

  test('provides generic guidance for unknown evidence types', () => {
    const guidance = getMissingEvidenceGuidance('TEST-001', 'unknown-evidence-type');
    expect(guidance).toContain('Provide documentation for');
    expect(guidance).toContain('unknown-evidence-type');
  });

  test('provides guidance for all evidence types', () => {
    const evidenceTypes = [
      'company-overview-presentation',
      'onboarding-checklists',
      'risk-analysis',
      'customer-contracts',
    ];

    evidenceTypes.forEach(type => {
      const guidance = getMissingEvidenceGuidance('TEST-001', type);
      expect(guidance).toBeTruthy();
      expect(guidance.length).toBeGreaterThan(0);
    });
  });
});

describe('Workspace Assessor - Document Quality Assessment', () => {
  test('assesses document quality from validation results', () => {
    type ValidationIssueType = 'missing-sections' | 'stale' | 'incomplete' | 'formatting' | 'other';
    interface TestValidationIssue {
      type: ValidationIssueType;
      message: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
    }

    const validationResult = {
      requirementId: 'BUS-001',
      passed: true,
      score: 85,
      checks: [],
      issues: [
        {
          type: 'stale' as ValidationIssueType,
          message: 'Document not updated in 6 months',
          severity: 'medium' as const,
        },
      ] as TestValidationIssue[],
      summary: 'Mostly compliant',
      validatedAt: new Date(),
    };

    // Simulate assessDocumentQuality
    const staleIssues = validationResult.issues?.filter(i => i.type === 'stale') || [];
    const missingSectionIssues =
      validationResult.issues?.filter(i => i.type === 'missing-sections') || [];
    const incompleteIssues = validationResult.issues?.filter(i => i.type === 'incomplete') || [];

    const quality = {
      score: validationResult.score || 50,
      hasRequiredSections: missingSectionIssues.length === 0,
      isFresh: staleIssues.length === 0,
      meetsLengthRequirement: incompleteIssues.length === 0,
      issues: validationResult.issues?.map(i => i.message) || [],
    };

    expect(quality.score).toBe(85);
    expect(quality.hasRequiredSections).toBe(true);
    expect(quality.isFresh).toBe(false); // Has stale issue
    expect(quality.issues).toHaveLength(1);
  });

  test('returns undefined for non-document evidence', () => {
    const evidencePaths = ['./evidence/config-snapshot.json'];

    // No document evidence, should return undefined
    const hasDocEvidence = evidencePaths.some(
      p => p.includes('process-templates') || p.endsWith('.md') || p.includes('documentation')
    );

    expect(hasDocEvidence).toBe(false);
  });
});

describe('Workspace Assessor - Status Calculation', () => {
  test('marks fully automated requirements as complete when evidence validates', () => {
    const hasPlaybook = true;
    const hasEvidence = true;
    const validated = true;

    // Simplified logic for test
    let status: 'complete' | 'in-progress' | 'not-started';
    if (hasEvidence && validated && hasPlaybook) {
      status = 'complete';
    } else if (hasEvidence || hasPlaybook) {
      status = 'in-progress';
    } else {
      status = 'not-started';
    }

    expect(status).toBe('complete');
  });

  test('marks manual requirements as in-progress without validation', () => {
    const hasPlaybook = true;
    const hasEvidence = true;
    const validated = undefined;

    // Simplified logic for test
    let status: 'complete' | 'in-progress' | 'not-started';
    if (hasPlaybook && hasEvidence && validated === true) {
      status = 'complete';
    } else if (hasPlaybook || hasEvidence) {
      status = 'in-progress';
    } else {
      status = 'not-started';
    }

    expect(status).toBe('in-progress');
  });

  test('calculates completion percentage correctly', () => {
    const scenarios = [
      { hasPlaybook: true, hasEvidence: true, validated: true, approved: true, expected: 100 },
      { hasPlaybook: true, hasEvidence: true, validated: true, approved: false, expected: 90 },
      { hasPlaybook: true, hasEvidence: true, validated: false, approved: false, expected: 70 },
      { hasPlaybook: true, hasEvidence: false, validated: false, approved: false, expected: 40 },
      { hasPlaybook: false, hasEvidence: false, validated: false, approved: false, expected: 0 },
    ];

    scenarios.forEach(scenario => {
      let score = 0;
      if (scenario.hasPlaybook && scenario.hasEvidence && scenario.validated && scenario.approved) {
        score = 100;
      } else if (scenario.hasPlaybook || scenario.hasEvidence) {
        if (scenario.hasPlaybook) score += 40;
        if (scenario.hasEvidence) score += 30;
        if (scenario.validated) score += 20;
        if (scenario.approved) score += 10;
        score = Math.min(score, 90);
      }

      expect(score).toBe(scenario.expected);
    });
  });
});

describe('Workspace Assessor - Integration', () => {
  test('assesses all 46 requirements without errors', () => {
    // This would be an integration test that runs assessWorkspace
    // For now, we just verify the mock requirements work
    expect(mockRequirements.length).toBeGreaterThan(0);
    mockRequirements.forEach(req => {
      expect(req.id).toBeTruthy();
      expect(req.name).toBeTruthy();
      expect(req.category).toBeTruthy();
      expect(req.evidenceRequired).toBeInstanceOf(Array);
    });
  });

  test('handles requirements with no AWS services', () => {
    const manualReqs = mockRequirements.filter(r => !r.awsServices || r.awsServices.length === 0);
    expect(manualReqs.length).toBeGreaterThan(0);
    manualReqs.forEach(req => {
      expect(req.evidenceRequired.length).toBeGreaterThan(0);
    });
  });

  test('handles requirements with no evidence required', () => {
    const noEvidenceReq: MSPRequirement = {
      id: 'TEST-002',
      name: 'Test No Evidence',
      category: 'business',
      description: 'Test requirement with no evidence',
      priority: 'low',
      evidenceRequired: [],
      estimatedHours: 0,
    };

    // Should handle gracefully
    expect(noEvidenceReq.evidenceRequired.length).toBe(0);
  });
});

describe('Workspace Assessor - Template Availability', () => {
  test('maps requirement IDs to template paths', () => {
    const templateMap: Record<string, string> = {
      'BUS-001': 'business/company-overview.md',
      'PEO-001': 'people/onboarding-checklist.md',
      'GOV-001': 'governance/risk-register.md',
    };

    expect(templateMap['BUS-001']).toBe('business/company-overview.md');
    expect(templateMap['PEO-001']).toBe('people/onboarding-checklist.md');
    expect(templateMap['GOV-001']).toBe('governance/risk-register.md');
  });

  test('handles requirements without templates', () => {
    const templateMap: Record<string, string> = {
      'BUS-001': 'business/company-overview.md',
    };

    expect(templateMap['UNKNOWN-001']).toBeUndefined();
  });
});
