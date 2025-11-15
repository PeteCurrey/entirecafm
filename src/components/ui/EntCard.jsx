import { motion } from "framer-motion";

export default function EntCard({ title, accent = "mag", right, children }) {
  const glowClass = accent === "mag" ? "ent-card-mag" : "ent-card-teal";
  const titleColor = accent === "mag" ? "text-[#E41E65]" : "text-[#00B4A0]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className={`ent-card ${glowClass} p-5`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm tracking-wider uppercase">
          <span className={`${titleColor} font-medium`}>{title}</span>
        </div>
        {right}
      </div>
      {children}
    </motion.div>
  );
}