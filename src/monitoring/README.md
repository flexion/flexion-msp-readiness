# MSP Readiness Monitoring

Automated drift detection and compliance monitoring for MSP readiness.

## Features

- **Scheduled Assessments**: Run assessments on a cron schedule
- **Drift Detection**: Compare current state against baseline
- **Slack Notifications**: Alert on compliance drops and new gaps
- **Email Notifications**: SMTP-based email alerts
- **CloudWatch Metrics**: Publish compliance metrics to AWS CloudWatch
- **Historical Tracking**: Store assessment history over time
- **Alert Deduplication**: Prevent notification spam

## Quick Start

### 1. Configure Monitoring

Add to your `config.yaml`:

```yaml
monitoring:
  enabled: true
  schedule: "0 9 * * *"  # Daily at 9 AM
  baseline_path: "./baseline-assessment.json"
  store_history: true
  history_path: "./history"

notifications:
  slack:
    webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    channel: "#msp-alerts"
    alert_on:
      compliance_drop: 5  # Alert if compliance drops by 5%
      new_gaps: true
      critical_findings: true

  cloudwatch:
    enabled: true
    namespace: "MSP/Readiness"
    dimensions:
      Environment: "production"
```

### 2. Create Baseline

Run an initial assessment and save it as baseline:

```bash
msp-readiness assess
msp-readiness drift --save-baseline
```

### 3. Monitor for Drift

Run drift detection manually:

```bash
msp-readiness drift
```

Or run a full monitoring cycle:

```bash
msp-readiness monitor
```

### 4. Start Monitoring Daemon

For continuous monitoring:

```bash
# Start daemon
node dist/monitoring/daemon.js config.yaml

# Or with npm script
npm run monitor
```

## Commands

### `msp-readiness drift`

Detect compliance drift against baseline.

**Options:**
- `-c, --config <path>` - Config file path
- `-b, --baseline <path>` - Baseline assessment path
- `-i, --input <path>` - Current assessment JSON
- `--save-baseline` - Save current as new baseline
- `--skip-notifications` - Don't send alerts

**Examples:**

```bash
# Detect drift
msp-readiness drift

# Save new baseline
msp-readiness drift --save-baseline

# Use custom baseline
msp-readiness drift --baseline ./baseline-2026-01.json
```

### `msp-readiness monitor`

Run scheduled assessment with drift detection.

**Options:**
- `-c, --config <path>` - Config file path
- `--skip-aws` - Skip AWS analysis

**Example:**

```bash
msp-readiness monitor
```

### `msp-readiness history`

Show compliance history and trends.

**Options:**
- `-c, --config <path>` - Config file path
- `-n, --limit <number>` - Number of recent assessments (default: 10)

**Example:**

```bash
# Show last 10 assessments
msp-readiness history

# Show last 30 assessments
msp-readiness history -n 30
```

## Drift Types

The drift detector identifies several types of changes:

- **status_change**: Requirement status changed (e.g., addressed → partial)
- **new_gap**: New gap detected in critical requirement
- **new_finding**: New compliance finding added
- **compliance_drop**: Overall compliance score dropped significantly
- **compliance_improve**: Requirement improved (gap → addressed)

## Severity Levels

Drifts are categorized by severity:

- **critical**: Major compliance drop or critical gap
- **high**: Important status regression
- **medium**: Moderate change requiring attention
- **low**: Minor status change
- **info**: Positive change or improvement

## Notifications

### Slack

Slack notifications use webhook integration with formatted blocks:

- Summary of compliance change
- Count of drifts by type
- Critical/high severity drifts
- Impact descriptions

### Email

Email notifications include:

- Plain text summary
- Drift details
- Critical findings
- Remediation guidance

### CloudWatch Metrics

Published metrics:

- `ComplianceScore` (Percent)
- `AddressedRequirements` (Count)
- `PartialRequirements` (Count)
- `GapRequirements` (Count)
- `CriticalGaps` (Count)
- `TotalDrifts` (Count)
- `ComplianceChange` (Percent)
- `NewGaps` (Count)
- `ResolvedGaps` (Count)

## Alert Thresholds

Configure alert thresholds in `config.yaml`:

```yaml
notifications:
  slack:
    alert_on:
      compliance_drop: 5      # Alert if compliance drops by 5%
      new_gaps: true          # Alert on any new gap
      critical_findings: true # Alert on new critical findings
```

## Alert Deduplication

Alerts are deduplicated based on:

- Project name
- Drift types and requirement IDs
- 1-hour deduplication window

This prevents notification spam from repeated assessments.

## Historical Tracking

Assessment history is stored in JSON format:

```
history/
├── index.json              # History index
├── assessment-1234567.json # Historical assessment
├── assessment-1234568.json
└── ...
```

The history keeps the last 100 assessments. Older assessments are automatically cleaned up.

## Cron Schedule Format

The monitoring schedule uses standard cron format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Examples:**

- `0 9 * * *` - Daily at 9 AM
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1` - Every Monday at 9 AM
- `0 9 1 * *` - First day of month at 9 AM

## Troubleshooting

### No drift detected when expected

- Ensure baseline path is correct
- Check that baseline is recent
- Verify assessment completed successfully

### Notifications not sending

- Verify webhook URL is correct
- Check network connectivity
- Review alert thresholds in config
- Check notification deduplication window

### CloudWatch metrics not appearing

- Verify AWS credentials and region
- Check IAM permissions for CloudWatch:PutMetricData
- Ensure namespace matches CloudWatch console

### Daemon crashes

- Check cron expression is valid
- Verify config file exists and is readable
- Review logs for errors
- Ensure AWS credentials are valid

## Best Practices

1. **Set Realistic Baselines**: Don't baseline incomplete implementations
2. **Regular Updates**: Update baseline after major changes
3. **Monitor Trends**: Review history to identify patterns
4. **Alert Tuning**: Adjust thresholds to reduce noise
5. **Test Notifications**: Verify alerts work before production use
6. **Backup History**: Periodically backup history directory
7. **Review Drifts**: Investigate all critical/high severity drifts promptly

## Architecture

```
monitoring/
├── daemon.ts              # Cron-based monitoring daemon
├── drift-detector.ts      # Drift detection logic
├── notifier.ts           # Slack/email notifications
├── cloudwatch-publisher.ts # CloudWatch metrics
├── scheduler.ts          # Scheduled assessment orchestration
└── README.md             # This file
```

## Integration

The monitoring system integrates with:

- **Assessment Pipeline**: Uses existing assessors and collectors
- **Evidence Collection**: Stores drift reports as evidence
- **Dashboard**: Historical data can be visualized
- **CI/CD**: Can be triggered from pipelines

## Future Enhancements

Potential improvements:

- [ ] SMS notifications via SNS
- [ ] Teams/Discord webhooks
- [ ] Prometheus metrics export
- [ ] Drift remediation suggestions
- [ ] Automated ticket creation (Jira, GitHub Issues)
- [ ] Machine learning-based anomaly detection
- [ ] Compliance forecasting
