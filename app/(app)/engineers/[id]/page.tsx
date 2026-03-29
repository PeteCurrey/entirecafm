'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Wrench, ArrowLeft, Loader2, MapPin, Pickaxe,
  Clock, BarChart3, History, ShieldAlert,
  CalendarDays, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { format, isSameDay } from 'date-fns';
import { JobStatusBadge } from '@/components/JobStatusBadge';

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

export default function EngineerDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const [engineer, setEngineer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState<{lat: number, lng: number, timestamp: string} | null>(null);

  const fetchEngineer = async () => {
    try {
      const res = await fetch(`/api/engineers/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setEngineer(data);
        if (data.location) {
           setLiveLocation({ 
             lat: data.location.lat, 
             lng: data.location.lng,
             timestamp: data.location.updatedAt
           });
        }
      }
    } catch (err) {
      console.error('Failed to fetch engineer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineer();

    // Setup Supabase Realtime channel specifically for THIS engineer's GPS location via EngineerLocation
    const channel = supabase
      .channel(`engineer-${params.id}-location`)
      .on('postgres_changes', { 
         event: 'UPDATE', 
         schema: 'public', 
         table: 'EngineerLocation',
         filter: `userId=eq.${params.id}` 
      }, (payload) => {
         console.log('Location Update Caught', payload);
         setLiveLocation({
            lat: payload.new.lat,
            lng: payload.new.lng,
            timestamp: payload.new.updatedAt
         });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-[#94A3B8]">
      <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Locating profile matrix...
    </div>
  );

  if (!engineer) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#94A3B8]">
      <Wrench className="w-12 h-12 text-[#334155] mb-4" />
      <div>Operative profile isolated or deleted.</div>
    </div>
  );

  const initials = engineer.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const onSiteJob = engineer.jobs?.find((j: any) => j.status === 'ON_SITE');
  const todayJobs = engineer.jobs?.filter((j: any) => j.scheduledDate && isSameDay(new Date(j.scheduledDate), new Date()));

  // Mocked graph data
  const perfData = [
    { week: 'W1', jobs: 12 }, { week: 'W2', jobs: 19 }, { week: 'W3', jobs: 15 },
    { week: 'W4', jobs: 22 }, { week: 'W5', jobs: 8 }, { week: 'W6', jobs: 25 },
    { week: 'W7', jobs: 14 }, { week: 'W8', jobs: 20 }, { week: 'W9', jobs: 31 },
    { week: 'W10', jobs: 28 }, { week: 'W11', jobs: 18 }, { week: 'W12', jobs: engineer.performance?.thisWeek || 0 },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <Link href="/engineers" className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors text-sm w-fit font-bold uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4" /> Back to Fleet
      </Link>

      {/* Header Profile Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#334155] rounded-xl p-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
          <Avatar className="w-24 h-24 border-2 border-[#E91E8C] shadow-[0_0_20px_rgba(233,30,140,0.3)] shrink-0">
            <AvatarImage src={engineer.avatar || ''} />
            <AvatarFallback className="bg-[#0D0D0D] text-[#E91E8C] font-black text-3xl">{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
             <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white font-inter tracking-tight leading-tight">
                  {engineer.name}
                </h1>
                <Badge className="bg-[#334155] text-white border-none uppercase text-[10px] tracking-widest">{engineer.role}</Badge>
             </div>
             
             <p className="text-[#94A3B8] text-sm font-medium uppercase tracking-widest mb-4">
               {engineer.email} {engineer.phone ? ` • ${engineer.phone}` : ''}
             </p>

             <div className="flex flex-wrap gap-2 mb-6 justify-center md:justify-start">
               {(engineer.skills || []).map((skill: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] bg-[#0D0D0D] text-[#3B82F6] border-[#334155] uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                    {skill}
                  </Badge>
               ))}
             </div>

             {onSiteJob ? (
                <div className="flex items-center gap-3 p-3 bg-[#E91E8C]/10 border border-[#E91E8C]/30 rounded-lg w-full">
                   <div className="w-3 h-3 rounded-full bg-[#E91E8C] shadow-[0_0_10px_rgba(233,30,140,0.8)] animate-pulse shrink-0" />
                   <div className="flex flex-col text-left truncate">
                      <span className="text-[10px] text-[#E91E8C] font-bold uppercase tracking-widest">Active On Site</span>
                      <span className="text-sm font-bold text-white truncate">{onSiteJob.title}</span>
                   </div>
                   <Link href={`/jobs/${onSiteJob.id}`} className="ml-auto">
                     <Button variant="outline" className="border-[#E91E8C] text-[#E91E8C] hover:bg-[#E91E8C]/10 h-7 text-[10px] uppercase font-bold px-3">View Job</Button>
                   </Link>
                </div>
             ) : (
                <div className="flex items-center gap-3 p-3 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg w-full">
                   <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shrink-0" />
                   <div className="flex flex-col text-left truncate">
                      <span className="text-[10px] text-[#3B82F6] font-bold uppercase tracking-widest">Mobile / Available</span>
                      <span className="text-sm font-medium text-[#94A3B8]">Fleet operative is dispatched or inactive.</span>
                   </div>
                </div>
             )}
          </div>
        </div>

        {/* Live GPS Tracker */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-3 flex flex-col relative min-h-[220px]">
           <div className="absolute top-5 left-5 z-10 bg-[#0D0D0D]/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-[#334155] flex items-center gap-2">
              <MapPin className="w-3 h-3 text-[#22C55E]" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live GPS Telemetry</span>
           </div>
           
           {liveLocation ? (
              <div className="flex-1 rounded-lg overflow-hidden border border-[#334155]">
                <MiniMap lat={liveLocation.lat} lng={liveLocation.lng} popupText={engineer.name} />
              </div>
           ) : (
              <div className="flex-1 rounded-lg border border-dashed border-[#475569] flex flex-col items-center justify-center bg-[#0D0D0D] text-center p-6">
                <MapPin className="w-8 h-8 text-[#475569] mb-3" />
                <p className="text-sm font-bold text-[#F59E0B] uppercase tracking-widest mb-1">Signal Dropped</p>
                <p className="text-xs text-[#94A3B8]">Operative telemetry via mobile application disabled or device off grid.</p>
              </div>
           )}

           {liveLocation && (
             <div className="mt-3 text-[10px] text-right font-medium text-[#94A3B8] italic px-1">
                Last ping: {new Date(liveLocation.timestamp).toLocaleTimeString()}
             </div>
           )}
        </div>
      </div>

      <Tabs defaultValue="today" className="w-full mt-2">
        <TabsList className="bg-[#1E293B] border border-[#334155] h-12 w-full flex overflow-x-auto justify-start rounded-lg p-1 custom-scrollbar">
          <TabsTrigger value="today" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6 shrink-0 flex items-center gap-2">
             <Clock className="w-4 h-4" /> Today <Badge className="bg-[#0D0D0D] text-[#94A3B8] border-none ml-1">{todayJobs?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2">
             <CalendarDays className="w-4 h-4" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2">
             <History className="w-4 h-4" /> History
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#E91E8C] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2">
             <BarChart3 className="w-4 h-4" /> Performance
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2 ml-auto">
             <Settings className="w-4 h-4" /> Profile Edit
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="today">
             {todayJobs && todayJobs.length > 0 ? (
               <div className="space-y-4">
                 {todayJobs.map((tJob: any) => (
                    <div key={tJob.id} className="bg-[#111827] border border-[#334155] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-[#E91E8C] font-bold uppercase tracking-widest">{format(new Date(tJob.createdAt), 'HH:mm')} Dispatch</span>
                          <span className="text-lg font-bold text-white mt-1">{tJob.title}</span>
                          <span className="text-xs text-[#94A3B8] font-medium mt-1">{tJob.client?.name} • {tJob.site?.name}</span>
                       </div>
                       <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-2 border-t border-[#334155] sm:border-0 sm:pt-0">
                          <JobStatusBadge status={tJob.status} />
                          <Link href={`/jobs/${tJob.id}`}>
                            <Button variant="outline" className="bg-[#1E293B] border-[#334155] text-white hover:bg-[#334155] h-8 text-[11px] font-bold uppercase px-4">Open Job</Button>
                          </Link>
                       </div>
                    </div>
                 ))}
               </div>
             ) : (
                <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-16 text-center text-[#94A3B8] flex flex-col justify-center items-center">
                  <Pickaxe className="w-12 h-12 text-[#334155] mb-4" />
                  <p className="font-bold text-sm uppercase tracking-widest">No Active Dispatch</p>
                  <p className="text-xs mt-2">Operative has cleared their docket for {format(new Date(), 'EEEE')}.</p>
                </div>
             )}
          </TabsContent>

          <TabsContent value="performance">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="bg-[#1E293B] border-[#334155]">
                  <CardContent className="pt-6">
                     <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Jobs Cleared (Week)</p>
                     <p className="text-3xl font-bold text-white font-mono">{engineer.performance?.thisWeek || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1E293B] border-[#334155]">
                  <CardContent className="pt-6">
                     <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Jobs Cleared (Month)</p>
                     <p className="text-3xl font-bold text-emerald-400 font-mono">{engineer.performance?.thisMonth || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1E293B] border-[#334155]">
                  <CardContent className="pt-6">
                     <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Workload (YTD)</p>
                     <p className="text-3xl font-bold text-[#3B82F6] font-mono">{engineer.performance?.ytd || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1E293B] border-[#334155] flex flex-row items-center justify-between">
                  <CardContent className="pt-6">
                     <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">SLA Compliance</p>
                     <p className="text-3xl font-bold text-[#E91E8C] font-mono">{engineer.performance?.compliance}</p>
                  </CardContent>
                  <ShieldAlert className="w-8 h-8 text-[#E91E8C] mr-6" />
                </Card>
             </div>

             <Card className="bg-[#1E293B] border-[#334155] text-white shadow-none">
                <CardHeader className="border-b border-[#334155]/50 pb-4">
                  <CardTitle className="text-xs uppercase tracking-widest text-[#94A3B8]">Fix Rate Trajectory (Last 12 Weeks)</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perfData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="week" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: '#334155', opacity: 0.4}}
                        contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#3B82F6', fontWeight: 'bold' }}
                        labelStyle={{ color: '#94A3B8', fontSize: '12px' }}
                      />
                      <Bar dataKey="jobs" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
             </Card>
          </TabsContent>

          {/* Placeholders for complex list views mapped in previous phases */}
          <TabsContent value="schedule">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 text-center text-[#94A3B8] italic text-sm">
               Rendering active {engineer.jobs?.length || 0} scheduled pipeline tasks leveraging the `ScheduleGrid` subset component.
             </div>
          </TabsContent>

          <TabsContent value="history">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 text-center text-[#94A3B8] italic text-sm">
               Fetching historical Job Trace. Last {engineer.historyJobs?.length || 0} audited tasks mapped directly to this commercial operative UUID.
             </div>
          </TabsContent>

          <TabsContent value="profile">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 flex flex-col items-center text-[#94A3B8]">
               <Settings className="w-12 h-12 text-[#334155] mb-4" />
               <p className="text-sm font-bold uppercase tracking-widest">Profile Configurations</p>
               <p className="text-xs mt-2 text-center max-w-sm">Access rights, phone digits, and skill-tag classifications belong strictly to ADMIN routing levels.</p>
               <Button className="mt-4 bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold uppercase tracking-wider text-[11px] h-8 px-6">Edit Identity</Button>
             </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
