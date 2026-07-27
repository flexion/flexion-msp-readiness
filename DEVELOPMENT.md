# Development Guide

This document describes how to develop, build, test, and contribute to the MSP Readiness automation tool.

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 8.x or higher
- **AWS CLI** configured with credentials
- **Git** for version control

## Setup

### Clone and Install

```bash
git clone <repository-url>
cd flexion-msp-readiness
npm install
```

### Build

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Watch Mode

For active development:

```bash
npm run watch
```

This runs TypeScript compiler in watch mode, recompiling on file changes.

## Project Structure

```
flexion-msp-readiness/
├── src/               # TypeScript source code
├── dist/              # Compiled JavaScript (gitignored)
├── templates/         # Handlebars templates
├── bin/               # CLI executables
├── docs/              # Additional documentation
├── __tests__/         # Test files
├── config.yaml        # User configuration (gitignored)
├── config.example.yaml # Configuration template
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── jest.config.js     # Jest test configuration
└── .eslintrc.json     # ESLint configuration
```

## Development Workflow

### 1. Make Changes

Edit files in `src/` directory. TypeScript files use strict mode.

### 2. Build

```bash
npm run build
```

Check for compilation errors.

### 3. Test

```bash
npm test
```

Run Jest unit tests. Test files are in `src/__tests__/`.

### 4. Lint

```bash
npm run lint
```

Run ESLint to check code style and catch issues.

### 5. Run Locally

```bash
npm run dev -- <command> [options]
```

Examples:
```bash
npm run dev -- assess --config config.yaml
npm run dev -- collect-evidence
npm run dev -- generate --playbooks-only
npm run dev -- dashboard
npm run dev -- status
```

### 6. Link for Testing

To test the CLI globally:

```bash
npm link
msp-readiness assess
```

To unlink:

```bash
npm unlink -g msp-readiness
```

## Testing

### Unit Tests

Unit tests are in `src/__tests__/` directory, mirroring the source structure:

```
src/__tests__/
├── assessors/
│   ├── doc-scanner.test.ts
│   └── requirement-matcher.test.ts
├── collectors/
│   └── cloudtrail-collector.test.ts
├── generators/
│   └── playbook-generator.test.ts
└── fixtures/
    ├── docs/           # Test markdown files
    └── output/         # Test output directory
```

Run tests:

```bash
npm test                              # All tests
npm test -- --watch                   # Watch mode
npm test -- --testPathPattern=doc     # Specific test
npm test -- --coverage                # Coverage report
```

### Integration Tests

Integration tests run full CLI commands with test fixtures:

```bash
npm run test:integration
```

### Manual Testing

Test on a real project:

```bash
cd /path/to/your/project
/path/to/flexion-msp-readiness/bin/msp-readiness assess
```

## Adding Features

### Adding a New MSP Requirement

1. Edit `src/data/msp-requirements.ts`:

```typescript
export const MSP_REQUIREMENTS: MSPRequirement[] = [
  // ... existing requirements
  {
    id: 'NEW-001',
    name: 'New Requirement Name',
    category: 'security',  // or 'operations' or 'support'
    description: 'Detailed description of the requirement',
    priority: 'high',  // or 'critical', 'medium', 'low'
    cisControls: ['5.1', '5.2'],  // Related CIS Controls
    awsServices: ['config', 'cloudtrail'],  // AWS services involved
    evidenceRequired: [
      'Documented procedure',
      'AWS Config rule compliance',
      'Evidence of implementation',
    ],
    estimatedHours: 8,  // Hours to implement
  },
];
```

2. Rebuild:

```bash
npm run build
```

3. Test:

```bash
npm test -- --testPathPattern=requirement
```

### Adding a New Template

1. Create Handlebars template in `templates/playbooks/` or `templates/runbooks/`:

```handlebars
# {{name}}

**Project**: {{projectName}}
**Organization**: {{organization}}
**Last Updated**: {{date}}

## Purpose

<!-- Template content here -->
```

2. Add to `src/generators/playbook-generator.ts`:

```typescript
export const AVAILABLE_PLAYBOOKS: PlaybookMetadata[] = [
  // ... existing playbooks
  {
    filename: 'new-playbook.md',
    template: 'playbooks/new-template.hbs',
    requirementIds: ['NEW-001'],
    cisControls: ['5.1'],
    title: 'New Playbook Title',
  },
];
```

3. Test generation:

```bash
npm run dev -- generate --playbooks-only
```

### Adding a New Evidence Collector

1. Create collector in `src/collectors/`:

```typescript
/**
 * New service evidence collector
 */

import { ServiceClient, ListCommand } from '@aws-sdk/client-service';
import { logger, wrapAWSError } from '../util/logger';

export interface NewServiceEvidence {
  // Define evidence structure
  resources: ResourceInfo[];
  summary: {
    total: number;
    compliant: number;
  };
}

export async function collectNewServiceEvidence(
  region: string,
  profile: string
): Promise<NewServiceEvidence> {
  logger.debug('Collecting new service evidence', { region });

  try {
    const client = new ServiceClient({ region });
    const response = await client.send(new ListCommand({}));

    // Process response

    return {
      resources: [],
      summary: {
        total: 0,
        compliant: 0,
      },
    };
  } catch (error) {
    const wrappedError = wrapAWSError(error, 'NewService');
    logger.error('Failed to collect evidence', wrappedError);
    throw wrappedError;
  }
}

export function saveNewServiceEvidence(
  evidence: NewServiceEvidence,
  outputPath: string
): EvidenceArtifact {
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2));

  return {
    type: 'aws-snapshot',
    path: outputPath,
    description: 'New service evidence snapshot',
    requirementIds: ['NEW-001'],
    collectedAt: new Date(),
  };
}

export function printNewServiceEvidenceSummary(evidence: NewServiceEvidence): void {
  console.log('New Service Evidence:');
  console.log(`  Total: ${evidence.summary.total}`);
  console.log(`  Compliant: ${evidence.summary.compliant}`);
}
```

2. Add to `src/cli.ts` in the `collect-evidence` command:

```typescript
// Collect new service evidence
spinner.text = 'Collecting new service evidence...';
spinner.start();
try {
  const newEvidence = await collectNewServiceEvidence(config.aws.region, config.aws.profile);
  const artifact = saveNewServiceEvidence(newEvidence, `${evidencePath}/new-service.json`);
  artifacts.push(artifact);
  spinner.succeed('New service evidence collected');
  printNewServiceEvidenceSummary(newEvidence);
} catch (error) {
  spinner.warn(`New service collection failed: ${error instanceof Error ? error.message : String(error)}`);
}
```

3. Test:

```bash
npm run dev -- collect-evidence
```

### Adding a New AWS Analyzer

1. Create analyzer in `src/assessors/`:

```typescript
/**
 * New service analyzer
 */

import { ServiceClient, DescribeCommand } from '@aws-sdk/client-service';
import { AssessmentFinding } from '../types';
import { logger, wrapAWSError } from '../util/logger';

export interface NewServiceAnalysis {
  timestamp: Date;
  enabled: boolean;
  configuration: ConfigInfo;
  findings: AssessmentFinding[];
}

export async function analyzeNewService(
  region: string,
  profile: string
): Promise<NewServiceAnalysis> {
  logger.debug('Starting new service analysis', { region });

  const findings: AssessmentFinding[] = [];

  try {
    const client = new ServiceClient({ region });
    // Analyze service

    return {
      timestamp: new Date(),
      enabled: true,
      configuration: {},
      findings,
    };
  } catch (error) {
    const wrappedError = wrapAWSError(error, 'NewService');
    logger.error('New service analysis failed', wrappedError);

    return {
      timestamp: new Date(),
      enabled: false,
      configuration: {},
      findings,
    };
  }
}
```

2. Add to `AWSAnalysisResults` type in `src/assessors/requirement-matcher.ts`:

```typescript
export interface AWSAnalysisResults {
  configAnalysis: AWSConfigAnalysis;
  iamAnalysis: IAMAnalysis;
  securityHubAnalysis: SecurityHubAnalysis;
  newServiceAnalysis?: NewServiceAnalysis;  // Add here
}
```

3. Add to `assess` command in `src/cli.ts`:

```typescript
const [configAnalysis, iamAnalysis, securityHubAnalysis, newServiceAnalysis] = await Promise.all([
  analyzeAWSConfig(config.aws.region, config.aws.profile),
  analyzeIAM(config.aws.region, config.aws.profile),
  analyzeSecurityHub(config.aws.region, config.aws.profile),
  analyzeNewService(config.aws.region, config.aws.profile),  // Add here
]);

awsAnalysis = {
  configAnalysis,
  iamAnalysis,
  securityHubAnalysis,
  newServiceAnalysis,  // Add here
};
```

4. Integrate findings in requirement matcher.

## Code Style

### TypeScript Guidelines

- Use strict mode (enabled in `tsconfig.json`)
- Prefer `interface` over `type` for object shapes
- Use `const` over `let` when possible
- No `any` types except when interfacing with external libraries
- Export types from `types.ts` for reuse
- Document public functions with JSDoc comments

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Functions**: `camelCase()`
- **Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private functions**: Prefix with underscore or keep unexported

### Error Handling

Always use try/catch for AWS SDK calls:

```typescript
try {
  const result = await client.send(command);
  // Success path
} catch (error) {
  const wrappedError = wrapAWSError(error, 'ServiceName');
  logger.error('Operation failed', wrappedError, { context });
  // Handle error
}
```

Use `MSPError` for application errors:

```typescript
import { createError, ErrorCodes } from './util/logger';

if (!fs.existsSync(path)) {
  throw createError(
    ErrorCodes.DOCS_PATH_INVALID,
    `Documentation path not found: ${path}`
  );
}
```

### Logging

Use the logger utility:

```typescript
import { logger } from './util/logger';

logger.debug('Starting operation', { param1, param2 });
logger.info('Operation complete');
logger.warn('Unexpected condition', { details });
logger.error('Operation failed', error, { context });
logger.success('Successfully completed');
```

## Debugging

### Enable Debug Logging

Set log level in code:

```typescript
import { logger, LogLevel } from './util/logger';

logger.setLevel(LogLevel.DEBUG);
```

Or add debug statements:

```typescript
console.log(JSON.stringify(data, null, 2));
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Assess Command",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/bin/msp-readiness",
      "args": ["assess", "--config", "config.yaml"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "npm: build"
    }
  ]
}
```

Set breakpoints in `.ts` files and press F5.

### Inspect AWS Requests

Use AWS CLI debug mode to see requests:

```bash
AWS_DEBUG=1 msp-readiness assess
```

## Testing Best Practices

### Unit Test Structure

```typescript
describe('module-name', () => {
  // Setup
  beforeAll(() => {
    // One-time setup
  });

  afterAll(() => {
    // One-time cleanup
  });

  beforeEach(() => {
    // Per-test setup
  });

  afterEach(() => {
    // Per-test cleanup
  });

  describe('function-name', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = createMockInput();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      // Test edge case
    });

    it('should throw on invalid input', () => {
      expect(() => functionUnderTest(invalid)).toThrow();
    });
  });
});
```

### Mocking AWS SDK

```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { ServiceClient, ListCommand } from '@aws-sdk/client-service';

const serviceMock = mockClient(ServiceClient);

beforeEach(() => {
  serviceMock.reset();
});

it('should handle AWS response', async () => {
  serviceMock.on(ListCommand).resolves({
    Items: [{ id: '1', name: 'test' }],
  });

  const result = await collectEvidence('us-east-1', 'default');

  expect(result.items.length).toBe(1);
});
```

## Release Process

### Version Bump

```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.1 -> 0.2.0
npm version major  # 0.2.0 -> 1.0.0
```

### Build and Test

```bash
npm run build
npm test
npm run lint
```

### Tag and Push

```bash
git push origin main --tags
```

### Publish to npm (if public)

```bash
npm publish
```

## Troubleshooting

### Build Errors

**Error**: `Cannot find module`

- Run `npm install` to ensure dependencies are installed
- Check `tsconfig.json` for correct path mappings

**Error**: Type errors in AWS SDK

- Ensure correct AWS SDK package names (e.g., `@aws-sdk/client-securityhub` not `client-security-hub`)
- Cast to `any` for problematic SDK types

### Test Failures

**Error**: Tests timing out

- Increase Jest timeout in `jest.config.js`
- Check for unresolved promises

**Error**: Mock not working

- Reset mocks in `beforeEach()`
- Verify mock setup before test execution

### Runtime Errors

**Error**: AWS credentials not found

```bash
aws configure  # Set up credentials
export AWS_PROFILE=your-profile
```

**Error**: Permission denied

- Check IAM permissions for the AWS services being accessed
- Use `--skip-aws` flag to skip AWS analysis

**Error**: Config file not found

- Create `config.yaml` from `config.example.yaml`
- Check file path is correct

## Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and commit: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Create Pull Request

### PR Checklist

- [ ] Code builds without errors
- [ ] Tests pass
- [ ] Linting passes
- [ ] New features have tests
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

### Code Review Guidelines

- Keep PRs focused and small
- Write descriptive commit messages
- Add tests for new features
- Update documentation
- Respond to review comments

## Getting Help

- Check documentation: README.md, ARCHITECTURE.md
- Search existing issues
- Create new issue with:
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details (Node version, OS, AWS region)
  - Error messages and stack traces

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Handlebars Documentation](https://handlebarsjs.com/guide/)

## License

See LICENSE file for details.
