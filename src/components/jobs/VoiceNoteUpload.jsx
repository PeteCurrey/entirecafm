import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Square,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileAudio
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function VoiceNoteUpload({ jobId, onSuccess }) {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Step 1: Upload audio file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Step 2: Process with talkToQuote
      const response = await base44.functions.invoke('talkToQuote', {
        audio_url: file_url,
        job_id: jobId
      });

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['quotes']);
      queryClient.invalidateQueries(['voice-notes']);
      
      setAudioBlob(null);
      setRecordingTime(0);
      
      if (onSuccess) {
        onSuccess(data);
      }
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioBlob(file);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;

    const file = audioBlob instanceof File 
      ? audioBlob 
      : new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

    uploadMutation.mutate(file);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center gap-2 mb-4">
        <Mic className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
        <h3 className="text-lg font-bold text-white">Voice Note → Quote</h3>
      </div>

      {!audioBlob && !isRecording && (
        <div className="space-y-4">
          <p className="text-sm text-[#CED4DA]">
            Record or upload a voice note describing parts used and work completed. 
            AI will automatically generate a quote.
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={startRecording}
              className="flex-1 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              <Mic className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Start Recording
            </Button>

            <label className="flex-1">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
                onClick={() => document.querySelector('input[type="file"]').click()}
              >
                <Upload className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Upload Audio
              </Button>
            </label>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 glass-panel rounded-lg border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white font-semibold">Recording...</span>
            </div>
            <span className="text-[#E1467C] font-mono text-lg">
              {formatTime(recordingTime)}
            </span>
          </div>

          <Button
            onClick={stopRecording}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <Square className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Stop Recording
          </Button>
        </div>
      )}

      {audioBlob && !isRecording && (
        <div className="space-y-4">
          <div className="p-4 glass-panel rounded-lg border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3 mb-3">
              <FileAudio className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
              <span className="text-white font-semibold">Audio Ready</span>
            </div>
            
            {audioBlob instanceof Blob && (
              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
                className="w-full"
                style={{ 
                  filter: 'invert(1) hue-rotate(180deg)',
                  borderRadius: '8px'
                }}
              />
            )}
          </div>

          {uploadMutation.data && (
            <div className={cn(
              "p-4 rounded-lg border",
              uploadMutation.data.success
                ? "bg-green-500/10 border-green-500/30"
                : "bg-yellow-500/10 border-yellow-500/30"
            )}>
              <div className="flex items-start gap-3">
                {uploadMutation.data.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                )}
                <div className="flex-1">
                  <p className="text-white font-semibold mb-1">
                    {uploadMutation.data.message}
                  </p>
                  
                  {uploadMutation.data.confidence && (
                    <Badge className={cn(
                      "mb-2",
                      uploadMutation.data.confidence >= 0.8
                        ? "bg-green-500/20 text-green-200"
                        : "bg-yellow-500/20 text-yellow-200"
                    )}>
                      Confidence: {(uploadMutation.data.confidence * 100).toFixed(0)}%
                    </Badge>
                  )}

                  {uploadMutation.data.transcript && (
                    <details className="mt-2">
                      <summary className="text-xs text-[#CED4DA] cursor-pointer hover:text-white">
                        View Transcript
                      </summary>
                      <p className="text-xs text-[#CED4DA] mt-2 p-2 glass-panel rounded border border-[rgba(255,255,255,0.08)]">
                        "{uploadMutation.data.transcript}"
                      </p>
                    </details>
                  )}

                  {uploadMutation.data.line_items && uploadMutation.data.line_items.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-[#CED4DA] font-semibold">Quote Items:</p>
                      {uploadMutation.data.line_items.map((item, idx) => (
                        <div key={idx} className="text-xs text-[#CED4DA] flex justify-between">
                          <span>{item.description} x{item.quantity}</span>
                          <span className="text-white">£{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="text-sm text-white font-bold pt-2 border-t border-[rgba(255,255,255,0.08)]">
                        Total: £{uploadMutation.data.totals?.total.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {uploadMutation.data.unmatched_items && uploadMutation.data.unmatched_items.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                      <p className="text-xs text-yellow-400 font-semibold">⚠️ Unmatched Items:</p>
                      <p className="text-xs text-[#CED4DA]">
                        {uploadMutation.data.unmatched_items.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={uploadMutation.isPending}
              className="flex-1 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.5} />
                  Processing...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Generate Quote
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                setAudioBlob(null);
                uploadMutation.reset();
              }}
              variant="outline"
              disabled={uploadMutation.isPending}
              className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}