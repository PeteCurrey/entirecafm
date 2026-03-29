import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface KPITileProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'pink' | 'blue' | 'amber' | 'red';
  pulse?: boolean;
  trend?: string;
  trendUp?: boolean;
}

export function KPITile({ title, value, icon: Icon, color, pulse, trend, trendUp }: KPITileProps) {
  const colorMap = {
    pink: 'text-[#E91E8C] border-[#E91E8C]',
    blue: 'text-[#3B82F6] border-[#3B82F6]',
    amber: 'text-[#F59E0B] border-[#F59E0B]',
    red: 'text-[#EF4444] border-[#EF4444]',
  };

  const barColorMap = {
    pink: 'bg-[#E91E8C]',
    blue: 'bg-[#3B82F6]',
    amber: 'bg-[#F59E0B]',
    red: 'bg-[#EF4444]',
  };

  return (
    <Card className="bg-[#1E293B] border-[#334155] p-5 rounded-lg flex flex-col relative overflow-hidden group">
      <div className="flex items-start justify-between mb-2">
        <Icon className={cn("w-5 h-5", colorMap[color].split(' ')[0])} />
      </div>
      
      <div className="flex flex-col">
        <span className="text-3xl font-bold text-white font-inter tracking-tight">
          {value}
        </span>
        <span className="text-[13px] text-[#94A3B8] font-medium mt-1 uppercase tracking-wide">
          {title}
        </span>
        {trend && (
           <div className={cn(
             "text-[10px] mt-2 font-bold flex items-center gap-1",
             trendUp ? "text-emerald-400" : "text-rose-400"
           )}>
             {trendUp ? '↑' : '↓'} {trend}
           </div>
        )}
      </div>

      {/* Thin bottom bar */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-[3px]",
        barColorMap[color],
        pulse && "animate-pulse"
      )} />
    </Card>
  );
}
