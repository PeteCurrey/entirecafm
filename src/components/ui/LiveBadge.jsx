export function LiveBadge() {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.06)] text-[11px] text-[#96A0AA]">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#00B4A0] opacity-40 animate-ping"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00B4A0]"></span>
      </span>
      Live
    </div>
  );
}