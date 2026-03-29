'use client';

import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface JobPipelineProps {
  data: {
    NEW: number;
    ASSIGNED: number;
    ON_ROUTE: number;
    ON_SITE: number;
    COMPLETED: number;
    INVOICED: number;
  };
}

export function JobPipeline({ data }: JobPipelineProps) {
  const router = useRouter();

  const stages = [
    { label: 'NEW', count: data.NEW || 0, status: 'NEW' },
    { label: 'ASSIGNED', count: data.ASSIGNED || 0, status: 'ASSIGNED' },
    { label: 'ON ROUTE', count: data.ON_ROUTE || 0, status: 'ON_ROUTE' },
    { label: 'ON SITE', count: data.ON_SITE || 0, status: 'ON_SITE' },
    { label: 'COMPLETED', count: data.COMPLETED || 0, status: 'COMPLETED' },
    { label: 'INVOICED', count: data.INVOICED || 0, status: 'INVOICED' },
  ];

  const handleStageClick = (status: string) => {
    router.push(`/jobs?status=${status}`);
  };

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 flex flex-col h-full group">
      <h3 className="text-white font-semibold mb-8 text-[15px] font-inter">Job Pipeline</h3>
      
      <div className="flex items-center justify-between w-full relative">
        {stages.map((stage, index) => (
          <div key={stage.label} className="flex items-center flex-1 last:flex-none">
            {/* Stage Circle */}
            <button 
              onClick={() => handleStageClick(stage.status)}
              className="flex flex-col items-center gap-3 transition-transform hover:scale-105 group/stage focus:outline-none"
            >
              <div className={cn(
                "w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                stage.count > 0 
                  ? "border-[#E91E8C] bg-[rgba(233,30,140,0.1)] Magenta-box-shadow" 
                  : "border-[#334155] bg-[#0D0D0D]"
              )}>
                <span className="text-lg font-bold text-white font-inter">
                  {stage.count}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-[0.1em] text-center w-full">
                {stage.label}
              </span>
            </button>

            {/* Arrow Divider */}
            {index < stages.length - 1 && (
              <div className="flex-1 flex justify-center text-[#334155] px-2 mb-6">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
