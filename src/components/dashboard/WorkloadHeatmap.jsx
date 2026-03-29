import React from "react";

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
    if (capacity <= 60) return 'bg-[#3FB950]'; // Green - available
    if (capacity <= 85) return 'bg-[#FFDC73]'; // Yellow - threshold
    return 'bg-[#E1467C]'; // Magenta - exceeded
  };

  const getCapacityOpacity = (capacity) => {
    if (capacity <= 60) return 'opacity-40';
    if (capacity <= 85) return 'opacity-50';
    return 'opacity-60';
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
      <h2 className="text-base font-semibold text-white mb-4">Engineer Workload Heatmap</h2>
      
      {/* Hour Labels */}
      <div className="flex mb-2">
        <div className="w-32 flex-shrink-0" />
        <div className="flex-1 grid grid-cols-12 gap-1">
          {hours.map(hour => (
            <div key={hour} className="text-center">
              <span className="text-[9px] text-[#CED4DA] opacity-60">{hour}:00</span>
            </div>
          ))}
        </div>
      </div>

      {/* Engineer Rows */}
      <div className="space-y-2">
        {engineerData.map((engineer, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-32 flex-shrink-0 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#E1467C] flex items-center justify-center text-white font-bold text-xs">
                {engineer.name[0]}
              </div>
              <span className="text-xs text-[#CED4DA] truncate">{engineer.name.split(' ')[0]}</span>
            </div>
            <div className="flex-1 grid grid-cols-12 gap-1">
              {engineer.capacity.map((capacity, hourIdx) => (
                <div
                  key={hourIdx}
                  className={`h-8 rounded ${getCapacityColor(capacity)} ${getCapacityOpacity(capacity)} transition-all hover:scale-105 cursor-pointer`}
                  title={`${engineer.name}: ${capacity}% booked at ${hours[hourIdx]}:00`}
                />
              ))}
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