import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Activity, MapPin, Wrench } from "lucide-react";

export default function TestRedisPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, status, message, data = null) => {
    setResults(prev => [...prev, {
      test,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testEngineerLocation = async () => {
    setLoading(true);
    addResult('Engineer Location', 'pending', 'Sending location update...');
    
    try {
      // London coordinates with slight random offset
      const lat = 51.5074 + (Math.random() - 0.5) * 0.01;
      const lng = -0.1278 + (Math.random() - 0.5) * 0.01;
      
      const response = await base44.functions.invoke('updateEngineerLocation', {
        lat,
        lng,
        accuracy: 10,
        battery_level: 85,
      });

      if (response.data.success) {
        addResult(
          'Engineer Location',
          'success',
          `Location updated! Redis: ${response.data.redis_configured ? '✅' : '❌'}`,
          response.data
        );
      } else {
        addResult('Engineer Location', 'error', response.data.error);
      }
    } catch (error) {
      addResult('Engineer Location', 'error', error.message);
    }
    
    setLoading(false);
  };

  const testJobStatusUpdate = async () => {
    setLoading(true);
    addResult('Job Status', 'pending', 'Fetching job and updating status...');
    
    try {
      // Get first job
      const jobs = await base44.entities.Job.list('-created_date', 1);
      
      if (jobs.length === 0) {
        addResult('Job Status', 'error', 'No jobs found in database');
        setLoading(false);
        return;
      }

      const job = jobs[0];
      const currentStatus = job.status || 'new';
      
      // Determine next status
      const statusFlow = {
        'new': 'assigned',
        'assigned': 'on_route',
        'on_route': 'on_site',
        'on_site': 'completed',
      };
      
      const nextStatus = statusFlow[currentStatus];
      
      if (!nextStatus) {
        addResult('Job Status', 'error', `Cannot transition from ${currentStatus}`);
        setLoading(false);
        return;
      }

      const response = await base44.functions.invoke('updateJobStatus', {
        job_id: job.id,
        to_status: nextStatus,
      });

      if (response.data.success) {
        addResult(
          'Job Status',
          'success',
          `Job ${job.job_number || job.id.slice(0, 8)}: ${currentStatus} → ${nextStatus}. Redis: ${response.data.redis_configured ? '✅' : '❌'}`,
          response.data
        );
      } else {
        addResult('Job Status', 'error', response.data.error || 'Update failed');
      }
    } catch (error) {
      addResult('Job Status', 'error', error.message);
    }
    
    setLoading(false);
  };

  const testApprovalProcess = async () => {
    setLoading(true);
    addResult('Approval', 'pending', 'Fetching pending approval...');
    
    try {
      const approvals = await base44.entities.Approval.filter({ status: 'pending' });
      
      if (approvals.length === 0) {
        addResult('Approval', 'error', 'No pending approvals found');
        setLoading(false);
        return;
      }

      const approval = approvals[0];

      const response = await base44.functions.invoke('processApproval', {
        approval_id: approval.id,
        action: 'approve',
      });

      if (response.data.success) {
        addResult(
          'Approval',
          'success',
          `Approved: ${approval.title}. Redis: ${response.data.published ? '✅' : '❌'}`,
          response.data
        );
      } else {
        addResult('Approval', 'error', response.data.error || 'Process failed');
      }
    } catch (error) {
      addResult('Approval', 'error', error.message);
    }
    
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Redis Real-Time Test</h1>
            <p className="text-[#CED4DA]">Test WebSocket pub/sub and function Redis integration</p>
          </div>
          <Badge className="bg-green-500/20 text-green-200 border-green-300/30 border">
            Redis Configured
          </Badge>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={testEngineerLocation}
            disabled={loading}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white h-auto py-4 flex-col"
          >
            <MapPin className="w-6 h-6 mb-2" strokeWidth={1.5} />
            <span className="text-sm font-semibold">Test Engineer Location</span>
            <span className="text-xs opacity-70 mt-1">Publish to map.org.{'{orgId}'}</span>
          </Button>

          <Button
            onClick={testJobStatusUpdate}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white h-auto py-4 flex-col"
          >
            <Wrench className="w-6 h-6 mb-2" strokeWidth={1.5} />
            <span className="text-sm font-semibold">Test Job Status</span>
            <span className="text-xs opacity-70 mt-1">Publish to jobs.org.{'{orgId}'}</span>
          </Button>

          <Button
            onClick={testApprovalProcess}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white h-auto py-4 flex-col"
          >
            <Activity className="w-6 h-6 mb-2" strokeWidth={1.5} />
            <span className="text-sm font-semibold">Test Approval</span>
            <span className="text-xs opacity-70 mt-1">Publish to approvals.org.{'{orgId}'}</span>
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button
              onClick={clearResults}
              variant="outline"
              className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              size="sm"
            >
              Clear Results
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h2 className="text-xl font-bold text-white mb-4">Test Results</h2>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-500/10 border-green-500/30'
                    : result.status === 'error'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" strokeWidth={1.5} />
                    ) : result.status === 'error' ? (
                      <XCircle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
                    ) : (
                      <Activity className="w-5 h-5 text-yellow-400 animate-pulse" strokeWidth={1.5} />
                    )}
                    <span className="font-semibold text-white">{result.test}</span>
                  </div>
                  <span className="text-xs text-[#CED4DA] opacity-50">{result.timestamp}</span>
                </div>
                <p className="text-sm text-[#CED4DA] mb-2">{result.message}</p>
                {result.data && (
                  <details className="text-xs text-[#CED4DA] opacity-70">
                    <summary className="cursor-pointer hover:opacity-100">View Response</summary>
                    <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h2 className="text-xl font-bold text-white mb-4">Testing Instructions</h2>
        <div className="space-y-3 text-sm text-[#CED4DA]">
          <div className="flex gap-3">
            <span className="font-bold text-white">1.</span>
            <div>
              <p className="font-semibold text-white mb-1">Deploy WebSocket Relay</p>
              <p>Deploy <code className="bg-black/20 px-1 rounded">functions/wsRelay.js</code> to Deno Deploy or Fly.io</p>
              <p className="text-xs opacity-70 mt-1">Endpoint: wss://ws.entirecafm.io</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-white">2.</span>
            <div>
              <p className="font-semibold text-white mb-1">Open Map Page</p>
              <p>Navigate to Map & Tracking in another tab</p>
              <p className="text-xs opacity-70 mt-1">Watch for "Live" indicator when WS connects</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-white">3.</span>
            <div>
              <p className="font-semibold text-white mb-1">Run Tests</p>
              <p>Click test buttons above and watch map update in real-time</p>
              <p className="text-xs opacity-70 mt-1">Engineer location should update within 1s, job markers should change color</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-white">4.</span>
            <div>
              <p className="font-semibold text-white mb-1">Check Logs</p>
              <p>Open browser console to see WebSocket messages</p>
              <p className="text-xs opacity-70 mt-1">Look for: 📨 Real-time update: ...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}