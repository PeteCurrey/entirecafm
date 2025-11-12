import React from "react";
import { Wrench } from "lucide-react";

export default function EntireLogo({ size = "normal", showText = true }) {
  const dimensions = {
    small: { container: "w-8 h-8", icon: "w-4 h-4", text: "text-sm" },
    normal: { container: "w-10 h-10", icon: "w-5 h-5", text: "text-base" },
    large: { container: "w-16 h-16", icon: "w-8 h-8", text: "text-2xl" }
  };

  const d = dimensions[size] || dimensions.normal;

  return (
    <div className="flex items-center gap-3">
      <div className={`${d.container} rounded-xl bg-gradient-to-br from-[#E41E65] to-[#C13666] flex items-center justify-center magenta-glow`}>
        <Wrench className={`${d.icon} text-white`} strokeWidth={2} />
      </div>
      {showText && (
        <span className={`${d.text} font-bold text-white tracking-wide`}>
          ENTIRE<span className="text-[#E41E65]">CAFM</span>
        </span>
      )}
    </div>
  );
}