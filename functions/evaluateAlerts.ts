import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Redis client (Upstash REST API compatible)
const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured, skipping pub/sub');
    return;
  }
  
  try {
    const response = await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      console.error('Redis publish failed:', await response.text());
    } else {
      console.log(`✅ Published to ${channel}`);
    }
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

// Debounce: 60 minutes
const DEBOUNCE_MINUTES = 60;

// Generate deep link for alert type
function getDeepLink(type, baseUrl) {
  const links = {
    'SLA_BREACHES': '/jobs?filter=sla_risk&sort=due_at_asc&from=director',
    'ORG_HEALTH': '/ai/director',
    'UTILISATION': '/engineers?sort=utilisation_desc&window=48h&from=director',
    'OVERDUE_INVOICES': '/invoices?status=overdue&from=director'
  };
  
  return `${baseUrl}${links[type] || '/ai/director'}`;
}

// Get metric value from dashboard data
function getMetricValue(type, dashboardData) {
  switch (type) {
    case 'SLA_BREACHES':
      return dashboardData?.summary?.sla_breaches || 0;
    case 'ORG_HEALTH':
      return dashboardData?.org_health_score || 0;
    case 'UTILISATION':
      return dashboardData?.summary?.avg_engineer_utilisation || 0;
    case 'OVERDUE_INVOICES':
      return dashboardData?.financials?.outstanding_invoices?.overdue_value || 0;
    default:
      return 0;
  }
}

// Check if alert should trigger
function shouldTrigger(metricValue, operator, threshold) {
  switch (operator) {
    case '>':
      return metricValue > threshold;
    case '<':
      return metricValue < threshold;
    case '>=':
      return metricValue >= threshold;
    case '<=':
      return metricValue <= threshold;
    default:
      return false;
  }
}

// Format alert message
function formatAlertMessage(rule, metricValue, deepLink) {
  const typeLabels = {
    'SLA_BREACHES': 'SLA Breaches',
    'ORG_HEALTH': 'Organization Health',
    'UTILISATION': 'Engineer Utilisation',
    'OVERDUE_INVOICES': 'Overdue Invoices'
  };

  const units = {
    'SLA_BREACHES': 'jobs',
    'ORG_HEALTH': '/100',
    'UTILISATION': '%',
    'OVERDUE_INVOICES': '£'
  };

  const label = typeLabels[rule.type] || rule.type;
  const unit = units[rule.type] || '';
  const valueStr = rule.type === 'OVERDUE_INVOICES' 
    ? `£${metricValue.toLocaleString()}` 
    : `${metricValue}${unit}`;

  return {
    subject: `[ENTIRECAFM] ALERT – ${label} threshold breached`,
    body: `⚠️ ALERT TRIGGERED

Metric: ${label}
Current Value: ${valueStr}
Threshold: ${rule.operator} ${rule.threshold_number}${unit}

This metric has crossed your configured threshold and requires attention.

View details: ${deepLink}

---
ENTIRECAFM Director Dashboard
Automated Alert System`,
    slack: {
      text: `🚨 *ALERT: ${label}*\n\nCurrent Value: *${valueStr}*\nThreshold: ${rule.operator} ${rule.threshold_number}${unit}\n\n<${deepLink}|View Details>`
    },
    inapp: {
      title: `${label} Alert`,
      message: `Current value: ${valueStr} (threshold: ${rule.operator} ${rule.threshold_number}${unit})`,
      severity: metricValue > rule.threshold_number * 1.5 ? 'critical' : 'warning',
      deepLink
    }
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function can be called without user auth (scheduled job)
    // So we use service role for all operations
    const { org_id } = await req.json();

    if (!org_id) {
      return Response.json({ error: 'org_id is required' }, { status: 400 });
    }

    console.log(`🔔 Evaluating alerts for org: ${org_id}`);

    // Step 1: Get latest dashboard metrics
    const dashboardResult = await base44.asServiceRole.functions.invoke('aiDirectorDashboard', {
      org_id
    });

    if (!dashboardResult.data?.success) {
      return Response.json({ 
        error: 'Failed to fetch dashboard metrics',
        details: dashboardResult.data
      }, { status: 500 });
    }

    const dashboardData = dashboardResult.data;

    // Step 2: Fetch all active alert rules for this org
    const alertRules = await base44.asServiceRole.entities.AlertRule.filter({
      org_id,
      is_active: true
    });

    console.log(`📋 Found ${alertRules.length} active alert rules`);

    const results = {
      evaluated: 0,
      triggered: 0,
      delivered: 0,
      suppressed: 0,
      failed: 0,
      alerts: []
    };

    const baseUrl = req.headers.get('origin') || 'https://app.base44.app';

    // Step 3: Evaluate each rule
    for (const rule of alertRules) {
      results.evaluated++;

      const metricValue = getMetricValue(rule.type, dashboardData);
      const triggered = shouldTrigger(metricValue, rule.operator, rule.threshold_number);

      console.log(`📊 Rule: ${rule.type}, Value: ${metricValue}, Threshold: ${rule.operator} ${rule.threshold_number}, Triggered: ${triggered}`);

      if (!triggered) {
        continue;
      }

      results.triggered++;

      // Step 4: Check for recent alerts (60-minute debounce)
      const debounceTime = new Date();
      debounceTime.setMinutes(debounceTime.getMinutes() - DEBOUNCE_MINUTES);

      const recentEvents = await base44.asServiceRole.entities.AlertEvent.filter({
        org_id,
        rule_id: rule.id
      });

      const hasRecentAlert = recentEvents.some(event => 
        new Date(event.created_date) > debounceTime
      );

      if (hasRecentAlert) {
        console.log(`⏭️  Suppressing duplicate alert for rule ${rule.id}`);
        results.suppressed++;
        continue;
      }

      // Step 5: Generate alert message
      const deepLink = getDeepLink(rule.type, baseUrl);
      const message = formatAlertMessage(rule, metricValue, deepLink);

      // Step 6: Create alert event
      const alertEvent = await base44.asServiceRole.entities.AlertEvent.create({
        org_id,
        rule_id: rule.id,
        metric_value: metricValue,
        status: 'TRIGGERED',
        payload_json: message
      });

      // Step 7: Deliver alert based on channel
      let deliverySuccess = false;
      let errorMessage = null;

      try {
        if (rule.channel === 'email' && rule.destination) {
          await base44.integrations.Core.SendEmail({
            to: rule.destination,
            subject: message.subject,
            body: message.body
          });
          deliverySuccess = true;
          console.log(`✅ Email sent to ${rule.destination}`);
        } 
        else if (rule.channel === 'slack' && rule.destination) {
          const slackResponse = await fetch(rule.destination, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message.slack)
          });
          
          if (slackResponse.ok) {
            deliverySuccess = true;
            console.log(`✅ Slack notification sent`);
          } else {
            errorMessage = `Slack webhook failed: ${await slackResponse.text()}`;
          }
        } 
        else if (rule.channel === 'inapp') {
          // Publish to Redis for in-app notifications
          await publishToRedis(`alerts.org.${org_id}`, {
            type: 'alert_triggered',
            rule_type: rule.type,
            alert: {
              id: alertEvent.id,
              ...message.inapp,
              metric_value: metricValue,
              timestamp: new Date().toISOString()
            }
          });
          deliverySuccess = true;
          console.log(`✅ In-app notification published`);
        }

        // Update alert event status
        await base44.asServiceRole.entities.AlertEvent.update(alertEvent.id, {
          status: deliverySuccess ? 'DELIVERED' : 'FAILED',
          error_message: errorMessage
        });

        if (deliverySuccess) {
          results.delivered++;
        } else {
          results.failed++;
        }

        results.alerts.push({
          rule_type: rule.type,
          metric_value: metricValue,
          threshold: `${rule.operator} ${rule.threshold_number}`,
          channel: rule.channel,
          status: deliverySuccess ? 'DELIVERED' : 'FAILED'
        });

      } catch (error) {
        console.error(`❌ Failed to deliver alert for rule ${rule.id}:`, error);
        
        await base44.asServiceRole.entities.AlertEvent.update(alertEvent.id, {
          status: 'FAILED',
          error_message: error.message
        });
        
        results.failed++;
        results.alerts.push({
          rule_type: rule.type,
          metric_value: metricValue,
          threshold: `${rule.operator} ${rule.threshold_number}`,
          channel: rule.channel,
          status: 'FAILED',
          error: error.message
        });
      }
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: 'system',
      action: 'CREATE',
      entity_type: 'AlertEvaluation',
      entity_id: org_id,
      new_values: results
    });

    return Response.json({
      success: true,
      org_id,
      timestamp: new Date().toISOString(),
      ...results
    });

  } catch (error) {
    console.error('evaluateAlerts error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});