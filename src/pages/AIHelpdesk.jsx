import React from "react";
import { Bot } from "lucide-react";

export default function AIHelpdeskPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="glass-panel rounded-2xl p-12 border border-divider text-center">
        <Bot className="w-16 h-16 mx-auto mb-4 text-body/50" strokeWidth={1.5} />
        <h2 className="text-2xl font-bold text-white mb-2">AI Helpdesk</h2>
        <p className="text-body mb-4">
          Auto-triage and intelligent job routing
        </p>
        <p className="text-sm text-body">
          AI-powered job classification and engineer assignment coming soon
        </p>
      </div>
    </div>
  );
}