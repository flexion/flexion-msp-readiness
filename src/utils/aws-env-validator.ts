/**
 * AWS Environment Validator
 *
 * Validates AWS credentials and environment variables to ensure
 * proper authentication configuration and avoid common issues.
 */

import chalk from 'chalk';

export interface AWSEnvValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  profile?: string;
  region?: string;
  hasStaticCredentials: boolean;
  hasProfileSet: boolean;
  recommendation?: string;
}

/**
 * Validate AWS environment variables and credentials setup
 */
export function validateAWSEnvironment(expectedProfile?: string): AWSEnvValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for environment variables
  const awsProfile = process.env.AWS_PROFILE;
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsSessionToken = process.env.AWS_SESSION_TOKEN;
  const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

  const hasStaticCredentials = !!(awsAccessKeyId && awsSecretAccessKey);
  const hasProfileSet = !!awsProfile;

  // Check for conflicting credential sources
  if (hasStaticCredentials && hasProfileSet) {
    warnings.push(
      'Multiple credential sources detected: Both AWS_PROFILE and static credentials ' +
        '(AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) are set. ' +
        'AWS SDK may behave unpredictably. Recommend unsetting static credentials.'
    );
  }

  // Check if expected profile matches actual profile
  if (expectedProfile && awsProfile && awsProfile !== expectedProfile) {
    errors.push(
      `AWS_PROFILE mismatch: Expected "${expectedProfile}" but found "${awsProfile}". ` +
        `Set with: export AWS_PROFILE=${expectedProfile}`
    );
  }

  // Check if no credentials are configured
  if (!hasStaticCredentials && !hasProfileSet) {
    errors.push('No AWS credentials configured. Set AWS_PROFILE or run "aws sso login".');
  }

  // Generate recommendation
  let recommendation: string | undefined;
  if (hasStaticCredentials && hasProfileSet) {
    recommendation =
      'Run these commands to fix credential conflicts:\n' +
      '  unset AWS_ACCESS_KEY_ID\n' +
      '  unset AWS_SECRET_ACCESS_KEY\n' +
      '  unset AWS_SESSION_TOKEN\n' +
      `  export AWS_PROFILE=${expectedProfile || awsProfile}`;
  } else if (!hasProfileSet && expectedProfile) {
    recommendation =
      `Set the correct AWS profile:\n` +
      `  export AWS_PROFILE=${expectedProfile}\n` +
      `  aws sso login --profile ${expectedProfile}`;
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    warnings,
    errors,
    profile: awsProfile,
    region: awsRegion,
    hasStaticCredentials,
    hasProfileSet,
    recommendation,
  };
}

/**
 * Print AWS environment validation results
 */
export function printAWSEnvValidation(validation: AWSEnvValidation, verbose = false): void {
  if (validation.isValid && validation.warnings.length === 0) {
    if (verbose) {
      console.log(chalk.green('✓ AWS environment validated'));
      if (validation.profile) {
        console.log(chalk.gray(`  Profile: ${validation.profile}`));
      }
      if (validation.region) {
        console.log(chalk.gray(`  Region: ${validation.region}`));
      }
    }
    return;
  }

  // Print errors
  if (validation.errors.length > 0) {
    console.log(chalk.red('\n⚠️  AWS Environment Errors:\n'));
    validation.errors.forEach(error => {
      console.log(chalk.red(`  ✗ ${error}`));
    });
  }

  // Print warnings
  if (validation.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  AWS Environment Warnings:\n'));
    validation.warnings.forEach(warning => {
      console.log(chalk.yellow(`  ! ${warning}`));
    });
  }

  // Print recommendation
  if (validation.recommendation) {
    console.log(chalk.cyan('\n💡 Recommendation:\n'));
    console.log(chalk.cyan(validation.recommendation));
  }

  console.log(); // Empty line
}

/**
 * Get current AWS environment summary for logging
 */
export function getAWSEnvSummary(): string {
  const profile = process.env.AWS_PROFILE || 'not set';
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'not set';
  const hasStatic = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

  return `AWS_PROFILE=${profile}, AWS_REGION=${region}, static_creds=${hasStatic}`;
}
