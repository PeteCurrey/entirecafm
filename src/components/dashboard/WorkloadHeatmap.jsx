import React from "react";

export default function WorkloadHeatmap({ engineers = [] }) {
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm
  
  const engineerData = [
    { 
      name: "Ryan Mitchell", 
      capacity: [20, 30, 45, 60, 75, 92, 95, 88, 70, 55, 45, 38, 30, 25, 20, 15, 10]
    },
    { 
      name: "Mia Chen", 
      capacity: [15, 25, 40, 65, 82, 95, 98, 92, 78, 65, 50, 40, 32, 28, 22, 18, 12]
    },
    { 
      name: "James Foster", 
      capacity: [10, 20, 35, 48, 52, 58, 62, 55, 48, 42, 38, 35, 30, 25, 20, 15, 10]
    },
  ];

  const getCapacityColor = (capacity) => {
    if (capacity <= 60) return 'bg-[#3FB950]'; // Green - available
    if (capacity <= 85) return 'bg-[#FFDC73]'; // Yellow - threshold
    return 'bg-[#E1467C]'; // Magenta - exceeded
  };

  const getCapacityOpacity = (capacity) => {
    if (capacity <= 60) return 'opacity-40';
    if (capacity <= 85) return 'opacity-50';
    return 'opacity-60';
  };

  const formatHour = (hour) => {
    if (hour === 0) return '12AM';
    if (hour === 12) return '12PM';
    if (hour < 12) return `${hour}AM`;
    return `${hour - 12}PM`;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
      <h2 className="text-base font-semibold text-white mb-4">Engineer Workload Heatmap</h2>
      
      {/* Hour Labels */}
      <div className="flex mb-2">
        <div className="w-28 flex-shrink-0" />
        <div className="flex-1 grid grid-cols-17 gap-1">
          {hours.map((hour, idx) => {
            // Only show labels for every 3 hours
            const showLabel = idx % 3 === 0 || idx === hours.length - 1;
            return (
              <div key={hour} className="text-center">
                {showLabel && (
                  <span className="text-[9px] text-[#CED4DA] opacity-60">
                    {formatHour(hour)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Engineer Rows */}
      <div className="space-y-2">
        {engineerData.map((engineer, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-28 flex-shrink-0">
              <span className="text-xs text-[#CED4DA]">{engineer.name}</span>
            </div>
            <div className="flex-1 grid grid-cols-17 gap-1">
              {engineer.capacity.map((capacity, hourIdx) => {
                const hour = hours[hourIdx];
                const timeLabel = `${hour}:00`;
                const statusText = capacity <= 60 ? 'available' : capacity <= 85 ? 'threshold' : 'exceeded';
                
                return (
                  <div
                    key={hourIdx}
                    className={`h-7 rounded ${getCapacityColor(capacity)} ${getCapacityOpacity(capacity)} transition-all hover:scale-105 cursor-pointer`}
                    title={`${engineer.name}: ${capacity}% booked at ${timeLabel} (${statusText})`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#3FB950] opacity-40" />
          <span className="text-[10px] text-[#CED4DA]">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#FFDC73] opacity-50" />
          <span className="text-[10px] text-[#CED4DA]">Threshold</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#E1467C] opacity-60" />
          <span className="text-[10px] text-[#CED4DA]">Exceeded</span>
        </div>
      </div>
    </div>
  );
}