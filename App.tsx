
// LifeGrid Application - Main Entry Point
import React, { useState, useMemo, useEffect, useRef, useCallback, Component } from 'react';
import { 
  Calendar, 
  Clock, 
  Hourglass, 
  Plus,
  Trash2,
  Target,
  Check,
  Sparkles,
  Compass,
  Sun,
  Moon,
  Mail,
  User,
  LogOut,
  Smartphone,
  LogIn,
  Lock,
  Unlock,
  Send,
  Feather,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Award,
  X,
  QrCode,
} from 'lucide-react';
import { format, differenceInDays, differenceInMonths, addYears, differenceInYears } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { domToPng } from 'modern-screenshot';

import { toPng } from 'html-to-image';

// Firebase Imports
import { 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  addDoc,
  collection, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  deleteDoc,
  getDocFromServer,
  Timestamp,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

const MAX_AGE_YEARS = 100;
const TOTAL_MONTHS = MAX_AGE_YEARS * 12;

interface LifeGoal {
  id: string;
  title: string;
  age: number;
  completed?: boolean;
}

interface FutureLetter {
  id: string;
  content: string;
  unlockAge: number;
  createdAt: string;
}

const WRITING_PROMPTS = {
  general: [
    "What is the wish you want to fulfill most right now?",
    "Who is the person you want to thank most at this moment?",
    "Imagine what kind of life you will be living in 10 years?",
    "Give a piece of advice to your future self.",
    "Record a small thing that made you happy today.",
    "What do you fear losing most right now?",
    "Write down a moment you hope you will never forget in the future."
  ],
  century: [
    "What kind of fantasies do you have about the world in the 22nd century?",
    "If you in 2100 can still see this letter, what do you want to say to yourself?",
    "What problems do you hope humanity will have solved in the next century?",
    "Leave a message for your descendants in 2100.",
    "Do you think people then will still use the technology we have now?",
    "Imagine the first scene you see when you wake up on a morning in 2100.",
    "If you could travel through time, what gift would you bring to people of the next century?"
  ]
};

// --- Error Handling & Logging ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-6 text-center">
          <div className="max-w-md">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
              <X size={32} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-800 mb-4">Oops, something went wrong</h2>
            <p className="text-stone-500 text-sm mb-8">
              The system encountered some issues. Please try refreshing the page or contact us.
            </p>
            {this.state.errorInfo && (
              <pre className="text-[10px] bg-stone-100 p-4 rounded-xl text-left overflow-auto max-h-40 mb-8">
                {this.state.errorInfo}
              </pre>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-stone-800 text-white rounded-full text-sm font-bold shadow-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [birthDate, setBirthDate] = useState<string>(() => localStorage.getItem('birthDate') || '');
  const [goals, setGoals] = useState<LifeGoal[]>(() => {
    const saved = localStorage.getItem('goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [letters, setLetters] = useState<FutureLetter[]>(() => {
    const saved = localStorage.getItem('letters');
    return saved ? JSON.parse(saved) : [];
  });

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalAge, setNewGoalAge] = useState<number | ''>('');
  
  const [newLetterContent, setNewLetterContent] = useState('');
  const [newLetterAge, setNewLetterAge] = useState<number | ''>('');
  const [newCenturyLetterContent, setNewCenturyLetterContent] = useState('');
  const [writingLetterType, setWritingLetterType] = useState<'general' | 'century'>('general');
  const [currentInspiration, setCurrentInspiration] = useState<string | null>(null);
  const [isWritingLetter, setIsWritingLetter] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [currentCertificateIndex, setCurrentCertificateIndex] = useState(0);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [isEditingCertificateName, setIsEditingCertificateName] = useState(false);
  const [certificateData, setCertificateData] = useState<{
    id: string;
    sender: string;
    departureYear: number;
    arrivalYear: number;
    arrivalAge: number;
    isCenturyTraveler?: boolean;
  } | null>(null);
  const [pendingLetter, setPendingLetter] = useState<{ content: string; age: number } | null>(null);
  const [user, setUser] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'google'>('email');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [letterToDeleteId, setLetterToDeleteId] = useState<string | null>(null);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [letterError, setLetterError] = useState('');
  const [goalError, setGoalError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedImage, setDownloadedImage] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [autoGeneratedCertImage, setAutoGeneratedCertImage] = useState<string | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<{
    daysLived: number;
    monthsLived: number;
    yearsLived: number;
    percentLived: number;
    remainingDays: number;
  } | null>(null);

  const canReachNextCentury = useMemo(() => {
    if (!birthDate) return false;
    const birthYear = new Date(birthDate).getFullYear();
    return (birthYear + MAX_AGE_YEARS) >= 2100;
  }, [birthDate]);

  const ageIn2100 = useMemo(() => {
    if (!birthDate) return 0;
    const birthYear = new Date(birthDate).getFullYear();
    return 2100 - birthYear;
  }, [birthDate]);

  const handleQuickLetterTo2100 = () => {
    setWritingLetterType('century');
    setCurrentInspiration(null);
    setIsWritingLetter(true);
  };

  useEffect(() => {
    localStorage.setItem('birthDate', birthDate);
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('letters', JSON.stringify(letters));
  }, [birthDate, goals, letters]);

  const calculateStats = (date: string) => {
    if (!date) return;
    const birth = new Date(date);
    const now = new Date();
    const end = addYears(birth, MAX_AGE_YEARS);

    const days = differenceInDays(now, birth);
    const months = differenceInMonths(now, birth);
    const years = differenceInYears(now, birth);
    const totalDaysPotential = differenceInDays(end, birth);
    const percent = Math.min((days / totalDaysPotential) * 100, 100);
    const remaining = Math.max(differenceInDays(end, now), 0);

    setStats({
      daysLived: Math.max(days, 0),
      monthsLived: Math.max(months, 0),
      yearsLived: Math.max(years, 0),
      percentLived: percent,
      remainingDays: remaining,
    });
  };

  const allCertificates = useMemo(() => {
    if (!birthDate || !user || letters.length === 0) return [];
    const birth = new Date(birthDate);
    return letters.map(letter => {
      const unlockDate = addYears(birth, letter.unlockAge);
      const createdAt = new Date(letter.createdAt);
      return {
        id: letter.id.slice(-8).toUpperCase(),
        sender: user.name || 'Time Traveler',
        departureYear: createdAt.getFullYear(),
        arrivalYear: unlockDate.getFullYear(),
        arrivalAge: letter.unlockAge,
        isCenturyTraveler: unlockDate.getFullYear() >= 2100,
        date: createdAt
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Newest first
  }, [letters, birthDate, user]);

  useEffect(() => {
    if (isCertificateModalOpen && allCertificates.length > 0) {
      const generateImage = async () => {
        setIsAutoGenerating(true);
        setAutoGeneratedCertImage(null);
        
        // Wait for animations and fonts
        await Promise.all([
          new Promise(resolve => setTimeout(resolve, 1200)),
          document.fonts.ready
        ]);
        
        if (certificateRef.current) {
          try {
            const dataUrl = await domToPng(certificateRef.current, {
              scale: 3,
              backgroundColor: allCertificates[currentCertificateIndex].isCenturyTraveler ? '#020617' : '#F5F2ED',
              features: {
                copyScrollbar: true,
              }
            });
            setAutoGeneratedCertImage(dataUrl);
          } catch (error) {
            console.error('Auto-generation failed:', error);
          } finally {
            setIsAutoGenerating(false);
          }
        }
      };
      
      generateImage();
    } else {
      setAutoGeneratedCertImage(null);
    }
  }, [isCertificateModalOpen, currentCertificateIndex, allCertificates.length]);

  useEffect(() => {
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection successful");
      } catch (error: any) {
        // If it's a permission error, it means we REACHED the server, so connection is OK
        if (error.code === 'permission-denied') {
          console.log("Firestore connection successful (reached backend, but access denied as expected)");
          return;
        }
        console.error("Firestore connection test failed:", error);
        if (error.code === 'unavailable') {
          console.error("Firestore backend is unavailable. This might be a temporary network issue or the database is still provisioning.");
        }
      }
    };
    testConnection();

    // Auth State Listener
    let unsubscribeGoals: (() => void) | null = null;
    let unsubscribeLetters: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Cleanup previous listeners
      if (unsubscribeGoals) {
        unsubscribeGoals();
        unsubscribeGoals = null;
      }
      if (unsubscribeLetters) {
        unsubscribeLetters();
        unsubscribeLetters = null;
      }

      if (firebaseUser) {
        // User is logged in
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          setUser({
            id: firebaseUser.uid,
            name: userData.name || firebaseUser.displayName || `User ${firebaseUser.email?.split('@')[0] || 'Unknown'}`,
            email: firebaseUser.email || ''
          });

          if (!userData.name) {
            setIsOnboardingModalOpen(true);
          }

          if (userData.birthDate) setBirthDate(userData.birthDate);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }

        // Fetch Subcollections
        const goalsQuery = query(collection(db, 'users', firebaseUser.uid, 'goals'), orderBy('age', 'asc'));
        unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
          const uniqueGoals: LifeGoal[] = [];
          const seenIds = new Set();
          snapshot.docs.forEach(doc => {
            if (!seenIds.has(doc.id)) {
              uniqueGoals.push({ id: doc.id, ...doc.data() } as LifeGoal);
              seenIds.add(doc.id);
            }
          });
          setGoals(uniqueGoals);
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${firebaseUser.uid}/goals`));

        const lettersQuery = query(collection(db, 'users', firebaseUser.uid, 'letters'), orderBy('unlockAge', 'asc'));
        unsubscribeLetters = onSnapshot(lettersQuery, (snapshot) => {
          const uniqueLetters: FutureLetter[] = [];
          const seenIds = new Set();
          snapshot.docs.forEach(doc => {
            if (!seenIds.has(doc.id)) {
              uniqueLetters.push({ 
                id: doc.id, 
                ...doc.data(),
                createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString()
              } as FutureLetter);
              seenIds.add(doc.id);
            }
          });
          setLetters(uniqueLetters);
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${firebaseUser.uid}/letters`));

      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeGoals) unsubscribeGoals();
      if (unsubscribeLetters) unsubscribeLetters();
    };
  }, []);

  useEffect(() => {
    if (birthDate) {
      calculateStats(birthDate);
    }
    
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [birthDate]);

  useEffect(() => {
    if (allCertificates.length > 0 && currentCertificateIndex >= allCertificates.length) {
      setCurrentCertificateIndex(allCertificates.length - 1);
    }
  }, [allCertificates.length, currentCertificateIndex]);

  // Helper to convert any color to RGBA using canvas
  const convertToRgba = (color: string): string => {
    if (!color || color === 'transparent' || color === 'none') return color;
    
    // Fallback for oklch/oklab which html2canvas cannot parse
    if (color.includes('oklch') || color.includes('oklab') || color.includes('color-mix')) {
      if (color.includes('white') || color.includes('100%')) return 'rgba(255,255,255,1)';
      if (color.includes('black') || color.includes(' 0%')) return 'rgba(0,0,0,1)';
      
      // Try to use a temporary element to let the browser resolve it to rgb
      try {
        const temp = document.createElement('div');
        temp.style.color = color;
        document.body.appendChild(temp);
        const resolved = window.getComputedStyle(temp).color;
        document.body.removeChild(temp);
        if (resolved && !resolved.includes('oklch') && !resolved.includes('oklab')) {
          return resolved;
        }
      } catch (e) {
        // Fallback to gray if resolution fails
        return 'rgba(128,128,128,1)';
      }
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return color;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    } catch (e) {
      return color;
    }
  };

  const handleDownloadCertificate = async () => {
    if (isDownloading) return;
    
    // If we already have the auto-generated image, use it directly
    if (autoGeneratedCertImage) {
      setDownloadedImage(autoGeneratedCertImage);
      if (isMobile) {
        setIsImagePreviewOpen(true);
      } else {
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = autoGeneratedCertImage;
        link.download = `LifeGrid-Certificate-${allCertificates[currentCertificateIndex].id}.png`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
        }, 100);
      }
      return;
    }

    const el = certificateRef.current;
    if (!el) {
      alert('Save failed: Certificate element not found');
      return;
    }
    
    setIsDownloading(true);
    
    try {
      // 1. Wait for everything to settle and fonts to be ready
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 2000)),
        document.fonts.ready
      ]);
      
      // 2. Ensure all images are loaded
      const images = el.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        const image = img as HTMLImageElement;
        if (image.complete) return Promise.resolve();
        return new Promise(resolve => {
          image.onload = resolve;
          image.onerror = resolve;
        });
      }));
      
      // 3. Capture with high precision
      const dataUrl = await domToPng(el, {
        scale: 3,
        backgroundColor: allCertificates[currentCertificateIndex].isCenturyTraveler ? '#020617' : '#F5F2ED',
        features: {
          copyScrollbar: true,
        }
      });

      setDownloadedImage(dataUrl);
      
      if (isMobile) {
        // On mobile, show preview for long-press saving
        setIsImagePreviewOpen(true);
      } else {
        // On desktop, trigger direct download
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = dataUrl;
        link.download = `LifeGrid-Certificate-${allCertificates[currentCertificateIndex].id}.png`;
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 100);
      }
      
      console.log('Capture successful');
    } catch (error) {
      console.error('Certificate capture failed:', error);
      alert('Failed to save certificate. Please try again or take a screenshot.');
    } finally {
      setIsDownloading(false);
    }
  };
  const addGoal = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!newGoalTitle.trim()) {
      setGoalError('Please enter the goal content');
      return;
    }
    if (newGoalAge === '') {
      setGoalError('Please enter the target age');
      return;
    }
    if (typeof newGoalAge === 'number' && (newGoalAge < 0 || newGoalAge > MAX_AGE_YEARS)) {
      setGoalError(`Age must be between 0 and ${MAX_AGE_YEARS}`);
      return;
    }

    setGoalError('');
    const goalData = { title: newGoalTitle, age: newGoalAge, completed: false };
    
    try {
      await addDoc(collection(db, 'users', user.id, 'goals'), goalData);
      setNewGoalTitle('');
      setNewGoalAge('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.id}/goals`);
    }
  };

  const removeGoal = (id: string) => {
    setGoalToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteGoal = async () => {
    if (goalToDeleteId) {
      if (user) {
        console.log('Confirming goal removal from Firestore:', goalToDeleteId);
        try {
          await deleteDoc(doc(db, 'users', user.id, 'goals', goalToDeleteId));
          console.log('Goal removed from Firestore successfully');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.id}/goals/${goalToDeleteId}`);
        }
      } else {
        // Local deletion
        console.log('Confirming goal removal from local state:', goalToDeleteId);
        setGoals(prev => prev.filter(g => g.id !== goalToDeleteId));
      }
      setGoalToDeleteId(null);
      setIsDeleteConfirmOpen(false);
    }
  };

  const toggleGoalCompletion = async (id: string) => {
    if (!user) return;
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    try {
      await setDoc(doc(db, 'users', user.id, 'goals', id), { ...goal, completed: !goal.completed }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}/goals/${id}`);
    }
  };

  const addLetter = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (writingLetterType === 'general') {
      if (!newLetterContent.trim()) {
        setLetterError('Please write down what you want to say first');
        return;
      }
      if (newLetterAge === '') {
        setLetterError('Please enter the unlock age');
        return;
      }
      if (typeof newLetterAge === 'number' && newLetterAge <= (stats?.yearsLived || 0)) {
        setLetterError(`Unlock age must be greater than current age (${Math.floor(stats?.yearsLived || 0)})`);
        return;
      }
      if (typeof newLetterAge === 'number' && newLetterAge > MAX_AGE_YEARS) {
        setLetterError(`Unlock age cannot exceed ${MAX_AGE_YEARS}`);
        return;
      }
      setPendingLetter({ content: newLetterContent, age: newLetterAge });
    } else {
      if (!newCenturyLetterContent.trim()) {
        setLetterError('Please write down what you want to say first');
        return;
      }
      setPendingLetter({ content: newCenturyLetterContent, age: ageIn2100 });
    }

    setLetterError('');
    setIsReminderModalOpen(true);
  };

  const confirmLetter = async () => {
    if (!pendingLetter || !user || !birthDate) return;

    setIsSubmittingReminder(true);
    const letterId = Date.now().toString();

    try {
      // Add a bit of artificial delay for the time tunnel effect
      await new Promise(resolve => setTimeout(resolve, 2200));

      // Calculate unlock date
      const birth = new Date(birthDate);
      const unlockDate = addYears(birth, pendingLetter.age);
      
      // Save to Firestore
      const letterData = {
        content: pendingLetter.content,
        unlockAge: pendingLetter.age,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'users', user.id, 'letters'), letterData);

      // Prepare certificate data
      setCertificateData({
        id: letterId.slice(-8).toUpperCase(),
        sender: user.name || 'Time Traveler',
        departureYear: new Date().getFullYear(),
        arrivalYear: unlockDate.getFullYear(),
        arrivalAge: pendingLetter.age,
        isCenturyTraveler: writingLetterType === 'century' || unlockDate.getFullYear() >= 2100
      });

      // Clear input
      if (writingLetterType === 'general') {
        setNewLetterContent('');
        setNewLetterAge('');
      } else {
        setNewCenturyLetterContent('');
      }
      setCurrentInspiration(null);

      setIsCertificateModalOpen(true);
      setIsWritingLetter(false);
      setIsReminderModalOpen(false);
      setPendingLetter(null);
    } catch (error) {
      console.error('Failed to send:', error);
      handleFirestoreError(error, OperationType.CREATE, `users/${user.id}/letters`);
      alert('Failed to send, please try again later');
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  const removeLetter = async (id: string) => {
    console.log('Initiating letter removal:', id);
    setLetterToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteLetter = async () => {
    if (letterToDeleteId) {
      if (user) {
        console.log('Confirming letter removal from Firestore:', letterToDeleteId);
        try {
          await deleteDoc(doc(db, 'users', user.id, 'letters', letterToDeleteId));
          console.log('Letter removed from Firestore successfully');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.id}/letters/${letterToDeleteId}`);
        }
      } else {
        // Local deletion
        console.log('Confirming letter removal from local state:', letterToDeleteId);
        setLetters(prev => prev.filter(l => l.id !== letterToDeleteId));
      }
      setLetterToDeleteId(null);
      setIsDeleteConfirmOpen(false);
    }
  };

  const updateUserName = async (newName: string) => {
    if (!user || !newName.trim()) return;
    
    setIsUpdatingName(true);
    try {
      await setDoc(doc(db, 'users', user.id), { name: newName.trim() }, { merge: true });
      
      setUser({ ...user, name: newName.trim() });
      // If certificate is open, sync the name on the certificate
      if (certificateData) {
        setCertificateData({ ...certificateData, sender: newName.trim() });
      }
      setIsOnboardingModalOpen(false);
      setIsEditingCertificateName(false);
    } catch (error) {
      console.error('Failed to update name:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setIsLoginModalOpen(false);
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      console.error('Login failed:', err);
      let msg = 'Login failed, please check your email and password';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email format';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please try again later.';
      }
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    if (loginPassword.length < 6) {
      setLoginError('Password must be at least 6 characters');
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      setIsLoginModalOpen(false);
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      console.error('Sign up failed:', err);
      let msg = 'Sign up failed, please try again';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email format';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak';
      }
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setIsLoginModalOpen(false);
    } catch (err: any) {
      console.error('Google login failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setLoginError('Google login failed, please try again');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    console.log('isLoginModalOpen changed:', isLoginModalOpen);
  }, [isLoginModalOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  useEffect(() => {
    // If logged in, periodically sync birthDate to backend
    if (user && birthDate) {
      const syncData = async () => {
        try {
          await setDoc(doc(db, 'users', user.id), { birthDate }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
        }
      };
      const timer = setTimeout(syncData, 2000); // Debounce
      return () => clearTimeout(timer);
    }
  }, [user, birthDate]);

  const goalMap = useMemo(() => {
    const map = new Map<number, LifeGoal[]>();
    goals.forEach(goal => {
      const monthIdx = goal.age * 12;
      if (!map.has(monthIdx)) map.set(monthIdx, []);
      map.get(monthIdx)?.push(goal);
    });
    return map;
  }, [goals]);

  const gridItems = useMemo(() => {
    if (!birthDate) return [];
    const items = [];
    for (let i = 0; i < TOTAL_MONTHS; i++) {
      items.push(i < (stats?.monthsLived || 0));
    }
    return items;
  }, [stats?.monthsLived, birthDate]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
          <p className="text-stone-400 text-sm font-serif italic">Connecting to the time tunnel...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFCFB] text-[#4A443F] flex flex-col overflow-hidden font-sans">
      {/* Header - Poetic & Minimal */}
      <header className="bg-transparent shrink-0 z-20 pt-12 pb-4 md:pt-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 w-full"
        >
          {/* Title - Top on Mobile, Left on Desktop */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-serif font-light italic text-[#2D2A26] tracking-tight">
              LifeGrid
            </h1>
            <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-[#A8A29E] mt-1.5 font-medium">
              Visualize every chapter of your life
            </p>
          </div>
          
          {/* Controls Group - Spread on Mobile, Right-aligned on Desktop */}
          <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-4">
            {/* Date Picker */}
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

            {/* User Menu */}
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
                      <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl border border-[#E7E5E4] shadow-lg py-1 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {allCertificates.length > 0 && (
                          <button 
                            onClick={() => {
                              setCurrentCertificateIndex(0); // Show newest
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
                  onClick={() => {
                    console.log('Opening login modal...');
                    setIsLoginModalOpen(true);
                  }}
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

      <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col max-w-7xl mx-auto w-full">
        {!birthDate ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="max-w-lg"
            >
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-[#F59E0B]/10 blur-3xl rounded-full"></div>
                <Hourglass size={64} className="relative text-[#D97706] mx-auto opacity-80" />
              </div>
              <h2 className="text-5xl font-serif font-light text-[#2D2A26] mb-6">
                Every moment is a gift
              </h2>
              <p className="text-lg text-[#78716C] font-light leading-relaxed mb-8">
                Your life is a unique story written in months.<br/>
                Enter your birth date to see the canvas you've filled and the future space waiting for your creation.
              </p>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#A8A29E] border-t border-[#E7E5E4] pt-6">
                <span>Please select your starting point above</span>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 h-full">
            {/* Stats Dashboard - Elegant Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
              <MiniStatCard 
                title="Days Lived" 
                value={stats?.daysLived.toLocaleString()} 
                icon={<Sun size={14} />}
                color="text-[#57534E]" 
              />
              <MiniStatCard 
                title="Years Passed" 
                value={stats?.yearsLived} 
                icon={<Compass size={14} />}
                color="text-[#57534E]" 
              />
              <MiniStatCard 
                title="Life Progress" 
                value={`${stats?.percentLived.toFixed(1)}%`} 
                icon={<Sparkles size={14} />}
                color="text-[#57534E]" 
              />
              <MiniStatCard 
                title="Future Seasons" 
                value={(TOTAL_MONTHS - (stats?.monthsLived || 0)).toLocaleString()} 
                icon={<Moon size={14} />}
                color="text-[#57534E]" 
              />
            </div>

            {/* The Grid Card - Organic & Soft */}
            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F5F5F4] flex-[3] flex flex-col min-h-0 relative overflow-hidden"
              >
                {/* Decorative background element */}
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

                {/* Grid Container - Flex-Grow to fill space */}
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
                  <span>Dawn: {format(new Date(birthDate), 'MMM yyyy')}</span>
                  <span>Sunset: {format(addYears(new Date(birthDate), 100), 'yyyy')}</span>
                </div>
              </motion.div>

              {/* Goals Management Sidebar - Soft & Inviting */}
              <div className="flex-[1.5] flex flex-col gap-8 min-h-0 w-full lg:min-w-[400px]">
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
                        onChange={(e) => {
                          setNewGoalTitle(e.target.value);
                          if (goalError) setGoalError('');
                        }}
                      />
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                          type="number" 
                          placeholder="Target Age"
                          className="w-full sm:flex-1 px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-2xl text-sm focus:ring-2 focus:ring-[#F43F5E]/20 focus:border-[#F43F5E] outline-none transition-all placeholder-[#A8A29E] font-medium"
                          value={newGoalAge}
                          onChange={(e) => {
                            setNewGoalAge(e.target.value === '' ? '' : parseInt(e.target.value));
                            if (goalError) setGoalError('');
                          }}
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

                {/* Future Letter Section */}
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F5F5F4] flex flex-col min-h-[380px] w-full"
                >
                  <div className="flex items-center justify-between mb-8 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                        <Mail size={20} />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-[#2D2A26]">Time Capsule</h3>
                    </div>
                    <button 
                      onClick={() => {
                        if (!isWritingLetter) {
                          setWritingLetterType('general');
                          setCurrentInspiration(null);
                        }
                        setIsWritingLetter(!isWritingLetter);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-colors"
                    >
                      {!isWritingLetter && <Feather size={12} />}
                      {isWritingLetter ? 'Cancel' : 'Write a Letter'}
                    </button>
                  </div>

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
                              // Ensure we get a different one if possible
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
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </main>
      
      {/* Simple Footer - Poetic */}
      <footer className="py-6 text-center bg-transparent shrink-0">
        <p className="text-[13px] font-serif italic text-[#A8A29E] tracking-wide">
          "Your life is the only story worth writing. Please write it with heart."
        </p>
      </footer>

      {/* Reminder Confirmation Modal */}
      <AnimatePresence>
        {isReminderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingReminder && setIsReminderModalOpen(false)}
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
                      Reminder Number: <span className="font-bold">{user?.phone}</span><br/>
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
                      onClick={() => setIsReminderModalOpen(false)}
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

      {/* Time Guardian Certificate Modal */}
      <AnimatePresence mode="wait">
        {isCertificateModalOpen && allCertificates.length > 0 && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCertificateModalOpen(false)}
              className="absolute inset-0 bg-white/40 backdrop-blur-xl"
            />

            <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
              {allCertificates[currentCertificateIndex] && (
                <>
                  {/* Navigation Arrows (Desktop) */}
              {!isMobile && allCertificates.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentCertificateIndex(prev => (prev > 0 ? prev - 1 : allCertificates.length - 1));
                    }}
                    className="absolute -left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-white transition-all shadow-lg z-20"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentCertificateIndex(prev => (prev < allCertificates.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute -right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-white transition-all shadow-lg z-20"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              <AnimatePresence mode="wait">
                <motion.div 
                  key={allCertificates[currentCertificateIndex].id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100) {
                      setCurrentCertificateIndex(prev => (prev > 0 ? prev - 1 : allCertificates.length - 1));
                    } else if (info.offset.x < -100) {
                      setCurrentCertificateIndex(prev => (prev < allCertificates.length - 1 ? prev + 1 : 0));
                    }
                  }}
                  className="w-full flex justify-center"
                >
                  <div className="w-full flex justify-center relative">
                    {/* The Certificate Card (HTML version, hidden once image is ready) */}
                    <div 
                      ref={certificateRef}
                      className={`
                      p-2 md:p-3 rounded-sm shadow-2xl border-[8px] md:border-[12px] relative overflow-hidden transition-all duration-1000
                      w-[300px] sm:w-[340px] md:w-[480px] mx-auto box-border
                      ${allCertificates[currentCertificateIndex].isCenturyTraveler 
                        ? 'bg-[#020617] border-[#1e293b]' 
                        : 'bg-[#F5F2ED] border-white'
                      }
                      ${autoGeneratedCertImage ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                    `}>
                      {/* Inner Border/Glow for Century Traveler - Using a div instead of ring for more consistent capture */}
                      {allCertificates[currentCertificateIndex].isCenturyTraveler && (
                        <div className="absolute inset-[6px] md:inset-[8px] border border-[rgba(96,165,250,0.2)] pointer-events-none z-10" />
                      )}
                      {/* Decorative Inner Border */}
                      <div className={`
                        border pt-[62px] pb-[46px] px-4 md:pt-[88px] md:pb-[68px] md:px-6 flex flex-col items-center text-center relative transition-colors duration-1000 w-full h-full box-border
                        ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'border-[rgba(59,130,246,0.2)]' : 'border-stone-300'}
                      `}>
                          
                          {/* Background Watermark */}
                          <div className={`
                            absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000
                            ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'opacity-[0.07] text-[#93c5fd]' : 'opacity-[0.03] text-[#292524]'}
                          `}>
                            <Hourglass size={240} className="md:w-[340px] md:h-[340px]" />
                          </div>

                          {/* Century Traveler Special Effects */}
                          {allCertificates[currentCertificateIndex].isCenturyTraveler && (
                            <>
                              {/* Refined Top Glow - Slightly darker and more contained */}
                              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(30,64,175,0.35)_0%,rgba(37,99,235,0.1)_30%,transparent_60%)] pointer-events-none" />
                              
                              {/* Corner Decorative Elements - Using fixed pixel offsets for absolute stability */}
                              <div className="absolute top-[6px] left-[6px] w-8 h-8 border-t border-l border-[rgba(96,165,250,0.3)] rounded-tl-sm pointer-events-none z-30" />
                              <div className="absolute top-[6px] right-[6px] w-8 h-8 border-t border-r border-[rgba(96,165,250,0.3)] rounded-tr-sm pointer-events-none z-30" />
                              <div className="absolute bottom-[6px] left-[6px] w-8 h-8 border-b border-l border-[rgba(96,165,250,0.3)] rounded-bl-sm pointer-events-none z-30" />
                              <div className="absolute bottom-[6px] right-[6px] w-8 h-8 border-b border-r border-[rgba(96,165,250,0.3)] rounded-br-sm pointer-events-none z-30" />

                              <div className="absolute top-3 left-1/2 -translate-x-1/2 md:top-6 w-full flex justify-center">
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="bg-gradient-to-r from-[rgba(37,99,235,0.2)] to-[rgba(79,70,229,0.2)] border border-[rgba(96,165,250,0.4)] px-2 py-0.5 md:px-3 md:py-1 rounded-full flex items-center gap-1 md:gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.2)] whitespace-nowrap"
                                >
                                  <Sparkles size={12} className="text-[#93c5fd] shrink-0" />
                                  <span className="text-[8px] md:text-[10px] font-bold text-[#bfdbfe] uppercase tracking-[0.2em] whitespace-nowrap">22nd Century Witness</span>
                                </motion.div>
                              </div>
                            </>
                          )}

                          {/* Header */}
                          <div className="mb-2 md:mb-8 w-full overflow-hidden">
                            <div className={`flex justify-center mb-1 md:mb-4 transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[#60a5fa]' : 'text-[#292524]'}`}>
                              <Award size={isMobile ? 32 : 44} className="md:w-11 md:h-11" strokeWidth={1} />
                            </div>
                            <h2 className={`
                              text-[11px] sm:text-sm md:text-xl lg:text-2xl font-serif font-light tracking-[0.1em] md:tracking-[0.2em] uppercase mb-1 md:mb-2 transition-colors duration-1000 w-full mx-auto leading-tight max-w-none
                              ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[#eff6ff] drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-[#292524]'}
                            `}>
                              {allCertificates[currentCertificateIndex].isCenturyTraveler ? 'Century Traveler Time Guardian Certificate' : 'Time Guardian Certificate'}
                            </h2>
                            <div className={`h-[1px] w-20 md:w-24 mx-auto mb-1 transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'bg-[rgba(59,130,246,0.5)]' : 'bg-[#a8a29e]'}`}></div>
                            <p className={`
                              text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold transition-colors duration-1000
                              ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(96,165,250,0.7)]' : 'text-[#78716c]'}
                            `}>
                              {allCertificates[currentCertificateIndex].isCenturyTraveler ? 'Century Traveler Certificate' : 'Time Guardian Certificate'}
                            </p>
                          </div>

                          {/* Content */}
                          <div className="space-y-3 md:space-y-4 mb-4 md:mb-8 relative z-10">
                            <div>
                              {isEditingCertificateName ? (
                                <div className="flex flex-col items-center gap-2">
                                  <input 
                                    autoFocus
                                    type="text"
                                    className={`
                                      text-base md:text-2xl font-bold border-b outline-none text-center px-2 py-1 w-36 md:w-48 transition-all
                                      ${allCertificates[currentCertificateIndex].isCenturyTraveler 
                                        ? 'text-white bg-[rgba(30,58,138,0.2)] border-[rgba(59,130,246,0.5)]' 
                                        : 'text-stone-800 bg-white/50 border-stone-400'
                                      }
                                    `}
                                    value={onboardingName}
                                    onChange={(e) => setOnboardingName(e.target.value)}
                                    onBlur={() => {
                                      if (onboardingName.trim() && onboardingName !== allCertificates[currentCertificateIndex].sender) {
                                        updateUserName(onboardingName);
                                      } else {
                                        setIsEditingCertificateName(false);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateUserName(onboardingName);
                                      }
                                    }}
                                  />
                                  <p className="text-[8px] md:text-[9px] text-stone-400 uppercase tracking-widest font-bold">Press Enter to Confirm</p>
                                </div>
                              ) : (
                                <div 
                                  className="group cursor-pointer relative inline-block"
                                  onClick={() => {
                                    setOnboardingName(allCertificates[currentCertificateIndex].sender);
                                    setIsEditingCertificateName(true);
                                  }}
                                >
                                  <h3 className={`
                                    text-base md:text-2xl font-bold mb-1 transition-colors duration-1000 whitespace-nowrap tracking-tight md:tracking-normal
                                    ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[#dbeafe]' : 'text-[#292524]'}
                                  `}>
                                    {allCertificates[currentCertificateIndex].sender}
                                  </h3>
                                  <div className="absolute -right-5 top-1/2 -translate-y-1/2 opacity-40 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <Feather size={14} className={allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[#60a5fa]' : 'text-[#a8a29e]'} />
                                  </div>
                                  <div className={`h-[1px] w-24 md:w-32 mx-auto transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'bg-[rgba(59,130,246,0.3)]' : 'bg-[#d6d3d1]'}`}></div>
                                </div>
                              )}
                            </div>

                            <p className={`leading-relaxed max-w-none mx-auto text-xs md:text-sm transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(219,234,254,0.8)]' : 'text-[#57534e]'}`}>
                              Sent a commitment across time and space in <span className={`font-bold ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[#60a5fa]' : 'text-[#1c1917]'}`}>{allCertificates[currentCertificateIndex].departureYear}</span>.
                              {allCertificates[currentCertificateIndex].isCenturyTraveler ? (
                                <>This capsule has entered the <span className="text-[#60a5fa] font-bold">Century Route</span> and will be precisely opened in <span className="text-[#60a5fa] font-bold">{allCertificates[currentCertificateIndex].arrivalYear}</span>.</>
                              ) : (
                                <>This capsule has entered the eternal orbit and will be precisely opened in <span className="text-[#1c1917] font-bold">{allCertificates[currentCertificateIndex].arrivalYear}</span>.</>
                              )}
                            </p>

                            <p className={`italic text-[10px] md:text-xs transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(96,165,250,0.6)]' : 'text-[#78716c]'}`}>
                              {allCertificates[currentCertificateIndex].isCenturyTraveler ? '"The dawn across the century, only to meet your future self."' : '"Time changes, but the warmth of commitment is eternal."'}
                            </p>
                          </div>

                          {/* Footer / Seal & QR Code */}
                          <div className="w-full relative flex justify-between items-center mt-1 md:mt-2 min-h-[60px] md:min-h-[90px]">
                            <div className="text-left relative flex items-center">
                              {/* QR Code for sharing */}
                              <div className={`
                                p-1 rounded-lg bg-white shadow-sm transition-all duration-1000
                                ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'ring-1 ring-[rgba(59,130,246,0.5)]' : ''}
                              `}>
                                <QRCodeSVG 
                                  value={window.location.href} 
                                  size={isMobile ? 44 : 64}
                                  level="M"
                                  includeMargin={true}
                                  marginSize={1}
                                  fgColor={allCertificates[currentCertificateIndex].isCenturyTraveler ? "#0F172A" : "#2D2A26"}
                                />
                              </div>
                            </div>

                            {/* Absolutely Centered Wax Seal */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group/seal">
                              {/* Realistic Wax Seal */}
                              <div className="w-12 h-12 md:w-20 md:h-20 relative">
                                {/* The outer irregular wax pool - organic shape */}
                                <div className={`
                                  absolute inset-0 rounded-[45%_55%_50%_50%/50%_45%_55%_50%] shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.4),inset_2px_2px_4px_rgba(255,255,255,0.2),4px_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-1000
                                  ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'bg-[#2E1065] shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'bg-[#8B1A1A]'}
                                `}></div>
                                
                                {/* The inner stamped area - depressed into the wax */}
                                <div className={`
                                  absolute inset-[10%] rounded-full shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6),inset_-2px_-2px_4px_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden border transition-colors duration-1000
                                  ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'bg-[#4C1D95] border-[rgba(124,58,237,0.3)]' : 'bg-[#991B1B] border-[rgba(127,29,29,0.3)]'}
                                `}>
                                  
                                  {/* Exquisite Pattern SVG with Gold Foil Effect - Scheme C: Tree of Rings */}
                                  <svg viewBox="0 0 100 100" className="w-[85%] h-[85%]">
                                    <defs>
                                      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#D4AF37" />
                                        <stop offset="50%" stopColor="#FFD700" />
                                        <stop offset="100%" stopColor="#AA8A2E" />
                                      </linearGradient>
                                    </defs>
                                    <g fill="none" stroke="url(#goldGradient)">
                                      {/* Scheme C: Tree Rings (Concentric, slightly irregular) */}
                                      <circle cx="50" cy="50" r="42" strokeWidth="0.5" opacity="0.6" />
                                      <path d="M50 8 A42 42 0 0 1 92 50" strokeWidth="1.2" strokeLinecap="round" />
                                      <circle cx="50" cy="50" r="34" strokeWidth="0.8" />
                                      <circle cx="50" cy="50" r="26" strokeWidth="1" />
                                      <circle cx="50" cy="50" r="18" strokeWidth="1.2" />
                                      
                                      {/* Clock Hands at the center of the rings */}
                                      <path d="M50 50 L50 25" strokeWidth="2.5" strokeLinecap="round" />
                                      <path d="M50 50 L70 50" strokeWidth="2" strokeLinecap="round" />
                                      <circle cx="50" cy="50" r="3" fill="url(#goldGradient)" stroke="none" />
                                      
                                      {/* Falling Leaves details */}
                                      <path d="M75 25 Q80 20 85 25 T75 35 Z" fill="url(#goldGradient)" stroke="none" transform="rotate(15 75 25)" />
                                      <path d="M25 70 Q20 75 25 80 T35 70 Z" fill="url(#goldGradient)" stroke="none" transform="rotate(-20 25 70)" />
                                      
                                      {/* Fine wood grain texture lines */}
                                      <path d="M40 15 Q45 12 50 15" strokeWidth="0.3" opacity="0.5" />
                                      <path d="M60 85 Q55 88 50 85" strokeWidth="0.3" opacity="0.5" />
                                    </g>
                                  </svg>
                                  
                                  {/* Wax texture overlay */}
                                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                                </div>
                                
                                {/* Realistic Surface Highlight */}
                                <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-gradient-to-br from-[rgba(255,255,255,0.2)] to-transparent rounded-full blur-lg pointer-events-none"></div>
                              </div>
                              <p className={`absolute -bottom-5 md:bottom-[-22px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(96,165,250,0.7)]' : 'text-[#a8a29e]'}`}>
                                Time Post · Rings
                              </p>
                            </div>

                            <div className="text-right flex flex-col gap-3 md:gap-4 min-w-[120px]">
                              <div>
                                <p className="text-[8px] md:text-[9px] text-[#a8a29e] uppercase tracking-widest font-bold mb-0.5 md:mb-1 whitespace-nowrap">Certificate ID</p>
                                <p className={`text-[10px] md:text-xs font-mono transition-colors duration-1000 whitespace-nowrap ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(147,197,253,0.7)]' : 'text-[#57534e]'}`}>{allCertificates[currentCertificateIndex].id}</p>
                              </div>
                              <div>
                                <p className="text-[8px] md:text-[9px] text-[#a8a29e] uppercase tracking-widest font-bold mb-0.5 md:mb-1 whitespace-nowrap">Issue Date</p>
                                <p className={`text-[10px] md:text-xs font-medium italic transition-colors duration-1000 whitespace-nowrap ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(147,197,253,0.7)]' : 'text-[#57534e]'}`}>{format(allCertificates[currentCertificateIndex].date, 'yyyy.MM.dd')}</p>
                              </div>
                            </div>
                          </div>
                      </div>
                    </div>

                    {/* Static Image Version (Visible once ready, allows direct long-press) */}
                    {autoGeneratedCertImage && (
                      <div className="absolute inset-0 flex justify-center items-center z-50">
                        <img 
                          src={autoGeneratedCertImage} 
                          alt="Certificate" 
                          className="w-[300px] sm:w-[340px] md:w-[480px] shadow-2xl rounded-sm border-[8px] md:border-[12px] border-transparent"
                          style={{ pointerEvents: 'auto' }}
                        />
                      </div>
                    )}

                    {/* Loading State for Auto-generation */}
                    {isAutoGenerating && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-[1px] z-40 rounded-sm">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Generating HD Image...</p>
                        </div>
                      </div>
                    )}
                  </div>

                </motion.div>
              </AnimatePresence>

              {/* Pagination Indicator */}
              {allCertificates.length > 1 && (
                <div className="mt-6 flex items-center gap-2 bg-[rgba(255,255,255,0.5)] backdrop-blur-md px-4 py-1.5 rounded-full border border-[rgba(231,229,228,0.5)] shadow-sm">
                  {allCertificates.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentCertificateIndex(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentCertificateIndex ? 'bg-[#292524] w-4' : 'bg-[#d6d3d1] hover:bg-[#a8a29e]'}`}
                    />
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 md:mt-8 flex justify-center gap-4">
                <button 
                  onClick={() => setIsCertificateModalOpen(false)}
                  className="px-8 py-3 bg-[rgba(245,245,244,0.8)] hover:bg-[rgba(231,229,228,0.8)] backdrop-blur-md text-stone-500 rounded-full text-sm font-bold transition-all border border-[rgba(231,229,228,0.5)] flex items-center gap-2"
                >
                  <X size={16} />
                  Close
                </button>
                <button 
                  onClick={handleDownloadCertificate}
                  disabled={isDownloading}
                  className="px-8 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-sm font-bold transition-all shadow-xl flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.2)] border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Download size={16} />
                  )}
                  <span className="whitespace-nowrap">
                    {isDownloading ? 'Saving...' : 'Save Certificate'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
  </AnimatePresence>

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

                <button 
                  disabled={isLoggingIn}
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setIsSignUp(false);
                    setLoginError(null);
                  }}
                  className="mt-8 text-stone-400 text-xs font-bold uppercase tracking-widest hover:text-stone-600 transition-colors disabled:opacity-0"
                >
                  Not Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-2xl font-bold text-stone-800 mb-2">Are you sure?</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-8">
                  {letterToDeleteId 
                    ? "This letter carries your expectations for the future. Once deleted, this memory will be lost forever."
                    : "This goal represents your vision for life. Once deleted, it will be removed from your life grid."}
                </p>
                
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={letterToDeleteId ? confirmDeleteLetter : confirmDeleteGoal}
                    className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg active:scale-[0.98]"
                  >
                    Confirm Delete
                  </button>
                  <button 
                    onClick={() => {
                      setIsDeleteConfirmOpen(false);
                      setLetterToDeleteId(null);
                      setGoalToDeleteId(null);
                    }}
                    className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Keep {letterToDeleteId ? 'Letter' : 'Goal'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Certificate Button (Quick Access) */}
      <AnimatePresence>
        {allCertificates.length > 0 && !isCertificateModalOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setCurrentCertificateIndex(0);
              setIsCertificateModalOpen(true);
            }}
            className={`
              fixed bottom-6 right-6 z-40 w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors
              ${allCertificates[0].isCenturyTraveler 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-stone-800 text-white hover:bg-stone-900'}
            `}
            title="View my Time Certificate"
          >
            <Award size={24} className="md:w-7 md:h-7" />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-current"
            />
          </motion.button>
        )}
        {/* Image Preview Modal Fallback */}
        <AnimatePresence>
          {isImagePreviewOpen && downloadedImage && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-stone-900/90 backdrop-blur-md"
                onClick={() => setIsImagePreviewOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] overflow-hidden max-w-2xl w-full relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Certificate Preview</h3>
                    <p className="text-xs text-stone-500 mt-1">
                      {isMobile ? "Long press the image to 'Save to Photos'" : "Click the button below to download"}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsImagePreviewOpen(false)}
                    className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-stone-50 flex items-center justify-center">
                  <img 
                    src={downloadedImage} 
                    alt="Certificate Preview" 
                    className="max-w-full h-auto shadow-lg rounded-lg"
                  />
                </div>
                
                <div className="p-6 bg-white border-t border-stone-100 flex flex-col sm:flex-row gap-4">
                  {isMobile ? (
                    <div className="flex-1 text-center py-2 px-4 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium">
                      💡 Tip: Long press the image above and select <b>"Save to Photos"</b> or <b>"Add to Photos"</b>.
                    </div>
                  ) : (
                    <a 
                      href={downloadedImage} 
                      download={`life-grid-certificate-${allCertificates[currentCertificateIndex].id}.png`}
                      className="flex-1 px-8 py-4 bg-stone-900 text-white rounded-full text-sm font-bold transition-all shadow-xl flex items-center justify-center gap-2 hover:bg-stone-800"
                    >
                      <Download size={18} />
                      Confirm Download
                    </a>
                  )}
                  <button 
                    onClick={() => setIsImagePreviewOpen(false)}
                    className={`px-8 py-4 rounded-full text-sm font-bold transition-all ${isMobile ? 'bg-stone-900 text-white w-full' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                  >
                    {isMobile ? 'Got it' : 'Cancel'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
};

const TimeTunnel = () => {
  const [streakCount, setStreakCount] = useState(window.innerWidth < 768 ? 340 : 320);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const stars = Array.from({ length: 100 });

  useEffect(() => {
    const updateCount = () => {
      const mobile = window.innerWidth < 768;
      setStreakCount(mobile ? 340 : 320);
      setIsMobile(mobile);
    };
    updateCount();
    window.addEventListener('resize', updateCount);
    return () => window.removeEventListener('resize', updateCount);
  }, []);

  const colors = [
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#60a5fa', // Light Blue
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#10b981', // Emerald
    '#facc15', // Yellow
    '#ffffff', // White
  ];

  const streakData = useMemo(() => {
    return Array.from({ length: streakCount }).map((_, i) => ({
      id: i,
      angle: (i * 360) / streakCount + (Math.random() * 2 - 1), // Slight randomness in angle
      delay: Math.random() * -10,
      duration: 0.5 + Math.random() * 1.5, // Faster, more dynamic range
      color: colors[i % colors.length],
      width: isMobile 
        ? 0.5 + Math.random() * 5 // Mobile: 0.5px to 5.5px
        : 0.5 + Math.random() * 6, // Desktop: 0.5px to 6.5px
      blur: Math.random() > 0.8 ? 2 : 0.5, // Some streaks are blurrier for depth
    }));
  }, [streakCount, isMobile]);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#020617]">
      {/* Deep Space Nebula Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.25),transparent_70%)]" />
      
      {/* Starfield */}
      {stars.map((_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute w-[1.5px] h-[1.5px] bg-white rounded-full shadow-[0_0_2px_#fff]"
          initial={{ 
            top: `${Math.random() * 100}%`, 
            left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.9
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5 + Math.random() * 2.5, repeat: Infinity }}
        />
      ))}

      {/* Radial Streaks - Enhanced Motion and Variety */}
      {streakData.map((streak) => (
        <motion.div
          key={`streak-${streak.id}`}
          initial={{ 
            top: '50%',
            left: '50%',
            width: `${streak.width}px`,
            height: '0px',
            opacity: 0,
            rotate: streak.angle,
            originY: 0,
            originX: '50%'
          }}
          animate={{ 
            height: ['0px', '4500px'], 
            opacity: [0, 1, 0.5, 0],
            scaleX: [1, 1.2, 1],
          }}
          transition={{
            duration: streak.duration,
            repeat: Infinity,
            delay: streak.delay,
            ease: "circIn", // Stronger acceleration feel
          }}
          className="absolute will-change-[height,opacity]"
          style={{
            background: `linear-gradient(to bottom, ${streak.color}, ${streak.color}88, transparent)`,
            boxShadow: streak.width > 3 ? `0 0 15px ${streak.color}66` : `0 0 5px ${streak.color}33`,
            filter: `blur(${streak.blur}px)`,
          }}
        />
      ))}

      {/* Central Vanishing Point */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-64 h-64 bg-blue-400/20 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full blur-sm shadow-[0_0_60px_#fff]" />
        <motion.div 
          animate={{ scale: [1, 2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-200/30 rounded-full blur-3xl" 
        />
      </div>

      {/* Speed Lines Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,6,23,0.4)_100%)] pointer-events-none" />
    </div>
  );
};

const MiniStatCard: React.FC<{ title: string; value: string | number | undefined; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white p-5 rounded-[2rem] border border-[#F5F5F4] shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col items-center text-center"
  >
    <div className="flex items-center gap-2 mb-2">
      <div className="text-[#A8A29E]">{icon}</div>
      <span className="text-[10px] font-black text-[#A8A29E] uppercase tracking-[0.2em]">{title}</span>
    </div>
    <span className={`text-2xl font-sans font-bold ${color}`}>{value}</span>
  </motion.div>
);

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
    <span className="text-[#78716C] font-bold">{label}</span>
  </div>
);

export default App;
