import React from 'react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

export const LoadingScreen = () => (
  <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8">
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mb-8"
    >
      <Logo />
    </motion.div>
    <div className="w-48 h-1.5 bg-brand-gray/30 rounded-full overflow-hidden relative">
      <motion.div 
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="absolute inset-0 bg-primary rounded-full"
      />
    </div>
    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-brand-ink/30 animate-pulse">
      Conectando ao Servidor...
    </p>
  </div>
);
