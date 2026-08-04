/**
 * Availability Management Evidence Collector
 * Collects evidence for OPS-011
 */

import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { AutoScalingClient, DescribeAutoScalingGroupsCommand } from '@aws-sdk/client-auto-scaling';
import {
  Route53Client,
  ListHealthChecksCommand,
  GetHealthCheckCommand,
} from '@aws-sdk/client-route-53';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { S3Client, ListBucketsCommand, GetBucketReplicationCommand } from '@aws-sdk/client-s3';
import { EvidenceArtifact } from '../types';

export interface AvailabilityEvidence {
  rdsInstances: RDSAvailabilityInfo[];
  autoScalingGroups: AutoScalingGroupInfo[];
  healthChecks: HealthCheckInfo[];
  loadBalancers: LoadBalancerInfo[];
  s3Buckets: S3ReplicationInfo[];
  summary: {
    multiAZRDSInstances: number;
    singleAZRDSInstances: number;
    autoScalingGroups: number;
    multiAZLoadBalancers: number;
    route53HealthChecks: number;
    s3BucketsWithReplication: number;
  };
}

export interface RDSAvailabilityInfo {
  dbInstanceIdentifier: string;
  engine: string;
  multiAZ: boolean;
  availabilityZone?: string;
  secondaryAvailabilityZone?: string;
  readReplicas: string[];
}

export interface AutoScalingGroupInfo {
  autoScalingGroupName: string;
  minSize: number;
  maxSize: number;
  desiredCapacity: number;
  availabilityZones: string[];
  healthCheckType: string;
}

export interface HealthCheckInfo {
  healthCheckId: string;
  type: string;
  resourcePath?: string;
  fullyQualifiedDomainName?: string;
  port?: number;
}

export interface LoadBalancerInfo {
  loadBalancerName: string;
  type: string;
  scheme: string;
  availabilityZones: string[];
}

export interface S3ReplicationInfo {
  bucketName: string;
  hasReplication: boolean;
  replicationRules?: number;
}

/**
 * Collect availability management evidence
 */
export async function collectAvailabilityEvidence(
  region: string,
  profile: string
): Promise<AvailabilityEvidence> {
  const rdsClient = new RDSClient({ region });
  const asgClient = new AutoScalingClient({ region });
  const route53Client = new Route53Client({ region });
  const elbClient = new ElasticLoadBalancingV2Client({ region });
  const s3Client = new S3Client({ region });

  const rdsInstances: RDSAvailabilityInfo[] = [];
  const autoScalingGroups: AutoScalingGroupInfo[] = [];
  const healthChecks: HealthCheckInfo[] = [];
  const loadBalancers: LoadBalancerInfo[] = [];
  const s3Buckets: S3ReplicationInfo[] = [];

  try {
    // Check RDS Multi-AZ configuration
    const rdsResponse = await rdsClient.send(new DescribeDBInstancesCommand({}));

    for (const dbInstance of rdsResponse.DBInstances ?? []) {
      rdsInstances.push({
        dbInstanceIdentifier: dbInstance.DBInstanceIdentifier ?? 'unknown',
        engine: dbInstance.Engine ?? 'unknown',
        multiAZ: dbInstance.MultiAZ ?? false,
        availabilityZone: dbInstance.AvailabilityZone,
        secondaryAvailabilityZone: dbInstance.SecondaryAvailabilityZone,
        readReplicas: dbInstance.ReadReplicaDBInstanceIdentifiers ?? [],
      });
    }

    // Check Auto Scaling Groups
    const asgResponse = await asgClient.send(new DescribeAutoScalingGroupsCommand({}));

    for (const asg of asgResponse.AutoScalingGroups ?? []) {
      autoScalingGroups.push({
        autoScalingGroupName: asg.AutoScalingGroupName ?? 'unknown',
        minSize: asg.MinSize ?? 0,
        maxSize: asg.MaxSize ?? 0,
        desiredCapacity: asg.DesiredCapacity ?? 0,
        availabilityZones: asg.AvailabilityZones ?? [],
        healthCheckType: asg.HealthCheckType ?? 'unknown',
      });
    }

    // Check Route53 Health Checks
    const healthChecksResponse = await route53Client.send(new ListHealthChecksCommand({}));

    for (const hc of healthChecksResponse.HealthChecks ?? []) {
      if (!hc.Id) continue;

      try {
        const hcDetails = await route53Client.send(
          new GetHealthCheckCommand({ HealthCheckId: hc.Id })
        );

        const config = hcDetails.HealthCheck?.HealthCheckConfig;
        healthChecks.push({
          healthCheckId: hc.Id,
          type: config?.Type ?? 'unknown',
          resourcePath: config?.ResourcePath,
          fullyQualifiedDomainName: config?.FullyQualifiedDomainName,
          port: config?.Port,
        });
      } catch {
        // Health check might not be accessible
      }
    }

    // Check Load Balancers (Multi-AZ)
    const lbResponse = await elbClient.send(new DescribeLoadBalancersCommand({}));

    for (const lb of lbResponse.LoadBalancers ?? []) {
      loadBalancers.push({
        loadBalancerName: lb.LoadBalancerName ?? 'unknown',
        type: lb.Type ?? 'unknown',
        scheme: lb.Scheme ?? 'unknown',
        availabilityZones: (lb.AvailabilityZones ?? []).map((az: any) => az.ZoneName ?? 'unknown'),
      });
    }

    // Check S3 bucket replication (cross-region)
    const bucketsResponse = await s3Client.send(new ListBucketsCommand({}));

    for (const bucket of bucketsResponse.Buckets ?? []) {
      if (!bucket.Name) continue;

      try {
        const replicationResponse = await s3Client.send(
          new GetBucketReplicationCommand({ Bucket: bucket.Name })
        );

        s3Buckets.push({
          bucketName: bucket.Name,
          hasReplication: true,
          replicationRules: replicationResponse.ReplicationConfiguration?.Rules?.length,
        });
      } catch {
        // No replication configured
        s3Buckets.push({
          bucketName: bucket.Name,
          hasReplication: false,
        });
      }
    }

    const summary = {
      multiAZRDSInstances: rdsInstances.filter(r => r.multiAZ).length,
      singleAZRDSInstances: rdsInstances.filter(r => !r.multiAZ).length,
      autoScalingGroups: autoScalingGroups.length,
      multiAZLoadBalancers: loadBalancers.filter(lb => lb.availabilityZones.length > 1).length,
      route53HealthChecks: healthChecks.length,
      s3BucketsWithReplication: s3Buckets.filter(b => b.hasReplication).length,
    };

    return {
      rdsInstances,
      autoScalingGroups,
      healthChecks,
      loadBalancers,
      s3Buckets,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect availability evidence: ${error}`);
    return {
      rdsInstances: [],
      autoScalingGroups: [],
      healthChecks: [],
      loadBalancers: [],
      s3Buckets: [],
      summary: {
        multiAZRDSInstances: 0,
        singleAZRDSInstances: 0,
        autoScalingGroups: 0,
        multiAZLoadBalancers: 0,
        route53HealthChecks: 0,
        s3BucketsWithReplication: 0,
      },
    };
  }
}

/**
 * Save availability evidence to file
 */
export function saveAvailabilityEvidence(
  evidence: AvailabilityEvidence,
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
    description: 'High availability configuration (Multi-AZ, Auto Scaling, Health Checks)',
    requirementIds: ['OPS-011'],
    collectedAt: new Date(),
    metadata: {
      multiAZRDS: evidence.summary.multiAZRDSInstances,
      autoScalingGroups: evidence.summary.autoScalingGroups,
      healthChecks: evidence.summary.route53HealthChecks,
    },
  };
}

/**
 * Print availability evidence summary
 */
export function printAvailabilityEvidenceSummary(evidence: AvailabilityEvidence): void {
  console.log('Availability Management Evidence:');
  console.log(`  Multi-AZ RDS instances: ${evidence.summary.multiAZRDSInstances}`);
  console.log(`  Single-AZ RDS instances: ${evidence.summary.singleAZRDSInstances}`);
  console.log(`  Auto Scaling groups: ${evidence.summary.autoScalingGroups}`);
  console.log(`  Multi-AZ load balancers: ${evidence.summary.multiAZLoadBalancers}`);
  console.log(`  Route53 health checks: ${evidence.summary.route53HealthChecks}`);
  console.log(`  S3 buckets with replication: ${evidence.summary.s3BucketsWithReplication}`);
  console.log('');
}
