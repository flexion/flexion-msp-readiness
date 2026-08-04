/**
 * Notification system for drift alerts
 */

import * as https from 'https';
import * as http from 'http';
import { DriftDetectionResult, Drift, Config } from '../types';

/**
 * Alert deduplication cache
 */
const alertCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 3600000; // 1 hour

/**
 * Send notifications based on drift detection results
 */
export async function sendDriftNotifications(
  result: DriftDetectionResult,
  config: Config
): Promise<void> {
  const notifications = config.notifications;
  if (!notifications) return;

  // Check if we should alert based on thresholds
  const shouldAlert = checkAlertThresholds(result, config);
  if (!shouldAlert.send) {
    console.log('  No alerts triggered (thresholds not met)');
    return;
  }

  // Deduplicate alerts
  const alertKey = generateAlertKey(result);
  if (isDuplicate(alertKey)) {
    console.log('  Alert deduplicated (sent recently)');
    return;
  }

  const promises: Promise<void>[] = [];

  // Send Slack notification
  if (notifications.slack?.webhook_url) {
    promises.push(
      sendSlackNotification(result, notifications.slack.webhook_url, notifications.slack.channel)
    );
  }

  // Send email notification
  if (notifications.email) {
    promises.push(sendEmailNotification(result, notifications.email));
  }

  await Promise.all(promises);

  // Record alert sent
  recordAlert(alertKey);
}

/**
 * Check if alert thresholds are met
 */
function checkAlertThresholds(
  result: DriftDetectionResult,
  config: Config
): { send: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const notifications = config.notifications;

  if (!notifications) {
    return { send: false, reasons };
  }

  // Check Slack thresholds
  const slackAlerts = notifications.slack?.alert_on;
  if (slackAlerts) {
    if (
      slackAlerts.compliance_drop &&
      result.summary.complianceChange <= -slackAlerts.compliance_drop
    ) {
      reasons.push(
        `Compliance dropped by ${Math.abs(result.summary.complianceChange).toFixed(1)}%`
      );
    }
    if (slackAlerts.new_gaps && result.summary.newGaps > 0) {
      reasons.push(`${result.summary.newGaps} new gap(s) detected`);
    }
    if (slackAlerts.critical_findings && result.summary.newCriticalFindings > 0) {
      reasons.push(`${result.summary.newCriticalFindings} new critical finding(s)`);
    }
  }

  // Check email thresholds (same logic)
  const emailAlerts = notifications.email?.alert_on;
  if (emailAlerts && reasons.length === 0) {
    if (
      emailAlerts.compliance_drop &&
      result.summary.complianceChange <= -emailAlerts.compliance_drop
    ) {
      reasons.push(
        `Compliance dropped by ${Math.abs(result.summary.complianceChange).toFixed(1)}%`
      );
    }
    if (emailAlerts.new_gaps && result.summary.newGaps > 0) {
      reasons.push(`${result.summary.newGaps} new gap(s) detected`);
    }
    if (emailAlerts.critical_findings && result.summary.newCriticalFindings > 0) {
      reasons.push(`${result.summary.newCriticalFindings} new critical finding(s)`);
    }
  }

  return { send: reasons.length > 0, reasons };
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(
  result: DriftDetectionResult,
  webhookUrl: string,
  channel?: string
): Promise<void> {
  const message = formatSlackMessage(result, channel);

  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, res => {
      if (res.statusCode === 200) {
        console.log('  ✓ Slack notification sent');
        resolve();
      } else {
        reject(new Error(`Slack API returned ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(JSON.stringify(message));
    req.end();
  });
}

/**
 * Format Slack message with blocks
 */
function formatSlackMessage(
  result: DriftDetectionResult,
  channel?: string
): Record<string, unknown> {
  const criticalDrifts = result.drifts.filter(
    d => d.severity === 'critical' || d.severity === 'high'
  );
  const emoji = result.summary.complianceChange < -5 ? ':rotating_light:' : ':warning:';

  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} MSP Readiness Drift Detected`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Project:*\n${result.currentAssessment.projectName}`,
        },
        {
          type: 'mrkdwn',
          text: `*Compliance Change:*\n${result.summary.complianceChange > 0 ? '+' : ''}${result.summary.complianceChange.toFixed(1)}%`,
        },
      ],
    },
  ];

  if (result.summary.totalDrifts > 0) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Total Drifts:*\n${result.summary.totalDrifts}`,
        },
        {
          type: 'mrkdwn',
          text: `*New Gaps:*\n${result.summary.newGaps}`,
        },
      ],
    });
  }

  if (criticalDrifts.length > 0) {
    blocks.push({
      type: 'divider',
    });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Critical/High Severity Drifts:*',
      },
    });

    for (const drift of criticalDrifts.slice(0, 5)) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${drift.requirementId}:* ${drift.description}\n_${drift.impact}_`,
        },
      });
    }

    if (criticalDrifts.length > 5) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_... and ${criticalDrifts.length - 5} more_`,
          },
        ],
      });
    }
  }

  const message: Record<string, unknown> = {
    blocks,
  };

  if (channel) {
    message.channel = channel;
  }

  return message;
}

/**
 * Send email notification (SMTP)
 */
async function sendEmailNotification(
  result: DriftDetectionResult,
  emailConfig: NonNullable<Config['notifications']>['email']
): Promise<void> {
  if (!emailConfig) return;

  // For now, we'll use a simple SMTP approach
  // In production, you'd use nodemailer or similar
  const message = formatEmailMessage(result);

  // Simplified SMTP send (in real implementation, use nodemailer)
  console.log('  ✓ Email notification sent (stubbed)');
  console.log(`    To: ${emailConfig.to.join(', ')}`);
  console.log(`    Subject: ${message.subject}`);

  // TODO: Implement actual SMTP sending with nodemailer
  // This is a placeholder to avoid adding another dependency
}

/**
 * Format email message
 */
function formatEmailMessage(result: DriftDetectionResult): {
  subject: string;
  body: string;
} {
  const criticalDrifts = result.drifts.filter(
    d => d.severity === 'critical' || d.severity === 'high'
  );

  const subject = `MSP Readiness Alert: ${result.summary.totalDrifts} drift(s) detected - ${result.currentAssessment.projectName}`;

  const body = `
MSP Readiness Drift Detected

Project: ${result.currentAssessment.projectName}
Timestamp: ${result.timestamp.toISOString()}
Baseline: ${result.baselineDate.toISOString()}

Summary:
- Total Drifts: ${result.summary.totalDrifts}
- Compliance Change: ${result.summary.complianceChange > 0 ? '+' : ''}${result.summary.complianceChange.toFixed(1)}%
- New Gaps: ${result.summary.newGaps}
- Resolved Gaps: ${result.summary.resolvedGaps}
- New Critical Findings: ${result.summary.newCriticalFindings}

Critical/High Severity Drifts:
${
  criticalDrifts.length === 0
    ? 'None'
    : criticalDrifts
        .map(
          d => `
- ${d.requirementId}: ${d.description}
  Impact: ${d.impact}
`
        )
        .join('\n')
}

Run "msp-readiness drift" to see full details.
`;

  return { subject, body };
}

/**
 * Generate alert key for deduplication
 */
function generateAlertKey(result: DriftDetectionResult): string {
  const driftTypes = result.drifts
    .map(d => `${d.requirementId}:${d.type}`)
    .sort()
    .join(',');
  return `${result.currentAssessment.projectName}:${driftTypes}`;
}

/**
 * Check if alert is duplicate (sent recently)
 */
function isDuplicate(alertKey: string): boolean {
  const lastSent = alertCache.get(alertKey);
  if (!lastSent) return false;

  const elapsed = Date.now() - lastSent;
  return elapsed < DEDUP_WINDOW_MS;
}

/**
 * Record alert sent
 */
function recordAlert(alertKey: string): void {
  alertCache.set(alertKey, Date.now());

  // Clean up old entries
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  for (const [key, timestamp] of alertCache.entries()) {
    if (timestamp < cutoff) {
      alertCache.delete(key);
    }
  }
}
