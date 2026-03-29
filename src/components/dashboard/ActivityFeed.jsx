import React from "react";

export default function ActivityFeed() {
  const activities = [
    {
      id: 1,
      text: "Ryan completed Job #3241 — Victoria Gate",
      timestamp: "14:22"
    },
    {
      id: 2,
      text: "Mia assigned to Job #3248 — NHS South Wing",
      timestamp: "14:18"
    },
    {
      id: 3,
      text: "Client approved Quote #1129",
      timestamp: "14:12"
    },
    {
      id: 4,
      text: "Invoice #INV-2401 sent to Starbucks",
      timestamp: "14:08"
    },
    {
      id: 5,
      text: "James started Job #3244 — Royal Hospital",
      timestamp: "14:02"
    },
    {
      id: 6,
      text: "New quote request from Acme Facilities",
      timestamp: "13:58"
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
      <h2 className="text-base font-semibold text-white mb-4">Recent Activity</h2>
      <div className="space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between py-1.5 hover:bg-[rgba(255,255,255,0.02)] rounded px-2 -mx-2 transition-colors">
            <p className="text-[13px] text-[#CED4DA] opacity-80">
              • {activity.text}
            </p>
            <span className="text-[11px] text-[#CED4DA] opacity-50 ml-4 flex-shrink-0">
              {activity.timestamp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}