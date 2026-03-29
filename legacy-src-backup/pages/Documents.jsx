import React from "react";
import { FolderOpen } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
        <FolderOpen className="w-16 h-16 mx-auto mb-4 text-white/30" />
        <h2 className="text-2xl font-bold text-white mb-2">Document Management</h2>
        <p className="text-white/70 mb-4">
          RAMS, certificates, O&M manuals, and warranties
        </p>
        <p className="text-sm text-white/60">
          Document repository coming soon
        </p>
      </div>
    </div>
  );
}