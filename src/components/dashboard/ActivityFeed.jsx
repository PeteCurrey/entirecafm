import React from "react";
import { CheckCircle2, UserPlus, FileText, DollarSign, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ActivityFeed() {
  const activities = [
    {
      id: 1,
      engineer: "Ryan",
      action: "completed",
      detail: "Job #3241",
      location: "Starbucks Victoria",
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      icon: CheckCircle2,
    },
    {
      id: 2,
      engineer: "Mia",
      action: "assigned to",
      detail: "Job #3248",
      location: "NHS South Wing",
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
      icon: UserPlus,
    },
    {
      id: 3,
      type: "client",
      action: "Client approved",
      detail: "Quote #1129",
      timestamp: new Date(Date.now() - 18 * 60 * 1000),
      icon: FileText,
    },
    {
      id: 4,
      action: "Invoice #INV-2401 sent to",
      detail: "Starbucks",
      timestamp: new Date(Date.now() - 32 * 60 * 1000),
      icon: DollarSign,
    },
    {
      id: 5,
      engineer: "James",
      action: "started",
      detail: "Job #3244",
      location: "Royal Hospital",
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      icon: Clock,
    },
  ];

  const formatActivityText = (activity) => {
    if (activity.engineer) {
      return (
        <>
          <span className="text-white font-medium">{activity.engineer}</span>
          <span className="text-[#CED4DA]"> {activity.action} </span>
          <span className="text-white font-medium">{activity.detail}</span>
          {activity.location && (
            <>
              <span className="text-[#CED4DA]"> — </span>
              <span className="text-[#CED4DA]">{activity.location}</span>
            </>
          )}
        </>
      );
    }
    return (
      <>
        <span className="text-[#CED4DA]">{activity.action} </span>
        <span className="text-white font-medium">{activity.detail}</span>
      </>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
      <h2 className="text-base font-semibold text-white mb-4">Activity Feed</h2>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start gap-3 py-2">
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-[#CED4DA] opacity-60" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-relaxed">
                  {formatActivityText(activity)}
                  <span className="text-[#CED4DA] opacity-50"> — </span>
                  <span className="text-[#CED4DA] opacity-50 text-[12px]">
                    {format(activity.timestamp, 'HH:mm')}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function format(date, formatStr) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}