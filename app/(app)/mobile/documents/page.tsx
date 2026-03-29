'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function MobileDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents?limit=50')
      .then(r => r.ok ? r.json() : [])
      .then(setDocs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <h1 className="text-xl font-black text-white">Documents</h1>

      {loading && <div className="flex justify-center pt-10"><Loader2 className="w-6 h-6 text-[#E91E8C] animate-spin" /></div>}

      {!loading && docs.length === 0 && (
        <div className="text-center pt-16 text-[#94A3B8]">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-bold text-white">No documents available</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {docs.map(doc => (
          <div key={doc.id} className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#334155] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#94A3B8]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{doc.name}</p>
              <p className="text-[#94A3B8] text-[11px]">{doc.folder} • {doc.createdAt ? format(new Date(doc.createdAt), 'dd MMM yyyy') : ''}</p>
            </div>
            {doc.url && (
              <a href={doc.url} download target="_blank" rel="noreferrer" className="text-[#3B82F6] shrink-0">
                <Download className="w-5 h-5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
