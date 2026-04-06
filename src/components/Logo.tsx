import React, { useId } from 'react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export const Logo = ({ className = "" }: { className?: string }) => {
  const { theme } = useTheme();
  const gradientId = useId().replace(/:/g, '');
  
  return (
    <div 
      className={cn("flex items-center justify-center cursor-pointer select-none", className)}
    >
      <div className="w-32 h-12 relative">
        <svg viewBox="0 0 300 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme === 'yellow' ? "#FDE047" : "#0066FF"} />
              <stop offset="50%" stopColor={theme === 'yellow' ? "#FACC15" : "#00D4FF"} />
              <stop offset="100%" stopColor={theme === 'yellow' ? "#EAB308" : "#33FF66"} />
            </linearGradient>
          </defs>
          
          <g transform="translate(10, 10) scale(0.8)">
            {/* Left bar top */}
            <polygon points="0,0 25,0 25,50 0,75" fill={`url(#${gradientId})`} />
            {/* Arrow */}
            <polygon points="0,80 65,15 55,5 85,5 85,35 75,25 0,100" fill={`url(#${gradientId})`} />
            {/* Bottom leg */}
            <polygon points="5,100 45,60 85,100" fill={`url(#${gradientId})`} />
          </g>
          
          {/* AZI */}
          <text x="90" y="85" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="85" fill={`url(#${gradientId})`} letterSpacing="2">AZI</text>
        </svg>
      </div>
    </div>
  );
};
