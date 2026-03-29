import React from 'react';
import { GripVertical } from 'lucide-react';

export default function DashboardWidget({ id, title, children, onRemove, isDragging }) {
  return (
    <div 
      className={`glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-[#CED4DA] cursor-move" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(id)}
            className="text-[#CED4DA] hover:text-red-400 text-xs"
          >
            Remove
          </button>
        )}
      </div>
      {children}
    </div>
  );
}