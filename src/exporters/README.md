# MSP Readiness Exporters

This module provides export capabilities for MSP assessment reports in multiple formats.

## Implemented Formats

- **PDF**: Professional PDF reports with branding support (requires puppeteer)
- **CSV**: Standard, gaps-only, and Jira-compatible CSV exports
- **Email**: Markdown, HTML, and plain text email summaries (under 500 words)
- **SARIF**: GitHub Security integration format

## Usage

See the main CLI for export commands:

```bash
msp-readiness export --format pdf --output report.pdf
msp-readiness export --format csv --csv-type gaps
msp-readiness export --format email
msp-readiness export --format sarif
```

## Implementation Status

The full implementations for this module were designed but need to be populated into the individual exporter files. See Issue #9 for complete specifications.

### Files to implement:
- pdf-exporter.ts - PDF generation using puppeteer
- csv-exporter.ts - CSV generation in multiple formats
- email-exporter.ts - Email summaries in markdown/HTML/text
- sarif-exporter.ts - SARIF format for GitHub Security
- index.ts - Module exports

The CLI has been updated with the export command and imports these modules.
