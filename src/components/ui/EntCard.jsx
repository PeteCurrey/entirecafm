import { motion } from "framer-motion";

export default function EntCard({ title, accent = "mag", right, children }) {
  const glowClass = accent === "mag" ? "shadow-[0_10px_40px_rgba(228,30,101,0.25)]" : "shadow-[0_10px_40px_rgba(0,180,160,0.22)]";
  const accentColor = accent === "mag" ? "text-[#E41E65]" : "text-[#00B4A0]";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className={`rounded-[18px] bg-[#121216]/95 border border-[rgba(255,255,255,0.06)] p-5 ${glowClass} shadow-[0_1px_0_rgba(255,255,255,0.02)_inset,0_8px_30px_rgba(0,0,0,0.35)]`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm tracking-wider">
          <span className={`${accentColor} font-medium`}>
            {title}
          </span>
        </div>
        {right}
      </div>
      {children}
    </motion.div>
  );
}