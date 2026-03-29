'use client';

import { useState, useRef } from 'react';
import { Upload, Download, CheckCircle, AlertTriangle, ArrowLeft, ArrowRight, Loader2, Users, Building2, Package, Wrench, HardHat, ClipboardList, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const IMPORT_TYPES = [
  { key: 'clients', label: 'Clients', icon: Users, desc: 'Company/client records', link: '/clients' },
  { key: 'sites', label: 'Sites', icon: Building2, desc: 'Property and location data', link: '/sites' },
  { key: 'assets', label: 'Assets', icon: Package, desc: 'Equipment and asset register', link: '/assets' },
  { key: 'jobs', label: 'Jobs', icon: Wrench, desc: 'Historical and open jobs', link: '/jobs' },
  { key: 'engineers', label: 'Engineers', icon: HardHat, desc: 'Field operative accounts', link: '/engineers' },
  { key: 'ppmtasks', label: 'PPM Tasks', icon: ClipboardList, desc: 'Planned maintenance tasks', link: '/ppm' },
];

type Step = 'idle' | 'upload' | 'preview' | 'importing' | 'done';

export default function ImportHubPage() {
  const [activeType, setActiveType] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [csvContent, setCsvContent] = useState('');
  const [validation, setValidation] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const reset = () => { setStep('idle'); setCsvContent(''); setValidation(null); setResult(null); setImportProgress(0); };

  const openWizard = (type: string) => { setActiveType(type); setStep('upload'); };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) return alert('Please upload a .csv file');
    const content = await file.text();
    setCsvContent(content);
    setValidating(true);
    try {
      const res = await fetch('/api/import/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, csvContent: content })
      });
      if (res.ok) { setValidation(await res.json()); setStep('preview'); }
    } finally { setValidating(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const executeImport = async () => {
    if (!validation) return;
    setStep('importing');
    const BATCH = 50;
    const rows = validation.valid;
    let imported = 0; let skipped = 0; const allErrors: string[] = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const res = await fetch('/api/import/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, rows: batch })
      });
      if (res.ok) {
        const data = await res.json();
        imported += data.imported; skipped += data.skipped;
        allErrors.push(...data.errors);
      }
      setImportProgress(Math.round(((i + BATCH) / rows.length) * 100));
    }

    setResult({ imported, skipped, errors: allErrors });
    setStep('done');
  };

  const currentType = IMPORT_TYPES.find(t => t.key === activeType);

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto pb-16 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-white font-inter tracking-tight flex items-center gap-2">
          <Upload className="w-6 h-6 text-[#E91E8C]" /> Data Import Hub
        </h1>
        <p className="text-[#94A3B8] text-sm mt-1">Import existing data using CSV templates. Download the template, fill it in, upload it here.</p>
      </div>

      {step === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {IMPORT_TYPES.map(t => (
            <div key={t.key} className="bg-[#111827] border border-[#334155] rounded-xl p-6 flex flex-col gap-4 hover:border-[#E91E8C]/50 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center group-hover:border-[#E91E8C]/50 transition-colors">
                  <t.icon className="w-5 h-5 text-[#E91E8C]" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">{t.label}</h3>
                  <p className="text-[10px] text-[#94A3B8]">{t.desc}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <a href={`/api/import/template/${t.key}`} download className="flex-1">
                  <Button variant="outline" className="w-full h-8 text-[10px] font-bold uppercase border-[#334155] text-[#94A3B8] hover:bg-[#334155] hover:text-white bg-transparent">
                    <Download className="w-3 h-3 mr-1" /> Template
                  </Button>
                </a>
                <Button onClick={() => openWizard(t.key)} className="flex-1 h-8 text-[10px] font-bold uppercase bg-[#E91E8C] hover:bg-[#D41B7F] text-white">
                  <Upload className="w-3 h-3 mr-1" /> Import CSV
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {step !== 'idle' && (
        <div className="bg-[#111827] border border-[#334155] rounded-xl overflow-hidden">
          {/* Wizard Header */}
          <div className="p-5 border-b border-[#334155] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentType && <currentType.icon className="w-5 h-5 text-[#E91E8C]" />}
              <h2 className="text-white font-bold">Import {currentType?.label}</h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Step indicators */}
              {['Upload', 'Preview', 'Importing', 'Done'].map((s, i) => (
                <div key={s} className={cn("flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider",
                  ['upload','preview','importing','done'][i] === step ? 'text-[#E91E8C]' : 'text-[#475569]'
                )}>
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black",
                    ['upload','preview','importing','done'].indexOf(step) > i ? 'bg-[#22C55E] text-white' :
                    ['upload','preview','importing','done'][i] === step ? 'bg-[#E91E8C] text-white' : 'bg-[#334155] text-[#94A3B8]'
                  )}>{i + 1}</div>
                  <span className="hidden sm:inline">{s}</span>
                </div>
              ))}
              <button onClick={reset} className="text-[#94A3B8] hover:text-white ml-2"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="p-6">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-[#334155] hover:border-[#E91E8C] transition-colors rounded-xl p-16 text-center flex flex-col items-center gap-4 relative"
              >
                <input ref={fileRef} type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {validating ? (
                  <><Loader2 className="w-10 h-10 text-[#E91E8C] animate-spin" /><p className="text-white font-bold">Validating CSV...</p></>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-[#334155]" />
                    <div>
                      <p className="text-white font-bold">Drop your CSV file here</p>
                      <p className="text-[#94A3B8] text-sm mt-1">or click to browse — {currentType?.label} template required</p>
                    </div>
                    <Button className="bg-[#E91E8C] text-white font-bold mt-2 pointer-events-none">Select File</Button>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && validation && (
              <div className="flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="flex-1 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-black text-[#22C55E]">{validation.valid.length}</p>
                    <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mt-1">Ready to Import</p>
                  </div>
                  <div className="flex-1 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-black text-[#EF4444]">{validation.errors.length}</p>
                    <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mt-1">Errors</p>
                  </div>
                  <div className="flex-1 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-black text-[#F59E0B]">{validation.warnings.length}</p>
                    <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mt-1">Warnings</p>
                  </div>
                </div>

                {!validation.canProceed && (
                  <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
                    <p className="text-sm text-[#EF4444] font-bold">Over 50% of rows have errors. Please fix the template before importing.</p>
                  </div>
                )}

                {validation.errors.length > 0 && (
                  <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                    {validation.errors.slice(0, 20).map((e: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 py-2 border-b border-[#334155] text-xs">
                        <span className="text-[#EF4444] font-mono font-bold shrink-0">Row {e.row}</span>
                        <span className="text-[#94A3B8]">{e.errors.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <Button onClick={() => setStep('upload')} variant="outline" className="border-[#334155] text-white bg-transparent hover:bg-[#334155] font-bold">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={executeImport} disabled={!validation.canProceed || validation.valid.length === 0} className="bg-[#E91E8C] text-white font-bold">
                    Import {validation.valid.length} Valid Rows <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Importing */}
            {step === 'importing' && (
              <div className="flex flex-col items-center justify-center py-16 gap-6">
                <Loader2 className="w-12 h-12 text-[#E91E8C] animate-spin" />
                <div className="w-full max-w-md">
                  <p className="text-white font-bold text-center mb-3">Importing records...</p>
                  <div className="h-3 bg-[#1E293B] rounded-full overflow-hidden">
                    <div className="h-full bg-[#E91E8C] transition-all duration-500" style={{ width: `${importProgress}%` }} />
                  </div>
                  <p className="text-[#94A3B8] text-xs text-center mt-2">{importProgress}% complete</p>
                </div>
              </div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && result && (
              <div className="flex flex-col items-center py-10 gap-6">
                <div className="w-16 h-16 rounded-full bg-[#22C55E]/20 border-2 border-[#22C55E] flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-[#22C55E]" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-white mb-1">Import Complete</h3>
                  <p className="text-[#22C55E] font-bold">{result.imported} records imported successfully</p>
                  {result.skipped > 0 && <p className="text-[#F59E0B] text-sm mt-1">{result.skipped} records skipped</p>}
                </div>
                <div className="flex gap-3">
                  {currentType && <a href={currentType.link}><Button className="bg-[#3B82F6] text-white font-bold">View Imported Data</Button></a>}
                  <Button onClick={reset} variant="outline" className="border-[#334155] text-white bg-transparent hover:bg-[#334155] font-bold">Import More</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
