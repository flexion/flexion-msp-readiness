/**
 * Public Resources Validator - SECP-002
 * Validates detection and prevention of unintentionally public resources
 */

import { BaseValidator } from './base-validator';
import { MSPRequirement, ValidationResult, ValidationCheck } from '../types';

export class PublicResourcesValidator extends BaseValidator {
  getSupportedRequirements(): string[] {
    return ['SECP-002'];
  }

  async validate(
    requirement: MSPRequirement,
    evidencePaths: string[]
  ): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    try {
      const publicResourcesPath = evidencePaths.find(p => p.includes('public-resources'));
      if (!publicResourcesPath) {
        throw new Error('Public resources evidence file not found');
      }

      const evidence = this.loadEvidenceFile(publicResourcesPath);

      // Check for unintentionally public S3 buckets
      checks.push(
        this.createCheck(
          'No unintentionally public S3 buckets',
          (evidence.summary?.publicS3Buckets || 0) === 0,
          'no public S3 buckets',
          `${evidence.summary?.publicS3Buckets || 0} public bucket(s)`,
          'critical',
          evidence.summary?.publicS3Buckets > 0
            ? 'Review and restrict public S3 bucket access'
            : undefined
        )
      );

      // Check for overly permissive security groups
      const allowedPublicPorts = [80, 443]; // HTTP/HTTPS are acceptable
      const riskySecurityGroups = (evidence.securityGroups || []).filter((sg: any) =>
        sg.publicRules?.some((rule: any) =>
          !allowedPublicPorts.includes(rule.fromPort) &&
          !allowedPublicPorts.includes(rule.toPort)
        )
      ).length;

      checks.push(
        this.createCheck(
          'No risky security group rules',
          riskySecurityGroups === 0,
          'no 0.0.0.0/0 on non-HTTP(S) ports',
          `${riskySecurityGroups} security group(s) with risky rules`,
          'critical',
          riskySecurityGroups > 0
            ? 'Restrict security groups to specific IPs or use AWS managed prefix lists'
            : undefined
        )
      );

      // Check for publicly accessible RDS instances
      checks.push(
        this.createCheck(
          'No publicly accessible RDS instances',
          (evidence.summary?.publicRDSInstances || 0) === 0,
          'no public RDS instances',
          `${evidence.summary?.publicRDSInstances || 0} public instance(s)`,
          'critical',
          evidence.summary?.publicRDSInstances > 0
            ? 'Disable public accessibility on RDS instances'
            : undefined
        )
      );

      // Internet-facing load balancers are acceptable, but note them
      const internetFacingLBs = evidence.summary?.internetFacingLoadBalancers || 0;
      checks.push(
        this.createCheck(
          'Internet-facing load balancers reviewed',
          true, // This is informational, not a failure
          'load balancers reviewed',
          `${internetFacingLBs} internet-facing load balancer(s)`,
          'low',
          internetFacingLBs > 0
            ? 'Ensure internet-facing load balancers are intentional and properly secured'
            : undefined
        )
      );
    } catch (error) {
      checks.push(
        this.createCheck(
          'Evidence file validation',
          false,
          'valid evidence file',
          'error loading evidence',
          'critical',
          `Failed to validate evidence: ${error}`
        )
      );
    }

    return this.createResult(requirement.id, checks);
  }
}
