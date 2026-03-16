
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Plus, Lock, Trash2 } from 'lucide-react';
import { FutureLetter, Stats } from '../types';

interface LetterSectionProps {
  letters: FutureLetter[];
  stats: Stats | null;
  setIsWritingLetter: (val: boolean) => void;
  removeLetter: (id: string) => void;
  openLetter: (letter: FutureLetter) => void;
}

export const LetterSection: React.FC<LetterSectionProps> = ({
  letters,
  stats,
  setIsWritingLetter,
  removeLetter,
  openLetter,
}) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F5F5F4] flex flex-col min-h-[380px] w-full"
    >
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F0FDF4] rounded-xl text-[#10B981]">
            <Mail size={20} />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#2D2A26]">Time Capsule</h3>
        </div>
        <button 
          onClick={() => setIsWritingLetter(true)}
          className="p-2 bg-[#FAFAF9] text-[#57534E] rounded-xl hover:bg-[#F5F5F4] transition-all active:scale-95 border border-[#E7E5E4]"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
        <AnimatePresence initial={false}>
          <div className="flex flex-col gap-4">
            {[...letters].sort((a, b) => a.age - b.age).map(letter => {
              const isUnlocked = (stats?.yearsLived || 0) >= letter.age;
              
              return (
                <motion.div 
                  key={letter.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`
                    flex items-center justify-between p-4 rounded-[1.5rem] border transition-all group
                    ${isUnlocked 
                      ? 'bg-[#F0FDF4] border-[#DCFCE7] hover:border-[#BBF7D0] cursor-pointer' 
                      : 'bg-[#FAFAF9] border-[#F5F5F4] opacity-80'
                    }
                  `}
                  onClick={() => isUnlocked && openLetter(letter)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isUnlocked ? 'bg-white text-[#10B981]' : 'bg-white text-[#A8A29E]'}
                    `}>
                      {isUnlocked ? <Mail size={18} /> : <Lock size={18} />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${isUnlocked ? 'text-[#166534]' : 'text-[#78716C]'}`}>
                        Letter to Age {letter.age}
                      </span>
                      <span className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mt-0.5">
                        {isUnlocked ? 'Unlocked & Ready' : `Unlocks in ${letter.age - (stats?.yearsLived || 0)} years`}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLetter(letter.id);
                    }}
                    className="p-2 text-[#D6D3D1] hover:text-[#F43F5E] transition-colors opacity-40 md:opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              );
            })}
            {letters.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#A8A29E] text-sm font-serif italic">No letters sent to the future yet...</p>
              </div>
            )}
          </div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
