# Exporters Implementation Guide

This guide provides the complete specifications for implementing each exporter module.

## Quick Start

Each exporter module should:
1. Export assessment data to a specific format
2. Handle errors gracefully
3. Provide helpful error messages
4. Support configuration options
5. Be independently testable

## Module Structure

```
src/exporters/
├── index.ts              # Module exports
├── pdf-exporter.ts       # PDF generation
├── csv-exporter.ts       # CSV generation
├── email-exporter.ts     # Email summaries
├── sarif-exporter.ts     # SARIF format
└── __tests__/
    ├── csv-exporter.test.ts
    ├── email-exporter.test.ts
    └── sarif-exporter.test.ts
```

## Implementation Priority

1. **CSV Exporter** (Easiest, no external dependencies)
   - Start here for quick win
   - Pure TypeScript, no external libraries needed
   - Three formats: standard, gaps, Jira

2. **Email Exporter** (Easy, uses existing utilities)
   - Markdown and text are simple string formatting
   - HTML needs basic templating
   - Use date-fns for date formatting

3. **SARIF Exporter** (Medium complexity)
   - JSON generation with specific schema
   - Requires understanding SARIF v2.1.0 spec
   - See: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning

4. **PDF Exporter** (Most complex)
   - Requires puppeteer (optional dependency)
   - HTML generation then PDF conversion
   - Branding customization

## Testing Strategy

Each exporter should have:
- Unit tests for each public function
- Mock assessment data for testing
- Validation of output format
- Error handling tests

## CLI Integration

After implementing the exporters, update `src/cli.ts` to:
1. Import all exporter functions
2. Add the export command with options
3. Handle format selection and output
4. Provide helpful usage messages

## Common Utilities

Consider creating shared utilities for:
- Date formatting (use date-fns)
- File I/O operations
- Error handling
- Assessment data validation

## Documentation

Each exporter should include:
- JSDoc comments for all public functions
- Usage examples in comments
- Type definitions for options
- Error condition documentation

## Performance Considerations

- CSV: Stream large datasets if needed
- PDF: Puppeteer launch is slow, consider caching browser instance
- Email: Keep summaries concise (under 500 words)
- SARIF: Optimize for large numbers of requirements

## Next Steps

1. Implement CSV exporter first (quickest win)
2. Add tests for CSV exporter
3. Implement email exporter
4. Add tests for email exporter
5. Implement SARIF exporter
6. Add tests for SARIF exporter
7. Implement PDF exporter (requires puppeteer)
8. Add tests for PDF exporter
9. Update CLI with export command
10. Test end-to-end with real assessment data
11. Update main README with export examples
12. Create PR for review

## Code Review Checklist

- [ ] All public functions have JSDoc comments
- [ ] All modules have corresponding tests
- [ ] Error handling is comprehensive
- [ ] Types are properly defined
- [ ] No any types (use proper typing)
- [ ] File I/O errors are handled
- [ ] Optional dependencies are properly checked
- [ ] CLI integration is complete
- [ ] Examples are provided in documentation
- [ ] Code follows project style guide

## Resources

- SARIF Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
- GitHub SARIF Support: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning
- Puppeteer API: https://pptr.dev/
- CSV RFC: https://datatracker.ietf.org/doc/html/rfc4180
- Jira CSV Import: https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-a-csv-file/
