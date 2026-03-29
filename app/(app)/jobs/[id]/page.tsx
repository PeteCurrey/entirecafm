'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  AlertCircle, 
  FileText, 
  Plus, 
  Trash2, 
  AlertTriangle,
  Send,
  Wrench,
  Loader2,
  Calendar,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { JobStatusBadge } from '@/components/JobStatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { SLATimer } from '@/components/SLATimer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { format } from 'date-fns';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [engineers, setEngineers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${params.id}`);
      if (res.ok) setJob(await res.json());
    } catch (err) {
      console.error('Failed to fetch job:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      const res = await fetch('/api/engineers');
      if (res.ok) setEngineers(await res.json());
    } catch (err) {
      console.error('Failed to fetch engineers:', err);
    }
  };

  useEffect(() => {
    fetchJob();
    fetchEngineers();
  }, [params.id]);

  const updateStatus = async (status: string) => {
    setSubmitting('status');
    const res = await fetch(`/api/jobs/${params.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchJob();
    setSubmitting(null);
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setSubmitting('note');
    const res = await fetch(`/api/jobs/${params.id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content: note }),
    });
    if (res.ok) {
      setNote('');
      fetchJob();
    }
    setSubmitting(null);
  };

  const assignEngineer = async (engineerId: string) => {
    setSubmitting('assign');
    const res = await fetch(`/api/jobs/${params.id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ engineerId }),
    });
    if (res.ok) fetchJob();
    setSubmitting(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-[#94A3B8]">
      <Loader2 className="w-8 h-8 animate-spin mr-2" />
      Loading job details...
    </div>
  );

  if (!job) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#94A3B8]">
      <AlertTriangle className="w-12 h-12 mb-4 text-[#EF4444]" />
      Job not found.
    </div>
  );

  const nextStatusOptions = {
    'NEW': { label: 'Assign & Accept', target: 'ASSIGNED', icon: User },
    'ASSIGNED': { label: 'Mark On Route', target: 'ON_ROUTE', icon: Send },
    'ON_ROUTE': { label: 'Arrived On Site', target: 'ON_SITE', icon: MapPin },
    'ON_SITE': { label: 'Mark Completed', target: 'COMPLETED', icon: CheckCircle2 },
    'COMPLETED': { label: 'Create Invoice', target: 'INVOICED', icon: FileText },
  } as any;

  const currentNext = nextStatusOptions[job.status];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Back Link */}
      <Link href="/jobs" className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors text-sm w-fit font-bold uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      <div className="flex gap-6 relative">
        {/* Left Column (65%) */}
        <div className="flex-[0.65] flex flex-col gap-6">
          {/* Header Card */}
          <Card className="bg-[#1E293B] border-[#334155] text-white overflow-hidden shadow-xl">
            <div className="h-1 bg-[#E91E8C]" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[#E91E8C] font-bold text-sm tracking-widest">{job.jobNumber}</span>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={job.priority} />
                <JobStatusBadge status={job.status} />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <h1 className="text-2xl font-bold font-inter leading-tight">{job.title}</h1>
              <div className="flex items-center gap-4 mt-4 text-[#94A3B8] text-xs font-bold uppercase tracking-wider">
                 <span>Created: {format(new Date(job.createdAt), "dd MMM yyyy")}</span>
                 <span>Updated: {format(new Date(job.updatedAt), "dd MMM HH:mm")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Client & Site Info */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-[#1E293B] border-[#334155] text-white">
              <CardHeader className="pb-3 border-b border-[#334155]/50 flex flex-row items-center gap-2">
                <User className="w-4 h-4 text-[#E91E8C]" />
                <CardTitle className="text-sm uppercase tracking-wider font-bold text-[#94A3B8]">Client Info</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="text-[15px] font-bold text-white">{job.client.name}</div>
                <div className="flex items-center gap-2 text-[#94A3B8] text-sm">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{job.client.email}</span>
                </div>
                {job.client.phone && (
                  <div className="flex items-center gap-2 text-[#94A3B8] text-sm">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{job.client.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#1E293B] border-[#334155] text-white">
              <CardHeader className="pb-3 border-b border-[#334155]/50 flex flex-row items-center gap-2">
                <MapPin className="w-4 h-4 text-[#E91E8C]" />
                <CardTitle className="text-sm uppercase tracking-wider font-bold text-[#94A3B8]">Site Location</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="text-[15px] font-bold text-white">{job.site.name}</div>
                <div className="flex items-start gap-2 text-[#94A3B8] text-sm leading-relaxed">
                  <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{job.site.address}</span>
                </div>
                <Link href={`/sites/${job.site.id}`} className="text-[#E91E8C] text-xs font-bold hover:underline flex items-center gap-1 mt-2">
                  View Site Layout <ArrowRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {job.description && (
            <Card className="bg-[#1E293B] border-[#334155] text-white">
              <CardHeader className="pb-3 border-b border-[#334155]/50 flex flex-row items-center gap-2">
                <FileText className="w-4 h-4 text-[#E91E8C]" />
                <CardTitle className="text-sm uppercase tracking-wider font-bold text-[#94A3B8]">Job Description</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-[#F8FAFC]/90 text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {/* SLA & Schedule Grid */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-[#1E293B] border-[#334155] text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <Clock className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">SLA Time Remaining</span>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                 <div className="text-2xl font-bold font-inter">
                   <SLATimer deadline={job.slaDeadline} />
                 </div>
                 <div className="text-[10px] text-[#94A3B8] mt-2 border-t border-[#334155] pt-2">
                    Deadline: {job.slaDeadline ? format(new Date(job.slaDeadline), "dd MMM, HH:mm") : "None set"}
                 </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1E293B] border-[#334155] text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <Wrench className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Assigned Engineer</span>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                {job.engineer ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-[#E91E8C]">
                      <AvatarImage src={job.engineer.avatar} />
                      <AvatarFallback className="bg-[#0D0D0D] text-white font-bold">{job.engineer.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{job.engineer.name}</span>
                      <span className="text-xs text-[#94A3B8] mt-0.5">{job.engineer.phone || "No phone"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[#94A3B8] italic flex items-center gap-2">
                    Not yet assigned
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <div className="mt-4">
            <h3 className="text-lg font-bold text-white mb-6 font-inter flex items-center gap-2">
               <History className="w-5 h-5 text-[#E91E8C]" />
               Job Activity History
            </h3>
            <ActivityTimeline activities={job.activities || []} />
          </div>
        </div>

        {/* Right Column (35%) - Sticky Panel */}
        <div className="flex-[0.35] flex flex-col gap-6 sticky top-6 h-fit max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar pb-10">
          
          {/* Status Actions */}
          <Card className="bg-[#0F172A] border-[#334155] border-t-2 border-t-[#E91E8C] overflow-hidden Magenta-box-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Status Control</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 py-4">
              {currentNext ? (
                <Button 
                  onClick={() => updateStatus(currentNext.target)}
                  disabled={!!submitting}
                  className="w-full bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-11 border-none transition-all Magenta-box-shadow-hover"
                >
                  {submitting === 'status' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <currentNext.icon className="w-4 h-4 mr-2" />}
                  {currentNext.label}
                </Button>
              ) : (
                <div className="text-center py-2 px-4 rounded-lg bg-[rgba(34,197,94,0.1)] text-[#22C55E] text-xs font-bold border border-[#22C55E]/20">
                  JOB FINALIZED
                </div>
              )}
              {job.status !== 'CANCELLED' && (
                <Button 
                   variant="outline" 
                   onClick={() => updateStatus('CANCELLED')}
                   className="w-full border-[#EF4444] text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] h-11 font-bold"
                >
                  Cancel Job
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Assign Engineer */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Assign Engineer</CardTitle>
            </CardHeader>
            <CardContent className="py-4 space-y-4">
              <Select onValueChange={assignEngineer}>
                <SelectTrigger className="bg-[#0D0D0D] border-[#334155] text-white">
                  <SelectValue placeholder="Search engineer..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                  {engineers.map(eng => (
                    <SelectItem key={eng.id} value={eng.id}>{eng.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Change Schedule Component (TBD but outline here) */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Reschedule Job</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
               <div className="flex items-center gap-2 p-3 bg-[#0D0D0D] border border-[#334155] rounded text-white text-[13px] font-medium mb-3">
                  <Calendar className="w-4 h-4 text-[#94A3B8]" />
                  {job.scheduledDate ? format(new Date(job.scheduledDate), "eee, dd MMM HH:mm") : "Unscheduled"}
               </div>
               <Button variant="link" className="text-[#E91E8C] px-0 h-auto font-bold text-xs uppercase tracking-wider">
                  Pick New Time
               </Button>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Ops Notes</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <Textarea 
                placeholder="Add internal note..." 
                className="bg-[#0D0D0D] border-[#334155] text-sm mb-3 min-h-[80px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button 
                onClick={addNote}
                disabled={submitting === 'note' || !note.trim()}
                className="w-full bg-[#111827] border border-[#334155] hover:bg-[#1E293B] text-white text-xs font-bold h-9"
              >
                {submitting === 'note' ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-2" />}
                Add Note
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-transparent border border-[#EF4444]/20 p-2">
            <Button variant="ghost" className="w-full text-[#EF4444] hover:bg-red-500/10 h-10 font-bold uppercase tracking-widest text-[10px]">
              <Trash2 className="w-3 h-3 mr-2" />
              Delete Permanently
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Fixed Lucide import names
import { History, CheckCircle2 } from 'lucide-react';
