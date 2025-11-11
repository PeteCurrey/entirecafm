import React from "react";
import { Calendar } from "lucide-react";

export default function SchedulingPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-white/30" />
        <h2 className="text-2xl font-bold text-white mb-2">Scheduling Calendar</h2>
        <p className="text-white/70 mb-4">
          Drag-and-drop job scheduling coming soon
        </p>
        <p className="text-sm text-white/60">
          This feature will allow you to schedule jobs via calendar view and assign engineers with drag-and-drop
        </p>
      </div>
    </div>
  );
}