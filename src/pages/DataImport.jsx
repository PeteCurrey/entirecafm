import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Database,
  RefreshCw,
  X,
  Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const ENTITY_TEMPLATES = {
  jobs: {
    name: "Jobs Template",
    headers: ["title", "description", "job_type", "priority", "status", "site_name", "asset_name", "scheduled_date", "po_number"],
    sample: [
      ["Fix HVAC Unit", "Air conditioning not working in Building A", "reactive", "high", "new", "Main Office", "HVAC-01", "2025-12-01", "PO-12345"]
    ]
  },
  assets: {
    name: "Assets Template",
    headers: ["name", "site_name", "asset_type", "manufacturer", "model", "serial_number", "installation_date"],
    sample: [
      ["HVAC-01", "Main Office", "hvac", "Carrier", "X5000", "SN-98765", "2020-01-15"]
    ]
  },
  sites: {
    name: "Sites Template",
    headers: ["name", "address", "city", "postcode", "contact_name", "contact_phone", "contact_email"],
    sample: [
      ["Main Office", "123 Business Park", "London", "SW1A 1AA", "John Smith", "020 1234 5678", "john@example.com"]
    ]
  },
  engineers: {
    name: "Engineers Template",
    headers: ["full_name", "email", "phone", "role"],
    sample: [
      ["Tom Engineer", "tom@example.com", "07700 900000", "engineer"]
    ]
  },
  parts: {
    name: "Parts Template",
    headers: ["name", "part_number", "supplier", "unit_cost", "stock_quantity", "category"],
    sample: [
      ["HVAC Filter", "FILT-500", "ABC Supplies", "12.50", "50", "consumable"]
    ]
  }
};

export default function DataImportPage() {
  const [user, setUser] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mappingResult, setMappingResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [error, setError] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!user?.org_id || !isImporting) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws;

    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `import.org.${user.org_id}`
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'import_progress') {
            setImportProgress(message.progress);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onerror = (error) => console.error('WebSocket error:', error);
    } catch (error) {
      console.error('WebSocket setup error:', error);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [user?.org_id, isImporting]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (selectedFile) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xls|xlsx)$/i)) {
      setError("Please upload a valid CSV, XLS, or XLSX file");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setMappingResult(null);
    await analyzeFile(selectedFile);
  };

  const analyzeFile = async (fileToAnalyze) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Upload file first
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: fileToAnalyze
      });

      // Analyze with AI
      const result = await base44.functions.invoke('aiDataImport', {
        org_id: user.org_id,
        file_url: uploadResult.file_url,
        file_name: fileToAnalyze.name
      });

      if (result.data.success) {
        setMappingResult(result.data);
      } else {
        setError(result.data.error || "Failed to analyze file");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setError(error.response?.data?.error || error.message || "Failed to analyze file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSheetsImport = async () => {
    if (!sheetsUrl) return;
    
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await base44.functions.invoke('aiDataImport', {
        org_id: user.org_id,
        sheets_url: sheetsUrl
      });

      if (result.data.success) {
        setMappingResult(result.data);
      } else {
        setError(result.data.error || "Failed to analyze Google Sheets");
      }
    } catch (error) {
      console.error("Sheets import error:", error);
      setError(error.response?.data?.error || error.message || "Failed to import from Google Sheets");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeImport = async () => {
    setIsImporting(true);
    setError(null);
    setImportProgress(0);

    try {
      const result = await base44.functions.invoke('executeDataImport', {
        org_id: user.org_id,
        mapping: mappingResult.mapping,
        file_url: mappingResult.file_url
      });

      if (result.data.success) {
        setImportSummary(result.data.summary);
        setImportComplete(true);
        
        // Trigger post-import automations
        await base44.functions.invoke('aiDirectorDashboard', { org_id: user.org_id });
      } else {
        setError(result.data.error || "Import failed");
      }
    } catch (error) {
      console.error("Import error:", error);
      setError(error.response?.data?.error || error.message || "Failed to import data");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = (templateKey) => {
    const template = ENTITY_TEMPLATES[templateKey];
    const csv = [
      template.headers.join(','),
      ...template.sample.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateKey}_template.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const resetImport = () => {
    setFile(null);
    setSheetsUrl("");
    setMappingResult(null);
    setImportComplete(false);
    setImportSummary(null);
    setError(null);
  };

  if (!user) {
    return (
      <div className="p-6 lg:p-8">
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#E1467C]" />
          <p className="text-[#CED4DA]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Database className="w-8 h-8 text-[#E1467C]" strokeWidth={1.5} />
            Data Import Hub
          </h1>
          <p className="text-[#CED4DA]">Upload operational data to activate AI dashboards instantly</p>
        </div>
        <Button
          onClick={() => setShowTemplates(true)}
          variant="outline"
          className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
        >
          <Download className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {importComplete && importSummary ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel rounded-2xl p-8 border border-green-500/30 text-center"
          >
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Import Complete!</h2>
            <p className="text-[#CED4DA] mb-6">Your data has been successfully imported</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(importSummary.imported).map(([entity, count]) => (
                <div key={entity} className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-3xl font-bold text-[#E1467C] mb-1">{count}</div>
                  <div className="text-xs text-[#CED4DA]">{entity}</div>
                </div>
              ))}
            </div>

            {importSummary.errors?.length > 0 && (
              <div className="glass-panel rounded-xl p-4 border border-yellow-500/30 mb-6">
                <AlertCircle className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                <p className="text-sm text-yellow-400 mb-3">{importSummary.errors.length} rows had issues</p>
                {importSummary.error_csv_url && (
                  <a 
                    href={importSummary.error_csv_url} 
                    download="import_errors.csv"
                    className="text-xs text-white hover:text-[#E1467C] underline"
                  >
                    Download Error Report (CSV)
                  </a>
                )}
              </div>
            )}

            <Button
              onClick={resetImport}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              Import More Data
            </Button>
          </motion.div>
        ) : mappingResult ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Mapping Preview */}
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#E1467C]" />
                    AI Detected Schema
                  </h3>
                  <p className="text-sm text-[#CED4DA]">Review and confirm field mappings</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  {mappingResult.confidence_score}% Confidence
                </Badge>
              </div>

              <div className="space-y-4">
                {Object.entries(mappingResult.mapping).map(([entity, fields]) => (
                  <div key={entity} className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                    <h4 className="font-semibold text-white mb-3 capitalize">{entity}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(fields).map(([targetField, sourceField]) => (
                        <div key={targetField} className="text-xs">
                          <div className="text-[#CED4DA] mb-1">{targetField}</div>
                          <Badge variant="outline" className="text-white">
                            {sourceField}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview Table */}
              {mappingResult.preview_data && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-white mb-3">Data Preview (first 5 rows)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.08)]">
                          {mappingResult.preview_data[0]?.map((header, idx) => (
                            <th key={idx} className="text-left py-2 px-3 text-[#CED4DA]">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mappingResult.preview_data.slice(1, 6).map((row, idx) => (
                          <tr key={idx} className="border-b border-[rgba(255,255,255,0.04)]">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="py-2 px-3 text-white">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={resetImport}
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={executeImport}
                disabled={isImporting}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Import
                  </>
                )}
              </Button>
            </div>

            {isImporting && (
              <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[#CED4DA]">Importing data...</span>
                  <span className="text-sm font-semibold text-white">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* File Upload */}
            <div
              className={`glass-panel rounded-2xl p-12 border-2 border-dashed transition-all cursor-pointer ${
                dragActive
                  ? 'border-[#E1467C] bg-[rgba(225,70,124,0.05)]'
                  : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileInput}
                className="hidden"
              />
              
              <div className="text-center">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-16 h-16 mx-auto mb-4 text-[#E1467C] animate-spin" />
                    <h3 className="text-xl font-bold text-white mb-2">Analyzing File...</h3>
                    <p className="text-[#CED4DA]">AI is mapping your data schema</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-16 h-16 mx-auto mb-4 text-[#E1467C]" />
                    <h3 className="text-xl font-bold text-white mb-2">Drop your file here</h3>
                    <p className="text-[#CED4DA] mb-4">or click to browse</p>
                    <Badge className="bg-[rgba(255,255,255,0.08)] text-[#CED4DA]">
                      Supports CSV, XLS, XLSX
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Google Sheets Import */}
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-[#E1467C]" />
                Import from Google Sheets
              </h3>
              <div className="flex gap-3">
                <Input
                  placeholder="Paste Google Sheets URL..."
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  className="flex-1 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-white"
                />
                <Button
                  onClick={handleSheetsImport}
                  disabled={!sheetsUrl || isAnalyzing}
                  className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-4 border border-red-500/30 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-400 mb-1">Import Error</h4>
                  <p className="text-sm text-[#CED4DA]">{error}</p>
                </div>
                <Button
                  onClick={() => setError(null)}
                  variant="ghost"
                  size="icon"
                  className="text-[#CED4DA]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                <Sparkles className="w-8 h-8 text-[#E1467C] mb-3" />
                <h4 className="font-semibold text-white mb-2">AI-Powered Mapping</h4>
                <p className="text-sm text-[#CED4DA]">Intelligent field detection with confidence scores</p>
              </div>
              <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                <Database className="w-8 h-8 text-[#E1467C] mb-3" />
                <h4 className="font-semibold text-white mb-2">Instant Activation</h4>
                <p className="text-sm text-[#CED4DA]">Dashboards populate automatically after import</p>
              </div>
              <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                <CheckCircle2 className="w-8 h-8 text-[#E1467C] mb-3" />
                <h4 className="font-semibold text-white mb-2">Validated & Safe</h4>
                <p className="text-sm text-[#CED4DA]">Multi-org isolation with error handling</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#E1467C]" />
              Download Templates
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[#CED4DA]">
              Download sample CSV templates to get started. Headers are optional — AI will detect column roles.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(ENTITY_TEMPLATES).map(([key, template]) => (
                <Button
                  key={key}
                  onClick={() => downloadTemplate(key)}
                  variant="outline"
                  className="border-[rgba(255,255,255,0.08)] text-white hover:bg-[rgba(255,255,255,0.04)] justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}