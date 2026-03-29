import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSyncStatus, syncPendingUpdates } from "./SyncManager";

export default function SyncIndicator({ onSyncComplete }) {
  const [syncStatus, setSyncStatus] = useState({
    pendingUpdates: 0,
    unsyncedTimeEntries: 0,
    unsyncedPhotos: 0,
    total: 0,
    isOnline: navigator.onLine
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  useEffect(() => {
    // Initial status check
    updateSyncStatus();

    // Update on online/offline changes
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      updateSyncStatus();
    };
    
    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic status check
    const interval = setInterval(updateSyncStatus, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateSyncStatus = async () => {
    const status = await getSyncStatus();
    setSyncStatus(status);
  };

  const handleManualSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    
    setIsSyncing(true);
    const result = await syncPendingUpdates();
    setLastSyncResult(result);
    await updateSyncStatus();
    setIsSyncing(false);
    
    if (onSyncComplete) onSyncComplete(result);
  };

  const { isOnline, total } = syncStatus;

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline indicator */}
      <Badge 
        className={`${
          isOnline 
            ? 'bg-green-500/20 text-green-300 border-green-400/30' 
            : 'bg-red-500/20 text-red-300 border-red-400/30'
        } border flex items-center gap-1`}
      >
        {isOnline ? (
          <Wifi className="w-3 h-3" strokeWidth={2} />
        ) : (
          <WifiOff className="w-3 h-3" strokeWidth={2} />
        )}
        {isOnline ? 'Online' : 'Offline'}
      </Badge>

      {/* Pending sync indicator */}
      {total > 0 && (
        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30 border flex items-center gap-1">
          <AlertCircle className="w-3 h-3" strokeWidth={2} />
          {total} pending
        </Badge>
      )}

      {/* Sync button */}
      {isOnline && total > 0 && (
        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[#CED4DA] hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
        </Button>
      )}

      {/* Last sync result */}
      {lastSyncResult && (
        <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 border">
          <Check className="w-3 h-3 mr-1" strokeWidth={2} />
          Synced {lastSyncResult.synced}
        </Badge>
      )}
    </div>
  );
}