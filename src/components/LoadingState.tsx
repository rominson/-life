
import React from 'react';

export const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
        <p className="text-stone-400 text-sm font-serif italic">Connecting to the time tunnel...</p>
      </div>
    </div>
  );
};
