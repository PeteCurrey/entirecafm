'use client';

import { useEffect, useState } from 'react';
import { differenceInMilliseconds, formatDuration, intervalToDuration } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLATimerProps {
  deadline: string | Date | null;
}

export function SLATimer({ deadline }: SLATimerProps) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [status, setStatus] = useState<'green' | 'amber' | 'red' | 'none'>('none');

  useEffect(() => {
    if (!deadline) {
      setTimeLeft('—');
      setStatus('none');
      return;
    }

    const timer = setInterval(() => {
      const targetDate = new Date(deadline);
      const diff = differenceInMilliseconds(targetDate, new Date());

      if (diff <= 0) {
        setTimeLeft('OVERDUE');
        setStatus('red');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${hours}h ${minutes}m`);
      
      if (hours < 4) {
        setStatus('amber');
      } else {
        setStatus('green');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  if (status === 'none') {
    return <span className="text-[#94A3B8] text-xs">—</span>;
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 font-bold text-[13px] font-inter",
      status === 'green' && "text-[#22C55E]",
      status === 'amber' && "text-[#F59E0B]",
      status === 'red' && "text-[#EF4444]"
    )}>
      {status === 'red' && <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />}
      {status === 'amber' && <AlertCircle className="w-4 h-4" />}
      <span>{timeLeft}</span>
    </div>
  );
}
