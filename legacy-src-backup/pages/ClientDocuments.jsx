import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText,
  Upload,
  Search,
  Download,
  ArrowLeft,
  File,
  Image as ImageIcon,
  FileType,
  Loader2,
  X,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ClientDocumentsPage() {
  const [user, setUser] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    if (userData.client_id) {
      setClientId(userData.client_id);
    }
  };

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.ClientDocument.filter({ 
        client_id: clientId,
        is_visible_to_client: true 
      });
    },
    enabled: !!clientId
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['client-sites', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.Site.filter({ client_id: clientId });
    },
    enabled: !!clientId
  });

  const handleUpload = async () => {
    if (!uploadFile || !clientId) return;

    setIsUploading(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: uploadFile
      });

      await base44.entities.ClientDocument.create({
        client_id: clientId,
        name: uploadFile.name,
        file_url: uploadResult.file_url,
        file_type: uploadFile.type,
        file_size: uploadFile.size,
        category: uploadCategory,
        description: uploadDescription,
        uploaded_by: user.id,
        uploaded_by_name: user.full_name || user.email,
        is_visible_to_client: true
      });

      queryClient.invalidateQueries(['client-documents']);
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadDescription("");
      setUploadCategory("other");
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (fileType) => {
    if (fileType?.includes('image')) return <ImageIcon className="w-5 h-5" />;
    if (fileType?.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const categoryColors = {
    certificate: 'bg-green-500/20 text-green-400 border-green-500/30',
    invoice: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    report: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    photo: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    manual: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    other: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };

  return (
    <div className="min-h-screen bg-[#0D1117] p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl("ClientPortal")}>
            <Button variant="ghost" className="mb-4 text-[#CED4DA]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Documents & Reports</h1>
              <p className="text-[#CED4DA]">Access and upload documents for your sites and assets</p>
            </div>
            <Button 
              onClick={() => setShowUploadDialog(true)}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel rounded-2xl p-4 border border-[rgba(255,255,255,0.08)] mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CED4DA] opacity-50" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48 glass-panel border-[rgba(255,255,255,0.08)] text-white">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#E1467C]" />
            <p className="text-[#CED4DA]">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No documents found</h3>
            <p className="text-[#CED4DA] mb-6">Upload documents to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => (
              <div 
                key={doc.id}
                className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center text-[#E1467C]">
                      {getFileIcon(doc.file_type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-sm mb-1 truncate">{doc.name}</h3>
                      <Badge className={`${categoryColors[doc.category]} border text-xs`}>
                        {doc.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {doc.description && (
                  <p className="text-[#CED4DA] text-xs mb-3 line-clamp-2">{doc.description}</p>
                )}
                
                <div className="flex items-center justify-between text-xs text-[#CED4DA] mb-3">
                  <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                  <span>{new Date(doc.created_date).toLocaleDateString()}</span>
                </div>
                
                <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full border-[rgba(255,255,255,0.08)] text-[#CED4DA]">
                    <Download className="w-3 h-3 mr-2" />
                    Download
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Document</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#CED4DA] mb-2 block">Select File</label>
              <Input
                type="file"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>

            <div>
              <label className="text-sm text-[#CED4DA] mb-2 block">Category</label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-[#CED4DA] mb-2 block">Description (Optional)</label>
              <Input
                placeholder="Add a description..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowUploadDialog(false)}
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}