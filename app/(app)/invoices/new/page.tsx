'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PoundSterling, ArrowLeft, Loader2, Plus, Trash2, Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [linkedJobs, setLinkedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [includeVat, setIncludeVat] = useState(true);
  
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [attachedJobIds, setAttachedJobIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/clients').then(r => r.ok && r.json()).then(data => {
      setClients(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!clientId) {
      setLinkedJobs([]);
      return;
    }
    fetch(`/api/jobs?clientId=${clientId}&status=COMPLETED`)
      .then(r => r.ok && r.json())
      .then(data => {
         const uninvoiced = data.filter((d: any) => !d.invoiceId);
         setLinkedJobs(uninvoiced);
      });
  }, [clientId]);

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const newItems = [...lineItems];
    const item = { ...newItems[index], [field]: value };
    
    // Auto calculate if numeric fields change
    item.quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity;
    item.unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice;
    item.total = item.quantity * item.unitPrice;
    
    newItems[index] = item;
    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const toggleLinkedJob = (job: any) => {
     if (attachedJobIds.includes(job.id)) {
        setAttachedJobIds(attachedJobIds.filter(id => id !== job.id));
        setLineItems(lineItems.filter(li => !li.description.startsWith(`[JOB: ${job.jobNumber}]`)));
     } else {
        setAttachedJobIds([...attachedJobIds, job.id]);
        setLineItems([...lineItems, { 
           description: `[JOB: ${job.jobNumber}] ${job.title}`, 
           quantity: 1, 
           unitPrice: 0, 
           total: 0 
        }]);
     }
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = includeVat ? subtotal * 0.2 : 0;
  const total = subtotal + tax;

  const handleSubmit = async () => {
    if (!clientId) return alert('Select a commercial client entity.');
    
    setSaving(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dueDate: dueDate || undefined,
          notes,
          lineItems,
          subtotal,
          tax,
          total,
          linkedJobs: attachedJobIds
        })
      });
      if (res.ok) {
        const payload = await res.json();
        router.push(`/invoices/${payload.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-[#94A3B8]">
      <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Provisioning Commercial Data...
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto pb-20">
      <Link href="/invoices" className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors text-sm w-fit font-bold uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4" /> Cancel Generator
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <PoundSterling className="w-6 h-6 text-[#E91E8C]" /> Issue Draft Invoice
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Build financial transaction payload mappings for deployed operatives and completed tickets.
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={saving || lineItems.length === 0 || !clientId} className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold shadow-lg min-w-[150px]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Map Transaction Payload'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Left Col: Setup & Links */}
         <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="bg-[#111827] border border-[#334155] p-5 rounded-xl">
               <h3 className="text-xs font-bold text-[#E91E8C] uppercase tracking-widest mb-4">Financial Header</h3>
               
               <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1 block">Commercial Client</label>
                    <select 
                       className="w-full bg-[#1E293B] border border-[#334155] rounded-md text-white px-3 py-2 text-sm focus:outline-none focus:border-[#E91E8C]"
                       value={clientId}
                       onChange={(e) => setClientId(e.target.value)}
                    >
                       <option value="">-- Attach Client Protocol --</option>
                       {clients.map(c => (
                         <option key={c.id} value={c.id}>{c.name}</option>
                       ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1 block">Due Date Deadline</label>
                    <Input 
                      type="date" 
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-[#1E293B] border-[#334155] text-white" 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-[#334155] rounded-md bg-[#1E293B]">
                     <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-white">Compound 20% VAT</span>
                     <input 
                        type="checkbox" 
                        checked={includeVat} 
                        onChange={(e) => setIncludeVat(e.target.checked)}
                        className="w-5 h-5 accent-[#E91E8C]"
                     />
                  </div>
               </div>
            </div>

            {clientId && linkedJobs.length > 0 && (
              <div className="bg-[#1E293B] border border-[#3B82F6]/50 p-5 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                 <h3 className="text-xs font-bold text-[#3B82F6] uppercase tracking-widest mb-4 flex items-center gap-2">
                   <LinkIcon className="w-4 h-4" /> Link Cleared Tickets
                 </h3>
                 <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {linkedJobs.map((job: any) => (
                       <div key={job.id} onClick={() => toggleLinkedJob(job)} className={cn("cursor-pointer border rounded-md p-3 transition-colors", attachedJobIds.includes(job.id) ? "border-[#3B82F6] bg-[#3B82F6]/10" : "border-[#334155] bg-[#0D0D0D] hover:border-[#94A3B8]")}>
                          <div className="flex justify-between items-start mb-1">
                             <span className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-widest">{job.jobNumber}</span>
                             <input type="checkbox" checked={attachedJobIds.includes(job.id)} readOnly className="accent-[#3B82F6]" />
                          </div>
                          <p className="text-xs text-white font-bold leading-tight">{job.title}</p>
                       </div>
                    ))}
                 </div>
              </div>
            )}
         </div>

         {/* Right Col: Builder */}
         <div className="lg:col-span-2 bg-[#111827] border border-[#334155] p-6 rounded-xl relative">
            <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-6">Line Item Pipeline Array</h3>
            
            <div className="space-y-4 mb-6">
               {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-4 items-start bg-[#1E293B] p-2 rounded-md border border-[#334155]">
                     <div className="flex-1">
                        <Input 
                           placeholder="Describe commercial logic line item..." 
                           value={item.description}
                           onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                           className="bg-[#0D0D0D] border-[#334155] text-white" 
                        />
                     </div>
                     <div className="w-24">
                        <Input 
                           type="number" 
                           placeholder="Qty" 
                           value={item.quantity}
                           onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                           className="bg-[#0D0D0D] border-[#334155] text-white font-mono" 
                        />
                     </div>
                     <div className="w-32 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">£</span>
                        <Input 
                           type="number" 
                           placeholder="Price" 
                           value={item.unitPrice}
                           onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                           className="bg-[#0D0D0D] border-[#334155] text-white pl-8 font-mono" 
                        />
                     </div>
                     <div className="w-24 px-2 py-2 text-right">
                        <span className="text-white font-mono font-bold">£{item.total.toLocaleString('en-GB', {minimumFractionDigits: 2})}</span>
                     </div>
                     <Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} className="text-[#EF4444] hover:bg-[#EF4444]/10 shrink-0">
                        <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
               ))}

               <Button onClick={addLineItem} variant="outline" className="w-full border-dashed border-[#334155] text-[#94A3B8] hover:text-white hover:border-[#94A3B8] bg-transparent">
                  <Plus className="w-4 h-4 mr-2" /> Inject Grid Row
               </Button>
            </div>
            
            <Textarea 
               placeholder="Payment terms, PO references..."
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="bg-[#1E293B] border-[#334155] text-white min-h-[100px] mb-8"
            />

            <div className="border-t border-[#334155] pt-6 flex justify-end">
               <div className="w-72 bg-[#1E293B] p-4 rounded-lg border border-[#334155]">
                  <div className="flex justify-between py-2 border-b border-[#334155]/50">
                     <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Calculated Net</span>
                     <span className="text-sm font-bold text-white font-mono">£{subtotal.toLocaleString('en-GB', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#334155]">
                     <span className="text-[11px] font-bold text-[#E91E8C] uppercase tracking-widest">VAT Burden</span>
                     <span className="text-sm font-bold text-[#E91E8C] font-mono">£{tax.toLocaleString('en-GB', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between py-3 pt-4">
                     <span className="text-[14px] font-black text-white uppercase tracking-widest">Gross Target</span>
                     <span className="text-xl font-black text-white font-mono tracking-tight">£{total.toLocaleString('en-GB', {minimumFractionDigits: 2})}</span>
                  </div>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
}
