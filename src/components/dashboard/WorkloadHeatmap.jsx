import React from "react";
import { User } from "lucide-react";

export default function WorkloadHeatmap({ engineers = [] }) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am to 7pm
  
  const engineerData = [
    { 
      name: "Ryan Mitchell", 
      capacity: [30, 70, 90, 95, 85, 60, 40, 30, 50, 70, 40, 20]
    },
    { 
      name: "Mia Chen", 
      capacity: [20, 40, 85, 100, 95, 90, 70, 50, 40, 30, 20, 10]
    },
    { 
      name: "James Foster", 
      capacity: [10, 30, 45, 60, 50, 40, 35, 30, 40, 35, 25, 15]
    },
  ];

  const getCapacityColor = (capacity) => {
    if (capacity <= 50) return 'bg-green-500/40';
    if (capacity <= 80) return 'bg-yellow-500/40';
    return 'bg-[#E1467C]/40';
  };

  const getCapacityBorder = (capacity) => {
    if (capacity <= 50) return 'border-green-500/30';
    if (capacity <= 80) return 'border-yellow-500/30';
    return 'border-[#E1467C]/30';
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-divider">
      <h2 className="text-lg font-bold text-white mb-4">Engineer Capacity Heatmap</h2>
      
      {/* Hour Labels */}
      <div className="flex mb-2">
        <div className="w-32 flex-shrink-0" />
        <div className="flex-1 grid grid-cols-12 gap-1">
          {hours.map(hour => (
            <div key={hour} className="text-center">
              <span className="text-xs text-body">{hour}:00</span>
            </div>
          ))}
        </div>
      </div>

      {/* Engineer Rows */}
      <div className="space-y-2">
        {engineerData.map((engineer, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-32 flex-shrink-0 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full accent-magenta flex items-center justify-center text-white font-bold text-xs">
                {engineer.name[0]}
              </div>
              <span className="text-xs text-white truncate">{engineer.name.split(' ')[0]}</span>
            </div>
            <div className="flex-1 grid grid-cols-12 gap-1">
              {engineer.capacity.map((capacity, hourIdx) => (
                <div
                  key={hourIdx}
                  className={`h-8 rounded border ${getCapacityColor(capacity)} ${getCapacityBorder(capacity)} transition-all hover:scale-105 cursor-pointer`}
                  title={`${capacity}% capacity at ${hours[hourIdx]}:00`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-divider">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/40 border border-green-500/30" />
          <span className="text-xs text-body">Free capacity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500/40 border border-yellow-500/30" />
          <span className="text-xs text-body">At threshold</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#E1467C]/40 border border-[#E1467C]/30" />
          <span className="text-xs text-body">Overloaded</span>
        </div>
      </div>
    </div>
  );
}