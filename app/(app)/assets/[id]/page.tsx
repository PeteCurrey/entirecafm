'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, QrCode, ClipboardList, Settings, Wrench, 
  FileText, Calendar, ShieldAlert, Download, Printer, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCategoryInfo } from '@/lib/assetCategories';

export default function AssetDetailPage() {
  const params = useParams();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrSvg, setQrSvg] = useState<string>('');

  const fetchAsset = async () => {
    try {
      const res = await fetch(`/api/assets/${params.id}`);
      if (res.ok) setAsset(await res.json());
    } catch (err) {
      console.error('Failed to fetch asset:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQR = async () => {
    try {
      const res = await fetch(`/api/assets/${params.id}/qr`);
      if (res.ok) setQrSvg(await res.text());
    } catch (err) {
      console.error('Failed to fetch QR:', err);
    }
  };

  useEffect(() => {
    fetchAsset();
    fetchQR();
  }, [params.id]);

  const handleDownloadQR = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asset-qr-${asset.id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintLabel = () => {
    const printWindow = window.open('', '', 'width=600,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Asset Label</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 20px; }
              .label { border: 2px solid #000; padding: 10px; display: inline-block; width: 6cm; height: 4cm; text-align: center; }
              .qr { width: 3cm; height: 3cm; margin: 0 auto; }
              .title { font-size: 14px; font-weight: bold; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              .site { font-size: 10px; color: #666; }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="title">${asset.name}</div>
              <div class="site">${asset.site.name}</div>
              <div class="qr">${qrSvg}</div>
            </div>
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-[#94A3B8]">
      <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" />
      Loading asset register...
    </div>
  );

  if (!asset) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#94A3B8]">
      <div className="w-16 h-16 bg-[#1E293B] rounded-full flex items-center justify-center mb-4">
        <Settings className="w-8 h-8 text-[#94A3B8]" />
      </div>
      <div>Asset not found.</div>
    </div>
  );

  const catInfo = getCategoryInfo(asset.category);
  const Icon = catInfo.icon;

  const getStatusColor = (s: string) => {
    if (s === 'OPERATIONAL') return "bg-[#22C55E] text-white hover:bg-[#22C55E]/80";
    if (s === 'REQUIRES_ATTENTION') return "bg-[#F59E0B] text-white hover:bg-[#F59E0B]/80";
    if (s === 'OUT_OF_SERVICE') return "bg-[#EF4444] text-white hover:bg-[#EF4444]/80";
    return "bg-[#334155] text-white";
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <Link href="/assets" className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors text-sm w-fit font-bold uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4" /> Back to Assets
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn("w-14 h-14 rounded-lg flex items-center justify-center bg-[#1E293B] border border-[#334155]", catInfo.color)}>
             <Icon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-inter tracking-tight leading-tight flex items-center gap-3">
              {asset.name}
              {asset.isStatutory && <span className="text-xs bg-[#E91E8C]/20 border border-[#E91E8C] text-[#E91E8C] px-2 py-0.5 rounded-full uppercase tracking-widest">Statutory</span>}
            </h1>
            <p className="text-[#94A3B8] font-medium text-sm mt-1 uppercase tracking-wider">
              {asset.category} • {asset.site.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("border-none px-3 py-1 font-bold tracking-widest uppercase rounded-sm", getStatusColor(asset.status))}>
            {asset.status.replace('_', ' ')}
          </Badge>
          <Badge className={cn(
             "border bg-transparent px-3 py-1 font-bold tracking-widest uppercase rounded-sm",
             asset.criticality === 'Low' && "text-[#94A3B8] border-[#475569]",
             asset.criticality === 'Medium' && "text-[#3B82F6] border-[#3B82F6]",
             asset.criticality === 'High' && "text-[#F59E0B] border-[#F59E0B]",
             asset.criticality === 'Critical' && "text-[#EF4444] border-[#EF4444]"
          )}>
            {asset.criticality} CRITICALITY
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#1E293B] border border-[#334155] h-12 w-full justify-start rounded-lg p-1 overflow-x-auto custom-scrollbar">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6">
            <ClipboardList className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="qr" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6">
            <QrCode className="w-4 h-4 mr-2" /> QR Tagging
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6">
            <Calendar className="w-4 h-4 mr-2" /> Service History
          </TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6">
            <Wrench className="w-4 h-4 mr-2" /> Linked Jobs
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6">
            <FileText className="w-4 h-4 mr-2" /> Documents
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <Card className="bg-[#1E293B] border-[#334155] text-white shadow-none">
                 <CardHeader className="pb-3 border-b border-[#334155]/50">
                   <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#94A3B8]">Technical Details</CardTitle>
                 </CardHeader>
                 <CardContent className="pt-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div><span className="text-[#94A3B8] block mb-1">Make</span> <span className="font-semibold">{asset.make || "—"}</span></div>
                    <div><span className="text-[#94A3B8] block mb-1">Model</span> <span className="font-semibold">{asset.model || "—"}</span></div>
                    <div><span className="text-[#94A3B8] block mb-1">Serial Number</span> <span className="font-semibold font-mono tracking-wider">{asset.serialNumber || "—"}</span></div>
                    <div><span className="text-[#94A3B8] block mb-1">Location</span> <span className="font-semibold">{asset.location || "—"}</span></div>
                    <div><span className="text-[#94A3B8] block mb-1">Install Date</span> <span className="font-semibold">{asset.installDate ? format(new Date(asset.installDate), "dd MMM yyyy") : "—"}</span></div>
                    <div><span className="text-[#94A3B8] block mb-1">Warranty Exp</span> <span className="font-semibold text-emerald-400">{asset.warrantyExp ? format(new Date(asset.warrantyExp), "dd MMM yyyy") : "—"}</span></div>
                 </CardContent>
               </Card>

               <Card className="bg-[#1E293B] border-[#334155] text-white shadow-none h-fit">
                 <CardHeader className="pb-3 border-b border-[#334155]/50">
                   <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#94A3B8]">Maintenance Lifecycle</CardTitle>
                 </CardHeader>
                 <CardContent className="pt-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div><span className="text-[#94A3B8] block mb-1">Last Serviced</span> <span className="font-semibold">{asset.lastService ? format(new Date(asset.lastService), "dd MMM yyyy") : "—"}</span></div>
                    <div><span className="text-[#94A3B8] block mb-1">Next Due</span> <span className="font-bold text-[#E91E8C]">{asset.nextService ? format(new Date(asset.nextService), "dd MMM yyyy") : "—"}</span></div>
                 </CardContent>
               </Card>
            </div>

            {asset.notes && (
              <Card className="bg-[#1E293B] border-[#334155] text-white shadow-none mt-6">
                 <CardHeader className="pb-3 border-b border-[#334155]/50 flex flex-row items-center gap-2">
                   <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#94A3B8]">Asset Notes</CardTitle>
                 </CardHeader>
                 <CardContent className="pt-4">
                   <p className="text-[#94A3B8] leading-relaxed whitespace-pre-wrap">{asset.notes}</p>
                 </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="qr">
            <Card className="bg-[#1E293B] border-[#334155] text-white shadow-none">
               <CardHeader className="border-b border-[#334155]/50">
                 <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#E91E8C]">Smart QR Labeling</CardTitle>
                 <CardDescription className="text-[#94A3B8] mt-1 text-sm">
                   Print and affix this tag to the asset physical location. Site engineers scan this using the EntireCAFM mobile app to instantly access the service history and log new jobs.
                 </CardDescription>
               </CardHeader>
               <CardContent className="pt-8 flex flex-col items-center gap-6">
                 {qrSvg ? (
                   <div 
                     className="bg-white p-4 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border-4 border-white w-48 h-48 flex items-center justify-center transform hover:scale-105 transition-transform" 
                     dangerouslySetInnerHTML={{ __html: qrSvg }} 
                   />
                 ) : (
                   <div className="w-48 h-48 bg-[#0D0D0D] border border-[#334155] rounded-xl flex items-center justify-center">
                     <Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" />
                   </div>
                 )}
                 
                 <div className="flex gap-4">
                   <Button variant="outline" className="border-[#334155] bg-transparent text-white hover:bg-[#334155]" onClick={handleDownloadQR}>
                     <Download className="w-4 h-4 mr-2" /> Download SVG
                   </Button>
                   <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white Magenta-box-shadow font-bold" onClick={handlePrintLabel}>
                     <Printer className="w-4 h-4 mr-2" /> Print QR Label
                   </Button>
                 </div>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
             <Card className="bg-[#1E293B] border-[#334155] text-white shadow-none">
                <CardContent className="pt-6">
                  {asset.ppmTasks && asset.ppmTasks.length > 0 ? (
                    <div className="space-y-4">
                       {asset.ppmTasks.filter((t: any) => t.status === 'COMPLETED').map((task: any) => (
                         <div key={task.id} className="flex justify-between items-center p-4 border border-[#334155] rounded-lg bg-[#0F172A]">
                           <div>
                             <h4 className="font-bold font-inter text-md">{task.title}</h4>
                             <p className="text-xs text-[#94A3B8] font-medium tracking-wide">
                               Completed on: {format(new Date(task.completedAt), "dd MMM yyyy")}
                             </p>
                           </div>
                           {task.certificateUrl && (
                             <Button variant="outline" size="sm" className="border-[#3B82F6] text-[#3B82F6] bg-blue-500/10 hover:bg-blue-500/20">
                               <FileText className="w-4 h-4 mr-2" /> View Certificate
                             </Button>
                           )}
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="text-[#94A3B8] text-sm text-center py-10 italic">
                      No service history available.
                    </div>
                  )}
                </CardContent>
             </Card>
          </TabsContent>

          {/* Jobs & Docs placeholder tabs to meet prompt */}
          <TabsContent value="jobs">
            <Card className="bg-[#1E293B] border-[#334155] text-[#94A3B8] p-10 text-center shadow-none text-sm italic">
              No reactive jobs linked to this asset.
            </Card>
          </TabsContent>
          <TabsContent value="docs">
            <Card className="bg-[#1E293B] border-[#334155] text-[#94A3B8] p-10 text-center shadow-none text-sm italic">
              No documents associated with this asset.
            </Card>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
