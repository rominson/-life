
import React from 'react';
import { motion } from 'motion/react';
import { format, addYears } from 'date-fns';
import { LifeGoal, Stats } from '../types';
import { LegendItem } from './UIComponents';

interface LifeGridProps {
  birthDate: string;
  gridItems: boolean[];
  goalMap: Map<number, LifeGoal[]>;
  stats: Stats | null;
}

export const LifeGrid: React.FC<LifeGridProps> = ({
  birthDate,
  gridItems,
  goalMap,
  stats,
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F5F5F4] flex-[3] flex flex-col min-h-0 relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#F59E0B]/5 rounded-full blur-3xl"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 gap-4">
        <div>
          <h3 className="text-2xl font-serif font-semibold text-[#2D2A26]">Life Canvas</h3>
          <p className="text-xs text-[#A8A29E] uppercase tracking-widest mt-1 font-bold">100-Year Life (1,200 Months)</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-[11px] font-bold uppercase tracking-wider">
          <LegendItem color="bg-[#57534E]" label="Past" />
          <LegendItem color="bg-[#F43F5E]" label="Goals" />
          <LegendItem color="bg-[#10B981]" label="Achieved" />
          <LegendItem color="bg-[#F5F5F4] border border-[#E7E5E4]" label="Future" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-0.5 md:py-6 px-0.5 md:px-4">
        <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] sm:grid-cols-[repeat(30,minmax(0,1fr))] md:grid-cols-[repeat(40,minmax(0,1fr))] gap-[3px] sm:gap-[5px] w-full max-w-4xl mx-auto content-center p-0.5 md:p-4">
          {gridItems.map((lived, idx) => {
            const monthGoals = goalMap.get(idx);
            const isGoal = monthGoals && monthGoals.length > 0;
            const isCompleted = isGoal && monthGoals.some(g => g.completed);
            
            return (
              <motion.div 
                key={idx}
                initial={false}
                animate={{
                  scale: isGoal ? 1.4 : 1,
                  backgroundColor: isGoal 
                    ? isCompleted ? '#10B981' : '#F43F5E'
                    : lived ? '#57534E' : '#F5F5F4'
                }}
                className={`
                  aspect-square rounded-full transition-all duration-700
                  ${isGoal 
                    ? 'z-10 shadow-[0_0_10px_rgba(0,0,0,0.1)]' 
                    : lived 
                      ? 'opacity-90' 
                      : 'border-[0.5px] border-[#E7E5E4]'
                  }
                `}
                title={isGoal 
                  ? `Goal: ${monthGoals.map(g => g.title).join(', ')} (Age ${Math.floor(idx/12)})${isCompleted ? ' - Achieved' : ''}`
                  : `Month ${idx + 1} (Age ${Math.floor(idx/12)})`
                }
              />
            );
          })}
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-[#F5F5F4] flex justify-between text-[11px] uppercase tracking-[0.2em] font-bold text-[#A8A29E] shrink-0">
        <span>Dawn: {birthDate ? format(new Date(birthDate), 'MMM yyyy') : ''}</span>
        <span>Sunset: {birthDate ? format(addYears(new Date(birthDate), 100), 'yyyy') : ''}</span>
      </div>
    </motion.div>
  );
};
