# Issue #9: Better Reporting Formats - Implementation Plan

## Overview
Add export capabilities for different audiences: PDF, CSV, Email summaries, and SARIF format.

## Status: In Progress

The implementation design is complete. The following components need to be created:

## 1. PDF Exporter (`src/exporters/pdf-exporter.ts`)

**Features:**
- Professional PDF generation using puppeteer
- Configurable branding (logo, colors, company name)
- Executive summary with metrics
- Requirements breakdown by category
- Critical gaps highlighting
- Styled HTML-to-PDF conversion

**Key Functions:**
- `exportToPDF(assessment, outputPath, branding)` - Main export function
- `generatePDFHTML(assessment, branding)` - Generate styled HTML
- `isPuppeteerAvailable()` - Check if puppeteer is installed

**Dependencies:**
- puppeteer (optional dependency in package.json)

## 2. CSV Exporter (`src/exporters/csv-exporter.ts`)

**Features:**
- Multiple CSV formats for different use cases
- Standard format: All requirements with full details
- Gaps format: Only requirements with gaps
- Jira format: Ready for Jira CSV import

**Key Functions:**
- `exportToCSV(assessment, outputPath, options)` - Main export
- `exportAllCSVFormats(assessment, outputDir)` - Generate all formats
- `generateStandardCSV(assessment, options)` - Full requirements list
- `generateJiraCSV(assessment)` - Jira-compatible format
- `generateGapsCSV(assessment)` - Gaps only

**CSV Formats:**
1. **Standard**: Full details, all requirements
2. **Gaps**: Focused on items needing attention
3. **Jira**: Issue import format with proper columns

## 3. Email Exporter (`src/exporters/email-exporter.ts`)

**Features:**
- Concise summaries (under 500 words)
- Multiple output formats: Markdown, HTML, Plain Text
- Executive summary with key metrics
- Top N critical gaps (configurable)
- Quick wins and high-priority items
- Actionable next steps

**Key Functions:**
- `exportEmailSummary(assessment, outputPath, format, options)` - Main export
- `generateEmailSummary(assessment, options)` - Markdown format
- `generateHTMLEmail(assessment, options)` - Styled HTML for email clients
- `generatePlainTextSummary(assessment, options)` - Plain text version

**Options:**
- `maxWordCount`: Target word count (default 500)
- `includeTopGaps`: Number of top gaps to show (default 5)
- `includeMetrics`: Show metrics section (default true)

## 4. SARIF Exporter (`src/exporters/sarif-exporter.ts`)

**Features:**
- SARIF v2.1.0 format for GitHub Security integration
- Maps MSP requirements to security rules
- Creates findings for gaps and partial requirements
- Links findings to documentation locations
- Includes severity levels and CIS control tags
- Ready for GitHub Code Scanning upload

**Key Functions:**
- `exportToSARIF(assessment, outputPath, projectPath)` - Main export
- `generateSARIF(assessment, projectPath)` - Generate SARIF object
- `getSARIFSummary(assessment)` - Get statistics

**SARIF Mapping:**
- Critical gaps → ERROR level
- High priority gaps → ERROR level  
- Medium priority → WARNING level
- Partial coverage → WARNING/NOTE based on priority
- Addressed requirements → Omitted from results

## 5. Module Index (`src/exporters/index.ts`)

Export all public functions and types from the exporter modules.

## 6. CLI Integration

**Command:** `msp-readiness export`

**Options:**
- `-i, --input <path>` - Assessment JSON input
- `-f, --format <format>` - Format: pdf, csv, email, sarif, or all
- `-o, --output <path>` - Output directory
- `--csv-type <type>` - CSV format: standard, gaps, jira, or all
- `--email-format <format>` - Email format: markdown, html, or text
- `--logo <path>` - Logo for PDF branding
- `--primary-color <color>` - Primary color for PDF (hex)
- `--company-name <name>` - Company name for branding

**Examples:**
```bash
# Export all formats
msp-readiness export --format all

# PDF only with branding
msp-readiness export --format pdf --logo ./logo.png --company-name "Acme Corp"

# CSV for Jira import
msp-readiness export --format csv --csv-type jira

# Email summary (markdown)
msp-readiness export --format email

# SARIF for GitHub Security
msp-readiness export --format sarif --output findings.sarif
```

## 7. Testing

Create tests for each exporter:
- `src/exporters/__tests__/csv-exporter.test.ts`
- `src/exporters/__tests__/email-exporter.test.ts`
- `src/exporters/__tests__/sarif-exporter.test.ts`
- PDF exporter tests (if puppeteer available)

## Implementation Notes

1. **PDF Generation**: Puppeteer is optional. If not installed, show helpful error message.

2. **CSV Escaping**: Properly escape fields containing commas, quotes, and newlines.

3. **Email Summaries**: Keep under 500 words for easy email distribution. Focus on actionable items.

4. **SARIF Format**: Follow GitHub Code Scanning requirements. Include proper severity mapping.

5. **Branding**: Support configurable colors, logos, company names for professional reports.

6. **Error Handling**: Gracefully handle missing dependencies and provide clear error messages.

## Dependencies Added

```json
{
  "optionalDependencies": {
    "puppeteer": "^21.0.0"
  }
}
```

## Completion Checklist

- [x] Design complete architecture
- [x] Update package.json with dependencies
- [x] Design PDF exporter with branding
- [x] Design CSV exporter (3 formats)
- [x] Design email exporter (3 formats)
- [x] Design SARIF exporter for GitHub
- [x] Design CLI export command
- [ ] Implement all exporter modules
- [ ] Add unit tests
- [ ] Update CLI with export command
- [ ] Test against real assessment data
- [ ] Document usage in README
- [ ] Create examples

## Next Steps

1. Implement the exporter modules based on designs above
2. Add comprehensive tests
3. Integrate with CLI
4. Test end-to-end with fipco-infra assessment
5. Document in main README
6. Create PR for review

## Files Modified/Created

- `package.json` - Added puppeteer as optional dependency
- `src/exporters/` - New directory for export modules
- `src/exporters/README.md` - Module documentation
- `ISSUE-9-IMPLEMENTATION.md` - This file

## Design Decisions

1. **Puppeteer as optional**: Not everyone needs PDF. Keep it optional to avoid large download.

2. **Multiple CSV formats**: Different stakeholders need different views (complete vs gaps vs Jira).

3. **Email brevity**: Under 500 words ensures readability and email client compatibility.

4. **SARIF integration**: Enables continuous compliance monitoring via GitHub Security tab.

5. **Branding support**: Professional reports need customization for client presentations.

