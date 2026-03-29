'use client';

import { useState, useEffect } from 'react';
import { Shield, Paperclip, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PublicRequestPortal() {
  const [sites, setSites] = useState<{ id: string, name: string, client: { id: string, name: string } }[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    siteId: '',
    name: '',
    email: '',
    phone: '',
    reference: '',
    title: '',
    description: '',
    urgency: 'MEDIUM'
  });

  useEffect(() => {
    // Fetch generic sites for the public portal
    // Due to unauthenticated state, this API must bypass RLS - we will hit /api/public/sites
    fetch('/api/public/sites')
      .then(res => res.json())
      .then(data => setSites(data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/public/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        alert('Failed to submit request. Please try again.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1E293B] rounded-2xl p-8 border border-[#334155] text-center shadow-2xl animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle2 className="w-10 h-10 text-emerald-500" />
           </div>
           <h2 className="text-2xl font-bold text-white mb-2 font-inter tracking-tight">Request Received</h2>
           <p className="text-[#94A3B8] leading-relaxed mb-8">
             Your maintenance request has been lodged successfully. Our helpdesk team will review the issue and contact you shortly.
           </p>
           <Button className="w-full bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-12" onClick={() => window.location.reload()}>
             Submit Another Request
           </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center py-12 px-4 selection:bg-[#E91E8C] selection:text-white overflow-x-hidden">
      
      {/* Brand Header */}
      <div className="text-center mb-10 w-full animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 flex flex-col items-center justify-center">
          <span className="flex items-center gap-2">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-[#E91E8C]" />
            <span className="text-[#E91E8C]">ENTIRE</span>
            <span className="text-white">CAFM</span>
          </span>
        </h1>
        <p className="text-[#94A3B8] font-medium tracking-widest uppercase text-[11px] sm:text-xs">
          Maintenance Request Portal
        </p>
      </div>

      <div className="max-w-2xl w-full bg-[#1E293B] rounded-2xl border border-[#334155] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-[#111827] px-6 py-4 border-b border-[#334155] flex items-center justify-between">
          <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#94A3B8] font-bold text-lg tracking-tight">
            Log New Issue
          </h2>
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest border border-[#334155] px-2 py-0.5 rounded bg-[#0D0D0D]">
            SECURE PORTAL
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#E91E8C] uppercase tracking-widest block">Your Name *</label>
              <Input 
                required
                placeholder="John Doe" 
                className="bg-[#0D0D0D] border-[#334155] text-white h-11 focus-visible:ring-[#E91E8C] focus-visible:border-[#E91E8C] transition-colors"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#E91E8C] uppercase tracking-widest block">Email Address *</label>
              <Input 
                required type="email"
                placeholder="john@example.com" 
                className="bg-[#0D0D0D] border-[#334155] text-white h-11 focus-visible:ring-[#E91E8C] focus-visible:border-[#E91E8C]"
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest block">Phone Number</label>
                <Input 
                  placeholder="+44 7000 000000" 
                  className="bg-[#0D0D0D] border-[#334155] text-white h-11 focus-visible:ring-[#E91E8C] focus-visible:border-[#E91E8C]"
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest block">Client Reference / PO</label>
                <Input 
                  placeholder="Optional PO number" 
                  className="bg-[#0D0D0D] border-[#334155] text-white h-11 focus-visible:ring-[#E91E8C] focus-visible:border-[#E91E8C]"
                  value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})}
                />
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-[11px] font-bold text-[#E91E8C] uppercase tracking-widest block">Location / Site *</label>
             <Select required value={formData.siteId} onValueChange={v => setFormData({...formData, siteId: v})}>
               <SelectTrigger className="w-full bg-[#0D0D0D] border-[#334155] text-white h-11 focus:ring-[#E91E8C]">
                 <SelectValue placeholder="Select the affected site" />
               </SelectTrigger>
               <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                 {sites.length === 0 && <SelectItem value="untracked" disabled>Loading sites...</SelectItem>}
                 {sites.map(s => (
                   <SelectItem key={s.id} value={s.id}>{s.name} ({s.client.name})</SelectItem>
                 ))}
                 <SelectItem value="OTHER">Other / Unknown Site</SelectItem>
               </SelectContent>
             </Select>
          </div>

          <div className="pt-4 border-t border-[#334155]">
            <div className="space-y-2 mb-6">
              <label className="text-[11px] font-bold text-[#E91E8C] uppercase tracking-widest block">Issue Title *</label>
              <Input 
                required
                placeholder="e.g. Broken window in main lobby" 
                className="bg-[#0D0D0D] border-[#334155] text-white h-11 focus-visible:ring-[#E91E8C] focus-visible:border-[#E91E8C]"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-[11px] font-bold text-[#E91E8C] uppercase tracking-widest block">Urgency *</label>
              <Select required value={formData.urgency} onValueChange={v => setFormData({...formData, urgency: v})}>
                <SelectTrigger className="w-full bg-[#0D0D0D] border-[#334155] text-white h-11 focus:ring-[#E91E8C]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                  <SelectItem value="LOW">Low - Routine Issue (5 Days)</SelectItem>
                  <SelectItem value="MEDIUM">Medium - Normal Attention (48 Hours)</SelectItem>
                  <SelectItem value="HIGH">High - Urgent Action (24 Hours)</SelectItem>
                  <SelectItem value="CRITICAL">Critical - Emergency / Safety Risk (4 Hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#E91E8C] uppercase tracking-widest block">Detailed Description *</label>
              <Textarea 
                required
                placeholder="Please describe the issue in as much detail as possible to help our engineers prepare..." 
                className="bg-[#0D0D0D] border-[#334155] text-white min-h-[120px] focus-visible:ring-[#E91E8C] focus-visible:border-[#E91E8C] custom-scrollbar"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#334155]">
            <div className="w-full sm:w-auto">
              <input type="file" id="portal-upload" className="hidden" />
              <Button type="button" variant="outline" className="w-full sm:w-auto bg-[#0D0D0D] border-[#334155] text-[#94A3B8] hover:text-white hover:bg-[#334155] h-12" onClick={() => document.getElementById('portal-upload')?.click()}>
                <Paperclip className="w-4 h-4 mr-2" /> Attach Photo (Optional)
              </Button>
            </div>
            
            <Button type="submit" disabled={loading} className="w-full sm:w-auto min-w-[180px] bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-12 Magenta-box-shadow transition-all group">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Submit Request <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[#475569] text-xs">
          Powered by EntireCAFM © {new Date().getFullYear()} Entire Facilities Management
        </p>
      </div>
    </div>
  );
}
