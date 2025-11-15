import EntCard from "../ui/EntCard";
import { LiveBadge } from "../ui/LiveBadge";
import Sparkline from "../ui/Sparkline";

export default function MetricTile({ label, value, delta, accent = "mag" }) {
  const deltaColor = delta >= 0 ? "text-[#00B4A0]" : "text-[#E41E65]";
  const valueColor = accent === "mag" ? "text-[#E41E65]" : "text-[#00B4A0]";
  
  return (
    <EntCard title={label} accent={accent} right={<LiveBadge />}>
      <div className="flex items-baseline gap-3">
        <div className={`text-4xl font-light ${valueColor}`}>{value}</div>
        {delta !== undefined && (
          <div className={`text-sm ${deltaColor}`}>
            {delta > 0 ? `↗ +${delta}%` : `↘ ${delta}%`}
          </div>
        )}
      </div>
      <div className="mt-2">
        <Sparkline accent={accent} />
      </div>
    </EntCard>
  );
}