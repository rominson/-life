
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Award, Check, X, LogIn, Mail, Lock, Sparkles } from 'lucide-react';

interface AuthModalsProps {
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (val: boolean) => void;
  isOnboardingModalOpen: boolean;
  setIsOnboardingModalOpen: (val: boolean) => void;
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  loginError: string | null;
  isLoggingIn: boolean;
  handleEmailLogin: (e: React.FormEvent) => void;
  handleEmailSignUp: (e: React.FormEvent) => void;
  handleGoogleLogin: () => void;
  onboardingName: string;
  setOnboardingName: (val: string) => void;
  updateUserName: (name: string) => void;
  isUpdatingName: boolean;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  isLoginModalOpen,
  setIsLoginModalOpen,
  isOnboardingModalOpen,
  setIsOnboardingModalOpen,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  isLoggingIn,
  handleEmailLogin,
  handleEmailSignUp,
  handleGoogleLogin,
  onboardingName,
  setOnboardingName,
  updateUserName,
  isUpdatingName,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden"
            >
              <div className="p-8 pb-0 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-stone-800">{isSignUp ? 'Join LifeGrid' : 'Welcome Back'}</h2>
                  <p className="text-sm text-stone-400 mt-1">Your journey through time continues.</p>
                </div>
                <button onClick={() => setIsLoginModalOpen(false)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                  <X size={20} className="text-stone-300" />
                </button>
              </div>

              <div className="p-8">
                <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                      <input 
                        type="email" 
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
                        placeholder="traveler@time.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                      <input 
                        type="password" 
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <p className="text-red-500 text-xs font-medium text-center bg-red-50 py-2 rounded-lg">{loginError}</p>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoggingIn ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                  </button>
                </form>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                    <span className="bg-white px-4 text-stone-300">Or continue with</span>
                  </div>
                </div>

                <button 
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white border border-stone-200 text-stone-700 rounded-2xl font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  Google Account
                </button>

                <p className="text-center mt-8 text-sm text-stone-400">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="ml-2 text-stone-800 font-bold hover:underline"
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOnboardingModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 bg-white w-full max-w-md rounded-[3rem] shadow-2xl border border-stone-100 overflow-hidden"
            >
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-stone-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-stone-200">
                  <Sparkles size={40} />
                </div>
                <h2 className="text-3xl font-serif font-bold text-stone-800 mb-2">Welcome, Traveler</h2>
                <p className="text-stone-400 text-sm mb-10 leading-relaxed">
                  Before we begin your journey through the life grid, how should we address you?
                </p>

                <div className="space-y-6">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Your Name</label>
                    <input 
                      type="text" 
                      value={onboardingName}
                      onChange={(e) => setOnboardingName(e.target.value)}
                      placeholder="e.g. Arthur Dent"
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all text-center font-medium"
                    />
                  </div>

                  <button 
                    onClick={() => updateUserName(onboardingName)}
                    disabled={!onboardingName.trim() || isUpdatingName}
                    className="w-full py-5 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUpdatingName ? 'Saving...' : 'Start My Journey'}
                    <Check size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
