/**
 * Remediation guidance data for common MSP compliance gaps
 *
 * This file contains actionable remediation guidance for common findings,
 * including root causes, step-by-step fixes, AWS documentation links,
 * and IaC code snippets.
 */

import { RemediationGuidance } from '../types';

/**
 * Remediation guidance database
 */
export const REMEDIATION_GUIDANCE: Record<string, RemediationGuidance> = {
  'config-not-enabled': {
    findingType: 'config-not-enabled',
    rootCause:
      'AWS Config is not enabled in this region. Config is required for continuous compliance monitoring and resource inventory.',
    impact:
      'Without Config, you cannot track resource configurations over time, detect non-compliant resources automatically, or provide audit evidence of infrastructure state.',
    riskLevel: 'critical',
    estimatedEffort: 2,
    prerequisites: [
      'S3 bucket for Config delivery (will be created if not exists)',
      'IAM permissions to enable Config and create required roles',
    ],
    steps: [
      {
        order: 1,
        action: 'Create S3 bucket for Config delivery',
        details: 'Config requires an S3 bucket to store configuration snapshots and history',
        command: 'aws s3 mb s3://config-bucket-${ACCOUNT_ID}-${REGION} --region ${REGION}',
        consoleSteps: [
          'Go to S3 console',
          'Click "Create bucket"',
          'Name: config-bucket-{account-id}-{region}',
          'Enable versioning',
          'Enable default encryption',
        ],
      },
      {
        order: 2,
        action: 'Enable AWS Config',
        details: 'Enable Config recorder and delivery channel',
        command:
          'aws configservice put-configuration-recorder --configuration-recorder name=default,roleARN=arn:aws:iam::${ACCOUNT_ID}:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig --recording-group allSupported=true,includeGlobalResourceTypes=true',
        consoleSteps: [
          'Go to AWS Config console',
          'Click "Get started" or "Settings"',
          'Select "Record all resources in this region"',
          'Choose the S3 bucket created in step 1',
          'Select or create an IAM role',
          'Click "Save"',
        ],
      },
      {
        order: 3,
        action: 'Start the Config recorder',
        command:
          'aws configservice start-configuration-recorder --configuration-recorder-name default',
      },
      {
        order: 4,
        action: 'Enable managed Config rules for MSP compliance',
        details: 'Enable recommended Config rules for security and operational best practices',
      },
    ],
    validation: [
      'Run: aws configservice describe-configuration-recorder-status',
      'Verify "recording" is true',
      'Check Config console shows resources being discovered',
      'Wait 10-15 minutes and verify configuration items appear in Config',
    ],
    awsDocs: [
      'https://docs.aws.amazon.com/config/latest/developerguide/gs-console.html',
      'https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html',
      'https://docs.aws.amazon.com/config/latest/developerguide/security-iam.html',
    ],
    iacSnippets: [
      {
        language: 'cdk-typescript',
        description: 'Enable AWS Config with S3 delivery bucket',
        code: `import * as config from 'aws-cdk-lib/aws-config';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

// Create S3 bucket for Config
const configBucket = new s3.Bucket(this, 'ConfigBucket', {
  bucketName: \`config-bucket-\${this.account}-\${this.region}\`,
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  lifecycleRules: [
    {
      expiration: cdk.Duration.days(2555), // 7 years
      transitions: [
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90),
        },
      ],
    },
  ],
});

// Enable AWS Config
const recorder = new config.CfnConfigurationRecorder(this, 'ConfigRecorder', {
  name: 'default',
  roleArn: configRole.roleArn,
  recordingGroup: {
    allSupported: true,
    includeGlobalResourceTypes: true,
  },
});

const deliveryChannel = new config.CfnDeliveryChannel(this, 'ConfigDeliveryChannel', {
  name: 'default',
  s3BucketName: configBucket.bucketName,
});

// Ensure recorder is created before delivery channel
deliveryChannel.addDependency(recorder);`,
        filePath: 'lib/config-stack.ts',
      },
      {
        language: 'cloudformation',
        description: 'CloudFormation template for AWS Config',
        code: `Resources:
  ConfigBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'config-bucket-\${AWS::AccountId}-\${AWS::Region}'
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      LifecycleConfiguration:
        Rules:
          - Id: ArchiveOldConfigs
            Status: Enabled
            ExpirationInDays: 2555
            Transitions:
              - TransitionInDays: 90
                StorageClass: GLACIER

  ConfigRecorder:
    Type: AWS::Config::ConfigurationRecorder
    Properties:
      Name: default
      RoleArn: !GetAtt ConfigRole.Arn
      RecordingGroup:
        AllSupported: true
        IncludeGlobalResourceTypes: true

  DeliveryChannel:
    Type: AWS::Config::DeliveryChannel
    Properties:
      Name: default
      S3BucketName: !Ref ConfigBucket`,
        filePath: 'cloudformation/config.yaml',
      },
    ],
  },

  'cloudtrail-not-logging': {
    findingType: 'cloudtrail-not-logging',
    rootCause:
      'CloudTrail is either not enabled or not logging API calls. CloudTrail provides audit logs of all AWS API activity.',
    impact:
      'Without CloudTrail, you have no audit trail of who did what in your AWS account. This is critical for security investigations, compliance audits, and troubleshooting.',
    riskLevel: 'critical',
    estimatedEffort: 2,
    prerequisites: [
      'S3 bucket for CloudTrail logs',
      'IAM permissions to create trails',
      'Optional: CloudWatch Logs group for real-time monitoring',
    ],
    steps: [
      {
        order: 1,
        action: 'Create S3 bucket for CloudTrail logs',
        command: 'aws s3 mb s3://cloudtrail-logs-${ACCOUNT_ID}-${REGION} --region ${REGION}',
        consoleSteps: [
          'Go to S3 console',
          'Create bucket: cloudtrail-logs-{account-id}-{region}',
          'Enable versioning and encryption',
          'Apply bucket policy for CloudTrail access',
        ],
      },
      {
        order: 2,
        action: 'Create CloudTrail trail',
        command:
          'aws cloudtrail create-trail --name management-events --s3-bucket-name cloudtrail-logs-${ACCOUNT_ID}-${REGION} --is-multi-region-trail --enable-log-file-validation',
        consoleSteps: [
          'Go to CloudTrail console',
          'Click "Create trail"',
          'Name: management-events',
          'Enable for all regions',
          'Select S3 bucket from step 1',
          'Enable log file validation',
          'Enable CloudWatch Logs (recommended)',
        ],
      },
      {
        order: 3,
        action: 'Start logging',
        command: 'aws cloudtrail start-logging --name management-events',
      },
      {
        order: 4,
        action: 'Enable CloudWatch Logs integration (recommended)',
        details: 'Stream CloudTrail logs to CloudWatch for real-time monitoring and alerting',
      },
    ],
    validation: [
      'Run: aws cloudtrail get-trail-status --name management-events',
      'Verify "IsLogging" is true',
      'Wait 15 minutes and check S3 bucket for log files',
      'Test by making an API call and verifying it appears in logs',
    ],
    awsDocs: [
      'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html',
      'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html',
      'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html',
    ],
    iacSnippets: [
      {
        language: 'cdk-typescript',
        description: 'Create CloudTrail with S3 and CloudWatch Logs',
        code: `import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';

// Create S3 bucket for CloudTrail
const trailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
  bucketName: \`cloudtrail-logs-\${this.account}-\${this.region}\`,
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  lifecycleRules: [
    {
      expiration: cdk.Duration.days(2555), // 7 years
      transitions: [
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90),
        },
      ],
    },
  ],
});

// Create CloudWatch Logs group
const logGroup = new logs.LogGroup(this, 'CloudTrailLogGroup', {
  logGroupName: '/aws/cloudtrail/management-events',
  retention: logs.RetentionDays.ONE_YEAR,
});

// Create CloudTrail
const trail = new cloudtrail.Trail(this, 'ManagementEventsTrail', {
  trailName: 'management-events',
  bucket: trailBucket,
  isMultiRegionTrail: true,
  enableFileValidation: true,
  cloudWatchLogGroup: logGroup,
  sendToCloudWatchLogs: true,
  includeGlobalServiceEvents: true,
});`,
        filePath: 'lib/cloudtrail-stack.ts',
      },
    ],
  },

  'no-backup-plans': {
    findingType: 'no-backup-plans',
    rootCause:
      'AWS Backup plans are not configured. Automated backups are essential for disaster recovery and business continuity.',
    impact:
      'Without backup plans, you risk permanent data loss in case of accidental deletion, corruption, or disaster. Recovery time is unpredictable and may be impossible.',
    riskLevel: 'critical',
    estimatedEffort: 3,
    prerequisites: [
      'Identify resources requiring backup (RDS, EBS, EFS, DynamoDB)',
      'Define RPO (Recovery Point Objective) and RTO (Recovery Time Objective)',
      'S3 bucket for backup vault (created automatically)',
    ],
    steps: [
      {
        order: 1,
        action: 'Create backup vault',
        command: 'aws backup create-backup-vault --backup-vault-name default-vault',
        consoleSteps: [
          'Go to AWS Backup console',
          'Click "Backup vaults"',
          'Click "Create backup vault"',
          'Name: default-vault',
          'Enable encryption with AWS managed key or custom KMS key',
        ],
      },
      {
        order: 2,
        action: 'Create backup plan',
        details:
          'Define backup frequency, retention, and lifecycle policies based on your RPO requirements',
        consoleSteps: [
          'Go to "Backup plans"',
          'Click "Create backup plan"',
          'Choose "Start with a template" (recommended) or "Build a new plan"',
          'Configure backup rules: frequency (daily/weekly), retention period, lifecycle to cold storage',
        ],
      },
      {
        order: 3,
        action: 'Assign resources to backup plan',
        details: 'Use resource tags or ARNs to select resources for backup',
        consoleSteps: [
          'In backup plan, go to "Resource assignments"',
          'Click "Assign resources"',
          'Choose assignment by tags (recommended): backup=true',
          'Or select specific resources by ARN',
        ],
      },
      {
        order: 4,
        action: 'Tag resources for backup',
        command:
          'aws rds add-tags-to-resource --resource-name arn:aws:rds:... --tags Key=backup,Value=true',
        details: 'Tag all production resources that need backup',
      },
    ],
    validation: [
      'Check AWS Backup console for scheduled backup jobs',
      'Wait for first backup to complete (check "Jobs" section)',
      'Verify recovery points appear in backup vault',
      'Test restore from backup to validate process',
    ],
    awsDocs: [
      'https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup-plan.html',
      'https://docs.aws.amazon.com/aws-backup/latest/devguide/assigning-resources.html',
      'https://docs.aws.amazon.com/aws-backup/latest/devguide/recovery-points.html',
    ],
    iacSnippets: [
      {
        language: 'cdk-typescript',
        description: 'AWS Backup plan with daily and weekly backups',
        code: `import * as backup from 'aws-cdk-lib/aws-backup';
import * as events from 'aws-cdk-lib/aws-events';

// Create backup vault
const vault = new backup.BackupVault(this, 'BackupVault', {
  backupVaultName: 'default-vault',
});

// Create backup plan
const plan = new backup.BackupPlan(this, 'BackupPlan', {
  backupPlanName: 'daily-weekly-monthly',
  backupPlanRules: [
    // Daily backups with 35-day retention
    new backup.BackupPlanRule({
      ruleName: 'DailyBackup',
      scheduleExpression: events.Schedule.cron({
        hour: '3',
        minute: '0',
      }),
      deleteAfter: cdk.Duration.days(35),
      moveToColdStorageAfter: cdk.Duration.days(7),
    }),
    // Weekly backups with 1-year retention
    new backup.BackupPlanRule({
      ruleName: 'WeeklyBackup',
      scheduleExpression: events.Schedule.cron({
        weekDay: 'SUN',
        hour: '3',
        minute: '0',
      }),
      deleteAfter: cdk.Duration.days(365),
      moveToColdStorageAfter: cdk.Duration.days(30),
    }),
    // Monthly backups with 7-year retention
    new backup.BackupPlanRule({
      ruleName: 'MonthlyBackup',
      scheduleExpression: events.Schedule.cron({
        day: '1',
        hour: '3',
        minute: '0',
      }),
      deleteAfter: cdk.Duration.days(2555), // 7 years
      moveToColdStorageAfter: cdk.Duration.days(90),
    }),
  ],
});

// Assign resources by tag
plan.addSelection('BackupSelection', {
  resources: [
    backup.BackupResource.fromTag('backup', 'true'),
  ],
  allowRestores: true,
});`,
        filePath: 'lib/backup-stack.ts',
      },
    ],
  },

  'old-access-keys': {
    findingType: 'old-access-keys',
    rootCause:
      'IAM user access keys have not been rotated recently. Long-lived credentials increase the risk of unauthorized access if keys are compromised.',
    impact:
      'Old access keys may have been exposed in logs, code repositories, or third-party systems. Regular rotation limits the window of exposure if keys are compromised.',
    riskLevel: 'high',
    estimatedEffort: 2,
    prerequisites: [
      'List of IAM users with access keys',
      'Knowledge of where keys are used (applications, CI/CD, scripts)',
      'Process to update keys in all locations',
    ],
    steps: [
      {
        order: 1,
        action: 'Audit existing access keys',
        command:
          'aws iam list-access-keys --user-name USERNAME && aws iam get-access-key-last-used --access-key-id KEY_ID',
        details: 'Identify all access keys and their age',
        consoleSteps: [
          'Go to IAM console',
          'Click "Users"',
          'For each user, check "Security credentials" tab',
          'Note the "Created" date for each access key',
        ],
      },
      {
        order: 2,
        action: 'Create new access key',
        command: 'aws iam create-access-key --user-name USERNAME',
        details: 'Create a new key before deactivating the old one to avoid downtime',
        consoleSteps: [
          'In user\'s "Security credentials" tab',
          'Click "Create access key"',
          'Save the new key ID and secret securely',
        ],
      },
      {
        order: 3,
        action: 'Update applications to use new key',
        details:
          'Update all systems using the old key: environment variables, Secrets Manager, Parameter Store, CI/CD systems',
      },
      {
        order: 4,
        action: 'Test with new key',
        details: 'Verify all applications work with the new key before deactivating the old one',
      },
      {
        order: 5,
        action: 'Deactivate old key',
        command:
          'aws iam update-access-key --access-key-id OLD_KEY_ID --status Inactive --user-name USERNAME',
        details: 'Deactivate but do not delete immediately, in case rollback is needed',
      },
      {
        order: 6,
        action: 'Monitor for errors',
        details:
          'Wait 24-48 hours and monitor for authentication failures indicating the old key is still in use somewhere',
      },
      {
        order: 7,
        action: 'Delete old key',
        command: 'aws iam delete-access-key --access-key-id OLD_KEY_ID --user-name USERNAME',
        details: 'After confirming no errors, delete the old key',
      },
    ],
    validation: [
      'Run: aws iam list-access-keys --user-name USERNAME',
      'Verify old key is deleted',
      'Check application logs for authentication errors',
      'Verify new key age is < 90 days',
    ],
    awsDocs: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_RotateAccessKey',
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#rotate-credentials',
      'https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html',
    ],
    iacSnippets: [
      {
        language: 'cdk-typescript',
        description: 'Automated access key rotation Lambda function',
        code: `import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

// Lambda function to rotate keys
const rotationFunction = new lambda.Function(this, 'KeyRotationFunction', {
  runtime: lambda.Runtime.PYTHON_3_11,
  handler: 'index.handler',
  code: lambda.Code.fromInline(\`
import boto3
import os
from datetime import datetime, timedelta

def handler(event, context):
    iam = boto3.client('iam')
    secretsmanager = boto3.client('secretsmanager')

    username = os.environ['IAM_USERNAME']
    secret_name = os.environ['SECRET_NAME']

    # List existing keys
    keys = iam.list_access_keys(UserName=username)['AccessKeyMetadata']

    # Check key age
    for key in keys:
        age = datetime.now(key['CreateDate'].tzinfo) - key['CreateDate']
        if age > timedelta(days=90):
            # Create new key
            new_key = iam.create_access_key(UserName=username)

            # Store in Secrets Manager
            secretsmanager.update_secret(
                SecretId=secret_name,
                SecretString=json.dumps({
                    'access_key_id': new_key['AccessKey']['AccessKeyId'],
                    'secret_access_key': new_key['AccessKey']['SecretAccessKey']
                })
            )

            # Deactivate old key
            iam.update_access_key(
                UserName=username,
                AccessKeyId=key['AccessKeyId'],
                Status='Inactive'
            )

            print(f"Rotated key {key['AccessKeyId']} for user {username}")
\`),
  environment: {
    IAM_USERNAME: 'service-account',
    SECRET_NAME: 'service-account-credentials',
  },
});

// Grant permissions
rotationFunction.addToRolePolicy(new iam.PolicyStatement({
  actions: [
    'iam:ListAccessKeys',
    'iam:CreateAccessKey',
    'iam:UpdateAccessKey',
    'iam:DeleteAccessKey',
  ],
  resources: ['*'],
}));

// Schedule rotation every 90 days
const rule = new events.Rule(this, 'KeyRotationSchedule', {
  schedule: events.Schedule.rate(cdk.Duration.days(90)),
});
rule.addTarget(new targets.LambdaFunction(rotationFunction));`,
        filePath: 'lib/access-key-rotation-stack.ts',
      },
    ],
  },

  'alb-invalid-headers': {
    findingType: 'alb-invalid-headers',
    rootCause:
      'Application Load Balancer is not configured to drop invalid HTTP headers. This can allow header smuggling attacks.',
    impact:
      'Attackers may be able to bypass security controls, access sensitive information, or poison caches by crafting malformed HTTP headers.',
    riskLevel: 'medium',
    estimatedEffort: 0.5,
    prerequisites: ['List of ALBs requiring update', 'Access to modify ALB attributes'],
    steps: [
      {
        order: 1,
        action: 'List all ALBs',
        command:
          'aws elbv2 describe-load-balancers --query "LoadBalancers[?Type==\'application\'].[LoadBalancerArn,LoadBalancerName]" --output table',
      },
      {
        order: 2,
        action: 'Check current configuration',
        command:
          'aws elbv2 describe-load-balancer-attributes --load-balancer-arn ALB_ARN --query "Attributes[?Key==\'routing.http.drop_invalid_header_fields.enabled\'].Value" --output text',
      },
      {
        order: 3,
        action: 'Enable drop invalid headers',
        command:
          'aws elbv2 modify-load-balancer-attributes --load-balancer-arn ALB_ARN --attributes Key=routing.http.drop_invalid_header_fields.enabled,Value=true',
        consoleSteps: [
          'Go to EC2 console',
          'Click "Load Balancers"',
          'Select the ALB',
          'Click "Attributes" tab',
          'Click "Edit"',
          'Enable "Drop invalid header fields"',
          'Click "Save"',
        ],
      },
    ],
    validation: [
      'Run: aws elbv2 describe-load-balancer-attributes --load-balancer-arn ALB_ARN',
      'Verify routing.http.drop_invalid_header_fields.enabled = true',
      'Test with curl to verify invalid headers are dropped',
    ],
    awsDocs: [
      'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#load-balancer-attributes',
      'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-update-security-groups.html',
    ],
    iacSnippets: [
      {
        language: 'cdk-typescript',
        description: 'Configure ALB to drop invalid headers',
        code: `import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
  vpc: vpc,
  internetFacing: true,
});

// Enable drop invalid headers
alb.setAttribute('routing.http.drop_invalid_header_fields.enabled', 'true');

// Additional security best practices
alb.setAttribute('deletion_protection.enabled', 'true');
alb.setAttribute('access_logs.s3.enabled', 'true');
alb.setAttribute('access_logs.s3.bucket', accessLogsBucket.bucketName);`,
        filePath: 'lib/alb-stack.ts',
      },
      {
        language: 'cloudformation',
        description: 'ALB with invalid header dropping',
        code: `Resources:
  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref ALBSecurityGroup
      LoadBalancerAttributes:
        - Key: routing.http.drop_invalid_header_fields.enabled
          Value: 'true'
        - Key: deletion_protection.enabled
          Value: 'true'
        - Key: access_logs.s3.enabled
          Value: 'true'
        - Key: access_logs.s3.bucket
          Value: !Ref AccessLogsBucket`,
        filePath: 'cloudformation/alb.yaml',
      },
    ],
  },

  'security-hub-not-enabled': {
    findingType: 'security-hub-not-enabled',
    rootCause:
      'AWS Security Hub is not enabled. Security Hub provides centralized security findings and compliance checks.',
    impact:
      'Without Security Hub, you lack visibility into security findings across AWS services and cannot easily track compliance with security standards (CIS, PCI-DSS, etc.).',
    riskLevel: 'high',
    estimatedEffort: 1,
    steps: [
      {
        order: 1,
        action: 'Enable Security Hub',
        command: 'aws securityhub enable-security-hub',
        consoleSteps: [
          'Go to AWS Security Hub console',
          'Click "Enable Security Hub"',
          'Select security standards (CIS AWS Foundations Benchmark recommended)',
          'Click "Enable"',
        ],
      },
      {
        order: 2,
        action: 'Enable security standards',
        command:
          'aws securityhub batch-enable-standards --standards-subscription-requests StandardsArn=arn:aws:securityhub:${REGION}::standards/cis-aws-foundations-benchmark/v/1.4.0',
        details:
          'Enable CIS AWS Foundations Benchmark and AWS Foundational Security Best Practices',
      },
      {
        order: 3,
        action: 'Enable integrations',
        details: 'Enable GuardDuty, Inspector, Macie, and other service integrations',
      },
    ],
    validation: [
      'Run: aws securityhub describe-hub',
      'Verify Security Hub is enabled',
      'Check console for security findings',
      'Wait 24 hours for initial compliance checks to complete',
    ],
    awsDocs: [
      'https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-enable.html',
      'https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards.html',
    ],
    iacSnippets: [
      {
        language: 'cdk-typescript',
        description: 'Enable Security Hub with CIS Benchmark',
        code: `import * as securityhub from 'aws-cdk-lib/aws-securityhub';

// Enable Security Hub
const hub = new securityhub.CfnHub(this, 'SecurityHub', {
  tags: {
    Name: 'SecurityHub',
  },
});

// Enable CIS AWS Foundations Benchmark
new securityhub.CfnStandard(this, 'CISBenchmark', {
  standardsArn: \`arn:aws:securityhub:\${this.region}::standards/cis-aws-foundations-benchmark/v/1.4.0\`,
});

// Enable AWS Foundational Security Best Practices
new securityhub.CfnStandard(this, 'AWSFoundational', {
  standardsArn: \`arn:aws:securityhub:\${this.region}::standards/aws-foundational-security-best-practices/v/1.0.0\`,
});`,
        filePath: 'lib/security-hub-stack.ts',
      },
    ],
  },

  'mfa-not-enabled': {
    findingType: 'mfa-not-enabled',
    rootCause:
      'Multi-factor authentication (MFA) is not enabled for IAM users with console access.',
    impact:
      'Without MFA, user accounts are vulnerable to credential theft. An attacker with a username and password can gain full access.',
    riskLevel: 'critical',
    estimatedEffort: 1,
    steps: [
      {
        order: 1,
        action: 'Identify users without MFA',
        command:
          'aws iam get-credential-report && aws iam list-users --query "Users[*].[UserName,Arn]" --output table',
      },
      {
        order: 2,
        action: 'Enable virtual MFA device',
        consoleSteps: [
          'Go to IAM console',
          'Click "Users"',
          'Select the user',
          'Go to "Security credentials" tab',
          'Click "Assign MFA device"',
          'Choose "Virtual MFA device"',
          'Scan QR code with authenticator app',
          'Enter two consecutive MFA codes',
        ],
      },
      {
        order: 3,
        action: 'Enforce MFA with IAM policy',
        details: 'Require MFA for sensitive operations',
      },
    ],
    validation: [
      'Check IAM console for MFA badge next to username',
      'Test login with MFA required',
      'Run credential report to verify MFA status',
    ],
    awsDocs: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html',
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_physical.html',
    ],
    iacSnippets: [
      {
        language: 'cdk-typescript',
        description: 'IAM policy requiring MFA for sensitive operations',
        code: `import * as iam from 'aws-cdk-lib/aws-iam';

// Policy requiring MFA for sensitive operations
const mfaPolicy = new iam.ManagedPolicy(this, 'RequireMFAPolicy', {
  statements: [
    new iam.PolicyStatement({
      sid: 'DenyAllExceptListedIfNoMFA',
      effect: iam.Effect.DENY,
      actions: ['*'],
      resources: ['*'],
      conditions: {
        BoolIfExists: {
          'aws:MultiFactorAuthPresent': 'false',
        },
        StringNotEquals: {
          'aws:RequestedRegion': [\`\${this.region}\`],
        },
      },
      // Allow listing and MFA management without MFA
      notActions: [
        'iam:CreateVirtualMFADevice',
        'iam:EnableMFADevice',
        'iam:ListMFADevices',
        'iam:ListUsers',
        'iam:ListVirtualMFADevices',
        'iam:ResyncMFADevice',
        'sts:GetSessionToken',
      ],
    }),
  ],
});`,
        filePath: 'lib/iam-policies-stack.ts',
      },
    ],
  },

  'inspector-not-enabled': {
    findingType: 'inspector-not-enabled',
    rootCause:
      'Amazon Inspector is not enabled. Inspector provides automated vulnerability scanning for EC2 instances and container images.',
    impact:
      'Without Inspector, you may not be aware of software vulnerabilities, network exposure, or configuration issues in your compute resources.',
    riskLevel: 'high',
    estimatedEffort: 0.5,
    steps: [
      {
        order: 1,
        action: 'Enable Inspector',
        command: 'aws inspector2 enable --resource-types EC2 ECR LAMBDA',
        consoleSteps: [
          'Go to Amazon Inspector console',
          'Click "Get started"',
          'Select resource types: EC2, ECR, Lambda',
          'Click "Enable Inspector"',
        ],
      },
      {
        order: 2,
        action: 'Configure scan settings',
        details: 'Enable continuous scanning for new vulnerabilities',
      },
    ],
    validation: [
      'Run: aws inspector2 get-configuration',
      'Verify Inspector is enabled for desired resource types',
      'Wait for initial scan to complete (30-60 minutes)',
      'Check console for vulnerability findings',
    ],
    awsDocs: [
      'https://docs.aws.amazon.com/inspector/latest/user/getting_started_tutorial.html',
      'https://docs.aws.amazon.com/inspector/latest/user/enable-disable-scanning.html',
    ],
    iacSnippets: [
      {
        language: 'cdk-typescript',
        description: 'Enable Amazon Inspector',
        code: `import * as inspector from 'aws-cdk-lib/aws-inspector';

// Note: Inspector v2 enablement is best done via CLI/Console
// as CDK support is limited. This shows the organization setup.

// Enable Inspector via custom resource
const enableInspector = new cr.AwsCustomResource(this, 'EnableInspector', {
  onCreate: {
    service: 'Inspector2',
    action: 'enable',
    parameters: {
      resourceTypes: ['EC2', 'ECR', 'LAMBDA'],
    },
    physicalResourceId: cr.PhysicalResourceId.of('EnableInspector'),
  },
  policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
    resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
  }),
});`,
        filePath: 'lib/inspector-stack.ts',
      },
    ],
  },
};

/**
 * Get remediation guidance for a finding type
 */
export function getRemediationGuidance(findingType: string): RemediationGuidance | undefined {
  return REMEDIATION_GUIDANCE[findingType];
}

/**
 * Get all available remediation types
 */
export function getAvailableRemediationTypes(): string[] {
  return Object.keys(REMEDIATION_GUIDANCE);
}

/**
 * Map common gap descriptions to remediation types
 */
export function mapGapToRemediationType(gapDescription: string): string | undefined {
  const gapLower = gapDescription.toLowerCase();

  if (gapLower.includes('config') && gapLower.includes('not enabled')) {
    return 'config-not-enabled';
  }
  if (
    gapLower.includes('cloudtrail') &&
    (gapLower.includes('not logging') || gapLower.includes('not enabled'))
  ) {
    return 'cloudtrail-not-logging';
  }
  if (gapLower.includes('backup') && gapLower.includes('plan')) {
    return 'no-backup-plans';
  }
  if (
    gapLower.includes('access key') &&
    (gapLower.includes('old') || gapLower.includes('rotati'))
  ) {
    return 'old-access-keys';
  }
  if (gapLower.includes('alb') && gapLower.includes('invalid header')) {
    return 'alb-invalid-headers';
  }
  if (gapLower.includes('security hub') && gapLower.includes('not enabled')) {
    return 'security-hub-not-enabled';
  }
  if (gapLower.includes('mfa') && gapLower.includes('not enabled')) {
    return 'mfa-not-enabled';
  }
  if (gapLower.includes('inspector') && gapLower.includes('not enabled')) {
    return 'inspector-not-enabled';
  }

  return undefined;
}
