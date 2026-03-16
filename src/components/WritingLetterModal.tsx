
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Unlock, Lock, Trash2, Feather } from 'lucide-react';
import { FutureLetter, Stats } from '../types';
import { WRITING_PROMPTS } from '../constants';

interface WritingLetterModalProps {
  isWritingLetter: boolean;
  setIsWritingLetter: (val: boolean) => void;
  writingLetterType: 'general' | 'century';
  currentInspiration: string | null;
  setCurrentInspiration: (val: string | null) => void;
  newLetterContent: string;
  setNewLetterContent: (val: string) => void;
  newCenturyLetterContent: string;
  setNewCenturyLetterContent: (val: string) => void;
  newLetterAge: number | '';
  setNewLetterAge: (val: number | '') => void;
  ageIn2100: number;
  addLetter: () => void;
  letterError: string;
  setLetterError: (val: string) => void;
  letters: FutureLetter[];
  stats: Stats | null;
  canReachNextCentury: boolean;
  handleQuickLetterTo2100: () => void;
  removeLetter: (id: string) => void;
}

export const WritingLetterModal: React.FC<WritingLetterModalProps> = ({
  isWritingLetter,
  setIsWritingLetter,
  writingLetterType,
  currentInspiration,
  setCurrentInspiration,
  newLetterContent,
  setNewLetterContent,
  newCenturyLetterContent,
  setNewCenturyLetterContent,
  newLetterAge,
  setNewLetterAge,
  ageIn2100,
  addLetter,
  letterError,
  setLetterError,
  letters,
  stats,
  canReachNextCentury,
  handleQuickLetterTo2100,
  removeLetter,
}) => {
  return (
    <div className="min-h-[220px] flex flex-col">
      <AnimatePresence mode="wait">
        {isWritingLetter ? (
          <motion.div 
            key="writing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 w-full"
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest">
                {writingLetterType === 'general' ? 'Letter to the Future' : 'Century Capsule'}
              </p>
              <button 
                onClick={() => {
                  const prompts = writingLetterType === 'general' ? WRITING_PROMPTS.general : WRITING_PROMPTS.century;
                  let randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
                  if (randomPrompt === currentInspiration && prompts.length > 1) {
                    randomPrompt = prompts.find(p => p !== currentInspiration) || randomPrompt;
                  }
                  setCurrentInspiration(randomPrompt);
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-amber-600 transition-colors uppercase tracking-widest"
              >
                <Sparkles size={10} />
                {currentInspiration ? 'Change' : 'Get Inspiration'}
              </button>
            </div>
            <textarea 
              placeholder={currentInspiration || (writingLetterType === 'general' ? "Write to your future self..." : "Write to your new century self...")}
              className="w-full h-32 px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-2xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder-[#A8A29E] font-medium resize-none"
              value={writingLetterType === 'general' ? newLetterContent : newCenturyLetterContent}
              onChange={(e) => {
                if (writingLetterType === 'general') {
                  setNewLetterContent(e.target.value);
                } else {
                  setNewCenturyLetterContent(e.target.value);
                }
                if (letterError) setLetterError('');
              }}
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="number" 
                placeholder="Unlock Age (e.g., 40)"
                className={`w-full sm:flex-1 px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-2xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder-[#A8A29E] font-medium ${writingLetterType === 'century' ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={writingLetterType === 'general' ? newLetterAge : ageIn2100}
                disabled={writingLetterType === 'century'}
                onChange={(e) => {
                  if (writingLetterType === 'general') {
                    setNewLetterAge(e.target.value === '' ? '' : parseInt(e.target.value));
                    if (letterError) setLetterError('');
                  }
                }}
              />
              <button 
                onClick={addLetter}
                className="w-full sm:w-auto px-6 py-3 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                <span className="text-sm font-bold">Send</span>
              </button>
            </div>
            {letterError && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-rose-500 text-[10px] font-bold mt-1 ml-1"
              >
                {letterError}
              </motion.p>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px] w-full"
          >
            <div className="flex flex-col gap-4">
              {letters.length === 0 ? (
                <div className="text-center py-10 px-1">
                  {canReachNextCentury ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleQuickLetterTo2100}
                      className="space-y-3 cursor-pointer p-6 rounded-[2rem] bg-amber-50/40 border border-amber-100/50 hover:bg-amber-50/60 transition-all group shadow-sm"
                    >
                      <div className="flex justify-center text-amber-500 mb-1 group-hover:scale-110 transition-transform">
                        <Sparkles size={24} />
                      </div>
                      <p className="text-amber-800/90 text-[13px] font-medium italic leading-relaxed tracking-wide">
                        You have a chance to witness the dawn of the 22nd century. Write a letter to your 2100 self.
                      </p>
                    </motion.div>
                  ) : (
                    <p className="text-[#A8A29E] text-sm font-serif italic">No letters to the future yet...</p>
                  )}
                </div>
              ) : (
                [...letters].sort((a, b) => a.unlockAge - b.unlockAge).map(letter => {
                  const isUnlocked = (stats?.yearsLived || 0) >= letter.unlockAge;
                  return (
                    <div key={letter.id} className="p-4 bg-[#FAFAF9] rounded-[1.5rem] border border-[#F5F5F4] group hover:border-[#E7E5E4] transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isUnlocked ? <Unlock size={14} className="text-emerald-500" /> : <Lock size={14} className="text-amber-500" />}
                          <span className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">
                            Unlock at Age {letter.unlockAge}
                          </span>
                        </div>
                        <button 
                          onClick={() => removeLetter(letter.id)}
                          className="p-1 text-[#D6D3D1] hover:text-[#F43F5E] transition-colors opacity-40 md:opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {isUnlocked ? (
                        <p className="text-sm text-[#44403C] leading-relaxed italic">"{letter.content}"</p>
                      ) : (
                        <div className="h-12 flex items-center justify-center bg-stone-100/50 rounded-xl border border-dashed border-stone-200">
                          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Content Encrypted</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
