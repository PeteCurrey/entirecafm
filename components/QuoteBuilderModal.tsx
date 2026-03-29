'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Calculator, Loader2 } from 'lucide-react';

interface QuoteBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LineItem {
  id: string;
  item: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export default function QuoteBuilderModal({ open, onClose, onSuccess }: QuoteBuilderModalProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', item: '', description: '', qty: 1, unitPrice: 0 }
  ]);

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        setClients(data);
        if (data.length > 0) setClientId(data[0].id);
      })
      .catch(err => console.error(err));
  }, []);

  const addLine = () => {
    setLineItems([
      ...lineItems, 
      { id: Math.random().toString(), item: '', description: '', qty: 1, unitPrice: 0 }
    ]);
  };

  const removeLine = (id: string) => {
    setLineItems(lineItems.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // Calculations
  const subtotal = lineItems.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0);
  const tax = subtotal * 0.20; // 20% VAT
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !title) return alert('Please set client and title.');
    if (lineItems.length === 0) return alert('Please add at least one line item.');

    setLoading(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title,
          lineItems,
          subtotal,
          tax,
          total,
          // Valid for 30 days
          validUntil: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
        })
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
         alert('Failed to formulate quote.');
      }
    } catch (err) {
      alert('Internal network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1E293B] border border-[#334155] text-white p-0 sm:max-w-[800px] overflow-hidden">
        <div className="p-6 border-b border-[#334155] bg-[#0D0D0D]">
          <DialogTitle className="text-xl font-bold font-inter tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#E91E8C]" />
            Quote Builder
          </DialogTitle>
          <p className="text-[#94A3B8] text-sm mt-1">Compile service lines, auto-calculate VAT, and mint proposals.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
             
             {/* Header Info */}
             <div className="grid grid-cols-2 gap-4 bg-[#0D0D0D] p-4 border border-[#334155] rounded-lg">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#E91E8C] uppercase tracking-widest block">Client</label>
                  <select 
                    required value={clientId} onChange={e => setClientId(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] text-white h-10 px-3 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#E91E8C]"
                  >
                    {!clients.length && <option value="">Loading...</option>}
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#E91E8C] uppercase tracking-widest block">Proposal Title</label>
                  <Input 
                    required placeholder="e.g. Q3 HVAC Installation"
                    value={title} onChange={e => setTitle(e.target.value)}
                    className="bg-[#1E293B] border-[#334155] text-white h-10"
                  />
                </div>
             </div>

             {/* Line Items */}
             <div>
               <div className="flex items-center justify-between mb-3 border-b border-[#334155] pb-2">
                 <h4 className="text-sm font-bold uppercase tracking-widest text-[#94A3B8]">Billable Rows</h4>
                 <Button type="button" onClick={addLine} variant="outline" className="h-7 text-xs border-[#E91E8C] text-[#E91E8C] bg-transparent hover:bg-[#E91E8C]/10 px-2 py-0">
                   <Plus className="w-3 h-3 mr-1" /> Add Row
                 </Button>
               </div>
               
               <div className="space-y-3">
                 {lineItems.map((line, idx) => (
                   <div key={line.id} className="grid grid-cols-12 gap-2 items-start bg-[#0D0D0D] p-3 rounded-md border border-[#334155]">
                       <div className="col-span-3">
                         <Input 
                           placeholder="Item name" required value={line.item} onChange={e => updateLine(line.id, 'item', e.target.value)}
                           className="bg-[#1E293B] border-[#334155] text-white text-xs h-9"
                         />
                       </div>
                       <div className="col-span-4">
                         <Textarea 
                           placeholder="Details..." value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)}
                           className="bg-[#1E293B] border-[#334155] text-white text-xs h-9 min-h-[36px] py-2 custom-scrollbar"
                         />
                       </div>
                       <div className="col-span-2">
                         <Input 
                           type="number" min="1" required placeholder="Qty" value={line.qty} onChange={e => updateLine(line.id, 'qty', parseInt(e.target.value) || 1)}
                           className="bg-[#1E293B] border-[#334155] text-white text-xs h-9"
                         />
                       </div>
                       <div className="col-span-2">
                         <Input 
                           type="number" step="0.01" min="0" required placeholder="Price" value={line.unitPrice === 0 ? '' : line.unitPrice} onChange={e => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                           className="bg-[#1E293B] border-[#334155] text-white text-xs h-9"
                         />
                       </div>
                       <div className="col-span-1 flex items-center justify-center pt-1.5">
                         <button type="button" onClick={() => removeLine(line.id)} className="text-[#EF4444] hover:text-[#B91C1C] transition-colors rounded">
                           <Trash2 className="w-5 h-5" />
                         </button>
                       </div>
                   </div>
                 ))}
                 {lineItems.length === 0 && (
                   <div className="text-center py-6 text-xs text-[#94A3B8] italic border border-dashed border-[#334155] rounded">
                     No rows added. Quote must have at least one billable row.
                   </div>
                 )}
               </div>
             </div>
          </div>

          <div className="bg-[#111827] border-t border-[#334155] p-6 shrink-0 flex items-center justify-between">
            {/* Totals Box */}
            <div className="flex items-center gap-6">
               <div className="flex flex-col text-right">
                 <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest">Subtotal</span>
                 <span className="text-sm font-medium">£{subtotal.toFixed(2)}</span>
               </div>
               <div className="flex flex-col text-right">
                 <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest">VAT (20%)</span>
                 <span className="text-sm font-medium text-[#F59E0B]">£{tax.toFixed(2)}</span>
               </div>
               <div className="flex flex-col text-right pl-6 border-l border-[#334155]">
                 <span className="text-[11px] text-[#E91E8C] uppercase font-bold tracking-widest">Gross Total</span>
                 <span className="text-xl font-bold font-mono tracking-tight text-white">£{total.toFixed(2)}</span>
               </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-[#334155] text-[#94A3B8] bg-transparent hover:bg-[#334155] hover:text-white">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || lineItems.length === 0} className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold Magenta-box-shadow">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save & Mint Quote
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
