import { cn } from '@/lib/utils';

type JobStatus = 'NEW' | 'ASSIGNED' | 'ON_ROUTE' | 'ON_SITE' | 'COMPLETED' | 'INVOICED' | 'CANCELLED';

interface JobStatusBadgeProps {
  status: JobStatus;
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const statusConfig: Record<JobStatus, { label: string, color: string }> = {
    NEW: { label: 'NEW', color: 'bg-[#3B82F6]' },
    ASSIGNED: { label: 'ASSIGNED', color: 'bg-[#F59E0B]' },
    ON_ROUTE: { label: 'ON ROUTE', color: 'bg-[#8B5CF6]' },
    ON_SITE: { label: 'ON SITE', color: 'bg-[#E91E8C]' },
    COMPLETED: { label: 'COMPLETED', color: 'bg-[#22C55E]' },
    INVOICED: { label: 'INVOICED', color: 'bg-[#6B7280]' },
    CANCELLED: { label: 'CANCELLED', color: 'bg-[#EF4444]' },
  };

  const { label, color } = statusConfig[status] || statusConfig.NEW;

  return (
    <span className={cn(
      "text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
      color
    )}>
      {label}
    </span>
  );
}
