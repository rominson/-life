
import React from 'react';
import { motion } from 'motion/react';
import { Calendar, ChevronDown, Award, LogOut, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { User, Certificate } from '../types';

interface HeaderProps {
  birthDate: string;
  setBirthDate: (val: string) => void;
  user: User | null;
  isUserMenuOpen: boolean;
  setIsUserMenuOpen: (val: boolean) => void;
  allCertificates: Certificate[];
  setCurrentCertificateIndex: (idx: number) => void;
  setIsCertificateModalOpen: (val: boolean) => void;
  handleLogout: () => void;
  setIsLoginModalOpen: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  birthDate,
  setBirthDate,
  user,
  isUserMenuOpen,
  setIsUserMenuOpen,
  allCertificates,
  setCurrentCertificateIndex,
  setIsCertificateModalOpen,
  handleLogout,
  setIsLoginModalOpen,
}) => {
  return (
    <header className="bg-transparent shrink-0 z-20 pt-12 pb-4 md:pt-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 w-full"
      >
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-serif font-light italic text-[#2D2A26] tracking-tight">
            LifeGrid
          </h1>
          <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-[#A8A29E] mt-1.5 font-medium">
            Visualize every chapter of your life
          </p>
        </div>
        
        <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-4">
          <div className="relative flex items-center bg-white/50 backdrop-blur-sm px-3 rounded-2xl border border-[#E7E5E4] shadow-sm h-[38px] min-w-[140px] group hover:bg-white/80 transition-all cursor-pointer active:scale-95">
            <Calendar size={14} className="text-[#A8A29E] mr-2 shrink-0 pointer-events-none" />
            <div className="flex-1 text-sm font-medium text-[#57534E] whitespace-nowrap pointer-events-none">
              {birthDate && !isNaN(new Date(birthDate).getTime()) ? format(new Date(birthDate), 'MM / dd / yyyy') : 'M / D / Y'}
            </div>
            <input 
              type="date" 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20 appearance-none full-clickable-date-input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              onClick={(e) => {
                try {
                  (e.target as any).showPicker();
                } catch (err) {
                  // Fallback for browsers that don't support showPicker()
                }
              }}
              title="Select Birth Date"
            />
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="relative">
                <div 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-4 rounded-2xl border border-[#E7E5E4] shadow-sm cursor-pointer hover:bg-white/80 transition-all h-[38px]"
                >
                  <span className="text-xs font-bold text-[#57534E]">{user.name}</span>
                  <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-[#E7E5E4] shadow-lg py-1 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {allCertificates.length > 0 && (
                        <button 
                          onClick={() => {
                            setCurrentCertificateIndex(0);
                            setIsCertificateModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-all border-b border-stone-50"
                        >
                          <Award size={14} />
                          My Certificates ({allCertificates.length})
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          handleLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                      >
                        <LogOut size={14} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-2 px-4 h-[38px] bg-[#2D2A26] text-white rounded-2xl hover:bg-[#45403B] transition-all shadow-md active:scale-95 text-xs font-bold"
              >
                <LogIn size={14} />
                Login
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </header>
  );
};
