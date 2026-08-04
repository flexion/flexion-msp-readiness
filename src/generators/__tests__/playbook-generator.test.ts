/**
 * Tests for enhanced playbook generator
 */

import {
  determinePlaybookMode,
  calculateAutomationPercentage,
  determineAutomationType,
} from '../playbook-generator';
import { MSPRequirement } from '../../types';

describe('Playbook Generator - Mode Detection', () => {
  test('should detect process mode for business requirements', () => {
    const requirement: MSPRequirement = {
      id: 'BUS-001',
      name: 'Company Overview',
      category: 'business',
      description: 'Company overview presentation',
      priority: 'high',
      cisControls: [],
      awsServices: [],
      evidenceRequired: ['company-overview-presentation', 'customer-portfolio-summary'],
      estimatedHours: 8,
    };

    const mode = determinePlaybookMode(requirement);
    expect(mode).toBe('process');
  });

  test('should detect technical mode for security requirements with AWS services only', () => {
    const requirement: MSPRequirement = {
      id: 'SEC-007',
      name: 'Multi-Factor Authentication',
      category: 'security',
      description: 'All human access requires MFA',
      priority: 'critical',
      cisControls: ['6'],
      awsServices: ['IAM', 'IAM Identity Center'],
      evidenceRequired: ['mfa-enforcement-demo', 'idp-mfa-configuration'],
      estimatedHours: 4,
    };

    const mode = determinePlaybookMode(requirement);
    expect(mode).toBe('technical');
  });

  test('should detect mixed mode for requirements with both AWS and process docs', () => {
    const requirement: MSPRequirement = {
      id: 'PEO-003',
      name: 'Personnel Offboarding',
      category: 'people',
      description: 'Termination processes with access revocation',
      priority: 'critical',
      cisControls: ['5', '6'],
      awsServices: ['IAM'],
      evidenceRequired: [
        'offboarding-checklists',
        'access-revocation-records',
        'security-certifications',
      ],
      estimatedHours: 4,
    };

    const mode = determinePlaybookMode(requirement);
    expect(mode).toBe('mixed');
  });

  test('should detect process mode when evidence contains documentation keywords', () => {
    const requirement: MSPRequirement = {
      id: 'GOV-001',
      name: 'Risk and Mitigation Plans',
      category: 'governance',
      description: 'Business risks with mitigation plans',
      priority: 'high',
      cisControls: [],
      awsServices: [],
      evidenceRequired: ['risk-analysis', 'mitigation-plans', 'risk-monitoring-process'],
      estimatedHours: 12,
    };

    const mode = determinePlaybookMode(requirement);
    expect(mode).toBe('process');
  });
});

describe('Playbook Generator - Automation Calculation', () => {
  test('should calculate 0% for pure process requirements', () => {
    const requirement: MSPRequirement = {
      id: 'BUS-001',
      name: 'Company Overview',
      category: 'business',
      description: 'Company overview',
      priority: 'high',
      cisControls: [],
      awsServices: [],
      evidenceRequired: ['company-overview-presentation', 'customer-portfolio'],
      estimatedHours: 8,
    };

    const percentage = calculateAutomationPercentage(requirement);
    expect(percentage).toBe(0);
  });

  test('should calculate 100% for fully automated requirements', () => {
    const requirement: MSPRequirement = {
      id: 'SEC-003',
      name: 'AWS Account Configuration',
      category: 'security',
      description: 'Standard security controls',
      priority: 'critical',
      cisControls: ['4', '5', '6'],
      awsServices: ['Control Tower', 'Config', 'CloudTrail', 'GuardDuty', 'Security Hub'],
      evidenceRequired: [
        'security-dashboards',
        'config-rules',
        'findings-remediation',
        'cloudtrail-logs',
        'guardduty-findings',
      ],
      estimatedHours: 0,
    };

    const percentage = calculateAutomationPercentage(requirement);
    expect(percentage).toBe(100);
  });

  test('should calculate partial percentage for mixed requirements', () => {
    const requirement: MSPRequirement = {
      id: 'PEO-003',
      name: 'Personnel Offboarding',
      category: 'people',
      description: 'Offboarding with access revocation',
      priority: 'critical',
      cisControls: ['5', '6'],
      awsServices: ['IAM'],
      evidenceRequired: [
        'offboarding-checklists',
        'access-revocation-records',
        'security-certifications',
      ],
      estimatedHours: 4,
    };

    const percentage = calculateAutomationPercentage(requirement);
    expect(percentage).toBe(33); // 1 AWS service / 3 evidence items = 33%
  });

  test('should handle empty evidence gracefully', () => {
    const requirement: MSPRequirement = {
      id: 'TEST-001',
      name: 'Test Requirement',
      category: 'security',
      description: 'Test',
      priority: 'low',
      cisControls: [],
      awsServices: ['IAM'],
      evidenceRequired: [],
      estimatedHours: 0,
    };

    const percentage = calculateAutomationPercentage(requirement);
    expect(percentage).toBe(0);
  });
});

describe('Playbook Generator - Automation Type', () => {
  test('should return "manual" for 0% automation', () => {
    expect(determineAutomationType(0)).toBe('manual');
  });

  test('should return "partial" for 1-79% automation', () => {
    expect(determineAutomationType(1)).toBe('partial');
    expect(determineAutomationType(33)).toBe('partial');
    expect(determineAutomationType(50)).toBe('partial');
    expect(determineAutomationType(79)).toBe('partial');
  });

  test('should return "full" for 80-100% automation', () => {
    expect(determineAutomationType(80)).toBe('full');
    expect(determineAutomationType(90)).toBe('full');
    expect(determineAutomationType(100)).toBe('full');
  });
});

describe('Playbook Generator - Real Requirements', () => {
  test('should correctly classify all 46 requirements', async () => {
    const { MSP_REQUIREMENTS } = await import('../../data/msp-requirements');

    const classifications = MSP_REQUIREMENTS.map(req => ({
      id: req.id,
      name: req.name,
      mode: determinePlaybookMode(req),
      automationPercentage: calculateAutomationPercentage(req),
      automationType: determineAutomationType(calculateAutomationPercentage(req)),
    }));

    // Verify we processed all requirements
    expect(classifications).toHaveLength(46);

    // Check specific known requirements
    const bus001 = classifications.find(c => c.id === 'BUS-001');
    expect(bus001?.mode).toBe('process');
    expect(bus001?.automationType).toBe('manual');

    const peo003 = classifications.find(c => c.id === 'PEO-003');
    expect(peo003?.mode).toBe('mixed');

    const sec003 = classifications.find(c => c.id === 'SEC-003');
    expect(sec003?.mode).toBe('mixed'); // Has AWS services + documentation evidence

    // Verify no classification is undefined
    classifications.forEach(c => {
      expect(c.mode).toBeDefined();
      expect(c.automationType).toBeDefined();
      expect(c.automationPercentage).toBeGreaterThanOrEqual(0);
      expect(c.automationPercentage).toBeLessThanOrEqual(100);
    });
  });

  test('should identify requirements by category', async () => {
    const { MSP_REQUIREMENTS } = await import('../../data/msp-requirements');

    const byCategory = {
      business: MSP_REQUIREMENTS.filter(r => r.category === 'business'),
      people: MSP_REQUIREMENTS.filter(r => r.category === 'people'),
      governance: MSP_REQUIREMENTS.filter(r => r.category === 'governance'),
      platform: MSP_REQUIREMENTS.filter(r => r.category === 'platform'),
      security: MSP_REQUIREMENTS.filter(r => r.category === 'security'),
      operations: MSP_REQUIREMENTS.filter(r => r.category === 'operations'),
    };

    // Check expected counts
    expect(byCategory.business).toHaveLength(4);
    expect(byCategory.people).toHaveLength(3);
    expect(byCategory.governance).toHaveLength(6);
    expect(byCategory.platform).toHaveLength(5);
    expect(byCategory.security).toHaveLength(10);
    expect(byCategory.operations).toHaveLength(18);

    // All business requirements should be process mode
    byCategory.business.forEach(req => {
      expect(determinePlaybookMode(req)).toBe('process');
    });
  });
});
