
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Award, Check, X } from 'lucide-react';

interface AuthModalsProps {
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (val: boolean) => void;
  isOnboardingModalOpen: boolean;
  setIsOnboardingModalOpen: (val: boolean) => void;
  isSignUp: boolean;
  setIsSignUp: (val: boolean) => void;
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  loginError: string | null;
  setLoginError: (val: string | null) => void;
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
  isSignUp,
  setIsSignUp,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  setLoginError,
  isLoggingIn,
  handleEmailLogin,
  handleEmailSignUp,
  handleGoogleLogin,
  onboardingName,
  setOnboardingName,
  updateUserName,
  isUpdatingName,
}) => {
  return (
    <>
      {/* First Login Onboarding Modal */}
      <AnimatePresence>
        {isOnboardingModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
              className="relative bg-[#F5F2ED] w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border border-white overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-stone-800 mb-8 shadow-inner border border-stone-100">
                  <Award size={40} strokeWidth={1} />
                </div>
                
                <h3 className="text-2xl font-bold text-stone-800 mb-4 tracking-tight">Welcome to LifeGrid</h3>
                
                <p className="text-stone-600 text-sm leading-relaxed mb-8 italic">
                  "Guardian, how should we address you?<br />This name will be engraved on your Time Certificate."
                </p>

                <div className="w-full space-y-6">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Your name or nickname"
                      className="w-full px-6 py-4 bg-white border border-stone-200 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-stone-800/5 focus:border-stone-800 outline-none transition-all text-center"
                      value={onboardingName}
                      onChange={(e) => setOnboardingName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <button 
                    onClick={() => updateUserName(onboardingName)}
                    disabled={isUpdatingName || !onboardingName.trim()}
                    className="w-full py-4 bg-stone-800 text-white rounded-2xl font-bold text-sm hover:bg-stone-700 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUpdatingName ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Check size={18} />
                        Start Guardian Journey
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setIsOnboardingModalOpen(false)}
                    className="text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-stone-600 transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoggingIn && setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-800 mb-6">
                  <User size={32} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-2">
                  {isSignUp ? 'Create Account' : 'Login to Life Grid'}
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed mb-4">
                  {isSignUp ? 'Start your poetic life journey' : 'Sync your life canvas and wish list'}
                </p>

                {loginError && (
                  <div className="w-full mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-[10px] font-bold animate-in fade-in slide-in-from-top-1">
                    {loginError}
                  </div>
                )}

                <div className="bg-stone-50 p-6 rounded-[2rem] border border-stone-100 w-full relative transition-all duration-500">
                  <AnimatePresence mode="wait">
                    {isLoggingIn ? (
                      <motion.div 
                        key="logging-in"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col items-center justify-center py-8 gap-4"
                      >
                        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Processing...</p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="login-form"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center w-full space-y-3"
                      >
                        <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailLogin} className="w-full space-y-3">
                          <input 
                            type="email" 
                            placeholder="Email Address"
                            required
                            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800 outline-none transition-all"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                          />
                          <input 
                            type="password" 
                            placeholder="Password"
                            required
                            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800 outline-none transition-all"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                          />
                          <button 
                            type="submit"
                            className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold text-sm hover:bg-stone-700 transition-all shadow-lg active:scale-[0.98]"
                          >
                            {isSignUp ? 'Sign Up' : 'Login'}
                          </button>
                        </form>

                        <div className="flex items-center w-full gap-2 my-2">
                          <div className="h-[1px] flex-1 bg-stone-200"></div>
                          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">OR</span>
                          <div className="h-[1px] flex-1 bg-stone-200"></div>
                        </div>

                        <button 
                          onClick={handleGoogleLogin}
                          className="w-full py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Continue with Google
                        </button>

                        <button 
                          onClick={() => {
                            setIsSignUp(!isSignUp);
                            setLoginError(null);
                          }}
                          className="text-[10px] text-stone-400 hover:text-stone-600 transition-all mt-2 font-bold uppercase tracking-widest"
                        >
                          {isSignUp ? 'Already have an account? Login' : 'New here? Create an account'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
