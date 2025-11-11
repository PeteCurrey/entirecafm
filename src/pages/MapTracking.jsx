import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { MapPin, User, Navigation, Clock, Phone, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "leaflet/dist/leaflet.css";

export default function MapTrackingPage() {
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock data
  const engineers = [
    { 
      id: 1, 
      name: "Ryan Mitchell", 
      lat: 51.5074, 
      lng: -0.1278, 
      status: "on_site",
      nextJob: "Boiler maintenance - Starbucks Victoria",
      eta: "On site",
      phone: "07700 900123"
    },
    { 
      id: 2, 
      name: "Mia Chen", 
      lat: 51.5155, 
      lng: -0.1419, 
      status: "en_route",
      nextJob: "HVAC inspection - NHS Trust Ward C",
      eta: "15 mins",
      phone: "07700 900456"
    },
    { 
      id: 3, 
      name: "James Foster", 
      lat: 51.5200, 
      lng: -0.1000, 
      status: "available",
      nextJob: "Not assigned",
      eta: "-",
      phone: "07700 900789"
    },
  ];

  const center = [51.5074, -0.1278];

  const statusColors = {
    on_site: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    en_route: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    available: 'bg-green-500/10 text-green-400 border-green-500/30',
  };

  return (
    <div className="h-screen flex">
      <style>{`
        .leaflet-container {
          background: #0D1117;
          height: 100%;
          width: 100%;
        }
        .leaflet-tile {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `}</style>

      {/* Left Sidebar - Filters */}
      <div className="w-80 border-r border-divider p-6 overflow-y-auto bg-[#0D1117]">
        <h2 className="text-xl font-bold text-white mb-6">Map & Tracking</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-body mb-2 block">Filter by Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="glass-panel border-divider text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engineers</SelectItem>
                <SelectItem value="on_site">On Site</SelectItem>
                <SelectItem value="en_route">En Route</SelectItem>
                <SelectItem value="available">Available</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white mb-3">Engineers ({engineers.length})</h3>
          {engineers.map((engineer) => (
            <div
              key={engineer.id}
              onClick={() => setSelectedEngineer(engineer)}
              className={`glass-panel rounded-xl p-4 border border-divider hover:glass-panel-strong cursor-pointer transition-all ${
                selectedEngineer?.id === engineer.id ? 'glass-panel-strong' : ''
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full accent-magenta flex items-center justify-center text-white font-bold">
                  {engineer.name[0]}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white text-sm">{engineer.name}</h4>
                  <Badge className={`${statusColors[engineer.status]} border text-xs mt-1`}>
                    {engineer.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-body space-y-1">
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

      {/* Main Map */}
      <div className="flex-1 relative">
        <MapContainer 
          center={center} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {engineers.map((engineer) => (
            <Marker 
              key={engineer.id}
              position={[engineer.lat, engineer.lng]}
              eventHandlers={{
                click: () => setSelectedEngineer(engineer)
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{engineer.name}</p>
                  <p className="text-xs text-gray-600 capitalize">{engineer.status.replace('_', ' ')}</p>
                  <p className="text-xs mt-1">{engineer.nextJob}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map Controls */}
        <div className="absolute top-6 right-6 glass-panel-strong rounded-xl p-3 border border-divider">
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-body hover:text-white">
              Street
            </Button>
            <Button size="sm" variant="ghost" className="text-body hover:text-white">
              Satellite
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Details */}
      {selectedEngineer && (
        <div className="w-96 border-l border-divider p-6 overflow-y-auto bg-[#0D1117]">
          <div className="glass-panel rounded-xl p-6 border border-divider mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full accent-magenta flex items-center justify-center text-white font-bold text-lg">
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
                <Wrench className="w-4 h-4 text-body flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-body text-xs mb-1">Next Job</p>
                  <p className="text-white">{selectedEngineer.nextJob}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-body flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-body text-xs mb-1">ETA</p>
                  <p className="text-white">{selectedEngineer.eta}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-body flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-body text-xs mb-1">Contact</p>
                  <p className="text-white">{selectedEngineer.phone}</p>
                </div>
              </div>
            </div>
          </div>

          <Button className="w-full accent-magenta">
            <Navigation className="w-4 h-4 mr-2" strokeWidth={1.5} />
            View Route
          </Button>
        </div>
      )}
    </div>
  );
}