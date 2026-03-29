'use client';

import { cn } from '@/lib/utils';

interface Engineer {
  id: string;
  name: string;
  hourData: Record<number, number>;
}

interface EngineerHeatmapProps {
  engineers: Engineer[];
}

export function EngineerHeatmap({ engineers }: EngineerHeatmapProps) {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-[#1E293B]'; // Dark Card
    if (count === 1) return 'bg-rgba(34,197,94,0.45)'; // Green
    if (count === 2) return 'bg-rgba(245,158,11,0.55)'; // Amber
    return 'bg-rgba(233,30,140,0.65)'; // Pink
  };

  // Inline grid cell component for better styling (Tailwind bg-rgba hack)
  const Cell = ({ count }: { count: number }) => {
    let style = {};
    if (count === 1) style = { backgroundColor: 'rgba(34, 197, 94, 0.45)' };
    if (count === 2) style = { backgroundColor: 'rgba(245, 158, 11, 0.55)' };
    if (count >= 3) style = { backgroundColor: 'rgba(233, 30, 140, 0.65)' };
    
    return (
      <div 
        className={cn(
          "w-9 h-8 border border-[#334155] transition-colors duration-200",
          count === 0 ? "bg-[#1E293B]" : ""
        )}
        style={style}
      />
    );
  };

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 flex flex-col h-full overflow-hidden">
      <h3 className="text-white font-semibold mb-6 text-[15px] font-inter">Engineer Workload Heatmap</h3>
      
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-[#334155]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-32 text-[10px] text-[#94A3B8] uppercase font-bold text-left py-2 px-1">Engineer</th>
              {hours.map(hour => (
                <th key={hour} className="text-[10px] text-[#94A3B8] uppercase font-bold text-center py-2 px-1">
                  {hour.toString().padStart(2, '0')}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {engineers.map(engineer => {
              const initials = engineer.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase();

              return (
                <tr key={engineer.id} className="border-b border-[#334155]/30 last:border-0 hover:bg-[#334155]/20 transition-colors">
                  <td className="py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#E91E8C] flex items-center justify-center text-white text-[10px] font-bold">
                      {initials}
                    </div>
                    <span className="text-white text-[13px] font-inter truncate w-20">
                      {engineer.name.split(' ')[0]}
                    </span>
                  </td>
                  {hours.map(hour => (
                    <td key={hour} className="py-2.5 px-0.5">
                      <Cell count={engineer.hourData[hour] || 0} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
