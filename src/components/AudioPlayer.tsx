import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '../App';

interface AudioPlayerProps {
  src: string;
  isMe: boolean;
}

export function AudioPlayer({ src, isMe }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [src]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-4 min-w-[200px] py-1">
      <button 
        onClick={togglePlay}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md flex-shrink-0",
          isMe ? "bg-white text-primary" : "bg-primary text-white"
        )}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-1" />
        )}
      </button>
      <div className="flex-1 relative h-6 flex items-center">
        <div className="absolute inset-0 flex items-center gap-0.5">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "flex-1 rounded-full transition-all",
                isMe ? "bg-white/30" : "bg-gray-300",
                i % 3 === 0 ? "h-4" : i % 2 === 0 ? "h-6" : "h-3",
                (i / 20) * 100 <= progress && (isMe ? "bg-white" : "bg-primary")
              )} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
