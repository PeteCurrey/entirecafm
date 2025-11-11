import React from "react";
import { Megaphone } from "lucide-react";

export default function AIMarketingPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="glass-panel rounded-2xl p-12 border border-divider text-center">
        <Megaphone className="w-16 h-16 mx-auto mb-4 text-body/50" strokeWidth={1.5} />
        <h2 className="text-2xl font-bold text-white mb-2">AI Marketing Dashboard</h2>
        <p className="text-body mb-4">
          Lead intelligence and campaign suggestions
        </p>
        <p className="text-sm text-body">
          AI-driven marketing insights to identify opportunities and optimize client acquisition
        </p>
      </div>
    </div>
  );
}