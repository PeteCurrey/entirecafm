import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Bell, ExternalLink, AlertTriangle, TrendingDown, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export default function AlertNotificationDropdown({ orgId }) {
  const navigate = useNavigate();
  const [liveAlerts, setLiveAlerts] = useState([]);

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['alert-events', orgId],
    queryFn: async () => {
      const events = await base44.entities.AlertEvent.filter({ org_id: orgId });
      return events.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Subscribe to real-time alerts via Redis
  useEffect(() => {
    if (!orgId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let alertWs;
    
    try {
      alertWs = new WebSocket(wsUrl);
      
      alertWs.onopen = () => {
        alertWs.send(JSON.stringify({
          type: 'subscribe',
          channel: `alerts.org.${orgId}`
        }));
      };

      alertWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'alert_triggered') {
            setLiveAlerts(prev => [message.alert, ...prev.slice(0, 9)]);
          }
        } catch (error) {
          console.error('Alert WebSocket parse error:', error);
        }
      };
    } catch (error) {
      console.error('Alert WebSocket setup error:', error);
    }

    return () => {
      if (alertWs) {
        alertWs.close();
      }
    };
  }, [orgId]);

  // Merge live alerts with recent events
  const allAlerts = [...liveAlerts, ...recentEvents].slice(0, 10);
  const unreadCount = liveAlerts.length;

  const getAlertIcon = (type) => {
    switch (type) {
      case 'SLA_BREACHES':
        return AlertTriangle;
      case 'ORG_HEALTH':
        return TrendingDown;
      case 'UTILISATION':
        return Users;
      case 'OVERDUE_INVOICES':
        return DollarSign;
      default:
        return Bell;
    }
  };

  const getAlertLink = (alert) => {
    const payload = alert.payload_json?.inapp;
    if (payload?.deepLink) {
      return payload.deepLink;
    }

    // Fallback based on type
    const links = {
      'SLA_BREACHES': createPageUrl("Jobs") + '?filter=sla_risk&sort=due_at_asc&from=director',
      'ORG_HEALTH': createPageUrl("AIDirector"),
      'UTILISATION': createPageUrl("Team") + '?sort=utilisation_desc&window=48h&from=director',
      'OVERDUE_INVOICES': createPageUrl("Invoices") + '?status=overdue&from=director'
    };

    return links[alert.rule_type] || createPageUrl("AIDirector");
  };

  const handleAlertClick = (alert) => {
    const link = getAlertLink(alert);
    navigate(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative text-white hover:bg-[rgba(255,255,255,0.04)]">
          <Bell className="w-5 h-5" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] w-96 max-h-[500px] overflow-y-auto">
        <div className="p-3 border-b border-[rgba(255,255,255,0.08)]">
          <h3 className="text-sm font-semibold text-white">Alerts & Notifications</h3>
          <p className="text-xs text-[#CED4DA]">Director dashboard threshold alerts</p>
        </div>
        
        {allAlerts.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="w-12 h-12 mx-auto mb-2 text-[#CED4DA] opacity-30" />
            <p className="text-sm text-[#CED4DA]">No alerts</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.08)]">
            {allAlerts.map((alert, idx) => {
              const Icon = getAlertIcon(alert.rule_type);
              const payload = alert.payload_json?.inapp || {};
              const severity = payload.severity || 'warning';
              const isUnread = liveAlerts.includes(alert);
              
              return (
                <div
                  key={alert.id || idx}
                  onClick={() => handleAlertClick(alert)}
                  className={`p-3 hover:bg-[rgba(255,255,255,0.04)] cursor-pointer transition-all ${
                    isUnread ? 'bg-[#E1467C]/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      severity === 'critical' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                      }`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {payload.title || alert.rule_type?.replace('_', ' ')}
                        </h4>
                        {isUnread && (
                          <Badge className="bg-[#E1467C] text-white text-xs">NEW</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#CED4DA] mb-2">
                        {payload.message || `Alert triggered at ${alert.metric_value}`}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#CED4DA] opacity-50">
                          {format(new Date(alert.created_date || Date.now()), 'MMM d, HH:mm')}
                        </span>
                        <span className="text-xs text-[#E1467C] flex items-center gap-1">
                          View context
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}