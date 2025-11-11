import React from "react";
import { CheckSquare } from "lucide-react";

export default function ApprovalsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="glass-panel rounded-2xl p-12 border border-divider text-center">
        <CheckSquare className="w-16 h-16 mx-auto mb-4 text-body/50" strokeWidth={1.5} />
        <h2 className="text-2xl font-bold text-white mb-2">Approvals Hub</h2>
        <p className="text-body mb-4">
          Supervisor and accounts approval workflow
        </p>
        <p className="text-sm text-body">
          Centralized approval queue for quotes, expenses, and purchase orders
        </p>
      </div>
    </div>
  );
}