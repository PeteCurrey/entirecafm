import React, { useState, useEffect } from "react";
import { Play, Pause, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveTimeEntry } from "./OfflineStorage";

export default function TimeTracker({ job, user, onTimeSaved }) {
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [savedEntries, setSavedEntries] = useState([]);

  // Load any existing time for this job from localStorage
  useEffect(() => {
    const savedTracking = localStorage.getItem(`time_tracking_${job.id}`);
    if (savedTracking) {
      const { start, elapsed } = JSON.parse(savedTracking);
      if (start) {
        setStartTime(new Date(start));
        setIsTracking(true);
        // Calculate elapsed time since last save
        const additionalElapsed = Math.floor((Date.now() - new Date(start).getTime()) / 1000);
        setElapsedSeconds(elapsed + additionalElapsed);
      } else {
        setElapsedSeconds(elapsed);
      }
    }
  }, [job.id]);

  // Timer tick
  useEffect(() => {
    let interval;
    if (isTracking && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setElapsedSeconds(elapsed);
        
        // Save to localStorage for persistence
        localStorage.setItem(`time_tracking_${job.id}`, JSON.stringify({
          start: startTime.toISOString(),
          elapsed: 0
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, startTime, job.id]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (isTracking) {
      // Stop tracking
      setIsTracking(false);
      localStorage.setItem(`time_tracking_${job.id}`, JSON.stringify({
        start: null,
        elapsed: elapsedSeconds
      }));
    } else {
      // Start tracking
      const now = new Date();
      setStartTime(now);
      setIsTracking(true);
      localStorage.setItem(`time_tracking_${job.id}`, JSON.stringify({
        start: now.toISOString(),
        elapsed: elapsedSeconds
      }));
    }
  };

  const handleSaveTime = async () => {
    if (elapsedSeconds < 60) return; // Minimum 1 minute

    const entry = {
      job_id: job.id,
      engineer_id: user.id,
      org_id: user.org_id,
      start_time: startTime ? startTime.getTime() : Date.now() - (elapsedSeconds * 1000),
      end_time: Date.now(),
      duration_minutes: Math.ceil(elapsedSeconds / 60),
      notes: `Time tracked for ${job.title}`
    };

    await saveTimeEntry(entry);
    
    setSavedEntries([...savedEntries, entry]);
    setElapsedSeconds(0);
    setStartTime(null);
    setIsTracking(false);
    localStorage.removeItem(`time_tracking_${job.id}`);
    
    if (onTimeSaved) onTimeSaved(entry);
  };

  return (
    <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#E1467C]" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-white">Time Tracker</span>
        </div>
        {isTracking && (
          <Badge className="bg-green-500/20 text-green-300 border-green-400/30 border animate-pulse">
            Recording
          </Badge>
        )}
      </div>

      <div className="text-center mb-4">
        <div className="text-4xl font-mono font-bold text-white">
          {formatTime(elapsedSeconds)}
        </div>
        <p className="text-xs text-[#CED4DA] mt-1">
          {elapsedSeconds > 0 ? `${Math.ceil(elapsedSeconds / 60)} minutes logged` : 'Ready to track'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleStartStop}
          className={`thumb-target ${
            isTracking 
              ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30 hover:bg-orange-500/30' 
              : 'bg-green-500/20 text-green-300 border border-green-400/30 hover:bg-green-500/30'
          }`}
        >
          {isTracking ? (
            <>
              <Pause className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" strokeWidth={1.5} />
              {elapsedSeconds > 0 ? 'Resume' : 'Start'}
            </>
          )}
        </Button>

        <Button
          onClick={handleSaveTime}
          disabled={elapsedSeconds < 60 || isTracking}
          className="thumb-target bg-[#E1467C] hover:bg-[#E1467C]/90 text-white disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" strokeWidth={1.5} />
          Save Time
        </Button>
      </div>

      {savedEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <p className="text-xs text-[#CED4DA] mb-2">Saved entries (pending sync):</p>
          {savedEntries.map((entry, idx) => (
            <div key={idx} className="text-xs text-white bg-[rgba(255,255,255,0.04)] rounded px-2 py-1 mb-1">
              {entry.duration_minutes} min
            </div>
          ))}
        </div>
      )}
    </div>
  );
}