
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Plus, Check, Trash2 } from 'lucide-react';
import { LifeGoal } from '../types';

interface GoalListProps {
  goals: LifeGoal[];
  newGoalTitle: string;
  setNewGoalTitle: (val: string) => void;
  newGoalAge: number | '';
  setNewGoalAge: (val: number | '') => void;
  addGoal: () => void;
  goalError: string;
  toggleGoalCompletion: (id: string) => void;
  removeGoal: (id: string) => void;
}

export const GoalList: React.FC<GoalListProps> = ({
  goals,
  newGoalTitle,
  setNewGoalTitle,
  newGoalAge,
  setNewGoalAge,
  addGoal,
  goalError,
  toggleGoalCompletion,
  removeGoal,
}) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F5F5F4] flex flex-col min-h-[420px] w-full"
    >
      <div className="flex items-center gap-3 mb-8 shrink-0">
        <div className="p-2 bg-[#FEF2F2] rounded-xl text-[#F43F5E]">
          <Target size={20} />
        </div>
        <h3 className="text-xl font-serif font-bold text-[#2D2A26]">Life Wishlist</h3>
      </div>

      <div className="flex flex-col gap-4 mb-8 shrink-0">
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="What is your next dream?"
            className="w-full px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-2xl text-sm focus:ring-2 focus:ring-[#F43F5E]/20 focus:border-[#F43F5E] outline-none transition-all placeholder-[#A8A29E] font-medium"
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="number" 
              placeholder="Target Age"
              className="w-full sm:flex-1 px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-2xl text-sm focus:ring-2 focus:ring-[#F43F5E]/20 focus:border-[#F43F5E] outline-none transition-all placeholder-[#A8A29E] font-medium"
              value={newGoalAge}
              onChange={(e) => setNewGoalAge(e.target.value === '' ? '' : parseInt(e.target.value))}
            />
            <button 
              onClick={addGoal}
              className="w-full sm:w-auto px-6 py-3 bg-[#2D2A26] text-white rounded-2xl hover:bg-[#45403B] transition-all shadow-md active:scale-95 flex items-center justify-center"
            >
              <Plus size={20} />
            </button>
          </div>
          {goalError && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#F43F5E] text-[10px] font-bold mt-1 ml-1"
            >
              {goalError}
            </motion.p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
        <AnimatePresence initial={false}>
          <div className="flex flex-col gap-4">
            {[...goals].sort((a, b) => a.age - b.age).map(goal => (
              <motion.div 
                key={goal.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between p-4 bg-[#FAFAF9] rounded-[1.5rem] border border-[#F5F5F4] group hover:border-[#E7E5E4] transition-all"
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleGoalCompletion(goal.id)}
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                      ${goal.completed 
                        ? 'bg-[#10B981] border-[#10B981] text-white' 
                        : 'bg-white border-[#E7E5E4] text-transparent hover:border-[#10B981]'
                      }
                    `}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold transition-all ${goal.completed ? 'text-[#A8A29E] line-through' : 'text-[#44403C]'}`}>
                      {goal.title}
                    </span>
                    <span className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mt-0.5">Age {goal.age}</span>
                  </div>
                </div>
                <button 
                  onClick={() => removeGoal(goal.id)}
                  className="p-2 text-[#D6D3D1] hover:text-[#F43F5E] transition-colors opacity-40 md:opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
            {goals.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#A8A29E] text-sm font-serif italic">The future is a blank page...</p>
              </div>
            )}
          </div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
