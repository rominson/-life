
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Smartphone } from 'lucide-react';
import { User } from '../types';

const TimeTunnel = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-emerald-900 to-stone-900 opacity-90" />
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            scale: 0.1, 
            opacity: 0,
            x: '-50%',
            y: '-50%',
            left: '50%',
            top: '50%',
            rotateZ: i * 18
          }}
          animate={{ 
            scale: [0.1, 4], 
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeIn"
          }}
          className="absolute w-[400px] h-[400px] border border-emerald-500/20 rounded-full"
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
};

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmittingReminder: boolean;
  pendingLetter: { content: string; age: number } | null;
  user: User | null;
  confirmLetter: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  isSubmittingReminder,
  pendingLetter,
  user,
  confirmLetter,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmittingReminder && onClose()}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
          />

          {isSubmittingReminder && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-0"
            >
              <TimeTunnel />
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={isSubmittingReminder ? { 
              opacity: [1, 1, 0], 
              scale: [1, 0.1, 0],
              rotateZ: [0, 5, 15],
              filter: ["blur(0px)", "blur(2px)", "blur(10px)"]
            } : { opacity: 1, scale: 1, y: 0 }}
            transition={isSubmittingReminder ? { duration: 2.2, ease: "easeIn" } : {}}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden"
          >
            <div className={`flex flex-col items-center text-center transition-all duration-700 ${isSubmittingReminder ? 'opacity-0 scale-75 blur-sm' : 'opacity-100'}`}>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-6">
                <Clock size={32} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-stone-800 mb-3">Enable Future Reminder</h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">
                Time flies, and we worry you might forget this letter. When the capsule unlocks at <span className="font-bold text-emerald-600">Age {pendingLetter?.age}</span>, we will notify you via SMS immediately.
              </p>

              <div className="w-full space-y-4">
                <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center">
                  <div className="w-16 h-16 bg-white rounded-full shadow-sm mb-4 flex items-center justify-center text-emerald-600">
                    <Smartphone size={32} />
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium text-center">
                    Reminder Number: <span className="font-bold">{(user as any)?.phone}</span><br/>
                    Phone number is the most stable way to connect across time.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    disabled={isSubmittingReminder}
                    onClick={confirmLetter}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingReminder ? 'Sending...' : 'Confirm Send'}
                  </button>
                  <button 
                    disabled={isSubmittingReminder}
                    onClick={onClose}
                    className="w-full py-4 bg-transparent text-stone-400 rounded-2xl font-bold hover:text-stone-600 transition-all"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
