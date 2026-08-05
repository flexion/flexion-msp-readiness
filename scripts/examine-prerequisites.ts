#!/usr/bin/env ts-node
/**
 * Examine the structure of the MSP Prerequisites sheet
 */

import * as XLSX from 'xlsx';

const SPREADSHEET_PATH = '/Users/tim/AWS Managed Service Provider (MSP) Program Self-Assessment.xlsx';

const workbook = XLSX.readFile(SPREADSHEET_PATH);
const worksheet = workbook.Sheets['MSP Prerequisites'];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log(`Total rows: ${data.length}\n`);
console.log('First 30 rows:\n');
data.slice(0, 30).forEach((row: any, idx: number) => {
  if (row && row.length > 0) {
    console.log(`Row ${idx}:`, JSON.stringify(row, null, 0));
  }
});
