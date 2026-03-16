
import React from 'react';
import { motion } from 'motion/react';
import { Hourglass } from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="max-w-lg"
      >
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-[#F59E0B]/10 blur-3xl rounded-full"></div>
          <Hourglass size={64} className="relative text-[#D97706] mx-auto opacity-80" />
        </div>
        <h2 className="text-5xl font-serif font-light text-[#2D2A26] mb-6">
          Every moment is a gift
        </h2>
        <p className="text-lg text-[#78716C] font-light leading-relaxed mb-8">
          Your life is a unique story written in months.<br/>
          Enter your birth date to see the canvas you've filled and the future space waiting for your creation.
        </p>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#A8A29E] border-t border-[#E7E5E4] pt-6">
          <span>Please select your starting point above</span>
        </div>
      </motion.div>
    </div>
  );
};
