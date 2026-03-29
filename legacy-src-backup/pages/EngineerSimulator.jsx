import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Play, Pause, Navigation, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EngineerSimulator() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastResponse, setLastResponse] = useState(null);
  const [currentLocation, setCurrentLocation] = useState({
    lat: 53.800,
    lng: -1.549,
  });
  const [battery, setBattery] = useState(85);

  // Predefined routes for simulation
  const routes = {
    leeds: [
      { lat: 53.800, lng: -1.549, name: "Leeds City Centre" },
      { lat: 53.795, lng: -1.540, name: "Leeds Station" },
      { lat: 53.801, lng: -1.535, name: "Leeds Arena" },
      { lat: 53.803, lng: -1.545, name: "Leeds University" },
    ],
    london: [
      { lat: 51.5074, lng: -0.1278, name: "London Centre" },
      { lat: 51.5155, lng: -0.1419, name: "Regent Street" },
      { lat: 51.5007, lng: -0.1246, name: "Westminster" },
      { lat: 51.5194, lng: -0.1270, name: "King's Cross" },
    ],
    manchester: [
      { lat: 53.4808, lng: -2.2426, name: "Manchester Centre" },
      { lat: 53.4770, lng: -2.2309, name: "Deansgate" },
      { lat: 53.4830, lng: -2.2446, name: "Piccadilly" },
      { lat: 53.4876, lng: -2.2394, name: "Victoria" },
    ],
  };

  const [selectedRoute, setSelectedRoute] = useState("leeds");
  const [routeIndex, setRouteIndex] = useState(0);

  // Single location update
  const sendLocationUpdate = async (lat, lng) => {
    try {
      const response = await base44.functions.invoke('updateEngineerLocation', {
        lat,
        lng,
        accuracy: 10,
        battery_level: battery,
        timestamp: new Date().toISOString(),
      });

      setLastResponse(response.data);
      setUpdateCount(prev => prev + 1);
      
      if (response.data.success) {
        console.log('✅ Location update successful:', response.data);
        if (response.data.published) {
          console.log('📡 Published to Redis: map.org.' + (response.data.location?.org_id || 'unknown'));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Location update failed:', error);
      setLastResponse({ error: error.message });
    }
  };

  // Auto-simulation along route
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const route = routes[selectedRoute];
      const nextIndex = (routeIndex + 1) % route.length;
      const location = route[nextIndex];
      
      setCurrentLocation(location);
      setRouteIndex(nextIndex);
      setBattery(prev => Math.max(20, prev - 1));
      
      sendLocationUpdate(location.lat, location.lng);
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [isSimulating, routeIndex, selectedRoute]);

  const handleManualUpdate = () => {
    sendLocationUpdate(currentLocation.lat, currentLocation.lng);
  };

  const handleRandomJump = () => {
    const lat = 51.5074 + (Math.random() - 0.5) * 0.1;
    const lng = -0.1278 + (Math.random() - 0.5) * 0.1;
    setCurrentLocation({ lat, lng });
    sendLocationUpdate(lat, lng);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Engineer Location Simulator</h1>
            <p className="text-[#CED4DA]">Test real-time map updates by simulating engineer movement</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${lastResponse?.published ? 'bg-green-500/20 text-green-200 border-green-300/30' : 'bg-yellow-500/20 text-yellow-200 border-yellow-300/30'} border`}>
              Redis: {lastResponse?.redis_configured ? 'Connected' : 'Checking...'}
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-200 border-blue-300/30 border">
              Updates: {updateCount}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h2 className="text-xl font-bold text-white mb-4">Simulation Controls</h2>
          
          {/* Route Selection */}
          <div className="mb-4">
            <Label className="text-white mb-2 block">Select Route</Label>
            <div className="flex gap-2">
              {Object.keys(routes).map(route => (
                <Button
                  key={route}
                  onClick={() => {
                    setSelectedRoute(route);
                    setRouteIndex(0);
                    setCurrentLocation(routes[route][0]);
                  }}
                  variant={selectedRoute === route ? "default" : "outline"}
                  className={selectedRoute === route ? "bg-[#E1467C]" : "border-[rgba(255,255,255,0.08)] text-[#CED4DA]"}
                  size="sm"
                >
                  {route.charAt(0).toUpperCase() + route.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Current Location */}
          <div className="mb-4 glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-[#E1467C]" strokeWidth={1.5} />
              <span className="text-sm font-semibold text-white">
                {routes[selectedRoute][routeIndex]?.name || 'Current Location'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-[#CED4DA] mb-1 block">Latitude</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={currentLocation.lat}
                  onChange={(e) => setCurrentLocation({...currentLocation, lat: parseFloat(e.target.value)})}
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white h-8"
                />
              </div>
              <div>
                <Label className="text-[#CED4DA] mb-1 block">Longitude</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={currentLocation.lng}
                  onChange={(e) => setCurrentLocation({...currentLocation, lng: parseFloat(e.target.value)})}
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white h-8"
                />
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-[#CED4DA] mb-1 block">Battery: {battery}%</Label>
              <div className="w-full bg-[rgba(255,255,255,0.08)] rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${battery}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`w-full ${isSimulating ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#E1467C] hover:bg-[#E1467C]/90'} text-white`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Stop Auto-Simulation
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Start Auto-Simulation (3s intervals)
                </>
              )}
            </Button>

            <Button
              onClick={handleManualUpdate}
              variant="outline"
              disabled={isSimulating}
              className="w-full border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
            >
              <Navigation className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Send Single Update
            </Button>

            <Button
              onClick={handleRandomJump}
              variant="outline"
              disabled={isSimulating}
              className="w-full border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
            >
              <Zap className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Random Jump (London)
            </Button>
          </div>
        </div>

        {/* Response Monitor */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h2 className="text-xl font-bold text-white mb-4">Last Response</h2>
          
          {lastResponse ? (
            <div className="space-y-3">
              {/* Status */}
              <div className={`p-3 rounded-lg border ${
                lastResponse.success 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">
                    {lastResponse.success ? '✅ Success' : '❌ Failed'}
                  </span>
                </div>
                {lastResponse.error && (
                  <p className="text-xs text-red-400">{lastResponse.error}</p>
                )}
              </div>

              {/* Redis Status */}
              {lastResponse.published !== undefined && (
                <div className={`p-3 rounded-lg border ${
                  lastResponse.published
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      📡 Redis Publish: {lastResponse.published ? 'Success' : 'Skipped'}
                    </span>
                  </div>
                  {lastResponse.location?.org_id && (
                    <p className="text-xs text-[#CED4DA] mt-1">
                      Channel: map.org.{lastResponse.location.org_id}
                    </p>
                  )}
                </div>
              )}

              {/* Location Data */}
              {lastResponse.location && (
                <div className="glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)]">
                  <p className="text-xs font-semibold text-white mb-2">Location Record</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#CED4DA]">
                    <div>
                      <span className="opacity-70">ID:</span>
                      <p className="text-white truncate">{lastResponse.location.id.slice(0, 12)}...</p>
                    </div>
                    <div>
                      <span className="opacity-70">Engineer:</span>
                      <p className="text-white truncate">{lastResponse.location.engineer_id.slice(0, 12)}...</p>
                    </div>
                    <div>
                      <span className="opacity-70">Lat:</span>
                      <p className="text-white">{lastResponse.location.lat.toFixed(6)}</p>
                    </div>
                    <div>
                      <span className="opacity-70">Lng:</span>
                      <p className="text-white">{lastResponse.location.lng.toFixed(6)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Response */}
              <details className="text-xs">
                <summary className="cursor-pointer text-[#CED4DA] hover:text-white mb-2">
                  View Full Response JSON
                </summary>
                <pre className="glass-panel rounded-lg p-3 overflow-x-auto text-[#CED4DA] border border-[rgba(255,255,255,0.08)]">
                  {JSON.stringify(lastResponse, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="text-center py-12 text-[#CED4DA] opacity-50">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
              <p>No updates sent yet</p>
              <p className="text-xs mt-1">Click a button to send location update</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h2 className="text-xl font-bold text-white mb-4">How to Test Real-Time Updates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[#CED4DA]">
          <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
            <div className="text-2xl mb-2">1️⃣</div>
            <p className="font-semibold text-white mb-2">Open Map Page</p>
            <p className="text-xs">Navigate to "Map & Tracking" in a separate browser window/tab</p>
          </div>
          <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
            <div className="text-2xl mb-2">2️⃣</div>
            <p className="font-semibold text-white mb-2">Start Simulation</p>
            <p className="text-xs">Click "Start Auto-Simulation" to send location updates every 3 seconds</p>
          </div>
          <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
            <div className="text-2xl mb-2">3️⃣</div>
            <p className="font-semibold text-white mb-2">Watch Live Updates</p>
            <p className="text-xs">See engineer marker move in real-time on map (if WebSocket is active) or every 30s (polling)</p>
          </div>
        </div>
      </div>
    </div>
  );
}