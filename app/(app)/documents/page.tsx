'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Folder, FileText, Upload, Download, Trash2, Loader2, Link as ShareLink, Eye, Share2, FolderOpen, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from 'date-fns';

export default function DocumentsDashboardPage() {
  const [activeFolder, setActiveFolder] = useState('All Documents');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?folder=${encodeURIComponent(activeFolder)}`);
      if (res.ok) setDocuments(await res.json());
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFolder]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    if (file.size > 50 * 1024 * 1024) return alert('File exceeds 50MB limit.');

    setUploading(true);
    setProgress(20);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', activeFolder === 'All Documents' ? 'Other' : activeFolder);
    // Hardcoded Client/Site for demo logic; in production, modals would select these natively
    formData.append('clientId', 'default-client');
    formData.append('siteId', 'default-site');

    try {
      setProgress(60);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
         setProgress(100);
         fetchDocuments();
      } else {
         alert('Upload Failed - ensure Supabase Bucket "cafm-documents" is properly created and configured open.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
         setUploading(false);
         setProgress(0);
      }, 500);
    }
  };

  const deleteDocument = async (id: string, name: string) => {
    if (!confirm(`Permanently delete sequence "${name}" from the secure bunker?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) fetchDocuments();
    } catch (e) {
      console.error(e);
    }
  };

  const getFileIconColor = (type: string) => {
     if (type.includes('pdf')) return 'text-[#EF4444]'; // red
     if (type.includes('image')) return 'text-[#3B82F6]'; // blue
     return 'text-[#94A3B8]'; // grey
  };

  const formatBytes = (bytes: number, decimals = 2) => {
      if (!+bytes) return '0 Bytes'
      const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto h-[calc(100vh-100px)]">
      
      {/* Sidebar Tree */}
      <div className="w-full lg:w-[280px] bg-[#111827] border border-[#334155] rounded-xl flex flex-col shrink-0 overflow-hidden">
         <div className="p-5 border-b border-[#334155]">
            <h2 className="text-white font-bold font-inter tracking-tight flex items-center gap-2">
               <FolderOpen className="w-5 h-5 text-[#3B82F6]" /> Digital Bunker
            </h2>
            <p className="text-[11px] text-[#94A3B8] mt-1 leadng-tight">Store compliance certs, SLA metrics, and secure images.</p>
         </div>
         
         <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest px-3 mb-2 mt-2">Active Filters</h3>
            
            <div className="space-y-1">
               {['All Documents', 'Recent Uploads', 'Expiring Soon', 'Flagged'].map((f) => (
                 <button 
                   key={f}
                   onClick={() => setActiveFolder(f)}
                   className={cn("w-full text-left px-3 py-2 rounded-md transition-colors text-xs font-bold font-inter tracking-wide flex items-center gap-2", activeFolder === f ? "bg-[#334155] text-white" : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white")}
                 >
                   {f === 'Expiring Soon' ? <AlertTriangle className="w-4 h-4 text-[#F59E0B]" /> : <Folder className="w-4 h-4 opacity-70" />}
                   {f}
                 </button>
               ))}
            </div>

            <h3 className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest px-3 mb-2 mt-6">By Classification</h3>
            
            <div className="space-y-1">
               {['Certificate', 'Photo', 'Report', 'Manual', 'Insurance', 'Compliance', 'Quote', 'Invoice', 'Other'].map((f) => (
                 <button 
                   key={f}
                   onClick={() => setActiveFolder(f)}
                   className={cn("w-full text-left px-3 py-2 rounded-md transition-colors text-xs font-bold font-inter tracking-wide flex items-center gap-2", activeFolder === f ? "bg-[#334155] text-white" : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white")}
                 >
                   <Folder className="w-4 h-4 opacity-70" /> {f}
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
         
         {/* Upload Zone */}
         <div className="bg-[#1E293B] border border-dashed border-[#475569] hover:border-[#3B82F6] transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            {uploading ? (
               <div className="flex flex-col items-center justify-center w-full z-10 relative">
                  <Loader2 className="w-10 h-10 text-[#3B82F6] animate-spin mb-4" />
                  <p className="text-sm font-bold text-white uppercase tracking-widest mb-2">Syncing to Bucket...</p>
                  <div className="w-64 h-2 bg-[#0D0D0D] rounded-full overflow-hidden">
                     <div className="h-full bg-[#3B82F6] transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
               </div>
            ) : (
               <>
                  <input 
                     type="file" 
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     onChange={handleFileUpload}
                     accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                  />
                  <div className="w-16 h-16 rounded-full bg-[#111827] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <Upload className="w-8 h-8 text-[#3B82F6]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Upload Compliance Assets</h3>
                  <p className="text-sm text-[#94A3B8] max-w-sm">Drag and drop files here, or click to browse. Supported: PDF, JPG, PNG, DOCX, XLSX (Max 50MB).</p>
               </>
            )}
         </div>

         {/* Document List Header */}
         <div className="flex items-center justify-between pb-2 border-b border-[#334155] mt-2">
            <h2 className="text-lg font-bold text-white font-inter tracking-tight flex items-center gap-2">
               {activeFolder} <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-none ml-2">{(documents || []).length}</Badge>
            </h2>
         </div>

         {/* Document Table */}
         <div className="relative rounded-md border border-[#334155] bg-[#1E293B] flex-1 overflow-auto custom-scrollbar">
            {loading && (
              <div className="absolute inset-0 bg-[#0D0D0D]/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-[#111827] sticky top-0 z-10 shadow-sm border-b border-[#334155]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Filename</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Status & Type</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Size</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Date Uploaded</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 text-right pr-6">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length > 0 ? (
                  documents.map((doc) => {
                     const isExpired = doc.expiryDate && differenceInDays(new Date(doc.expiryDate), new Date()) < 0;
                     const expiringSoon = doc.expiryDate && differenceInDays(new Date(doc.expiryDate), new Date()) <= 30 && !isExpired;
                     
                     return (
                      <TableRow key={doc.id} className="border-b border-[#334155] hover:bg-[#334155]/20">
                        <TableCell className="py-4 text-center">
                           <FileText className={cn("w-5 h-5 mx-auto", getFileIconColor(doc.type))} />
                        </TableCell>
                        <TableCell className="py-4">
                           <span className="font-bold text-[12px] text-white block max-w-[250px] truncate" title={doc.name}>
                             {doc.name}
                           </span>
                        </TableCell>
                        <TableCell className="py-4">
                           <div className="flex flex-col gap-1 items-start">
                             <Badge className="bg-[#334155] text-[#94A3B8] uppercase text-[9px] tracking-widest border-none px-1.5 py-0">{doc.folder}</Badge>
                             {isExpired && <Badge className="bg-[#EF4444]/10 text-[#EF4444] uppercase text-[9px] tracking-widest border-[#EF4444]/30 px-1.5 py-0">Expired Matrix</Badge>}
                             {expiringSoon && <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] uppercase text-[9px] tracking-widest border-[#F59E0B]/30 px-1.5 py-0">Imminent Breach</Badge>}
                           </div>
                        </TableCell>
                        <TableCell className="py-4 text-[#94A3B8] text-[12px]">{formatBytes(doc.size)}</TableCell>
                        <TableCell className="py-4 text-[#94A3B8] text-[11px]">{format(new Date(doc.uploadedAt), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="py-4 text-right pr-6 flex items-center justify-end gap-2">
                           {/* Using mock buttons here as actual signed URLs demand Supabase SDKs which are environment dependent */}
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10" title="Preview Signature">
                             <Eye className="w-4 h-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94A3B8] hover:text-[#22C55E] hover:bg-[#22C55E]/10" title="Generate Access Share">
                             <Share2 className="w-4 h-4" />
                           </Button>
                           <Button onClick={() => deleteDocument(doc.id, doc.name)} variant="ghost" size="icon" className="h-8 w-8 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10" title="Eradicate Node">
                             <Trash2 className="w-4 h-4" />
                           </Button>
                        </TableCell>
                      </TableRow>
                     )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-[#94A3B8]">
                      {!loading && (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FolderOpen className="w-10 h-10 text-[#334155]" />
                          <p className="font-bold text-xs uppercase tracking-widest">Sector Empty</p>
                          <p className="text-[11px] max-w-xs text-center">No compliance artifacts detected matching this particular categorization grid.</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
         </div>

      </div>
    </div>
  );
}
