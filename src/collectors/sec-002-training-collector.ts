/**
 * SEC-002: Security Awareness Training Evidence Collector
 * Collects evidence of security awareness training records and completion
 */

import { EvidenceArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface TrainingEvidence {
  trainingRecords: TrainingRecord[];
  trainingFiles: TrainingFile[];
  completionStats: CompletionStats;
  summary: {
    totalRecords: number;
    totalEmployees: number;
    completedTraining: number;
    completionRate: number;
    hasRecentTraining: boolean;
    compliant: boolean;
  };
}

export interface TrainingRecord {
  employeeId?: string;
  employeeName?: string;
  trainingDate?: Date;
  trainingType: string;
  completed: boolean;
  score?: number;
  certificateNumber?: string;
}

export interface TrainingFile {
  fileName: string;
  filePath: string;
  fileType: 'csv' | 'json' | 'pdf' | 'xlsx' | 'other';
  recordCount: number;
  lastModified?: Date;
}

export interface CompletionStats {
  byMonth: Record<string, number>;
  byDepartment: Record<string, number>;
  averageScore?: number;
}

/**
 * Collect security training evidence
 */
export async function collectTrainingEvidence(
  docsPath: string
): Promise<TrainingEvidence> {
  try {
    // Scan for training-related files
    const trainingFiles = scanForTrainingFiles(docsPath);

    // Parse training records from files
    const trainingRecords = parseTrainingRecords(trainingFiles);

    // Calculate completion statistics
    const completionStats = calculateCompletionStats(trainingRecords);

    const totalEmployees = new Set(trainingRecords.map(r => r.employeeId)).size;
    const completedTraining = trainingRecords.filter(r => r.completed).length;
    const completionRate =
      totalEmployees > 0 ? (completedTraining / totalEmployees) * 100 : 0;

    // Check for recent training (within last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const hasRecentTraining = trainingRecords.some(
      r => r.trainingDate && r.trainingDate > oneYearAgo
    );

    const summary = {
      totalRecords: trainingRecords.length,
      totalEmployees,
      completedTraining,
      completionRate,
      hasRecentTraining,
      compliant: completionRate >= 90 && hasRecentTraining,
    };

    return {
      trainingRecords,
      trainingFiles,
      completionStats,
      summary,
    };
  } catch (error) {
    console.error(`Failed to collect training evidence: ${error}`);
    return {
      trainingRecords: [],
      trainingFiles: [],
      completionStats: {
        byMonth: {},
        byDepartment: {},
      },
      summary: {
        totalRecords: 0,
        totalEmployees: 0,
        completedTraining: 0,
        completionRate: 0,
        hasRecentTraining: false,
        compliant: false,
      },
    };
  }
}

/**
 * Scan for training-related files
 */
function scanForTrainingFiles(docsPath: string): TrainingFile[] {
  const files: TrainingFile[] = [];

  if (!fs.existsSync(docsPath)) {
    return files;
  }

  try {
    const allFiles = fs.readdirSync(docsPath, { recursive: true }) as string[];

    for (const file of allFiles) {
      const filePath = path.join(docsPath, file);

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) continue;

      const lowerFile = file.toLowerCase();

      // Look for training-related files
      if (
        lowerFile.includes('training') ||
        lowerFile.includes('awareness') ||
        lowerFile.includes('security-training') ||
        lowerFile.includes('compliance-training') ||
        lowerFile.includes('lms') ||
        lowerFile.includes('learning')
      ) {
        const ext = path.extname(file).toLowerCase();
        let fileType: 'csv' | 'json' | 'pdf' | 'xlsx' | 'other' = 'other';

        if (ext === '.csv') fileType = 'csv';
        else if (ext === '.json') fileType = 'json';
        else if (ext === '.pdf') fileType = 'pdf';
        else if (ext === '.xlsx' || ext === '.xls') fileType = 'xlsx';

        const stats = fs.statSync(filePath);

        files.push({
          fileName: path.basename(file),
          filePath,
          fileType,
          recordCount: 0, // Will be updated during parsing
          lastModified: stats.mtime,
        });
      }
    }
  } catch (error) {
    console.error(`Failed to scan for training files: ${error}`);
  }

  return files;
}

/**
 * Parse training records from files
 */
function parseTrainingRecords(files: TrainingFile[]): TrainingRecord[] {
  const records: TrainingRecord[] = [];

  for (const file of files) {
    try {
      if (file.fileType === 'csv') {
        const csvRecords = parseCSVTrainingFile(file.filePath);
        records.push(...csvRecords);
        file.recordCount = csvRecords.length;
      } else if (file.fileType === 'json') {
        const jsonRecords = parseJSONTrainingFile(file.filePath);
        records.push(...jsonRecords);
        file.recordCount = jsonRecords.length;
      }
      // PDF and XLSX would require additional libraries
      // For now, just note their presence
    } catch (error) {
      console.error(`Failed to parse training file ${file.fileName}: ${error}`);
    }
  }

  return records;
}

/**
 * Parse CSV training file
 */
function parseCSVTrainingFile(filePath: string): TrainingRecord[] {
  const records: TrainingRecord[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = line.split(',').map(f => f.trim());

      // Try to parse common CSV formats
      // Format 1: employeeId, employeeName, trainingDate, trainingType, completed
      if (fields.length >= 4) {
        records.push({
          employeeId: fields[0],
          employeeName: fields[1],
          trainingDate: parseDate(fields[2]),
          trainingType: fields[3],
          completed: fields[4]?.toLowerCase() === 'true' || fields[4] === '1',
          score: fields[5] ? parseFloat(fields[5]) : undefined,
        });
      }
    }
  } catch (error) {
    console.error(`Failed to parse CSV file: ${error}`);
  }

  return records;
}

/**
 * Parse JSON training file
 */
function parseJSONTrainingFile(filePath: string): TrainingRecord[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Handle array of records
    if (Array.isArray(data)) {
      return data.map(item => ({
        employeeId: item.employeeId || item.employee_id,
        employeeName: item.employeeName || item.employee_name || item.name,
        trainingDate: parseDate(item.trainingDate || item.training_date || item.date),
        trainingType: item.trainingType || item.training_type || item.type || 'Unknown',
        completed: Boolean(item.completed || item.status === 'completed'),
        score: item.score,
        certificateNumber: item.certificateNumber || item.certificate_number,
      }));
    }

    // Handle object with records array
    if (data.records && Array.isArray(data.records)) {
      return parseJSONTrainingFile(filePath);
    }
  } catch (error) {
    console.error(`Failed to parse JSON file: ${error}`);
  }

  return [];
}

/**
 * Parse date string
 */
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;

  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

/**
 * Calculate completion statistics
 */
function calculateCompletionStats(records: TrainingRecord[]): CompletionStats {
  const byMonth: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const scores: number[] = [];

  for (const record of records) {
    // Count by month
    if (record.trainingDate) {
      const monthKey = `${record.trainingDate.getFullYear()}-${String(
        record.trainingDate.getMonth() + 1
      ).padStart(2, '0')}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    }

    // Collect scores
    if (record.score !== undefined) {
      scores.push(record.score);
    }
  }

  const averageScore =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;

  return {
    byMonth,
    byDepartment,
    averageScore,
  };
}

/**
 * Save training evidence to file
 */
export function saveSEC002Evidence(
  evidence: TrainingEvidence,
  outputPath: string
): EvidenceArtifact {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save evidence as JSON
  fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2), 'utf-8');

  return {
    type: 'document',
    path: outputPath,
    description: 'Security awareness training records and completion statistics',
    requirementIds: ['SEC-002'],
    collectedAt: new Date(),
    metadata: {
      totalRecords: evidence.summary.totalRecords,
      completionRate: evidence.summary.completionRate,
      compliant: evidence.summary.compliant,
    },
  };
}
