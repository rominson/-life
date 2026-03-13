
import React, { useState, useMemo, useEffect, useRef, Component } from 'react';
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

import html2canvas from 'html2canvas';

// Firebase Imports
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  onAuthStateChanged, 
  signOut,
  ConfirmationResult
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  addDoc,
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  deleteDoc,
  getDocFromServer,
  Timestamp,
  writeBatch
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
    "你现在最想实现的愿望是什么？",
    "此时此刻，你最想感谢的人是谁？",
    "想象一下，10年后的你正在过着怎样的生活？",
    "给未来的自己一个建议吧。",
    "记录下今天让你感到快乐的一件小事。",
    "现在的你，最害怕失去的是什么？",
    "写下一个你希望未来永远不要忘记的瞬间。"
  ],
  century: [
    "你对22世纪的世界有什么样的幻想？",
    "如果2100年的你还能看到这封信，你想对自己说什么？",
    "你希望人类在下个世纪解决了哪些问题？",
    "给2100年的后代留一句话吧。",
    "你认为那时候的人们还会使用现在的这些科技吗？",
    "想象一下，2100年的早晨，你醒来看到的第一个画面。",
    "如果能跨越时空，你想带给下个世纪的人什么礼物？"
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
  // In a real app, you might show a toast or throw to an ErrorBoundary
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
            <h2 className="text-2xl font-serif font-bold text-stone-800 mb-4">糟糕，出错了</h2>
            <p className="text-stone-500 text-sm mb-8">
              系统遇到了一些问题。请尝试刷新页面，或者联系我们。
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
              刷新页面
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
    return saved ? JSON.parse(saved) : [
      { id: '1', title: '遇见生命中的另一半', age: 28, completed: false },
      { id: '2', title: '环游世界', age: 45, completed: false },
      { id: '3', title: '享受宁静的退休生活', age: 60, completed: false },
    ];
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
  const [user, setUser] = useState<{ id: string; name: string; phone?: string } | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'phone'>('phone');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginSmsCode, setLoginSmsCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [letterToDeleteId, setLetterToDeleteId] = useState<string | null>(null);
  const [letterError, setLetterError] = useState('');
  const [goalError, setGoalError] = useState('');
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedImage, setDownloadedImage] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

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
        sender: user.name || '时空旅者',
        departureYear: createdAt.getFullYear(),
        arrivalYear: unlockDate.getFullYear(),
        arrivalAge: letter.unlockAge,
        isCenturyTraveler: unlockDate.getFullYear() >= 2100,
        date: createdAt
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Newest first
  }, [letters, birthDate, user]);

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
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        setUser({
          id: firebaseUser.uid,
          name: userData.name || `用户 ${firebaseUser.phoneNumber?.slice(-4) || '未知'}`,
          phone: firebaseUser.phoneNumber || ''
        });

        if (!userData.name) {
          setIsOnboardingModalOpen(true);
        }

        if (userData.birthDate) setBirthDate(userData.birthDate);

        // Fetch Subcollections
        const goalsQuery = query(collection(db, 'users', firebaseUser.uid, 'goals'), orderBy('age', 'asc'));
        unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
          setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LifeGoal)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${firebaseUser.uid}/goals`));

        const lettersQuery = query(collection(db, 'users', firebaseUser.uid, 'letters'), orderBy('unlockAge', 'asc'));
        unsubscribeLetters = onSnapshot(lettersQuery, (snapshot) => {
          setLetters(snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString()
          } as FutureLetter)));
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
    
    console.log('Attempting to download certificate...');
    if (!certificateRef.current) {
      console.error('Certificate ref is null!');
      alert('保存失败：未找到证书元素');
      return;
    }
    
    setIsDownloading(true);
    
    try {
      // 稍微等待一下，确保二维码等异步内容渲染完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Capturing canvas with html2canvas...');
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2, 
        useCORS: true, 
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          // 1. Hide external textures that might cause CORS issues during capture
          const textures = clonedDoc.querySelectorAll('[class*="bg-[url("]');
          textures.forEach(el => {
            (el as HTMLElement).style.backgroundImage = 'none';
          });

          // 2. Global CSS Variable Reset
          const styleTag = clonedDoc.createElement('style');
          styleTag.innerHTML = `
            * { 
              --tw-ring-color: transparent !important;
              --tw-shadow-color: transparent !important;
              --tw-outline-color: transparent !important;
            }
          `;
          clonedDoc.head.appendChild(styleTag);

          // 3. Element-by-element color conversion
          const allElements = clonedDoc.querySelectorAll('*');
          const view = clonedDoc.defaultView || window;
          
          allElements.forEach(el => {
            try {
              const htmlEl = el as HTMLElement;
              const style = view.getComputedStyle(htmlEl);
              
              // Standard color properties
              const colorProps = [
                'color', 'backgroundColor', 'borderColor', 'borderTopColor', 
                'borderRightColor', 'borderBottomColor', 'borderLeftColor', 
                'fill', 'stroke', 'outlineColor', 'columnRuleColor',
                'textDecorationColor', 'textEmphasisColor'
              ];
              
              colorProps.forEach(prop => {
                const val = style.getPropertyValue(prop);
                if (val && (val.includes('oklab') || val.includes('oklch') || val.includes('color-mix'))) {
                  const resolvedColor = convertToRgba(val);
                  if (resolvedColor && !resolvedColor.includes('oklab') && !resolvedColor.includes('oklch')) {
                    htmlEl.style.setProperty(prop, resolvedColor, 'important');
                  }
                }
              });

              // Complex properties: boxShadow, textShadow
              const complexProps = ['boxShadow', 'textShadow'];
              complexProps.forEach(prop => {
                const val = (style as any)[prop];
                if (val && (val.includes('oklab') || val.includes('oklch') || val.includes('color-mix'))) {
                  htmlEl.style.setProperty(prop, 'none', 'important');
                }
              });
            } catch (e) {
              // Ignore errors for individual elements
            }
          });
        }
      });
      
      console.log('Canvas captured, generating image URL...');
      const image = canvas.toDataURL('image/png', 1.0);
      setDownloadedImage(image);
      setIsImagePreviewOpen(true);
      
      // Attempt automatic download as well
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = image;
      link.download = `时光织锦-证书-${allCertificates[currentCertificateIndex].id}.png`;
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 100);
      
      console.log('Download triggered successfully');
    } catch (error: any) {
      console.error('保存证书失败:', error);
      alert(`保存证书失败:\n${error.message || '未知错误'}\n\n提示：如果下载失败，您可以尝试直接截图保存。`);
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
      setGoalError('请输入愿望内容');
      return;
    }
    if (newGoalAge === '') {
      setGoalError('请输入预期年龄');
      return;
    }
    if (typeof newGoalAge === 'number' && (newGoalAge < 0 || newGoalAge > MAX_AGE_YEARS)) {
      setGoalError(`年龄必须在 0 到 ${MAX_AGE_YEARS} 岁之间`);
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

  const removeGoal = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.id, 'goals', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.id}/goals/${id}`);
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
        setLetterError('请先写下你想说的话');
        return;
      }
      if (newLetterAge === '') {
        setLetterError('请输入开启年龄');
        return;
      }
      if (typeof newLetterAge === 'number' && newLetterAge <= (stats?.yearsLived || 0)) {
        setLetterError(`开启年龄必须大于当前年龄 (${Math.floor(stats?.yearsLived || 0)} 岁)`);
        return;
      }
      if (typeof newLetterAge === 'number' && newLetterAge > MAX_AGE_YEARS) {
        setLetterError(`开启年龄不能超过 ${MAX_AGE_YEARS} 岁`);
        return;
      }
      setPendingLetter({ content: newLetterContent, age: newLetterAge });
    } else {
      if (!newCenturyLetterContent.trim()) {
        setLetterError('请先写下你想说的话');
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
      // 增加一点人为延迟，让时空隧道特效更完整
      await new Promise(resolve => setTimeout(resolve, 2200));

      // 计算解锁日期
      const birth = new Date(birthDate);
      const unlockDate = addYears(birth, pendingLetter.age);
      
      // 保存到 Firestore
      const letterData = {
        content: pendingLetter.content,
        unlockAge: pendingLetter.age,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'users', user.id, 'letters'), letterData);

      // 准备证书数据
      setCertificateData({
        id: letterId.slice(-8).toUpperCase(),
        sender: user.name || '时空旅者',
        departureYear: new Date().getFullYear(),
        arrivalYear: unlockDate.getFullYear(),
        arrivalAge: pendingLetter.age,
        isCenturyTraveler: writingLetterType === 'century' || unlockDate.getFullYear() >= 2100
      });

      // 清空输入
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
      console.error('寄出失败:', error);
      handleFirestoreError(error, OperationType.CREATE, `users/${user.id}/letters`);
      alert('寄出失败，请稍后重试');
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  const removeLetter = async (id: string) => {
    setLetterToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteLetter = async () => {
    if (letterToDeleteId && user) {
      try {
        await deleteDoc(doc(db, 'users', user.id, 'letters', letterToDeleteId));
        setLetterToDeleteId(null);
        setIsDeleteConfirmOpen(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.id}/letters/${letterToDeleteId}`);
      }
    }
  };

  const updateUserName = async (newName: string) => {
    if (!user || !newName.trim()) return;
    
    setIsUpdatingName(true);
    try {
      await setDoc(doc(db, 'users', user.id), { name: newName.trim() }, { merge: true });
      
      setUser({ ...user, name: newName.trim() });
      // 如果证书开着，同步更新证书上的名字
      if (certificateData) {
        setCertificateData({ ...certificateData, sender: newName.trim() });
      }
      setIsOnboardingModalOpen(false);
      setIsEditingCertificateName(false);
    } catch (error) {
      console.error('更新姓名失败:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleLogin = async (method: 'phone') => {
    if (!loginSmsCode || !confirmationResultRef.current) return;
    setIsLoggingIn(true);
    
    try {
      const result = await confirmationResultRef.current.confirm(loginSmsCode);
      const firebaseUser = result.user;
      
      // 登录成功后，useEffect 中的 onAuthStateChanged 会处理后续逻辑
      setIsLoginModalOpen(false);
      
    } catch (err: any) {
      alert(err.message || '登录失败，请检查验证码');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('86') && cleaned.length === 13) {
      return '+' + cleaned;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+86' + cleaned;
    }
    if (!phone.startsWith('+')) {
      // Default to +86 if it looks like a Chinese number but doesn't have the prefix
      return '+86' + cleaned;
    }
    return phone;
  };

  // 当登录弹窗打开时，初始化 reCAPTCHA
  useEffect(() => {
    let timeoutId: any;
    
    if (isLoginModalOpen && recaptchaRef.current && !verifierRef.current) {
      try {
        verifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
          size: 'normal',
          callback: () => {
            console.log('Recaptcha resolved');
            setIsHumanVerified(true);
          },
          'expired-callback': () => {
            console.log('Recaptcha expired');
            setIsHumanVerified(false);
          },
          'error-callback': (error: any) => {
            console.error('Recaptcha error:', error);
            setIsHumanVerified(false);
          }
        });
        verifierRef.current.render();
      } catch (err) {
        console.error('Failed to initialize reCAPTCHA:', err);
      }
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (verifierRef.current) {
        try {
          verifierRef.current.clear();
          verifierRef.current = null;
        } catch (e) {
          console.error('Error clearing reCAPTCHA:', e);
        }
      }
      setIsHumanVerified(false);
    };
  }, [isLoginModalOpen]);

  const sendSmsCode = async () => {
    if (!loginPhone || !verifierRef.current) {
      alert('请先完成人机验证');
      return;
    }
    setIsSendingCode(true);
    try {
      const formattedPhone = formatPhoneNumber(loginPhone);
      console.log('Sending SMS to:', formattedPhone);
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifierRef.current);
      confirmationResultRef.current = confirmation;
      alert('验证码已发送');
    } catch (err: any) {
      console.error('发送失败:', err);
      let msg = '发送失败，请检查手机号格式';
      if (err.code === 'auth/invalid-phone-number') {
        msg = '手机号格式不正确，请包含国家代码（如 +86）';
      } else if (err.code === 'auth/too-many-requests') {
        msg = '请求过于频繁，请稍后再试';
      } else if (err.code === 'auth/captcha-check-failed') {
        msg = '验证码校验失败，请重试';
        setIsHumanVerified(false);
      }
      alert(`${msg}\n(${err.message || '网络错误'})`);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('退出失败:', err);
    }
  };

  useEffect(() => {
    // 如果已登录，定期同步 birthDate 到后端
    if (user && birthDate) {
      const syncData = async () => {
        try {
          await setDoc(doc(db, 'users', user.id), { birthDate }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
        }
      };
      const timer = setTimeout(syncData, 2000); // 防抖
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
          <p className="text-stone-400 text-sm font-serif italic">正在连接时光隧道...</p>
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
              时光织锦Life
            </h1>
            <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-[#A8A29E] mt-1.5 font-medium">
              可视化你生命中的每一个篇章
            </p>
          </div>
          
          {/* Controls Group - Spread on Mobile, Right-aligned on Desktop */}
          <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-4">
            {/* Date Picker */}
            <div className="flex items-center bg-white/50 backdrop-blur-sm px-3 rounded-2xl border border-[#E7E5E4] shadow-sm h-[38px]">
              <input 
                type="date" 
                className="bg-transparent border-none text-sm focus:ring-0 outline-none transition-all font-medium text-[#57534E] w-32 p-0"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
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
                            我的证书 ({allCertificates.length})
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
                          退出登录
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
                  <Smartphone size={14} />
                  手机登录
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
                每一刻都是一份礼物
              </h2>
              <p className="text-lg text-[#78716C] font-light leading-relaxed mb-8">
                你的生命是以月为单位书写的独特故事。<br/>
                输入你的出生日期，看看你已经填满的画布，以及等待你创作的未来空间。
              </p>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#A8A29E] border-t border-[#E7E5E4] pt-6">
                <span>请在上方选择你的起点</span>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 h-full">
            {/* Stats Dashboard - Elegant Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
              <MiniStatCard 
                title="已历经的天数" 
                value={stats?.daysLived.toLocaleString()} 
                icon={<Sun size={14} />}
                color="text-[#57534E]" 
              />
              <MiniStatCard 
                title="已走过的岁序" 
                value={stats?.yearsLived} 
                icon={<Compass size={14} />}
                color="text-[#57534E]" 
              />
              <MiniStatCard 
                title="生命进度" 
                value={`${stats?.percentLived.toFixed(1)}%`} 
                icon={<Sparkles size={14} />}
                color="text-[#57534E]" 
              />
              <MiniStatCard 
                title="未来的季节" 
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
                    <h3 className="text-2xl font-serif font-semibold text-[#2D2A26]">生命画布</h3>
                    <p className="text-xs text-[#A8A29E] uppercase tracking-widest mt-1 font-bold">百岁人生 (1,200 个月)</p>
                  </div>
                  <div className="flex flex-wrap gap-6 text-[11px] font-bold uppercase tracking-wider">
                    <LegendItem color="bg-[#57534E]" label="过去" />
                    <LegendItem color="bg-[#F43F5E]" label="愿望" />
                    <LegendItem color="bg-[#10B981]" label="达成" />
                    <LegendItem color="bg-[#F5F5F4] border border-[#E7E5E4]" label="未来" />
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
                            ? `目标: ${monthGoals.map(g => g.title).join(', ')} (年龄 ${Math.floor(idx/12)})${isCompleted ? ' - 已达成' : ''}`
                            : `第 ${idx + 1} 个月 (${Math.floor(idx/12)} 岁)`
                          }
                        />
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-[#F5F5F4] flex justify-between text-[11px] uppercase tracking-[0.2em] font-bold text-[#A8A29E] shrink-0">
                  <span>黎明: {format(new Date(birthDate), 'yyyy年MM月')}</span>
                  <span>夕阳: {format(addYears(new Date(birthDate), 100), 'yyyy年')}</span>
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
                    <h3 className="text-xl font-serif font-bold text-[#2D2A26]">人生愿望清单</h3>
                  </div>

                  <div className="flex flex-col gap-4 mb-8 shrink-0">
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="你的下一个梦想是什么？"
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
                          placeholder="预期年龄"
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
                        {goals.sort((a, b) => a.age - b.age).map(goal => (
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
                                <span className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mt-0.5">年龄 {goal.age}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => removeGoal(goal.id)}
                              className="p-2 text-[#D6D3D1] hover:text-[#F43F5E] transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </motion.div>
                        ))}
                        {goals.length === 0 && (
                          <div className="text-center py-12">
                            <p className="text-[#A8A29E] text-sm font-serif italic">未来是一张白纸...</p>
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
                      <h3 className="text-xl font-serif font-bold text-[#2D2A26]">时光信囊</h3>
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
                      {isWritingLetter ? '取消' : '写一封信'}
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
                            {writingLetterType === 'general' ? '写给未来的信' : '跨世纪信囊'}
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
                            {currentInspiration ? '换一个' : '获取灵感'}
                          </button>
                        </div>
                        <textarea 
                          placeholder={currentInspiration || (writingLetterType === 'general' ? "写给未来的自己..." : "写给新世纪的自己...")}
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
                            placeholder="开启年龄 (如: 40)"
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
                            <span className="text-sm font-bold">寄出</span>
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
                                    你有机会见证 22 世纪的曙光，给 2100 年的自己写封信吧
                                  </p>
                                </motion.div>
                              ) : (
                                <p className="text-[#A8A29E] text-sm font-serif italic">还没有寄给未来的信...</p>
                              )}
                            </div>
                          ) : (
                            letters.sort((a, b) => a.unlockAge - b.unlockAge).map(letter => {
                              const isUnlocked = (stats?.yearsLived || 0) >= letter.unlockAge;
                              return (
                                <div key={letter.id} className="p-4 bg-[#FAFAF9] rounded-[1.5rem] border border-[#F5F5F4] group hover:border-[#E7E5E4] transition-all">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {isUnlocked ? <Unlock size={14} className="text-emerald-500" /> : <Lock size={14} className="text-amber-500" />}
                                      <span className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">
                                        {letter.unlockAge} 岁开启
                                      </span>
                                    </div>
                                    <button 
                                      onClick={() => removeLetter(letter.id)}
                                      className="p-1 text-[#D6D3D1] hover:text-[#F43F5E] transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  {isUnlocked ? (
                                    <p className="text-sm text-[#44403C] leading-relaxed italic">"{letter.content}"</p>
                                  ) : (
                                    <div className="h-12 flex items-center justify-center bg-stone-100/50 rounded-xl border border-dashed border-stone-200">
                                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">内容已加密</span>
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
          "你的生命是唯一值得书写的故事。请用心去写。"
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
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-3">开启未来提醒</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-6">
                  时光荏苒，我们担心您会忘记这封信。当信囊在 <span className="font-bold text-emerald-600">{pendingLetter?.age} 岁</span> 解锁时，我们会第一时间短信通知您。
                </p>

                <div className="w-full space-y-4">
                  <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm mb-4 flex items-center justify-center text-emerald-600">
                      <Smartphone size={32} />
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium text-center">
                      提醒号码: <span className="font-bold">{user?.phone}</span><br/>
                      手机号是跨越时光最稳定的联系方式。
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-2">
                    <button 
                      disabled={isSubmittingReminder}
                      onClick={confirmLetter}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmittingReminder ? '正在寄出...' : '确认寄出'}
                    </button>
                    <button 
                      disabled={isSubmittingReminder}
                      onClick={() => setIsReminderModalOpen(false)}
                      className="w-full py-4 bg-transparent text-stone-400 rounded-2xl font-bold hover:text-stone-600 transition-all"
                    >
                      返回修改
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
                  className="w-full"
                >
                  {/* The Certificate Card */}
                  <div 
                    ref={certificateRef}
                    className={`
                    p-1 rounded-sm shadow-2xl border-[8px] md:border-[12px] relative overflow-hidden transition-all duration-1000
                    ${allCertificates[currentCertificateIndex].isCenturyTraveler 
                      ? 'bg-[#020617] border-[#1e293b] ring-1 ring-[rgba(96,165,250,0.2)]' 
                      : 'bg-[#F5F2ED] border-white'
                    }
                  `}>
                    {/* Decorative Inner Border */}
                    <div className={`
                      border pt-12 pb-6 px-6 md:p-12 flex flex-col items-center text-center relative transition-colors duration-1000
                      ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'border-[rgba(59,130,246,0.2)]' : 'border-stone-300'}
                    `}>
                        
                        {/* Background Watermark */}
                        <div className={`
                          absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000
                          ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'opacity-[0.07] text-blue-300' : 'opacity-[0.03] text-stone-800'}
                        `}>
                          <Hourglass size={240} className="md:w-[300px] md:h-[300px]" />
                        </div>

                        {/* Century Traveler Special Effects */}
                        {allCertificates[currentCertificateIndex].isCenturyTraveler && (
                          <>
                            {/* Humanistic Texture Overlay - Space Parchment Feel */}
                            <div 
                              className="absolute inset-0 opacity-60 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" 
                              style={{ backgroundSize: '16px 16px' }}
                            />
                            
                            {/* Refined Top Glow - Slightly darker and more contained */}
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(30,64,175,0.35)_0%,rgba(37,99,235,0.1)_30%,transparent_60%)] pointer-events-none" />
                            
                            {/* Corner Decorative Elements - Like antique book corners but futuristic */}
                            <div className="absolute top-2 left-2 w-8 h-8 border-t border-l border-[rgba(96,165,250,0.3)] rounded-tl-sm pointer-events-none" />
                            <div className="absolute top-2 right-2 w-8 h-8 border-t border-r border-[rgba(96,165,250,0.3)] rounded-tr-sm pointer-events-none" />
                            <div className="absolute bottom-2 left-2 w-8 h-8 border-b border-l border-[rgba(96,165,250,0.3)] rounded-bl-sm pointer-events-none" />
                            <div className="absolute bottom-2 right-2 w-8 h-8 border-b border-r border-[rgba(96,165,250,0.3)] rounded-br-sm pointer-events-none" />

                            <div className="absolute top-3 right-3 md:top-6 md:right-6">
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-r from-[rgba(37,99,235,0.2)] to-[rgba(79,70,229,0.2)] border border-[rgba(96,165,250,0.4)] px-2 py-0.5 md:px-3 md:py-1 rounded-full flex items-center gap-1 md:gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                              >
                                <Sparkles size={12} className="text-blue-300" />
                                <span className="text-[8px] md:text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em]">22世纪见证者</span>
                              </motion.div>
                            </div>
                          </>
                        )}

                        {/* Header */}
                        <div className="mb-4 md:mb-8">
                          <div className={`flex justify-center mb-2 md:mb-4 transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[#60a5fa]' : 'text-[#292524]'}`}>
                            <Award size={40} className="md:w-12 md:h-12" strokeWidth={1} />
                          </div>
                          <h2 className={`
                            text-2xl md:text-4xl font-serif font-light tracking-[0.2em] uppercase mb-1 md:mb-2 transition-colors duration-1000 max-w-[390px] w-full mx-auto leading-tight
                            ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-blue-50 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-[#292524]'}
                          `}>
                            {allCertificates[currentCertificateIndex].isCenturyTraveler ? (
                              <>跨世纪<br />时光守护证书</>
                            ) : '时光守护证书'}
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
                        <div className="space-y-4 md:space-y-6 mb-6 md:mb-10 relative z-10">
                          <div>
                            {isEditingCertificateName ? (
                              <div className="flex flex-col items-center gap-2">
                                <input 
                                  autoFocus
                                  type="text"
                                  className={`
                                    text-xl md:text-2xl font-bold border-b outline-none text-center px-2 py-1 w-40 md:w-48 transition-all
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
                                <p className="text-[8px] md:text-[9px] text-stone-400 uppercase tracking-widest font-bold">按回车确认修改</p>
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
                                  text-xl md:text-2xl font-bold mb-1 transition-colors duration-1000
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

                          <p className={`leading-relaxed max-w-xs mx-auto text-xs md:text-sm transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(219,234,254,0.8)]' : 'text-[#57534e]'}`}>
                            于 <span className={`font-bold ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[#60a5fa]' : 'text-[#1c1917]'}`}>{allCertificates[currentCertificateIndex].departureYear}年</span> 寄出一份跨越时空的托付。
                            {allCertificates[currentCertificateIndex].isCenturyTraveler ? (
                              <>此信囊已进入<span className="text-[#60a5fa] font-bold">跨世纪航道</span>，将于 <span className="text-[#60a5fa] font-bold">{allCertificates[currentCertificateIndex].arrivalYear}年</span> 精准启封。</>
                            ) : (
                              <>此信囊已进入永恒轨道，将于 <span className="text-[#1c1917] font-bold">{allCertificates[currentCertificateIndex].arrivalYear}年</span> 精准启封。</>
                            )}
                          </p>

                          <p className={`italic text-[10px] md:text-xs transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(96,165,250,0.6)]' : 'text-[#78716c]'}`}>
                            {allCertificates[currentCertificateIndex].isCenturyTraveler ? '"跨越世纪的曙光，只为遇见未来的你。"' : '"时光会变，但承诺的温度永恒。"'}
                          </p>
                        </div>

                        {/* Footer / Seal & QR Code */}
                        <div className="w-full relative flex justify-between items-center mt-2 md:mt-4 min-h-[80px] md:min-h-[120px]">
                          <div className="text-left relative flex items-center">
                            {/* QR Code for sharing */}
                            <div className={`
                              p-1.5 rounded-lg bg-white shadow-sm transition-all duration-1000
                              ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'ring-1 ring-[rgba(59,130,246,0.5)]' : ''}
                            `}>
                              <QRCodeSVG 
                                value={window.location.href} 
                                size={isMobile ? 48 : 64}
                                level="L"
                                includeMargin={false}
                                fgColor={allCertificates[currentCertificateIndex].isCenturyTraveler ? "#1E293B" : "#2D2A26"}
                              />
                            </div>

                            {/* QR Label - Positioned below the QR code box */}
                            <p className={`absolute top-[calc(100%+8px)] md:top-[calc(100%+12px)] left-0 whitespace-nowrap text-[7px] md:text-[8px] font-bold uppercase tracking-widest ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(96,165,250,0.6)]' : 'text-[#a8a29e]'}`}>
                              扫码开启时光之旅
                            </p>
                          </div>

                          {/* Absolutely Centered Wax Seal */}
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group/seal">
                            {/* Realistic Wax Seal */}
                            <div className="w-16 h-16 md:w-24 md:h-24 relative">
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
                                <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] drop-shadow-[0.5px_0.5px_0.5px_rgba(255,255,255,0.2)]">
                                  <defs>
                                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#D4AF37" />
                                      <stop offset="25%" stopColor="#F9E29C" />
                                      <stop offset="50%" stopColor="#B8860B" />
                                      <stop offset="75%" stopColor="#FFD700" />
                                      <stop offset="100%" stopColor="#AA8A2E" />
                                    </linearGradient>
                                    <filter id="emboss" x="-20%" y="-20%" width="140%" height="140%">
                                      <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" result="blur" />
                                      <feSpecularLighting in="blur" surfaceScale="2.5" specularConstant="1.2" specularExponent="25" lightingColor="#white" result="specOut">
                                        <fePointLight x="-5000" y="-10000" z="20000" />
                                      </feSpecularLighting>
                                      <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
                                      <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litGraphic" />
                                    </filter>
                                  </defs>
                                  
                                  <g filter="url(#emboss)" fill="none" stroke="url(#goldGradient)">
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
                            <p className={`absolute -bottom-5 md:bottom-[-28px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(96,165,250,0.7)]' : 'text-[#a8a29e]'}`}>
                              时光邮局 · 年轮
                            </p>
                          </div>

                          <div className="text-right flex flex-col gap-3 md:gap-4">
                            <div>
                              <p className="text-[8px] md:text-[9px] text-[#a8a29e] uppercase tracking-widest font-bold mb-0.5 md:mb-1">证书编号</p>
                              <p className={`text-[10px] md:text-xs font-mono transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(147,197,253,0.7)]' : 'text-[#57534e]'}`}>{allCertificates[currentCertificateIndex].id}</p>
                            </div>
                            <div>
                              <p className="text-[8px] md:text-[9px] text-[#a8a29e] uppercase tracking-widest font-bold mb-0.5 md:mb-1">签发日期</p>
                              <p className={`text-[10px] md:text-xs font-medium italic transition-colors duration-1000 ${allCertificates[currentCertificateIndex].isCenturyTraveler ? 'text-[rgba(147,197,253,0.7)]' : 'text-[#57534e]'}`}>{format(allCertificates[currentCertificateIndex].date, 'yyyy.MM.dd')}</p>
                            </div>
                          </div>
                        </div>
                    </div>
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
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentCertificateIndex ? 'bg-stone-800 w-4' : 'bg-stone-300 hover:bg-stone-400'}`}
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
                  关闭
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
                  {isDownloading ? '正在生成...' : '保存证书'}
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
                
                <h3 className="text-2xl font-bold text-stone-800 mb-4 tracking-tight">欢迎来到时光织锦</h3>
                
                <p className="text-stone-600 text-sm leading-relaxed mb-8 italic">
                  “守护者，请问该如何称呼您？<br />这个名字将被镌刻在您的时光证书上。”
                </p>

                <div className="w-full space-y-6">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="您的姓名或昵称"
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
                        开启守护之旅
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setIsOnboardingModalOpen(false)}
                    className="text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-stone-600 transition-colors"
                  >
                    稍后再说
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
                  {!isHumanVerified ? '安全验证' : '登录时光织锦'}
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed mb-6">
                  {!isHumanVerified ? '请证明您不是机器人以继续' : '同步您的生命画布与愿望清单'}
                </p>

                <div className={`${isHumanVerified || isLoggingIn ? 'bg-stone-50 p-6 rounded-[2rem] border border-stone-100 min-h-[220px]' : 'min-h-0'} flex flex-col items-center w-full relative justify-center transition-all duration-500 overflow-hidden`}>
                  {/* Always keep recaptcha in DOM to avoid "element removed" error */}
                  <div className={`${!isHumanVerified && !isLoggingIn ? 'opacity-100 relative' : 'opacity-0 absolute pointer-events-none'} flex flex-col items-center space-y-4 transition-opacity duration-500`}>
                    <div ref={recaptchaRef} className="scale-90 md:scale-100"></div>
                    <p className="text-[10px] text-stone-400 italic">完成验证后将自动进入登录界面</p>
                  </div>

                  <AnimatePresence mode="wait">
                    {isLoggingIn ? (
                      <motion.div 
                        key="logging-in"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col items-center justify-center gap-4"
                      >
                        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">正在同步数据...</p>
                      </motion.div>
                    ) : isHumanVerified ? (
                      <motion.div 
                        key="login-form"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center w-full space-y-3"
                      >
                        <input 
                          type="tel" 
                          placeholder="手机号码"
                          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800 outline-none transition-all"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                        />
                        <div className="relative w-full">
                          <input 
                            type="text" 
                            placeholder="验证码"
                            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800 outline-none transition-all pr-24"
                            value={loginSmsCode}
                            onChange={(e) => setLoginSmsCode(e.target.value)}
                          />
                          <button 
                            onClick={sendSmsCode}
                            disabled={isSendingCode || !loginPhone}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-stone-100/80 text-stone-600 rounded-lg text-[10px] font-bold hover:bg-stone-200 transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {isSendingCode ? '发送中...' : '获取验证码'}
                          </button>
                        </div>
                        <button 
                          onClick={() => handleLogin('phone')}
                          className="w-full mt-2 py-3 bg-stone-800 text-white rounded-xl font-bold text-sm hover:bg-stone-700 transition-all"
                        >
                          登录
                        </button>
                        <button 
                          onClick={() => setIsHumanVerified(false)}
                          className="text-[10px] text-stone-400 hover:text-stone-600 transition-all mt-2"
                        >
                          重新进行安全验证
                        </button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <button 
                  disabled={isLoggingIn}
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setIsHumanVerified(false);
                  }}
                  className="mt-8 text-stone-400 text-xs font-bold uppercase tracking-widest hover:text-stone-600 transition-colors disabled:opacity-0"
                >
                  暂不登录
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
                <h3 className="text-2xl font-bold text-stone-800 mb-2">确定要删除吗？</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-8">
                  这封信承载着你对未来的期许。一旦删除，这段时光记忆将无法找回。
                </p>
                
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={confirmDeleteLetter}
                    className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg active:scale-[0.98]"
                  >
                    确认删除
                  </button>
                  <button 
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    保留信件
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
            title="查看我的时光证书"
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
                    <h3 className="text-xl font-bold text-stone-800">证书预览</h3>
                    <p className="text-xs text-stone-500 mt-1">长按图片或点击下方按钮保存</p>
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
                  <a 
                    href={downloadedImage} 
                    download={`time-guardian-certificate-${allCertificates[currentCertificateIndex].id}.png`}
                    className="flex-1 px-8 py-4 bg-stone-900 text-white rounded-full text-sm font-bold transition-all shadow-xl flex items-center justify-center gap-2 hover:bg-stone-800"
                  >
                    <Download size={18} />
                    确认下载
                  </a>
                  <button 
                    onClick={() => setIsImagePreviewOpen(false)}
                    className="px-8 py-4 bg-stone-100 text-stone-600 rounded-full text-sm font-bold transition-all hover:bg-stone-200"
                  >
                    取消
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
