# History Tracking and Progress Trends

The MSP Readiness tool now includes comprehensive history tracking and trend analysis capabilities.

## Features

### 1. Automatic History Saving

Every time you run `msp-readiness assess`, the assessment is automatically saved to `.msp-history/`:

```bash
msp-readiness assess
# Creates: .msp-history/assessment-2024-01-15T10-30-45-123Z.json
```

The tool automatically retains the 10 most recent assessments and cleans up older ones.

### 2. Compare Assessments

Compare your baseline assessment with the current one to track progress:

```bash
# Compare oldest vs newest (from history)
msp-readiness compare

# Compare specific assessments
msp-readiness compare \
  --baseline ./baseline-report.json \
  --current ./current-report.json

# Export comparison to CSV
msp-readiness compare --csv comparison.csv
```

**Output:**
- Improved requirements
- Regressed requirements
- Unchanged requirements
- Net change score
- Time span between assessments

### 3. View History and Trends

View your assessment history and analyze compliance trends:

```bash
# Show history and trend analysis
msp-readiness history

# Export history to CSV
msp-readiness history --csv history.csv
```

**Provides:**
- List of recent assessments with completion percentages
- Trend direction (improving/declining/stable)
- Average change per week
- Projected 100% completion date
- Text-based trend chart

### 4. Dashboard with Trends

The interactive dashboard now includes trend charts when history is available:

```bash
msp-readiness dashboard
```

**Trend visualizations:**
- Completion percentage over time (line chart)
- Requirements by status over time (stacked bar chart)
- Trend indicator with direction and rate of change
- Projected completion date

## Use Cases

### Continuous Compliance Monitoring

Run assessments weekly to track continuous improvement:

```bash
# Week 1
msp-readiness assess

# Week 2
msp-readiness assess
msp-readiness compare  # See what changed

# Week 3
msp-readiness assess
msp-readiness history  # View trend
```

### Sprint Planning

Use trend data to project completion and plan sprints:

```bash
msp-readiness history
# Shows: "Average change: +5.2% per week"
# Shows: "Projected 100% completion: 2024-03-15"
```

### Audit Evidence

Export historical data for audit purposes:

```bash
# Create audit package
msp-readiness history --csv compliance-history.csv
msp-readiness compare --csv recent-improvements.csv
```

### Regression Detection

Quickly identify when compliance regresses:

```bash
msp-readiness compare
# Shows: "⚠️ Regressed Requirements: 2"
# Lists which requirements declined
```

## History Storage

### Location

Assessments are stored in `.msp-history/` in your project root:

```
project/
├── .msp-history/
│   ├── assessment-2024-01-01T10-00-00-000Z.json
│   ├── assessment-2024-01-08T10-00-00-000Z.json
│   ├── assessment-2024-01-15T10-00-00-000Z.json
│   └── ...
```

### Format

Each file is a complete `ProjectAssessment` JSON:

```json
{
  "projectName": "My Project",
  "assessmentDate": "2024-01-15T10:00:00.000Z",
  "overallStatus": {
    "addressed": 15,
    "partial": 3,
    "gap": 2,
    "notApplicable": 0
  },
  "requirementAssessments": [...],
  ...
}
```

### Retention

- Default: Keep 10 most recent assessments
- Configurable via `cleanupOldAssessments()` function
- Automatic cleanup on each `assess` run

## CSV Exports

### History CSV Format

```csv
Date,Addressed,Partial,Gap,Not Applicable,Completion %,Total Effort (hours)
2024-01-01,10,5,5,0,50,100
2024-01-08,12,4,4,0,60,80
2024-01-15,15,3,2,0,75,40
```

### Comparison CSV Format

```csv
Requirement ID,Name,Category,Baseline Status,Current Status,Change
SEC-001,Multi-Factor Authentication,security,partial,addressed,improved
OPS-003,Change Management,operations,gap,partial,improved
SEC-003,Data Encryption,security,addressed,addressed,unchanged
```

## API Usage

### Programmatic Access

```typescript
import {
  saveAssessmentToHistory,
  compareAssessments,
  analyzeTrend,
  exportHistoryToCSV,
} from './utils/history-manager';

// Save assessment
const historyPath = './.msp-history';
saveAssessmentToHistory(assessment, historyPath);

// Compare assessments
const baseline = loadAssessment('./baseline.json');
const current = loadAssessment('./current.json');
const comparison = compareAssessments(baseline, current);

console.log(`Improved: ${comparison.summary.totalImproved}`);
console.log(`Regressed: ${comparison.summary.totalRegressed}`);

// Analyze trends
const trend = analyzeTrend(historyPath);
console.log(`Direction: ${trend.trend.direction}`);
console.log(`Rate: ${trend.trend.averageChangePerWeek}% per week`);

// Export
exportHistoryToCSV(historyPath, './history.csv');
```

## Best Practices

### Regular Assessments

Run assessments on a regular schedule:
- **Weekly**: For active projects making rapid improvements
- **Bi-weekly**: For steady-state projects
- **Monthly**: For maintenance-mode projects

### Baseline Establishment

Create a baseline early:

```bash
# First assessment
msp-readiness assess
cp assessment-report.json baseline.json

# Later comparisons
msp-readiness compare --baseline baseline.json
```

### Version Control

Consider committing key milestones:

```bash
# After major improvements
msp-readiness assess
git add assessment-report.json
git commit -m "chore: update MSP assessment - 75% complete"
```

### Automation

Integrate with CI/CD:

```yaml
# .github/workflows/msp-check.yml
name: MSP Compliance Check
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
jobs:
  assess:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run MSP Assessment
        run: |
          msp-readiness assess
          msp-readiness compare
          msp-readiness history --csv history.csv
      - name: Upload Results
        uses: actions/upload-artifact@v2
        with:
          name: msp-assessment
          path: |
            assessment-report.*
            history.csv
```

## Troubleshooting

### No History Found

```
Error: No historical assessments found
```

**Solution**: Run `msp-readiness assess` to create the first assessment.

### Not Enough History

```
Error: Need at least 2 assessments in history
```

**Solution**: Run multiple assessments over time to build history.

### Trend Shows "Stable"

**Cause**: Change is less than 1% per week.

**Solution**: Continue making improvements and run more assessments.

## Future Enhancements

Potential improvements for history tracking:

1. **Configurable retention policies**
2. **Remote storage (S3/GitHub) support**
3. **Slack/email notifications on regressions**
4. **Advanced analytics (velocity, burndown charts)**
5. **Historical requirement-level drill-down**
6. **Automated remediation suggestions based on trends**

## How This Improves the MSP Readiness Skill

### Automated Continuous Monitoring

Users can now automatically track compliance progress without manual tracking:
- ✅ Automatic history storage
- ✅ Automated trend analysis
- ✅ Zero manual record-keeping

### Data-Driven Planning

Provides concrete data for sprint planning:
- ✅ Projected completion dates
- ✅ Rate of improvement metrics
- ✅ Resource allocation insights

### Audit Trail

Creates comprehensive audit evidence:
- ✅ Complete history of assessments
- ✅ CSV exports for auditors
- ✅ Before/after comparisons

### Early Warning System

Detects regressions immediately:
- ✅ Automatic comparison on each assessment
- ✅ Highlights declining requirements
- ✅ Enables rapid remediation

This feature moves the skill closer to the goal of **continuous, automated compliance monitoring** with minimal manual intervention.
