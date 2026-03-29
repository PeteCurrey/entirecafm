'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Navigation, CheckCircle, Mic, MicOff, Camera, QrCode, ChevronDown, ChevronUp, Loader2, Clock } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_TRANSITIONS: Record<string, { next: string; label: string; colour: string }[]> = {
  ASSIGNED:  [{ next: 'ON_ROUTE', label: "I'm On My Way", colour: 'bg-[#9333EA]' }],
  ON_ROUTE:  [{ next: 'ON_SITE', label: 'Arrived On Site', colour: 'bg-[#E91E8C]' }],
  ON_SITE:   [{ next: 'COMPLETED', label: 'Job Complete', colour: 'bg-[#22C55E]' }],
};

const PRIORITY_COLOUR: Record<string, string> = { LOW: 'bg-[#3B82F6]/20 text-[#3B82F6]', MEDIUM: 'bg-[#F59E0B]/20 text-[#F59E0B]', HIGH: 'bg-[#F97316]/20 text-[#F97316]', CRITICAL: 'bg-[#EF4444]/20 text-[#EF4444]' };

function queueOrFetch(url: string, method: string, body: object) {
  if (!navigator.onLine) {
    const q = JSON.parse(localStorage.getItem('cafm_offline_queue') || '[]');
    q.push({ url, method, body });
    localStorage.setItem('cafm_offline_queue', JSON.stringify(q));
    return null;
  }
  return fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export default function MobileJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [transitioningTo, setTransitioningTo] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setJob(d); })
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    setTransitioningTo(newStatus);
    const res = queueOrFetch('/api/mobile/jobs', 'PATCH', { jobId: id, status: newStatus });
    if (res) await res;
    setJob((j: any) => ({ ...j, status: newStatus }));
    setTransitioningTo(null);
    if (newStatus === 'COMPLETED') router.push('/mobile');
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    queueOrFetch('/api/mobile/jobs', 'PATCH', { jobId: id, note: `${new Date().toLocaleString()}: ${note}` });
    setNote('');
    setSavingNote(false);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert('Speech recognition not supported in this browser');
    const rec = new SR(); rec.continuous = false; rec.interimResults = false; rec.lang = 'en-GB';
    rec.onresult = (e: any) => setNote(n => n + e.results[0][0].transcript + ' ');
    rec.onend = () => setListening(false);
    rec.start(); recognitionRef.current = rec; setListening(true);
  };

  const stopVoice = () => { recognitionRef.current?.stop(); setListening(false); };

  const capturePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotos(p => [...p, url]);
    // In production: upload to Supabase Storage
  };

  const startQRScan = async () => {
    setQrScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      const { default: jsQR } = await import('jsqr');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const scan = () => {
        if (!qrScanning || !videoRef.current || !ctx) return;
        canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, canvas.width, canvas.height);
        if (code) {
          stream.getTracks().forEach(t => t.stop());
          setQrScanning(false);
          router.push(`/mobile/assets/${encodeURIComponent(code.data)}`);
        } else { requestAnimationFrame(scan); }
      };
      if (videoRef.current) {
        videoRef.current.addEventListener('loadeddata', scan);
      }
    } catch { setQrScanning(false); alert('Camera access denied'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" /></div>;
  if (!job) return <div className="p-6 text-center text-[#94A3B8]">Job not found.</div>;

  const transitions = STATUS_TRANSITIONS[job.status] || [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* QR Scanner overlay */}
      {qrScanning && (
        <div className="fixed inset-0 z-50 bg-[#0D0D0D] flex flex-col items-center justify-center">
          <video ref={videoRef} className="w-full max-w-sm rounded-xl" />
          <button onClick={() => setQrScanning(false)} className="mt-6 text-white font-bold bg-[#334155] px-6 py-3 rounded-xl">Cancel Scan</button>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-[#111827] border-b border-[#334155] px-4 py-3 flex items-center gap-3 z-10">
        <Link href="/mobile/jobs" className="text-[#94A3B8] active:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <p className="text-[10px] text-[#E91E8C] font-bold uppercase tracking-widest">{job.jobNumber}</p>
          <h1 className="text-base font-black text-white leading-tight truncate">{job.title}</h1>
        </div>
        <div className="flex gap-2">
          <Badge className={cn("border-none text-[10px] font-bold uppercase", PRIORITY_COLOUR[job.priority])}>{job.priority}</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 pb-6">
        {/* Client & Site */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mb-2">Location</p>
          <p className="text-white font-bold">{job.client?.name}</p>
          <p className="text-[#94A3B8] text-sm">{job.site?.name}</p>
          <p className="text-[#94A3B8] text-sm">{job.site?.address}, {job.site?.postcode}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.site?.address} ${job.site?.postcode}`)}`}
            target="_blank" rel="noreferrer"
            className="mt-3 flex items-center gap-2 bg-[#1E3A5F] active:bg-[#1E40AF] text-white text-sm font-bold py-2.5 px-4 rounded-lg w-fit transition-colors"
          >
            <Navigation className="w-4 h-4" /> Navigate
          </a>
        </div>

        {/* Status Actions */}
        {transitions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest">Status Actions</p>
            {transitions.map(t => (
              <button key={t.next} onClick={() => updateStatus(t.next)} disabled={!!transitioningTo}
                className={cn("w-full flex items-center justify-center gap-2 text-white font-black py-4 rounded-xl transition-colors text-base", t.colour, transitioningTo === t.next ? 'opacity-60' : '')}
              >
                {transitioningTo === t.next ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {t.label}
              </button>
            ))}
            {job.status === 'ON_SITE' && (
              <button onClick={() => setShowDetails(true)} className="w-full flex items-center justify-center gap-2 bg-[#334155] text-white font-bold py-4 rounded-xl text-sm">
                Report Issue
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mb-3">Add Note</p>
          <div className="relative">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full bg-[#111827] border border-[#334155] text-white rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-[#E91E8C] pr-10"
            />
            <button onClick={listening ? stopVoice : startVoice} className={cn("absolute right-3 top-3", listening ? 'text-[#EF4444] animate-pulse' : 'text-[#94A3B8]')}>
              {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          <button onClick={saveNote} disabled={!note.trim() || savingNote} className="mt-2 w-full bg-[#E91E8C] disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm">
            {savingNote ? 'Saving...' : 'Save Note'}
          </button>
        </div>

        {/* Photo Upload */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mb-3">Photos</p>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((p, i) => <img key={i} src={p} className="w-full aspect-square object-cover rounded-lg" alt={`Photo ${i + 1}`} />)}
            </div>
          )}
          <label className="flex items-center justify-center gap-2 bg-[#334155] active:bg-[#475569] text-white font-bold py-3 rounded-xl cursor-pointer transition-colors text-sm">
            <Camera className="w-4 h-4" /> Add Photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={capturePhoto} />
          </label>
        </div>

        {/* QR Scanner */}
        <button onClick={startQRScan} className="flex items-center justify-center gap-2 bg-[#1E293B] border border-[#334155] active:bg-[#334155] text-white font-bold py-3.5 rounded-xl text-sm transition-colors">
          <QrCode className="w-4 h-4 text-[#E91E8C]" /> Scan Asset QR Code
        </button>

        {/* Job Details (collapsible) */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          <button onClick={() => setShowDetails(v => !v)} className="w-full flex items-center justify-between p-4 text-sm font-bold text-white">
            Job Details {showDetails ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" /> : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
          </button>
          {showDetails && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#334155]">
              {job.description && (
                <div className="pt-3">
                  <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mb-1">Description</p>
                  <p className="text-[#E2E8F0] text-sm leading-relaxed">{job.description}</p>
                </div>
              )}
              {job.slaDeadline && (
                <div>
                  <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mb-1">SLA Deadline</p>
                  <p className="text-white text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#F59E0B]" />
                    {format(new Date(job.slaDeadline), 'dd MMM yyyy HH:mm')}
                    <span className={cn("text-xs", new Date(job.slaDeadline) < new Date() ? 'text-[#EF4444]' : 'text-[#22C55E]')}>
                      ({formatDistanceToNow(new Date(job.slaDeadline), { addSuffix: true })})
                    </span>
                  </p>
                </div>
              )}
              {job.scheduledDate && (
                <div>
                  <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mb-1">Scheduled</p>
                  <p className="text-white text-sm">{format(new Date(job.scheduledDate), 'dd MMM yyyy HH:mm')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
