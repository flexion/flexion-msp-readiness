/**
 * Structured logging utility
 */

import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  module?: string;
  operation?: string;
  requirementId?: string;
  awsService?: string;
  [key: string]: any;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', chalk.gray(message), context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', chalk.blue(message), context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', chalk.yellow(message), context);
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', chalk.red(message), context);
      if (error && error.stack) {
        console.error(chalk.gray(error.stack));
      }
    }
  }

  success(message: string, context?: LogContext): void {
    this.log('INFO', chalk.green(message), context);
  }

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    console.log(`[${timestamp}] ${level}: ${message}${contextStr}`);
  }
}

export const logger = new Logger();

/**
 * Error wrapper with actionable guidance
 */
export class MSPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly guidance?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'MSPError';
  }

  toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`;
    if (this.guidance) {
      result += `\n\nSuggested action: ${this.guidance}`;
    }
    if (this.cause) {
      result += `\n\nCaused by: ${this.cause.message}`;
    }
    return result;
  }
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  AWS_ACCESS_DENIED: 'AWS_ACCESS_DENIED',
  AWS_SERVICE_ERROR: 'AWS_SERVICE_ERROR',
  DOCS_PATH_INVALID: 'DOCS_PATH_INVALID',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_RENDER_ERROR: 'TEMPLATE_RENDER_ERROR',
  ASSESSMENT_NOT_FOUND: 'ASSESSMENT_NOT_FOUND',
  EVIDENCE_COLLECTION_FAILED: 'EVIDENCE_COLLECTION_FAILED',
} as const;

/**
 * Create error with guidance based on error code
 */
export function createError(code: string, message: string, cause?: Error): MSPError {
  const guidance = getErrorGuidance(code);
  return new MSPError(message, code, guidance, cause);
}

function getErrorGuidance(code: string): string | undefined {
  const guidanceMap: Record<string, string> = {
    [ErrorCodes.CONFIG_NOT_FOUND]:
      'Create a config.yaml file in the project root. See config.example.yaml for reference.',
    [ErrorCodes.CONFIG_INVALID]:
      'Check config.yaml syntax and ensure all required fields are present.',
    [ErrorCodes.AWS_ACCESS_DENIED]:
      'Verify AWS credentials are configured (aws configure) and the IAM user/role has required permissions.',
    [ErrorCodes.AWS_SERVICE_ERROR]:
      'Check AWS service status and verify the region is correct. Use --skip-aws to skip AWS analysis.',
    [ErrorCodes.DOCS_PATH_INVALID]:
      'Verify the docs_path in config.yaml points to an existing directory with Markdown files.',
    [ErrorCodes.TEMPLATE_NOT_FOUND]: 'Ensure template files exist in templates/ directory.',
    [ErrorCodes.TEMPLATE_RENDER_ERROR]:
      'Check template syntax and verify all required variables are provided.',
    [ErrorCodes.ASSESSMENT_NOT_FOUND]:
      'Run "msp-readiness assess" first to generate the assessment report.',
    [ErrorCodes.EVIDENCE_COLLECTION_FAILED]:
      'Check AWS permissions and service availability. Some evidence may be partially collected.',
  };

  return guidanceMap[code];
}

/**
 * Wrap AWS SDK errors with actionable guidance
 */
export function wrapAWSError(error: any, service: string): MSPError {
  const message = error.message || String(error);

  if (error.name === 'AccessDeniedException' || message.includes('Access Denied')) {
    return createError(
      ErrorCodes.AWS_ACCESS_DENIED,
      `Access denied when calling ${service}: ${message}`,
      error
    );
  }

  return createError(ErrorCodes.AWS_SERVICE_ERROR, `AWS ${service} error: ${message}`, error);
}

/**
 * Format error for user display
 */
export function formatError(error: Error | MSPError): string {
  if (error instanceof MSPError) {
    return error.toString();
  }
  return `${error.name}: ${error.message}`;
}
