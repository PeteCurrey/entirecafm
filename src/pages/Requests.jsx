import React from "react";
import { Inbox } from "lucide-react";

export default function RequestsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="glass-panel rounded-2xl p-12 border border-divider text-center">
        <Inbox className="w-16 h-16 mx-auto mb-4 text-body/50" strokeWidth={1.5} />
        <h2 className="text-2xl font-bold text-white mb-2">Job Requests</h2>
        <p className="text-body mb-4">
          Client-raised job requests awaiting triage
        </p>
        <p className="text-sm text-body">
          This inbox will show all incoming job requests from clients that need approval before converting to jobs
        </p>
      </div>
    </div>
  );
}