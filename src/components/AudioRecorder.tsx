import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, Play, Pause, Send } from 'lucide-react';
import { toast } from 'sonner';

export const AudioRecorder: React.FC<{ onStop: (blob: Blob) => void }> = ({ onStop }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<any>(null);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(15).fill(2));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        onStop(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startTimer();
      startVisualizer();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Não foi possível aceder ao microfone.');
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration(prev => {
        if (prev >= 119) { // Limit to 2 minutes
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const startVisualizer = () => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setVisualizerData(new Array(15).fill(0).map(() => Math.floor(Math.random() * 12) + 2));
      }
    }, 100);
    return () => clearInterval(interval);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center">
      {isRecording ? (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-2.5 rounded-[24px] border border-red-100 shadow-lg shadow-red-100/50 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-1.5 px-2">
            {visualizerData.map((h, i) => (
              <motion.div 
                key={i}
                animate={{ height: isPaused ? 2 : h }}
                className="w-0.5 bg-red-500 rounded-full"
                style={{ height: 2 }}
              />
            ))}
          </div>
          
          <span className="text-[11px] font-black tracking-widest min-w-[40px] font-mono">{formatDuration(duration)}</span>
          
          <div className="flex items-center gap-1.5 border-l border-red-200 pl-3 ml-1">
            {isPaused ? (
              <button 
                onClick={resumeRecording} 
                className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-full transition-all hover:scale-110 active:scale-95"
                title="Retomar"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button 
                onClick={pauseRecording} 
                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full transition-all hover:scale-110 active:scale-95"
                title="Pausar"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
            )}
            <button 
              onClick={stopRecording} 
              className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-full transition-all hover:scale-110 active:scale-95 shadow-md shadow-red-200"
              title="Parar e Enviar"
            >
              <Send className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={startRecording}
          className="p-3.5 text-gray-400 hover:bg-primary/10 hover:text-primary rounded-2xl transition-all group relative overflow-hidden"
        >
          <Mic className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" />
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
};
