import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  MapPin,
  Package,
  Wrench,
  Users,
  Settings,
  ArrowRight,
  X,
  AlertTriangle,
  Mail,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// Entity configurations with templates
const ENTITY_CONFIGS = {
  clients: {
    name: "Clients",
    icon: Building2,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
    description: "Import client companies with auto portal user creation",
    template: {
      headers: ["client_id", "company_name", "contact_name", "contact_email", "contact_phone", "billing_address", "site_count", "status", "notes"],
      sample: [
        ["CLT001", "Acme Corporation", "John Smith", "john@acme.com", "020 1234 5678", "123 Business Park, London SW1A 1AA", "5", "active", "Key account"],
        ["CLT002", "TechCorp Ltd", "Sarah Johnson", "sarah@techcorp.com", "020 9876 5432", "456 Tech Lane, Manchester M1 2AB", "3", "active", "New client"]
      ]
    },
    requiredFields: ["company_name"],
    validations: {
      status: ["active", "inactive", "suspended"],
      contact_email: "email"
    }
  },
  sites: {
    name: "Sites",
    icon: MapPin,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/30",
    description: "Import site locations linked to clients",
    template: {
      headers: ["site_id", "client_id", "site_name", "address_line_1", "address_line_2", "city", "postcode", "country", "contact_name", "contact_email", "contact_phone", "status", "notes"],
      sample: [
        ["SITE001", "CLT001", "Main Office", "123 Business Park", "Floor 5", "London", "SW1A 1AA", "UK", "John Smith", "john@acme.com", "020 1234 5678", "active", "HQ"],
        ["SITE002", "CLT001", "Warehouse", "456 Industrial Estate", "", "Birmingham", "B1 2CD", "UK", "Mike Brown", "mike@acme.com", "0121 123 4567", "active", "Distribution center"]
      ]
    },
    requiredFields: ["site_name"],
    validations: {
      status: ["active", "inactive"]
    }
  },
  assets: {
    name: "Assets",
    icon: Package,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/30",
    description: "Import equipment and assets with service schedules",
    template: {
      headers: ["asset_id", "site_id", "building", "location", "category", "make", "model", "serial_number", "install_date", "next_service_date", "ppm_template", "compliance_status", "notes"],
      sample: [
        ["AST001", "SITE001", "Main Building", "Roof", "hvac", "Carrier", "X5000", "SN-98765", "2020-01-15", "2025-01-15", "quarterly", "compliant", "Annual service required"],
        ["AST002", "SITE001", "Main Building", "Basement", "electrical", "Siemens", "Panel-200", "SN-12345", "2019-06-01", "2025-06-01", "annual", "compliant", "Main distribution board"]
      ]
    },
    requiredFields: ["site_id", "category"],
    validations: {
      category: ["hvac", "electrical", "plumbing", "fire_safety", "security", "lift", "boiler", "lighting", "doors", "other"],
      compliance_status: ["compliant", "non_compliant", "pending"]
    }
  },
  jobs: {
    name: "Jobs",
    icon: Wrench,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/30",
    description: "Import work orders and maintenance jobs",
    template: {
      headers: ["job_id", "client_id", "site_id", "asset_id", "job_type", "priority", "requested_date", "scheduled_for", "engineer_id", "description", "status", "po_number", "reference"],
      sample: [
        ["JOB001", "CLT001", "SITE001", "AST001", "reactive", "high", "2025-12-01", "2025-12-02", "ENG001", "HVAC unit not cooling", "new", "PO-12345", "REF-001"],
        ["JOB002", "CLT001", "SITE001", "AST002", "ppm", "medium", "2025-12-05", "2025-12-05", "ENG002", "Annual inspection", "scheduled", "PO-12346", "REF-002"]
      ]
    },
    requiredFields: ["description", "job_type"],
    validations: {
      job_type: ["reactive", "ppm", "project", "inspection"],
      priority: ["low", "medium", "high", "critical", "emergency"],
      status: ["new", "assigned", "en_route", "on_site", "completed", "cancelled"]
    }
  },
  parts: {
    name: "Parts",
    icon: Settings,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/30",
    description: "Import inventory parts and stock levels",
    template: {
      headers: ["part_code", "part_name", "description", "unit_cost", "currency", "default_markup", "stock_quantity", "reorder_level", "supplier_name", "supplier_code", "notes"],
      sample: [
        ["PART001", "HVAC Filter", "Standard air filter 20x20", "12.50", "GBP", "25", "50", "10", "ABC Supplies", "SUP001", "Fast moving item"],
        ["PART002", "Fan Belt", "V-belt for AC units", "8.75", "GBP", "30", "25", "5", "ABC Supplies", "SUP001", "Critical spare"]
      ]
    },
    requiredFields: ["part_name"],
    validations: {
      unit_cost: "number",
      stock_quantity: "number",
      reorder_level: "number"
    }
  },
  engineers: {
    name: "Engineers",
    icon: Users,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    borderColor: "border-pink-500/30",
    description: "Import field engineers and technicians",
    template: {
      headers: ["engineer_id", "full_name", "email", "phone", "base_location", "skills", "employment_type", "status", "notes"],
      sample: [
        ["ENG001", "Tom Engineer", "tom@example.com", "07700 900000", "London", "HVAC,Electrical", "employed", "active", "Senior technician"],
        ["ENG002", "Jane Tech", "jane@example.com", "07700 900001", "Manchester", "Plumbing,Gas", "contractor", "active", "Gas Safe certified"]
      ]
    },
    requiredFields: ["full_name", "email"],
    validations: {
      email: "email",
      employment_type: ["employed", "contractor"],
      status: ["active", "inactive"]
    }
  }
};

export default function BulkDataWizard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState("clients");
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Admin guard
      if (userData.role !== 'admin') {
        toast.error("Admin access required");
        navigate(createPageUrl("Dashboard"));
        return;
      }
    } catch (error) {
      console.error("Error loading user:", error);
      navigate(createPageUrl("Dashboard"));
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = (entityKey) => {
    const config = ENTITY_CONFIGS[entityKey];
    const csv = [
      config.template.headers.join(','),
      ...config.template.sample.map(row => row.map(cell => 
        cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityKey}_template.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    toast.success(`${config.name} template downloaded`);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseRow = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(line => parseRow(line));
    
    return { headers, rows };
  };

  const validateData = (headers, rows, entityKey) => {
    const config = ENTITY_CONFIGS[entityKey];
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    rows.forEach((row, rowIndex) => {
      const rowData = {};
      headers.forEach((header, idx) => {
        rowData[header.toLowerCase().replace(/\s+/g, '_')] = row[idx] || '';
      });

      // Check required fields
      config.requiredFields.forEach(field => {
        const headerVariants = [field, field.replace(/_/g, ' ')];
        const hasValue = headerVariants.some(variant => {
          const idx = headers.findIndex(h => h.toLowerCase() === variant.toLowerCase());
          return idx !== -1 && row[idx]?.trim();
        });
        
        if (!hasValue) {
          errors.push({
            row: rowIndex + 2, // +2 for header row and 0-index
            field,
            message: `Missing required field: ${field}`
          });
        }
      });

      // Check validations
      Object.entries(config.validations).forEach(([field, validation]) => {
        const idx = headers.findIndex(h => h.toLowerCase() === field.toLowerCase());
        const value = idx !== -1 ? row[idx]?.trim() : '';
        
        if (!value) return; // Skip empty optional fields

        if (Array.isArray(validation)) {
          // Enum validation
          if (!validation.includes(value.toLowerCase())) {
            errors.push({
              row: rowIndex + 2,
              field,
              message: `Invalid value "${value}" for ${field}. Allowed: ${validation.join(', ')}`
            });
          }
        } else if (validation === 'email') {
          if (!emailRegex.test(value)) {
            errors.push({
              row: rowIndex + 2,
              field,
              message: `Invalid email format: ${value}`
            });
          }
        } else if (validation === 'number') {
          if (isNaN(parseFloat(value))) {
            errors.push({
              row: rowIndex + 2,
              field,
              message: `Invalid number: ${value}`
            });
          }
        }
      });
    });

    return errors;
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.csv$/i)) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);
    setIsAnalyzing(true);
    setImportResult(null);

    try {
      const text = await selectedFile.text();
      const { headers, rows } = parseCSV(text);
      
      if (rows.length === 0) {
        toast.error("CSV file is empty or has no data rows");
        setFile(null);
        return;
      }

      const errors = validateData(headers, rows, selectedEntity);
      
      setParsedData({ headers, rows });
      setValidationErrors(errors);
      
      if (errors.length > 0) {
        toast.warning(`${errors.length} validation issues found`);
      } else {
        toast.success(`${rows.length} rows ready to import`);
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Failed to parse CSV file");
      setFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeImport = async () => {
    if (!parsedData || !user?.org_id) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Upload file first
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      // Call bulk import function
      const result = await base44.functions.invoke('bulkImport', {
        org_id: user.org_id,
        entity_type: selectedEntity,
        file_url: uploadResult.file_url
      });

      if (result.data.success) {
        setImportResult(result.data);
        toast.success(`Import complete: ${result.data.created} created, ${result.data.updated} updated`);
        
        // Log to audit
        await base44.entities.AuditLog.create({
          org_id: user.org_id,
          user_id: user.id,
          action: 'CREATE',
          entity_type: 'BulkImport',
          entity_id: `bulk-${selectedEntity}-${Date.now()}`,
          new_values: {
            entity_type: selectedEntity,
            created: result.data.created,
            updated: result.data.updated,
            skipped: result.data.skipped,
            users_created: result.data.users_created || 0
          }
        });
      } else {
        toast.error(result.data.error || "Import failed");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error.response?.data?.error || error.message || "Import failed");
    } finally {
      setIsImporting(false);
      setImportProgress(100);
    }
  };

  const resetImport = () => {
    setFile(null);
    setParsedData(null);
    setValidationErrors([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#E1467C]" />
          <p className="text-[#CED4DA]">Loading...</p>
        </div>
      </div>
    );
  }

  const currentConfig = ENTITY_CONFIGS[selectedEntity];
  const EntityIcon = currentConfig.icon;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Upload className="w-8 h-8 text-[#E1467C]" strokeWidth={1.5} />
          Bulk Data Wizard
        </h1>
        <p className="text-[#CED4DA]">Import data across all core entities with validation and auto-linking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Entity Selector */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-semibold text-[#CED4DA] uppercase tracking-wider mb-3">Select Entity</h3>
          {Object.entries(ENTITY_CONFIGS).map(([key, config]) => {
            const Icon = config.icon;
            const isSelected = selectedEntity === key;
            
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedEntity(key);
                  resetImport();
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                  isSelected
                    ? `glass-panel-strong ${config.borderColor} border`
                    : 'glass-panel border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${config.color}`} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{config.name}</div>
                  <div className="text-xs text-[#CED4DA] truncate">{config.description}</div>
                </div>
                {isSelected && (
                  <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Import Panel */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {importResult ? (
              /* Import Result */
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel rounded-2xl p-8 border border-green-500/30"
              >
                <div className="text-center mb-6">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
                  <h2 className="text-2xl font-bold text-white mb-2">Import Complete!</h2>
                  <p className="text-[#CED4DA]">{currentConfig.name} data has been successfully imported</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] text-center">
                    <div className="text-3xl font-bold text-green-400 mb-1">{importResult.created}</div>
                    <div className="text-xs text-[#CED4DA]">Created</div>
                  </div>
                  <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-1">{importResult.updated}</div>
                    <div className="text-xs text-[#CED4DA]">Updated</div>
                  </div>
                  <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-1">{importResult.skipped}</div>
                    <div className="text-xs text-[#CED4DA]">Skipped</div>
                  </div>
                  {selectedEntity === 'clients' && (
                    <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] text-center">
                      <div className="text-3xl font-bold text-[#E1467C] mb-1">{importResult.users_created || 0}</div>
                      <div className="text-xs text-[#CED4DA]">Portal Users</div>
                    </div>
                  )}
                </div>

                {/* Detailed stats for clients */}
                {selectedEntity === 'clients' && importResult.users_created > 0 && (
                  <div className="glass-panel rounded-xl p-4 border border-[#E1467C]/30 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <UserPlus className="w-5 h-5 text-[#E1467C]" />
                      <span className="font-semibold text-white">Client Portal Users</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-[#CED4DA]">Created: </span>
                        <span className="text-green-400 font-semibold">{importResult.users_created}</span>
                      </div>
                      <div>
                        <span className="text-[#CED4DA]">Linked: </span>
                        <span className="text-blue-400 font-semibold">{importResult.users_linked_existing || 0}</span>
                      </div>
                      <div>
                        <span className="text-[#CED4DA]">Skipped: </span>
                        <span className="text-yellow-400 font-semibold">{importResult.users_skipped || 0}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#CED4DA]">
                      <Mail className="w-3 h-3" />
                      <span>Invitation emails sent to new portal users</span>
                    </div>
                  </div>
                )}

                {importResult.errors?.length > 0 && (
                  <div className="glass-panel rounded-xl p-4 border border-yellow-500/30 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <span className="font-semibold text-yellow-400">{importResult.errors.length} rows had issues</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importResult.errors.slice(0, 10).map((err, idx) => (
                        <div key={idx} className="text-xs text-[#CED4DA]">
                          Row {err.row}: {err.message}
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <div className="text-xs text-[#CED4DA]">...and {importResult.errors.length - 10} more</div>
                      )}
                    </div>
                  </div>
                )}

                <Button onClick={resetImport} className="w-full bg-[#E1467C] hover:bg-[#E1467C]/90 text-white">
                  Import More Data
                </Button>
              </motion.div>
            ) : (
              /* Upload Panel */
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Entity Header */}
                <div className={`glass-panel rounded-2xl p-6 border ${currentConfig.borderColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl ${currentConfig.bgColor} flex items-center justify-center`}>
                        <EntityIcon className={`w-7 h-7 ${currentConfig.color}`} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Import {currentConfig.name}</h2>
                        <p className="text-sm text-[#CED4DA]">{currentConfig.description}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => downloadTemplate(selectedEntity)}
                      variant="outline"
                      className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>

                {/* File Upload */}
                <div
                  className={`glass-panel rounded-2xl p-8 border-2 border-dashed transition-all cursor-pointer ${
                    file
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="text-center">
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#E1467C] animate-spin" />
                        <h3 className="text-lg font-bold text-white mb-2">Analyzing File...</h3>
                        <p className="text-[#CED4DA]">Validating data and checking for errors</p>
                      </>
                    ) : file ? (
                      <>
                        <FileText className="w-12 h-12 mx-auto mb-4 text-green-400" />
                        <h3 className="text-lg font-bold text-white mb-2">{file.name}</h3>
                        <p className="text-[#CED4DA]">
                          {parsedData?.rows.length || 0} rows • Click to change file
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mx-auto mb-4 text-[#CED4DA]" />
                        <h3 className="text-lg font-bold text-white mb-2">Drop your CSV here</h3>
                        <p className="text-[#CED4DA] mb-2">or click to browse</p>
                        <Badge className="bg-[rgba(255,255,255,0.08)] text-[#CED4DA]">
                          CSV format only
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Preview Table */}
                {parsedData && (
                  <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                    <h3 className="text-lg font-bold text-white mb-4">Data Preview (first 10 rows)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[rgba(255,255,255,0.08)]">
                            <th className="text-left py-2 px-3 text-[#CED4DA]">#</th>
                            {parsedData.headers.map((header, idx) => (
                              <th key={idx} className="text-left py-2 px-3 text-[#CED4DA]">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.rows.slice(0, 10).map((row, rowIdx) => {
                            const rowErrors = validationErrors.filter(e => e.row === rowIdx + 2);
                            return (
                              <tr 
                                key={rowIdx} 
                                className={`border-b border-[rgba(255,255,255,0.04)] ${
                                  rowErrors.length > 0 ? 'bg-red-500/10' : ''
                                }`}
                              >
                                <td className="py-2 px-3 text-[#CED4DA]">{rowIdx + 2}</td>
                                {row.map((cell, cellIdx) => {
                                  const hasError = rowErrors.some(e => 
                                    e.field.toLowerCase() === parsedData.headers[cellIdx]?.toLowerCase()
                                  );
                                  return (
                                    <td 
                                      key={cellIdx} 
                                      className={`py-2 px-3 ${hasError ? 'text-red-400' : 'text-white'}`}
                                    >
                                      {cell || <span className="text-[#CED4DA] opacity-50">-</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.rows.length > 10 && (
                      <p className="text-xs text-[#CED4DA] mt-2">
                        ...and {parsedData.rows.length - 10} more rows
                      </p>
                    )}
                  </div>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="glass-panel rounded-2xl p-6 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <h3 className="font-bold text-yellow-400">{validationErrors.length} Validation Issues</h3>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {validationErrors.slice(0, 20).map((error, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="text-xs shrink-0">Row {error.row}</Badge>
                          <span className="text-[#CED4DA]">{error.message}</span>
                        </div>
                      ))}
                      {validationErrors.length > 20 && (
                        <p className="text-xs text-[#CED4DA]">...and {validationErrors.length - 20} more issues</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Import Progress */}
                {isImporting && (
                  <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-[#CED4DA]">Importing {currentConfig.name}...</span>
                      <span className="text-sm font-semibold text-white">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}

                {/* Action Buttons */}
                {parsedData && (
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
                      disabled={isImporting || validationErrors.some(e => currentConfig.requiredFields.includes(e.field))}
                      className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Run Import ({parsedData.rows.length} rows)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}