'use client';

import { useState, useEffect } from 'react';
import { 
  DndContext, DragOverlay, closestCorners, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors 
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { addDays, startOfWeek, format, isSameDay } from 'date-fns';
import { Calendar, Loader2, GripVertical, AlertCircle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from '@/components/PriorityBadge';

// Helper Components for DND
function DraggableJob({ job }: { job: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: job
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-[#111827] border border-[#334155] rounded-md p-2 shadow-md cursor-grab active:cursor-grabbing hover:border-[#E91E8C] transition-colors",
        isDragging ? "opacity-30" : "opacity-100"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#E91E8C] font-mono text-[10px] font-bold">{job.jobNumber}</span>
        <PriorityBadge priority={job.priority} />
      </div>
      <div className="text-white text-xs font-bold truncate">{job.title}</div>
      <div className="text-[#94A3B8] text-[10px] truncate mt-0.5">{job.site?.name}</div>
    </div>
  );
}

function DroppableSlot({ id, date, engineerId, children }: { id: string, date?: Date, engineerId?: string, children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { date, engineerId }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[80px] p-1 rounded-md transition-colors border",
        isOver ? "bg-[#334155]/50 border-[#E91E8C]" : "bg-transparent border-dashed border-[#334155]"
      )}
    >
      <div className="flex flex-col gap-1.5 h-full">
        {children}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [engineers, setEngineers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<any | null>(null);

  // Default to current week
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
  const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const { engineers, jobs } = await res.json();
        setEngineers(engineers);
        setJobs(jobs);
      }
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // minimum drag distance before activation
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const job = jobs.find(j => j.id === event.active.id);
    setActiveJob(job);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return; // Dropped outside

    const jobId = active.id as string;
    const { date, engineerId } = over.data.current as any;
    
    // Optistic UI update
    setJobs(currentJobs => 
      currentJobs.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              engineerId, 
              scheduledDate: date ? date.toISOString() : null,
              status: engineerId ? 'ASSIGNED' : 'NEW'
            } 
          : job
      )
    );

    // Persist
    try {
      await fetch(`/api/schedule/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           engineerId,
           scheduledDate: date ? date.toISOString() : null
        })
      });
    } catch (err) {
      console.error("Failed to commit drop:", err);
      fetchSchedule(); // Revert on err
    }
  };

  const unassignedJobs = jobs.filter(j => !j.engineerId && j.status === 'NEW');

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in duration-500 overflow-hidden">
      
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#E91E8C]" /> Fleet Dispatch & Schedule
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Drag unassigned operations tickets onto engineer routes.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#94A3B8]">
          <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Loading master grid...
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 gap-6 overflow-hidden">
            
            {/* Calendar Matrix */}
            <div className="flex-1 bg-[#1E293B] border border-[#334155] rounded-lg overflow-hidden flex flex-col">
               {/* 7 Days Header */}
               <div className="grid grid-cols-[200px_repeat(7,minmax(120px,1fr))] border-b border-[#334155] bg-[#0D0D0D] shrink-0">
                 <div className="p-4 border-r border-[#334155] flex items-center justify-center">
                   <span className="text-xs font-bold text-[#E91E8C] uppercase tracking-widest">Engineers</span>
                 </div>
                 {days.map(d => (
                   <div key={d.toISOString()} className={cn("p-2 text-center border-r border-[#334155] flex flex-col justify-center", isSameDay(d, new Date()) && "bg-[#E91E8C]/10")}>
                     <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{format(d, 'EEE')}</span>
                     <span className={cn("text-sm font-bold", isSameDay(d, new Date()) ? "text-[#E91E8C]" : "text-white")}>{format(d, 'dd MMM')}</span>
                   </div>
                 ))}
               </div>

               {/* Matrix Body */}
               <div className="flex-1 overflow-auto custom-scrollbar">
                 <div className="min-w-[1000px]">
                   {engineers.map(eng => (
                     <div key={eng.id} className="grid grid-cols-[200px_repeat(7,minmax(120px,1fr))] border-b border-[#334155] hover:bg-[#334155]/10">
                       
                       {/* Eng Card */}
                       <div className="p-3 border-r border-[#334155] flex flex-col justify-center bg-[#111827]">
                         <div className="flex items-center gap-3">
                           <Avatar className="h-8 w-8 border border-[#334155]">
                             <AvatarImage src={eng.avatar} />
                             <AvatarFallback className="bg-[#1E293B] text-xs font-bold">{eng.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                           </Avatar>
                           <div className="truncate">
                             <div className="text-xs font-bold text-white truncate">{eng.name}</div>
                             <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Field Operative</div>
                           </div>
                         </div>
                       </div>

                       {/* Slots */}
                       {days.map(d => {
                         const cellId = `eng-${eng.id}-date-${format(d, 'yyyy-MM-dd')}`;
                         // Find jobs for this eng on this day
                         const dayJobs = jobs.filter(j => 
                            j.engineerId === eng.id && 
                            j.scheduledDate && 
                            isSameDay(new Date(j.scheduledDate), d)
                         );

                         return (
                           <div key={cellId} className="p-1 border-r border-[#334155]">
                             <DroppableSlot id={cellId} engineerId={eng.id} date={d}>
                               {dayJobs.map(j => <DraggableJob key={j.id} job={j} />)}
                             </DroppableSlot>
                           </div>
                         )
                       })}
                     </div>
                   ))}
                 </div>
               </div>
            </div>

            {/* Unassigned Bin */}
            <div className="w-[300px] bg-[#1E293B] border border-[#334155] rounded-lg shrink-0 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-[#334155] bg-[#0D0D0D] flex items-center justify-between shrink-0">
                 <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                   <AlertCircle className="w-4 h-4 text-[#F59E0B]" /> Default Pool
                 </h2>
                 <Badge variant="secondary" className="bg-[#334155] text-white border-none">{unassignedJobs.length}</Badge>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                 <DroppableSlot id="unassigned-pool" engineerId={undefined} date={undefined}>
                   {unassignedJobs.map(j => <DraggableJob key={j.id} job={j} />)}
                   {unassignedJobs.length === 0 && (
                     <div className="h-32 flex flex-col items-center justify-center text-[#94A3B8] italic text-xs">
                       <Wrench className="w-8 h-8 opacity-20 mb-2" />
                       No unassigned jobs pending.
                     </div>
                   )}
                 </DroppableSlot>
               </div>
            </div>

            <DragOverlay>
              {activeJob ? (
                <div className="w-[180px] bg-[#1E293B] border-2 border-[#E91E8C] rounded-md p-2 shadow-2xl opacity-90 scale-105 transition-transform rotate-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#E91E8C] font-mono text-[10px] font-bold">{activeJob.jobNumber}</span>
                    <PriorityBadge priority={activeJob.priority} />
                  </div>
                  <div className="text-white text-xs font-bold truncate">{activeJob.title}</div>
                </div>
              ) : null}
            </DragOverlay>

          </div>
        </DndContext>
      )}
    </div>
  );
}
