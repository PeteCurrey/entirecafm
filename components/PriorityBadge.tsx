import { cn } from '@/lib/utils';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const priorityConfig: Record<Priority, { color: string, border: string }> = {
    LOW: { 
      color: 'text-[#94A3B8]', 
      border: 'border-[#475569]' 
    },
    MEDIUM: { 
      color: 'text-[#3B82F6]', 
      border: 'border-[#3B82F6]' 
    },
    HIGH: { 
      color: 'text-[#F59E0B]', 
      border: 'border-[#F59E0B]' 
    },
    CRITICAL: { 
      color: 'text-[#EF4444]', 
      border: 'border-[#EF4444]' 
    },
  };

  const { color, border } = priorityConfig[priority] || priorityConfig.MEDIUM;

  return (
    <span className={cn(
      "text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-transparent",
      color,
      border,
      priority === 'CRITICAL' && "animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]"
    )}>
      {priority}
    </span>
  );
}
