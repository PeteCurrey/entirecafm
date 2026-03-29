import React from "react";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-white/30" />
        <h2 className="text-2xl font-bold text-white mb-2">Reports & Analytics</h2>
        <p className="text-white/70 mb-4">
          SLA compliance, first-time fix rates, PPM compliance, aging debt
        </p>
        <p className="text-sm text-white/60">
          Comprehensive reporting dashboard coming soon
        </p>
      </div>
    </div>
  );
}