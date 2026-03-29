import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LiveMap from "../components/map/LiveMap";
import { MapPin, User, Navigation, Clock, Phone, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MapTrackingPage() {
  const navigate = useNavigate();
  const [selectedEngineer, setSelectedEngineer] = useState(null);
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

  const statusColors = {
    on_site: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    on_route: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    available: 'bg-green-500/10 text-green-400 border-green-500/30',
    assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };

  // Mock data for demonstration (will be replaced by real-time data)
  const engineers = [
    { 
      id: 1, 
      name: "Ryan Mitchell", 
      status: "on_site",
      nextJob: "Boiler maintenance - Starbucks Victoria",
      eta: "On site",
      phone: "07700 900123"
    },
    { 
      id: 2, 
      name: "Mia Chen", 
      status: "on_route",
      nextJob: "HVAC inspection - NHS Trust Ward C",
      eta: "15 mins",
      phone: "07700 900456"
    },
    { 
      id: 3, 
      name: "James Foster", 
      status: "available",
      nextJob: "Not assigned",
      eta: "-",
      phone: "07700 900789"
    },
  ];

  const handleJobClick = (job) => {
    if (job && job.id) {
      navigate(`${createPageUrl("JobDetail")}?id=${job.id}`);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row">
      {/* Left Sidebar - Engineer List */}
      <div className="w-full lg:w-80 border-b lg:border-r lg:border-b-0 border-[rgba(255,255,255,0.08)] p-6 overflow-y-auto bg-[#0D1117]">
        <h2 className="text-xl font-bold text-white mb-6">Live Map & Tracking</h2>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white mb-3">
            Engineers ({engineers.length})
          </h3>
          {engineers.map((engineer) => (
            <div
              key={engineer.id}
              onClick={() => setSelectedEngineer(engineer)}
              className={`glass-panel rounded-xl p-4 border hover:border-[rgba(255,255,255,0.12)] cursor-pointer transition-all ${
                selectedEngineer?.id === engineer.id 
                  ? 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)]' 
                  : 'border-[rgba(255,255,255,0.08)]'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#E1467C] flex items-center justify-center text-white font-bold">
                  {engineer.name[0]}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white text-sm">{engineer.name}</h4>
                  <Badge className={`${statusColors[engineer.status]} border text-xs mt-1`}>
                    {engineer.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-[#CED4DA] space-y-1">
                <div className="flex items-center gap-2">
                  <Wrench className="w-3 h-3" strokeWidth={1.5} />
                  <span className="line-clamp-1">{engineer.nextJob}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  <span>ETA: {engineer.eta}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Map - Full Width */}
      <div className="flex-1 relative">
        {user && (
          <LiveMap 
            orgId={user.org_id || 'default-org'} 
            compact={false}
            onJobClick={handleJobClick}
          />
        )}
      </div>

      {/* Right Sidebar - Engineer Details (when selected) */}
      {selectedEngineer && (
        <div className="w-full lg:w-96 border-t lg:border-l lg:border-t-0 border-[rgba(255,255,255,0.08)] p-6 overflow-y-auto bg-[#0D1117]">
          <div className="glass-panel rounded-xl p-6 border border-[rgba(255,255,255,0.08)] mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#E1467C] flex items-center justify-center text-white font-bold text-lg">
                {selectedEngineer.name[0]}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white">{selectedEngineer.name}</h3>
                <Badge className={`${statusColors[selectedEngineer.status]} border text-xs mt-1`}>
                  {selectedEngineer.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Wrench className="w-4 h-4 text-[#CED4DA] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-[#CED4DA] text-xs mb-1">Next Job</p>
                  <p className="text-white">{selectedEngineer.nextJob}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#CED4DA] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-[#CED4DA] text-xs mb-1">ETA</p>
                  <p className="text-white">{selectedEngineer.eta}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-[#CED4DA] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-[#CED4DA] text-xs mb-1">Contact</p>
                  <p className="text-white">{selectedEngineer.phone}</p>
                </div>
              </div>
            </div>
          </div>

          <Button className="w-full bg-[#E1467C] hover:bg-[#E1467C]/90 text-white">
            <Navigation className="w-4 h-4 mr-2" strokeWidth={1.5} />
            View Route
          </Button>
        </div>
      )}
    </div>
  );
}