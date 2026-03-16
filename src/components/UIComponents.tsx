
import React from 'react';
import { motion } from 'motion/react';

export const MiniStatCard: React.FC<{ 
  title: string; 
  value: string | number | undefined; 
  icon: React.ReactNode; 
  color: string 
}> = ({ title, value, icon, color }) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-white p-4 md:p-5 rounded-[2rem] border border-[#F5F5F4] shadow-sm flex flex-col gap-2"
  >
    <div className={`flex items-center gap-2 ${color} opacity-60`}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{title}</span>
    </div>
    <div className="text-xl md:text-2xl font-serif font-bold text-[#2D2A26] tracking-tight">{value}</div>
  </motion.div>
);

export const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${color}`}></div>
    <span className="text-[#A8A29E]">{label}</span>
  </div>
);
