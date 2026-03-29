import React, { useState, useEffect, Suspense, lazy } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Navigation, MapPin, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const LiveMap = lazy(() => import("../map/LiveMap"));

export default function HeroMap() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const { data: jobs = [] } = useQuery({
    queryKey: ['dashboard-jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 20),
    refetchInterval: 30000
  });

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status));

  return (
    <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden relative" style={{ height: '400px' }}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-[#E1467C]" />
        </div>
      }>
        <LiveMap jobs={activeJobs} height="400px" />
      </Suspense>
      
      <Link to={createPageUrl("MapTracking")}>
        <div className="absolute bottom-4 right-4 glass-panel rounded-lg px-3 py-2 text-xs text-white hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer flex items-center gap-2 border border-[rgba(255,255,255,0.08)] z-10">
          <Navigation className="w-3 h-3" strokeWidth={1.5} />
          <span>Full Map</span>
        </div>
      </Link>
    </div>
  );
}