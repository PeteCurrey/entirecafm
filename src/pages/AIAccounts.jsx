import React from "react";
import { CreditCard } from "lucide-react";

export default function AIAccountsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="glass-panel rounded-2xl p-12 border border-divider text-center">
        <CreditCard className="w-16 h-16 mx-auto mb-4 text-body/50" strokeWidth={1.5} />
        <h2 className="text-2xl font-bold text-white mb-2">AI Accounts Dashboard</h2>
        <p className="text-body mb-4">
          Aged debt alerts and payment likelihood prediction
        </p>
        <p className="text-sm text-body">
          AI-powered financial insights to optimize cash flow and reduce aged debt
        </p>
      </div>
    </div>
  );
}