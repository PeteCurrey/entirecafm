import React from "react";
import { CheckCircle2, UserPlus, FileText, DollarSign, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ActivityFeed() {
  const activities = [
    {
      id: 1,
      type: "job_completed",
      engineer: "Ryan Mitchell",
      description: "completed Job #3241 (Victoria Gate)",
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      icon: CheckCircle2,
      color: "text-green-400"
    },
    {
      id: 2,
      type: "job_assigned",
      engineer: "Mia Chen",
      description: "assigned to Job #3248 (NHS South Wing)",
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
      icon: UserPlus,
      color: "text-blue-400"
    },
    {
      id: 3,
      type: "quote_approved",
      client: "Client",
      description: "approved Quote #1129",
      timestamp: new Date(Date.now() - 18 * 60 * 1000),
      icon: FileText,
      color: "text-purple-400"
    },
    {
      id: 4,
      type: "invoice_sent",
      description: "Invoice #INV-2401 sent to Starbucks",
      timestamp: new Date(Date.now() - 32 * 60 * 1000),
      icon: DollarSign,
      color: "text-yellow-400"
    },
    {
      id: 5,
      type: "job_started",
      engineer: "James Foster",
      description: "started Job #3244 (Royal Hospital)",
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      icon: Clock,
      color: "text-orange-400"
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-divider">
      <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start gap-3 group">
              <div className={`w-8 h-8 rounded-lg glass-panel flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <span className="font-medium">{activity.engineer || activity.client}</span>{" "}
                  <span className="text-body">{activity.description}</span>
                </p>
                <p className="text-xs text-body mt-0.5">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}