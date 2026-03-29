'use client';

import { 
  CheckCircle2, 
  MessageSquare, 
  FileText, 
  UserPlus, 
  PlusCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Activity {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  userId?: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return <ArrowRight className="w-4 h-4" />;
      case 'NOTE': return <MessageSquare className="w-4 h-4" />;
      case 'DOCUMENT': return <FileText className="w-4 h-4" />;
      case 'ASSIGNMENT': return <UserPlus className="w-4 h-4" />;
      case 'CREATED': return <PlusCircle className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'NOTE': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'DOCUMENT': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'ASSIGNMENT': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      default: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-[#334155]">
      {activities.map((activity, index) => (
        <div key={activity.id} className="relative flex items-start gap-6 group">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border shrink-0 z-10",
            getIconColor(activity.type)
          )}>
            {getIcon(activity.type)}
          </div>
          
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-white font-inter tracking-tight">
                {activity.type.replace('_', ' ')}
              </span>
              <span className="text-[11px] text-[#94A3B8]">
                {format(new Date(activity.createdAt), "MMM d, HH:mm")}
              </span>
            </div>
            <p className="text-[13px] text-[#94A3B8] leading-relaxed">
              {activity.content}
            </p>
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="text-center py-10 text-[#94A3B8] text-sm italic">
          No activity recorded yet
        </div>
      )}
    </div>
  );
}
