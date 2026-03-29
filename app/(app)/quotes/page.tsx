'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Loader2, Download, Eye, FileSignature 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QuoteBuilderModal from '@/components/QuoteBuilderModal';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/quotes');
      if (res.ok) setQuotes(await res.json());
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const generatePDF = (quote: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(30, 41, 59); // CAFM Brand Header Dark
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(233, 30, 140); // CAFM Pink
    doc.text("ENTIRE", 15, 25);
    doc.setTextColor(255, 255, 255);
    doc.text("CAFM", 45, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // Align right
    doc.text(`QUOTE NO: ${quote.quoteNumber}`, 195, 20, { align: 'right' });
    doc.text(`DATE: ${format(new Date(quote.createdAt), "dd MMM yyyy")}`, 195, 25, { align: 'right' });
    
    doc.setTextColor(0, 0, 0);
    // Bill to
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Prepared For:", 15, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.client?.name || "Client Name", 15, 67);
    doc.text(`Site Reference: ${quote.siteId}`, 15, 74);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Proposal: ${quote.title}`, 15, 95);

    // Table
    const tableData = (quote.lineItems || []).map((item: any) => [
      item.item, 
      item.description, 
      item.qty.toString(), 
      `£${item.unitPrice.toFixed(2)}`, 
      `£${(item.qty * item.unitPrice).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 105,
      head: [['Item', 'Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text("Totals", 140, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal:`, 140, finalY + 8);
    doc.text(`£${quote.subtotal.toFixed(2)}`, 195, finalY + 8, { align: 'right' });

    doc.text(`VAT (20%):`, 140, finalY + 16);
    doc.text(`£${quote.tax.toFixed(2)}`, 195, finalY + 16, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Total (gross):`, 140, finalY + 26);
    doc.setTextColor(233, 30, 140);
    doc.text(`£${quote.total.toFixed(2)}`, 195, finalY + 26, { align: 'right' });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Valid for 30 days. Contact accounts@entirefm.com for support.", 105, 280, { align: 'center' });

    doc.save(`${quote.quoteNumber}_Proposal.pdf`);
  };

  const filteredQuotes = quotes.filter(q => 
    q.quoteNumber.toLowerCase().includes(search.toLowerCase()) || 
    q.title?.toLowerCase().includes(search.toLowerCase()) ||
    q.client?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-[#E91E8C]" /> Commercial Quotes
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Build and dispatch line-item accurate proposals to clients.
          </p>
        </div>
        <Button onClick={() => setBuilderOpen(true)} className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Create New Quote
        </Button>
      </div>

      <div className="flex bg-[#1E293B] p-4 rounded-lg border border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input 
            placeholder="Search quote number, client, title..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0D0D0D] border-[#334155] text-white h-10 w-full"
          />
        </div>
      </div>

      <div className="relative rounded-md border border-[#334155] bg-[#1E293B] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-[#0D0D0D]/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" />
          </div>
        )}
        <Table>
          <TableHeader className="bg-[#111827]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Quote #</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Client</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Title</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Value (Gross)</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Status</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Generated</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 text-right pr-6">Export</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotes.length > 0 ? (
              filteredQuotes.map((q) => (
                <TableRow key={q.id} className="border-b border-[#334155] hover:bg-[#334155]/20">
                  <TableCell className="py-4">
                    <span className="text-[#E91E8C] font-mono text-[11px] font-bold tracking-widest bg-[#E91E8C]/10 px-2 py-1 rounded">
                      {q.quoteNumber}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 font-bold text-[13px] text-white">
                     {q.client?.name}
                  </TableCell>
                  <TableCell className="py-4 font-medium text-[13px] text-white">
                    {q.title}
                  </TableCell>
                  <TableCell className="py-4 font-bold text-[13px] text-emerald-400">
                    £{q.total?.toFixed(2)}
                  </TableCell>
                  <TableCell className="py-4">
                     <Badge className={cn("border-none px-2.5 py-0.5 rounded-sm font-bold uppercase tracking-widest text-[10px]", 
                        q.status === 'Draft' ? "bg-[#334155] text-white" : 
                        q.status === 'Accepted' ? "bg-[#22C55E] text-white" : "bg-[#EF4444] text-white"
                     )}>
                       {q.status}
                     </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-xs font-medium text-[#94A3B8]">
                    {format(new Date(q.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="py-4 text-right pr-6">
                    <Button 
                      variant="outline" 
                      onClick={() => generatePDF(q)}
                      className="border-[#334155] text-[#94A3B8] hover:text-white bg-transparent h-8 text-[11px] font-bold uppercase tracking-wider px-3 mr-2"
                    >
                       <Download className="w-3 h-3 mr-1" /> PDF
                    </Button>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-[11px] font-bold uppercase tracking-wider px-3 border-none"
                    >
                       <Eye className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-[#94A3B8]">
                  <p>No quotes generated yet.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {builderOpen && (
        <QuoteBuilderModal 
           open={builderOpen} 
           onClose={() => setBuilderOpen(false)} 
           onSuccess={fetchQuotes} 
        />
      )}
    </div>
  );
}
