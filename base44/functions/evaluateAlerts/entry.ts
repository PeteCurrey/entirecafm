import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

// Publish to Redis for in-app notifications
async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured, skipping publish');
    return;
  }

  try {
    const response = await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: JSON.stringify(message) })
    });

    if (!response.ok) {
      console.error('Redis publish failed:', await response.text());
    }
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

// Generate deep links for alerts
function generateDeepLink(type, baseUrl) {
  const links = {
    'SLA_BREACHES': '/jobs?filter=sla_risk&sort=due_at_asc&from=alert',
    'ORG_HEALTH': '/ai/director',
    'UTILISATION': '/engineers?sort=utilisation_desc&window=48h&from=alert',
    'OVERDUE_INVOICES': '/invoices?status=overdue&from=alert'
  };
  
  const path = links[type] || '/ai/director';
  return `${baseUrl}${path}`;
}

// Extract metric value from dashboard data
function extractMetricValue(type, dashboardData) {
  const extractors = {
    'SLA_BREACHES': () => dashboardData.summary?.sla_breaches || 0,
    'ORG_HEALTH': () => dashboardData.org_health_score || 0,
    'UTILISATION': () => dashboardData.summary?.avg_engineer_utilisation || 0,
    'OVERDUE_INVOICES': () => dashboardData.financials?.outstanding_invoices?.overdue_value || 0
  };
  
  return extractors[type]?.() ?? 0;
}

// Check if threshold is met
function isThresholdMet(metricValue, operator, threshold) {
  switch (operator) {
    case '>': return metricValue > threshold;
    case '>=': return metricValue >= threshold;
    case '<': return metricValue < threshold;
    case '<=': return metricValue <= threshold;
    default: return false;
  }
}

// Format alert message
function formatAlertMessage(type, metricValue, threshold, operator, deepLink) {
  const metricLabels = {
    'SLA_BREACHES': 'SLA breaches',
    'ORG_HEALTH': 'Organization health score',
    'UTILISATION': 'Engineer utilisation',
    'OVERDUE_INVOICES': 'Overdue invoices value'
  };
  
  const metricFormatters = {
    'SLA_BREACHES': (val) => `${val} jobs`,
    'ORG_HEALTH': (val) => `${val}/100`,
    'UTILISATION': (val) => `${val}%`,
    'OVERDUE_INVOICES': (val) => `£${val.toLocaleString()}`
  };
  
  const severityLabels = {
    'SLA_BREACHES': 'URGENT',
    'ORG_HEALTH': 'WARNING',
    'UTILISATION': 'WARNING',
    'OVERDUE_INVOICES': 'URGENT'
  };
  
  const label = metricLabels[type] || type;
  const formatter = metricFormatters[type] || ((v) => v.toString());
  const severity = severityLabels[type] || 'ALERT';
  
  return {
    title: `${severity}: ${label}`,
    message: `${label} is ${formatter(metricValue)} (threshold: ${operator} ${formatter(threshold)})`,
    severity: severity === 'URGENT' ? 'critical' : 'warning',
    deepLink
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { org_id } = await req.json();

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    console.log(`🔔 Evaluating alerts for org: ${org_id}`);

    // Step 1: Fetch latest metrics
    const dashboardResult = await base44.asServiceRole.functions.invoke('aiDirectorDashboard', {
      org_id
    });

    if (!dashboardResult.data?.success) {
      throw new Error('Failed to fetch dashboard metrics');
    }

    const dashboardData = dashboardResult.data;
    console.log('📊 Dashboard metrics fetched');

    // Step 2: Fetch active alert rules for this org
    const rules = await base44.asServiceRole.entities.AlertRule.filter({
      org_id,
      is_active: true
    });

    console.log(`📋 Found ${rules.length} active alert rules`);

    // Step 3: Check for recent alerts (60 min debounce)
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentEvents = await base44.asServiceRole.entities.AlertEvent.filter({
      org_id
    });

    const recentEventsByRule = recentEvents
      .filter(e => e.created_date >= sixtyMinutesAgo)
      .reduce((acc, event) => {
        acc[event.rule_id] = event;
        return acc;
      }, {});

    console.log(`⏰ Found ${Object.keys(recentEventsByRule).length} recent alerts (last 60 min)`);

    // Step 4: Evaluate rules and send alerts
    const results = [];
    const baseUrl = `https://${req.headers.get('host')}`;

    for (const rule of rules) {
      const metricValue = extractMetricValue(rule.type, dashboardData);
      const thresholdMet = isThresholdMet(metricValue, rule.operator, rule.threshold_number);

      console.log(`🔍 Rule ${rule.id} (${rule.type}): metric=${metricValue}, threshold=${rule.operator}${rule.threshold_number}, met=${thresholdMet}`);

      if (!thresholdMet) {
        results.push({
          rule_id: rule.id,
          type: rule.type,
          status: 'threshold_not_met',
          metric_value: metricValue
        });
        continue;
      }

      // Check debounce
      if (recentEventsByRule[rule.id]) {
        console.log(`⏸️  Rule ${rule.id} debounced (sent ${recentEventsByRule[rule.id].created_date})`);
        results.push({
          rule_id: rule.id,
          type: rule.type,
          status: 'debounced',
          metric_value: metricValue
        });
        continue;
      }

      // Generate alert payload
      const deepLink = generateDeepLink(rule.type, baseUrl);
      const alertMessage = formatAlertMessage(rule.type, metricValue, rule.threshold_number, rule.operator, deepLink);

      const payload = {
        email: {
          subject: `[ENTIRECAFM] ALERT — ${rule.type.replace('_', ' ')} threshold breached`,
          body: `
Alert: ${alertMessage.title}

${alertMessage.message}

This alert was triggered because the ${rule.type.replace('_', ' ').toLowerCase()} metric exceeded your configured threshold.

Current value: ${metricValue}
Threshold: ${rule.operator} ${rule.threshold_number}

Take action: ${deepLink}

---
You are receiving this because you have an active alert rule configured for ${rule.type}.
To manage alert rules, visit your AI Director Dashboard.
          `.trim()
        },
        slack: {
          text: `[ENTIRECAFM] ALERT – ${rule.type.replace('_', ' ')} at ${metricValue}. Open: ${deepLink}`
        },
        inapp: {
          title: alertMessage.title,
          message: alertMessage.message,
          severity: alertMessage.severity,
          deepLink
        }
      };

      // Create alert event
      const event = await base44.asServiceRole.entities.AlertEvent.create({
        org_id,
        rule_id: rule.id,
        metric_value: metricValue,
        status: 'TRIGGERED',
        payload_json: payload
      });

      console.log(`🔔 Alert event created: ${event.id}`);

      // Attempt delivery
      let deliveryStatus = 'TRIGGERED';
      let errorMessage = null;

      try {
        if (rule.channel === 'email' && rule.destination) {
          // Send email
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'ENTIRECAFM Alerts',
            to: rule.destination,
            subject: payload.email.subject,
            body: payload.email.body
          });
          deliveryStatus = 'DELIVERED';
          console.log(`✅ Email sent to ${rule.destination}`);
          
        } else if (rule.channel === 'slack' && rule.destination) {
          // Send Slack webhook
          const slackResponse = await fetch(rule.destination, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: payload.slack.text })
          });
          
          if (!slackResponse.ok) {
            throw new Error(`Slack webhook failed: ${slackResponse.status}`);
          }
          
          deliveryStatus = 'DELIVERED';
          console.log(`✅ Slack notification sent`);
          
        } else if (rule.channel === 'inapp') {
          // Publish to Redis
          await publishToRedis(`alerts.org.${org_id}`, {
            type: 'alert_triggered',
            alert: {
              id: event.id,
              rule_id: rule.id,
              rule_type: rule.type,
              created_date: event.created_date,
              ...payload.inapp
            }
          });
          
          deliveryStatus = 'DELIVERED';
          console.log(`✅ In-app notification published to Redis`);
        }
      } catch (error) {
        console.error(`❌ Alert delivery failed:`, error);
        errorMessage = error.message;
        deliveryStatus = 'FAILED';
      }

      // Update event status
      await base44.asServiceRole.entities.AlertEvent.update(event.id, {
        status: deliveryStatus,
        error_message: errorMessage
      });

      results.push({
        rule_id: rule.id,
        type: rule.type,
        status: deliveryStatus.toLowerCase(),
        metric_value: metricValue,
        event_id: event.id
      });
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: 'system',
      action: 'CREATE',
      entity_type: 'AlertEvaluation',
      entity_id: 'batch',
      new_values: {
        rules_evaluated: rules.length,
        alerts_triggered: results.filter(r => r.status === 'delivered').length,
        alerts_debounced: results.filter(r => r.status === 'debounced').length
      }
    });

    return Response.json({
      success: true,
      org_id,
      timestamp: new Date().toISOString(),
      rules_evaluated: rules.length,
      results
    });

  } catch (error) {
    console.error('evaluateAlerts error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});