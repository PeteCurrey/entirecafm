import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import LiveMap from "../map/LiveMap";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Navigation } from "lucide-react";

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

  return (
    <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden" style={{ height: '400px' }}>
      {user && (
        <LiveMap 
          orgId={user.org_id || 'default-org'} 
          compact={true}
        />
      )}
      
      <Link to={createPageUrl("MapTracking")}>
        <div className="absolute bottom-4 right-4 glass-panel rounded-lg px-3 py-2 text-xs text-white hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer flex items-center gap-2 border border-[rgba(255,255,255,0.08)] z-[1000]">
          <Navigation className="w-3 h-3" strokeWidth={1.5} />
          <span>Full Map</span>
        </div>
      </Link>
    </div>
  );
}