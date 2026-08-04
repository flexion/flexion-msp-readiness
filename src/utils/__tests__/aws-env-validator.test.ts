import { validateAWSEnvironment, getAWSEnvSummary } from '../aws-env-validator';

describe('aws-env-validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateAWSEnvironment', () => {
    it('should pass validation with only profile set', () => {
      process.env.AWS_PROFILE = 'test-profile';

      const result = validateAWSEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.profile).toBe('test-profile');
      expect(result.hasProfileSet).toBe(true);
      expect(result.hasStaticCredentials).toBe(false);
    });

    it('should pass validation with only static credentials set', () => {
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
      process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

      const result = validateAWSEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.hasStaticCredentials).toBe(true);
      expect(result.hasProfileSet).toBe(false);
    });

    it('should warn when both profile and static credentials are set', () => {
      process.env.AWS_PROFILE = 'test-profile';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
      process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

      const result = validateAWSEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Multiple credential sources');
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation).toContain('unset AWS_ACCESS_KEY_ID');
    });

    it('should error when no credentials are configured', () => {
      const result = validateAWSEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('No AWS credentials configured');
    });

    it('should error when profile does not match expected', () => {
      process.env.AWS_PROFILE = 'wrong-profile';

      const result = validateAWSEnvironment('expected-profile');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('AWS_PROFILE mismatch');
      expect(result.errors[0]).toContain('expected-profile');
      expect(result.errors[0]).toContain('wrong-profile');
    });

    it('should pass when profile matches expected', () => {
      process.env.AWS_PROFILE = 'expected-profile';

      const result = validateAWSEnvironment('expected-profile');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should include region in validation result', () => {
      process.env.AWS_PROFILE = 'test-profile';
      process.env.AWS_REGION = 'us-west-2';

      const result = validateAWSEnvironment();

      expect(result.region).toBe('us-west-2');
    });

    it('should use AWS_DEFAULT_REGION if AWS_REGION not set', () => {
      process.env.AWS_PROFILE = 'test-profile';
      process.env.AWS_DEFAULT_REGION = 'us-east-1';

      const result = validateAWSEnvironment();

      expect(result.region).toBe('us-east-1');
    });

    it('should generate recommendation for credential conflicts', () => {
      process.env.AWS_PROFILE = 'test-profile';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
      process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

      const result = validateAWSEnvironment('expected-profile');

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation).toContain('unset AWS_ACCESS_KEY_ID');
      expect(result.recommendation).toContain('unset AWS_SECRET_ACCESS_KEY');
      expect(result.recommendation).toContain('export AWS_PROFILE=expected-profile');
    });

    it('should generate recommendation for missing profile', () => {
      // No credentials set

      const result = validateAWSEnvironment('expected-profile');

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation).toContain('export AWS_PROFILE=expected-profile');
      expect(result.recommendation).toContain('aws sso login');
    });
  });

  describe('getAWSEnvSummary', () => {
    it('should summarize environment with profile set', () => {
      process.env.AWS_PROFILE = 'test-profile';
      process.env.AWS_REGION = 'us-east-1';

      const summary = getAWSEnvSummary();

      expect(summary).toContain('AWS_PROFILE=test-profile');
      expect(summary).toContain('AWS_REGION=us-east-1');
      expect(summary).toContain('static_creds=false');
    });

    it('should show static credentials when set', () => {
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
      process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

      const summary = getAWSEnvSummary();

      expect(summary).toContain('static_creds=true');
    });

    it('should show "not set" for missing values', () => {
      const summary = getAWSEnvSummary();

      expect(summary).toContain('AWS_PROFILE=not set');
      expect(summary).toContain('AWS_REGION=not set');
    });
  });
});
