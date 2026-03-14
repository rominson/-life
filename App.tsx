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
              className="px-8 py-3 bg-stone-800 text-white rounded-2xl hover:bg-stone-700 transition-all"
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
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<{
    id: string;
    sender: string;
    departureYear: number;
    arrivalYear: number;
    arrivalAge: number;
    isCenturyTraveler?: boolean;
  } | null>(null);

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [pendingLetter, setPendingLetter] = useState<{ content: string; age: number } | null>(null);
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; email?: string; phone?: string } | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [letterToDeleteId, setLetterToDeleteId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [goalError, setGoalError] = useState('');
  const [letterError, setLetterError] = useState('');

  const [stats, setStats] = useState<{
    daysLived: number;
    monthsLived: number;
    yearsLived: number;
    percentLived: number;
  } | null>(null);

  const [currentCertificateIndex, setCurrentCertificateIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedImage, setDownloadedImage] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isEditingCertificateName, setIsEditingCertificateName] = useState(false);

  const certificateRef = useRef<HTMLDivElement>(null);

  const canReachNextCentury = useMemo(() => {
    if (!birthDate) return false;
    const birth = new Date(birthDate);
    const hundredthBirthday = addYears(birth, 100);
    return hundredthBirthday.getFullYear() >= 2100;
  }, [birthDate]);

  const ageIn2100 = useMemo(() => {
    if (!birthDate) return 0;
    const birthYear = new Date(birthDate).getFullYear();
    return 2100 - birthYear;
  }, [birthDate]);

  const handleQuickLetterTo2100 = () => {
    setWritingLetterType('century');
    setIsWritingLetter(true);
    setCurrentInspiration(null);
  };

  useEffect(() => {
    const savedBirthDate = localStorage.getItem('birthDate');
    if (savedBirthDate) {
      setBirthDate(savedBirthDate);
      calculateStats(savedBirthDate);
    }
  }, []);

  const calculateStats = (date: string) => {
    const birth = new Date(date);
    const now = new Date();
    const days = differenceInDays(now, birth);
    const months = differenceInMonths(now, birth);
    const years = differenceInYears(now, birth);
    const percent = (months / TOTAL_MONTHS) * 100;

    setStats({
      daysLived: Math.max(0, days),
      monthsLived: Math.max(0, months),
      yearsLived: Math.max(0, years),
      percentLived: Math.min(100, Math.max(0, percent))
    });
  };

  const allCertificates = useMemo(() => {
    return letters.map(letter => {
      const unlockDate = addYears(new Date(birthDate), letter.unlockAge);
      return {
        id: letter.id.slice(-8).toUpperCase(),
        sender: user?.name || 'Time Traveler',
        departureYear: new Date(letter.createdAt).getFullYear(),
        arrivalYear: unlockDate.getFullYear(),
        arrivalAge: letter.unlockAge,
        date: new Date(letter.createdAt),
        isCenturyTraveler: unlockDate.getFullYear() >= 2100,
        content: letter.content
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [letters, user, birthDate]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.warn("Firestore permissions restricted as expected for test connection.");
        }
        if (error.code === 'unavailable') {
          console.error("Firestore is unavailable. Please check your network or Firebase configuration.");
        }
      }
    };
    testConnection();

    let unsubscribeGoals: () => void;
    let unsubscribeLetters: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeGoals) unsubscribeGoals();
      if (unsubscribeLetters) unsubscribeLetters();

      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          setUser({
            id: firebaseUser.uid,
            name: userData.name || firebaseUser.displayName || `User ${firebaseUser.email?.split('@')[0] || 'Unknown'}`,
            email: firebaseUser.email || undefined,
            phone: userData.phone || undefined
          });

          if (!userData.name) {
            setIsOnboardingModalOpen(true);
            setOnboardingName(firebaseUser.displayName || '');
          }

          if (userData.birthDate) {
            setBirthDate(userData.birthDate);
            calculateStats(userData.birthDate);
          }
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
      localStorage.setItem('birthDate', birthDate);
    }
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('letters', JSON.stringify(letters));
  }, [birthDate, goals, letters]);

  useEffect(() => {
    if (birthDate) {
      calculateStats(birthDate);
    }
    
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [birthDate]);

// ... 代码过长，请在下一条消息中查看剩余部分 ...
