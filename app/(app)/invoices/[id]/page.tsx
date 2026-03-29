'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, ArrowLeft, Loader2, Download, Send, CheckCircle, Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${params.id}`);
      if (res.ok) setInvoice(await res.json());
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const handleAction = async (status: string) => {
    if (!confirm(`Are you sure you want to transition this invoice to ${status}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchInvoice();
    } finally {
      setActionLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(233, 30, 140); // #E91E8C
    doc.text('EntireCAFM.', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('EntireFM Operations Hub', 14, 28);
    doc.text('123 Corporate Avenue', 14, 33);
    doc.text('London, EC1A 1BB', 14, 38);
    
    // Invoice Meta
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('TAX INVOICE', 140, 20);
    
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 140, 28);
    doc.text(`Date of Issue: ${format(new Date(invoice.createdAt), 'dd MMM yyyy')}`, 140, 33);
    doc.text(`Payment Due: ${invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : 'Immediate'}`, 140, 38);

    // Bill To
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Bill To:', 14, 55);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(invoice.client.name, 14, 62);
    if (invoice.client.address) {
       doc.text(invoice.client.address, 14, 67);
    }

    // Line Items
    const tableBody = invoice.lineItems.map((item: any) => [
      item.description,
      item.quantity,
      `£${parseFloat(item.unitPrice).toFixed(2)}`,
      `£${parseFloat(item.total).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Qty', 'Unit Price', 'Line Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [233, 30, 140] },
      styles: { fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Totals
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text('Subtotal:', 140, finalY);
    doc.text(`£${parseFloat(invoice.subtotal).toFixed(2)}`, 180, finalY, { align: 'right' });
    
    doc.text('VAT @ 20%:', 140, finalY + 7);
    doc.text(`£${parseFloat(invoice.tax).toFixed(2)}`, 180, finalY + 7, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(233, 30, 140);
    doc.text('Total Due:', 140, finalY + 17);
    doc.text(`£${parseFloat(invoice.total).toFixed(2)}`, 180, finalY + 17, { align: 'right' });

    if (invoice.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Notes:', 14, finalY + 30);
      doc.text(invoice.notes, 14, finalY + 35, { maxWidth: 100 });
    }

    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  const getStatusColor = (status: string) => {
     switch (status) {
       case 'PAID': return 'bg-[#22C55E]/10 flex text-[#22C55E]';
       case 'SENT': return 'bg-[#3B82F6]/10 flex text-[#3B82F6]';
       case 'DRAFT': return 'bg-[#334155] flex text-[#94A3B8]';
       case 'OVERDUE': return 'bg-[#EF4444]/10 flex text-[#EF4444] animate-pulse';
       case 'CANCELLED': return 'bg-[#1E293B] flex text-[#475569] line-through';
       default: return 'bg-[#334155] flex text-white';
     }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-[#94A3B8]">
      <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Rendering Financial Document...
    </div>
  );

  if (!invoice) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#94A3B8]">
      <FileText className="w-12 h-12 text-[#334155] mb-4" />
      <div>Invoice record corrupted or voided.</div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500 max-w-[1200px] mx-auto items-start">
      
      {/* Visual Doc Preview */}
      <div className="flex-1 w-full flex flex-col gap-4">
         <Link href="/invoices" className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors text-sm w-fit font-bold uppercase tracking-wider mb-2">
           <ArrowLeft className="w-4 h-4" /> Back to Ledger
         </Link>
         
         {/* Paper Replica */}
         <div className="bg-white rounded-md p-10 shadow-xl overflow-x-auto min-h-[800px] relative">
            <Badge className={cn("absolute top-8 right-8 border-none px-4 py-1 rounded-sm font-black uppercase tracking-[0.2em] text-[16px]", getStatusColor(invoice.status))}>
               {invoice.status}
            </Badge>

            <h1 className="text-4xl font-extrabold text-[#E91E8C] tracking-tight mb-1">EntireCAFM.</h1>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-10">Bespoke Operations Hub</p>
            
            <div className="grid grid-cols-2 gap-10 mb-12">
               <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Bill To</h3>
                  <p className="text-lg font-bold text-slate-800">{invoice.client.name}</p>
                  <p className="text-sm text-slate-500 whitespace-pre-wrap">{invoice.client.address || 'Address Unknown'}</p>
               </div>
               <div className="text-right">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Invoice Demographics</h3>
                  <p className="text-sm font-bold text-slate-800"><span className="text-gray-400 mr-2">Number:</span> {invoice.invoiceNumber}</p>
                  <p className="text-sm font-bold text-slate-800"><span className="text-gray-400 mr-2">Issue Date:</span> {format(new Date(invoice.createdAt), 'dd MMM yyyy')}</p>
                  <p className="text-sm font-bold text-slate-800"><span className="text-gray-400 mr-2">Payment Due:</span> {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : 'Immediate'}</p>
               </div>
            </div>

            <table className="w-full text-left border-collapse mb-10">
               <thead>
                  <tr className="border-b-2 border-slate-200">
                     <th className="py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-1/2">Line Item Description</th>
                     <th className="py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Qty</th>
                     <th className="py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Unit Price</th>
                     <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-800 text-right">Total</th>
                  </tr>
               </thead>
               <tbody className="border-b border-slate-200">
                  {invoice.lineItems.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                       <td className="py-4 text-sm font-semibold text-slate-700">{item.description}</td>
                       <td className="py-4 text-sm text-slate-500 text-right">{item.quantity}</td>
                       <td className="py-4 text-sm text-slate-500 text-right block font-mono mt-1 w-full text-right h-full">£{parseFloat(item.unitPrice).toLocaleString('en-GB', {minimumFractionDigits: 2})}</td>
                       <td className="py-4 text-sm font-bold text-slate-800 text-right font-mono">£{parseFloat(item.total).toLocaleString('en-GB', {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))}
               </tbody>
            </table>

            <div className="flex justify-between items-start">
               <div className="w-1/2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Terms & Notes</h3>
                  <p className="text-xs text-slate-500 leading-relaxed pr-10">{invoice.notes || 'Payment strictly due via BACS transfer to the account details provided on your Master Services Agreement.'}</p>
               </div>
               <div className="w-64">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
                     <span className="text-sm font-bold text-slate-800 font-mono">£{parseFloat(invoice.subtotal).toLocaleString('en-GB', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">VAT (20%)</span>
                     <span className="text-sm font-bold text-slate-800 font-mono">£{parseFloat(invoice.tax).toLocaleString('en-GB', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between py-3">
                     <span className="text-sm font-black text-[#E91E8C] uppercase tracking-widest mt-1">Gross Total</span>
                     <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">£{parseFloat(invoice.total).toLocaleString('en-GB', {minimumFractionDigits: 2})}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Control Panel */}
      <div className="w-full lg:w-72 bg-[#111827] border border-[#334155] rounded-xl p-6 flex flex-col gap-4 sticky top-6 shrink-0">
         <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 border-b border-[#334155] pb-3">Financial Operations</h3>
         
         <Button 
            onClick={() => handleAction('SENT')} 
            disabled={invoice.status !== 'DRAFT' || actionLoading} 
            className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold h-10 shadow-lg"
         >
            <Send className="w-4 h-4 mr-2" /> Issue to Client
         </Button>
         
         <Button 
            onClick={() => handleAction('PAID')} 
            disabled={invoice.status === 'PAID' || invoice.status === 'CANCELLED' || actionLoading} 
            className="w-full bg-[#22C55E] hover:bg-green-600 text-white font-bold h-10 shadow-lg"
         >
            <CheckCircle className="w-4 h-4 mr-2" /> Mark Liquidity Collected
         </Button>
         
         <Button 
            onClick={generatePDF} 
            variant="outline" 
            className="w-full border-[#E91E8C] text-[#E91E8C] hover:bg-[#E91E8C]/10 font-bold h-10"
         >
            <Download className="w-4 h-4 mr-2" /> Mint PDF Copy
         </Button>

         <div className="h-px bg-[#334155] my-2" />

         <Button 
            onClick={() => handleAction('CANCELLED')} 
            disabled={invoice.status === 'CANCELLED' || actionLoading} 
            variant="ghost" 
            className="w-full text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444] font-bold h-10"
         >
            <Ban className="w-4 h-4 mr-2" /> Write Off / Void Doc
         </Button>
      </div>
    </div>
  );
}
