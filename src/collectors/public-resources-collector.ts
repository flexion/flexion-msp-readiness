/**
 * Public Resources Evidence Collector
 * Collects evidence for SECP-002
 */

import {
  S3Client,
  ListBucketsCommand,
  GetPublicAccessBlockCommand,
  GetBucketPolicyStatusCommand,
  GetBucketAclCommand,
} from '@aws-sdk/client-s3';
import {
  EC2Client,
  DescribeSecurityGroupsCommand,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
} from '@aws-sdk/client-rds';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { EvidenceArtifact } from '../types';

export interface PublicResourcesEvidence {
  s3Buckets: S3BucketPublicAccess[];
  securityGroups: SecurityGroupPublicAccess[];
  ec2Instances: EC2PublicAccess[];
  rdsInstances: RDSPublicAccess[];
  loadBalancers: LoadBalancerPublicAccess[];
  summary: {
    publicS3Buckets: number;
    securityGroupsWithPublicAccess: number;
    publicEC2Instances: number;
    publicRDSInstances: number;
    internetFacingLoadBalancers: number;
    totalPublicResources: number;
  };
}

export interface S3BucketPublicAccess {
  bucketName: string;
  publicAccessBlock: {
    blockPublicAcls: boolean;
    ignorePublicAcls: boolean;
    blockPublicPolicy: boolean;
    restrictPublicBuckets: boolean;
  };
  isPublic: boolean;
  isPolicyPublic?: boolean;
  hasPublicAcl?: boolean;
}

export interface SecurityGroupPublicAccess {
  groupId: string;
  groupName: string;
  vpcId: string;
  description: string;
  publicRules: SecurityGroupRule[];
}

export interface SecurityGroupRule {
  protocol: string;
  fromPort?: number;
  toPort?: number;
  cidrIp: string;
  description?: string;
}

export interface EC2PublicAccess {
  instanceId: string;
  instanceType: string;
  publicIpAddress?: string;
  publicDnsName?: string;
  state: string;
  securityGroups: string[];
}

export interface RDSPublicAccess {
  dbInstanceIdentifier: string;
  engine: string;
  publiclyAccessible: boolean;
  endpoint?: string;
  vpcSecurityGroups: string[];
}

export interface LoadBalancerPublicAccess {
  loadBalancerArn: string;
  loadBalancerName: string;
  scheme: string;
  type: string;
  dnsName: string;
}

/**
 * Collect public resources evidence
 */
export async function collectPublicResourcesEvidence(
  region: string,
  profile: string
): Promise<PublicResourcesEvidence> {
  const s3Client = new S3Client({ region });
  const ec2Client = new EC2Client({ region });
  const rdsClient = new RDSClient({ region });
  const elbClient = new ElasticLoadBalancingV2Client({ region });

  const s3Buckets: S3BucketPublicAccess[] = [];
  const securityGroups: SecurityGroupPublicAccess[] = [];
  const ec2Instances: EC2PublicAccess[] = [];
  const rdsInstances: RDSPublicAccess[] = [];
  const loadBalancers: LoadBalancerPublicAccess[] = [];

  try {
    // Check S3 buckets for public access
    const bucketsResponse = await s3Client.send(new ListBucketsCommand({}));

    for (const bucket of bucketsResponse.Buckets ?? []) {
      if (!bucket.Name) continue;

      try {
        // Get public access block configuration
        const publicAccessBlock = await s3Client.send(
          new GetPublicAccessBlockCommand({ Bucket: bucket.Name })
        );

        const blockConfig = publicAccessBlock.PublicAccessBlockConfiguration;
        const isBlocked =
          blockConfig?.BlockPublicAcls &&
          blockConfig?.IgnorePublicAcls &&
          blockConfig?.BlockPublicPolicy &&
          blockConfig?.RestrictPublicBuckets;

        // Check if bucket policy is public
        let isPolicyPublic = false;
        try {
          const policyStatus = await s3Client.send(
            new GetBucketPolicyStatusCommand({ Bucket: bucket.Name })
          );
          isPolicyPublic = policyStatus.PolicyStatus?.IsPublic ?? false;
        } catch {
          // No policy or not accessible
        }

        // Check bucket ACL
        let hasPublicAcl = false;
        try {
          const aclResponse = await s3Client.send(
            new GetBucketAclCommand({ Bucket: bucket.Name })
          );
          hasPublicAcl = (aclResponse.Grants ?? []).some(
            grant =>
              grant.Grantee?.URI?.includes('AllUsers') ||
              grant.Grantee?.URI?.includes('AuthenticatedUsers')
          );
        } catch {
          // ACL not accessible
        }

        const isPublic = !isBlocked || isPolicyPublic || hasPublicAcl;

        s3Buckets.push({
          bucketName: bucket.Name,
          publicAccessBlock: {
            blockPublicAcls: blockConfig?.BlockPublicAcls ?? false,
            ignorePublicAcls: blockConfig?.IgnorePublicAcls ?? false,
            blockPublicPolicy: blockConfig?.BlockPublicPolicy ?? false,
            restrictPublicBuckets: blockConfig?.RestrictPublicBuckets ?? false,
          },
          isPublic,
          isPolicyPublic,
          hasPublicAcl,
        });
      } catch (error) {
        console.error(`Failed to check bucket ${bucket.Name}: ${error}`);
      }
    }

    // Check security groups for public access (0.0.0.0/0)
    const sgResponse = await ec2Client.send(new DescribeSecurityGroupsCommand({}));

    for (const sg of sgResponse.SecurityGroups ?? []) {
      const publicRules: SecurityGroupRule[] = [];

      for (const rule of sg.IpPermissions ?? []) {
        for (const ipRange of rule.IpRanges ?? []) {
          if (ipRange.CidrIp === '0.0.0.0/0') {
            publicRules.push({
              protocol: rule.IpProtocol ?? 'unknown',
              fromPort: rule.FromPort,
              toPort: rule.ToPort,
              cidrIp: ipRange.CidrIp,
              description: ipRange.Description,
            });
          }
        }
      }

      if (publicRules.length > 0) {
        securityGroups.push({
          groupId: sg.GroupId ?? 'unknown',
          groupName: sg.GroupName ?? 'unknown',
          vpcId: sg.VpcId ?? 'unknown',
          description: sg.Description ?? '',
          publicRules,
        });
      }
    }

    // Check EC2 instances with public IPs
    const instancesResponse = await ec2Client.send(new DescribeInstancesCommand({}));

    for (const reservation of instancesResponse.Reservations ?? []) {
      for (const instance of reservation.Instances ?? []) {
        if (instance.PublicIpAddress) {
          ec2Instances.push({
            instanceId: instance.InstanceId ?? 'unknown',
            instanceType: instance.InstanceType ?? 'unknown',
            publicIpAddress: instance.PublicIpAddress,
            publicDnsName: instance.PublicDnsName,
            state: instance.State?.Name ?? 'unknown',
            securityGroups: (instance.SecurityGroups ?? []).map((sg: any) => sg.GroupId ?? 'unknown'),
          });
        }
      }
    }

    // Check RDS instances for public accessibility
    const rdsInstancesResponse = await rdsClient.send(new DescribeDBInstancesCommand({}));

    for (const dbInstance of rdsInstancesResponse.DBInstances ?? []) {
      if (dbInstance.PubliclyAccessible) {
        rdsInstances.push({
          dbInstanceIdentifier: dbInstance.DBInstanceIdentifier ?? 'unknown',
          engine: dbInstance.Engine ?? 'unknown',
          publiclyAccessible: dbInstance.PubliclyAccessible,
          endpoint: dbInstance.Endpoint?.Address,
          vpcSecurityGroups: (dbInstance.VpcSecurityGroups ?? []).map(
            (sg: any) => sg.VpcSecurityGroupId ?? 'unknown'
          ),
        });
      }
    }

    // Check RDS clusters for public accessibility
    const rdsClustersResponse = await rdsClient.send(new DescribeDBClustersCommand({}));

    for (const dbCluster of rdsClustersResponse.DBClusters ?? []) {
      if (dbCluster.PubliclyAccessible) {
        rdsInstances.push({
          dbInstanceIdentifier: dbCluster.DBClusterIdentifier ?? 'unknown',
          engine: dbCluster.Engine ?? 'unknown',
          publiclyAccessible: dbCluster.PubliclyAccessible,
          endpoint: dbCluster.Endpoint,
          vpcSecurityGroups: (dbCluster.VpcSecurityGroups ?? []).map(
            sg => sg.VpcSecurityGroupId ?? 'unknown'
          ),
        });
      }
    }

    // Check load balancers
    const lbResponse = await elbClient.send(new DescribeLoadBalancersCommand({}));

    for (const lb of lbResponse.LoadBalancers ?? []) {
      if (lb.Scheme === 'internet-facing') {
        loadBalancers.push({
          loadBalancerArn: lb.LoadBalancerArn ?? 'unknown',
          loadBalancerName: lb.LoadBalancerName ?? 'unknown',
          scheme: lb.Scheme ?? 'unknown',
          type: lb.Type ?? 'unknown',
          dnsName: lb.DNSName ?? 'unknown',
        });
      }
    }

    const summary = {
      publicS3Buckets: s3Buckets.filter(b => b.isPublic).length,
      securityGroupsWithPublicAccess: securityGroups.length,
      publicEC2Instances: ec2Instances.length,
      publicRDSInstances: rdsInstances.length,
      internetFacingLoadBalancers: loadBalancers.length,
      totalPublicResources:
        s3Buckets.filter(b => b.isPublic).length +
        ec2Instances.length +
        rdsInstances.length +
        loadBalancers.length,
    };

    return {
      s3Buckets,
      securityGroups,
      ec2Instances,
      rdsInstances,
      loadBalancers,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect public resources evidence: ${error}`);
    return {
      s3Buckets: [],
      securityGroups: [],
      ec2Instances: [],
      rdsInstances: [],
      loadBalancers: [],
      summary: {
        publicS3Buckets: 0,
        securityGroupsWithPublicAccess: 0,
        publicEC2Instances: 0,
        publicRDSInstances: 0,
        internetFacingLoadBalancers: 0,
        totalPublicResources: 0,
      },
    };
  }
}

/**
 * Save public resources evidence to file
 */
export function savePublicResourcesEvidence(
  evidence: PublicResourcesEvidence,
  outputPath: string
): EvidenceArtifact {
  const fs = require('fs');
  const path = require('path');

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'Public resources detection (S3, EC2, RDS, Security Groups, Load Balancers)',
    requirementIds: ['SECP-002'],
    collectedAt: new Date(),
    metadata: {
      totalPublicResources: evidence.summary.totalPublicResources,
      publicS3Buckets: evidence.summary.publicS3Buckets,
      publicEC2: evidence.summary.publicEC2Instances,
      publicRDS: evidence.summary.publicRDSInstances,
    },
  };
}

/**
 * Print public resources evidence summary
 */
export function printPublicResourcesEvidenceSummary(evidence: PublicResourcesEvidence): void {
  console.log('Public Resources Evidence:');
  console.log(`  Public S3 buckets: ${evidence.summary.publicS3Buckets}`);
  console.log(`  Security groups with public access: ${evidence.summary.securityGroupsWithPublicAccess}`);
  console.log(`  Public EC2 instances: ${evidence.summary.publicEC2Instances}`);
  console.log(`  Public RDS instances: ${evidence.summary.publicRDSInstances}`);
  console.log(`  Internet-facing load balancers: ${evidence.summary.internetFacingLoadBalancers}`);
  console.log(`  Total public resources: ${evidence.summary.totalPublicResources}`);
  console.log('');
}
