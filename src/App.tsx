/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams,
  useLocation,
  Navigate
} from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  getDocFromServer,
  limit,
  deleteField,
  getDocs,
  increment,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { compressImage } from './lib/imageUtils';
import { AudioPlayer } from './components/AudioPlayer';
import { 
  User as UserIcon, 
  Search, 
  Plus, 
  MessageSquare, 
  Star, 
  MapPin, 
  BookOpen, 
  LogOut, 
  Menu, 
  X,
  Briefcase,
  Home as HomeIcon,
  Play,
  Send,
  Square,
  Mic,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  AlertCircle,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Globe,
  Wand2,
  Clock,
  Phone,
  Video,
  Camera,
  Smile,
  MoreHorizontal,
  MoreVertical,
  Check,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  Shield,
  Info,
  HelpCircle,
  Settings as SettingsIcon,
  Trash2,
  Lock,
  UserPlus,
  Users,
  ClipboardList,
  Bell,
  Unlock,
  ShieldAlert,
  Paperclip,
  Ban,
  FileText,
  Image as ImageIcon,
  Pause,
} from 'lucide-react';
import { App } from '@capacitor/app';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { toast, Toaster } from 'sonner';
import { generateLogo, getSmartRecommendations, validateAndImproveProfile, validateAndImproveService } from './services/geminiService';

import { ImageUpload } from './components/ImageUpload';

// --- Constants ---
const MOZAMBIQUE_LOCATIONS: Record<string, string[]> = {
  "Cabo Delgado": ["Pemba", "Ancuabe", "Balama", "Chiúre", "Ibo", "Macomia", "Mecúfi", "Meluco", "Metuge", "Mocímboa da Praia", "Montepuez", "Mueda", "Muidumbe", "Namuno", "Nangade", "Palma", "Quissanga"],
  "Gaza": ["Xai-Xai", "Bilene", "Chibuto", "Chicualacuala", "Chigubo", "Chókwe", "Guijá", "Mabalane", "Manjacaze", "Massangena", "Massingir"],
  "Inhambane": ["Inhambane", "Maxixe", "Funhalouro", "Govuro", "Homoíne", "Inharrime", "Inhassoro", "Jangamo", "Mabote", "Massinga", "Morrumbene", "Panda", "Vilankulo", "Zavala"],
  "Manica": ["Chimoio", "Báruè", "Gondola", "Guro", "Macate", "Machaze", "Macossa", "Manica", "Mossurize", "Sussundenga", "Tambara", "Vanduzi"],
  "Maputo Cidade": ["KaMpfumo", "KaNhaka", "KaTembe", "KaMavota", "KaMaxaquene", "KaMubukwana", "KaLhanguene"],
  "Maputo Província": ["Matola", "Boane", "Magude", "Manhiça", "Marracuene", "Matutuíne", "Moamba", "Namaacha"],
  "Nampula": ["Nampula", "Angoche", "Eráti", "Lalaua", "Larde", "Liúpo", "Malema", "Meconta", "Mecubúri", "Memba", "Mogincual", "Mogovolas", "Moma", "Monapo", "Mossuril", "Muecate", "Murrupula", "Nacala-a-Velha", "Nacarôa", "Rapale", "Ribáuè", "Nacala Porto"],
  "Niassa": ["Lichinga", "Chimbonila", "Cuamba", "Lago", "Majune", "Mandimba", "Marrupa", "Maúa", "Mavago", "Mecanhelas", "Mecula", "Metarica", "Muembe", "N'gauma", "Nipepe", "Sanga"],
  "Sofala": ["Beira", "Búzi", "Caia", "Chemba", "Cheringoma", "Chibabava", "Dondo", "Gorongosa", "Marromeu", "Machanga", "Maringué", "Muanza", "Nhamatanda"],
  "Tete": ["Tete", "Angónia", "Cahora-Bassa", "Changara", "Chifunde", "Chiuta", "Doa", "Macanga", "Magoé", "Marávia", "Moatize", "Mutarara", "Tsangano", "Zumbo"],
  "Zambézia": ["Quelimane", "Alto Molócue", "Chinde", "Derre", "Gilé", "Gurué", "Ile", "Inhassunge", "Luabo", "Lugela", "Maganja da Costa", "Milange", "Mocuba", "Mopeia", "Morrumbala", "Mulevala", "Namacurra", "Namarroi", "Nicoadala", "Pebane"]
};

// --- Utilities ---
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CreateJob: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company: profile?.displayName || '',
    province: '',
    district: '',
    salary: '',
    type: 'full-time' as Job['type']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.title || !formData.description || !formData.company || !formData.province || !formData.district) {
      toast.error('Preenche todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'jobs'), {
        title: formData.title,
        description: formData.description,
        company: formData.company,
        location: {
          province: formData.province,
          district: formData.district
        },
        salary: formData.salary,
        type: formData.type,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        createdAt: serverTimestamp(),
        status: 'open'
      });
      toast.success('Oportunidade publicada com sucesso!');
      onClose();
    } catch (err) {
      console.error('Error creating job:', err);
      toast.error('Erro ao publicar oportunidade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Publicar Oportunidade</h2>
            <p className="text-gray-500 font-medium">Ajuda jovens talentos a encontrar o seu caminho.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Título da Vaga *</label>
              <input 
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: Designer Gráfico Júnior"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Empresa *</label>
              <input 
                type="text"
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                placeholder="Nome da empresa"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tipo de Contrato *</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
              >
                <option value="full-time">Tempo Inteiro</option>
                <option value="part-time">Part-time</option>
                <option value="internship">Estágio</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Província *</label>
              <select 
                required
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value, district: '' })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecionar Província</option>
                <option value="Todas as Províncias">Todas as Províncias</option>
                {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Distrito *</label>
              <select 
                required
                disabled={!formData.province}
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">Selecionar Distrito</option>
                {formData.province && MOZAMBIQUE_LOCATIONS[formData.province].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Salário (Opcional)</label>
              <input 
                type="text"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: 15.000 - 20.000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição da Vaga *</label>
              <textarea 
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Descreve as responsabilidades e requisitos..."
              />
            </div>
          </div>

          <div className="pt-4 sticky bottom-0 bg-white">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-5 rounded-2xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Briefcase className="w-6 h-6" />}
              <span>{loading ? 'A publicar...' : 'Publicar Oportunidade'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Types ---
interface UserProfile {
  uid: string;
  displayName: string;
  handle?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  age?: number;
  phoneNumber?: string;
  skills?: string[];
  location?: { 
    province: string; 
    district: string; 
    city?: string;
    lat?: number; 
    lng?: number; 
  };
  role: 'provider' | 'client' | 'admin';
  lookingFor?: string;
  isComplete?: boolean;
  acceptedTerms?: boolean;
  acceptedTermsAt?: any;
  workExamples?: string[];
  bannerURL?: string;
  followerCount?: number;
  followingCount?: number;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    twitter?: string;
  };
  blockedUsers?: string[];
  lastCheckedNotifications?: any;
  rating?: number;
  reviewCount?: number;
  createdAt: any;
  updatedAt?: any;
}

interface Announcement {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  photoURL?: string;
  createdAt: any;
}

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  photoURL?: string;
  location?: { 
    province: string; 
    district: string; 
    city?: string;
    lat?: number; 
    lng?: number; 
  };
  createdAt: any;
  rating?: number;
  reviewCount?: number;
}

interface Order {
  id: string;
  serviceId: string;
  serviceTitle: string;
  clientId: string;
  clientName: string;
  providerId: string;
  providerName: string;
  status: 'pending' | 'accepted' | 'completed_by_provider' | 'completed' | 'cancelled';
  message: string;
  createdAt: any;
  isReviewed?: boolean;
}

interface Job {
  id: string;
  title: string;
  description: string;
  company: string;
  location: {
    province: string;
    district: string;
    city?: string;
  };
  salary?: string;
  type: 'full-time' | 'part-time' | 'internship' | 'freelance';
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: any;
  status: 'open' | 'closed';
}

interface Review {
  id: string;
  orderId: string;
  serviceId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  targetId: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface Education {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: any;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'audio' | 'image' | 'file';
  audioURL?: string;
  imageURL?: string;
  fileURL?: string;
  fileName?: string;
  createdAt: any;
  read?: boolean;
  deletedFor?: string[];
  deletedForAll?: boolean;
}

interface Report {
  id: string;
  reportedId: string;
  reportedType: 'user' | 'service' | 'message' | 'announcement';
  reporterId: string;
  type: 'spam' | 'inappropriate' | 'harassment' | 'fraud' | 'fake_review' | 'technical' | 'other';
  description?: string;
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  createdAt: any;
}

// --- Context ---
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Erro no Firestore (${operationType}): ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('Firestore Error')) {
        setHasError(true);
        try {
          const info = JSON.parse(event.error.message);
          setErrorMsg(`Erro no Firestore (${info.operationType}): ${info.error}`);
        } catch {
          setErrorMsg(event.error.message);
        }
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo correu mal</h2>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Recarregar Aplicação
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const privateDocRef = doc(db, 'users_private', uid);
      // Use getDocFromServer to ensure we get the latest data after an update
      const [docSnap, privateSnap] = await Promise.all([
        getDocFromServer(docRef),
        getDocFromServer(privateDocRef).catch(() => null)
      ]);

      if (docSnap.exists()) {
        let data = docSnap.data() as UserProfile;
        if (privateSnap && privateSnap.exists()) {
          data = { ...data, ...privateSnap.data() };
        }
        setProfile(data);
        console.log('Profile refreshed:', data.uid, 'isComplete:', data.isComplete);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      // Fallback to normal getDoc if server fetch fails
      const [docSnap, privateSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, 'users_private', uid)).catch(() => null)
      ]);
      if (docSnap.exists()) {
        let data = docSnap.data() as UserProfile;
        if (privateSnap && privateSnap.exists()) {
          data = { ...data, ...privateSnap.data() };
        }
        setProfile(data);
      }
    }
  };

  useEffect(() => {
    // Safety timeout to prevent stuck loading state
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timed out. Forcing loading state to false.');
        setLoading(false);
      }
    }, 10000); // 10 seconds timeout

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const privateDocRef = doc(db, 'users_private', firebaseUser.uid);
          const [docSnap, privateSnap] = await Promise.all([
            getDoc(docRef),
            getDoc(privateDocRef).catch(() => null)
          ]);

          if (docSnap.exists()) {
            let data = docSnap.data() as UserProfile;
            
            // Migration: Move PII from public doc to private doc if found
            if (data.email || data.phoneNumber) {
              const privateInfo = {
                email: data.email || firebaseUser.email || '',
                phoneNumber: data.phoneNumber || ''
              };
              await Promise.all([
                setDoc(privateDocRef, privateInfo, { merge: true }),
                updateDoc(docRef, {
                  email: deleteField(),
                  phoneNumber: deleteField()
                })
              ]);
              // Remove from local data object
              delete data.email;
              delete data.phoneNumber;
              data = { ...data, ...privateInfo };
            } else if (privateSnap && privateSnap.exists()) {
              data = { ...data, ...privateSnap.data() };
            }
            setProfile(data);
          } else {
            // New user, create initial profile
            const displayName = firebaseUser.displayName || 'Utilizador';
            const handle = '@' + displayName.toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 15) + '_' + Math.floor(Math.random() * 1000);
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: displayName,
              handle: handle,
              photoURL: firebaseUser.photoURL || undefined,
              role: 'client',
              isComplete: false,
              createdAt: serverTimestamp(),
            };
            const privateInfo = {
              email: firebaseUser.email || '',
            };
            await Promise.all([
              setDoc(docRef, newProfile),
              setDoc(privateDocRef, privateInfo)
            ]);
            setProfile({ ...newProfile, ...privateInfo });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      clearTimeout(timeoutId);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Update online status periodically
  useEffect(() => {
    if (!user || !profile) return;
    
    const updateStatus = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error('Error updating status:', err);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // Every minute
    return () => clearInterval(interval);
  }, [user?.uid, profile?.uid]);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

const Onboarding: React.FC<{ onSkip?: () => void }> = ({ onSkip }) => {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    handle: '',
    age: 18,
    bio: '',
    role: 'provider' as 'provider' | 'client',
    phoneNumber: '',
    photoURL: profile?.photoURL || '',
    lookingFor: '',
    location: { province: '', district: '' },
    acceptedTerms: false
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.displayName || !formData.age || !formData.phoneNumber || !formData.handle) {
        toast.error('Por favor, preenche todos os campos obrigatórios (Nome, Handle, Idade e Telemóvel).');
        return false;
      }
      if (formData.handle.length < 4) {
        toast.error('O nome de utilizador deve ter pelo menos 3 caracteres (além do @).');
        return false;
      }
      if (formData.age < 16) {
        toast.error('Deves ter pelo menos 16 anos para usar a KAZI.');
        return false;
      }
      // Mozambican phone number validation
      const cleanPhone = formData.phoneNumber.replace(/\s+/g, '').replace('+258', '');
      if (!/^(82|83|84|85|86|87)\d{7}$/.test(cleanPhone)) {
        toast.error('Por favor, insere um número de telemóvel de Moçambique válido (ex: 84XXXXXXX).');
        return false;
      }
    }
    if (step === 4) {
      if (!formData.acceptedTerms) {
        toast.error('Precisas de aceitar os Termos e Condições para continuar.');
        return false;
      }
    }
    return true;
  };

  const nextStep = async () => {
    if (validateStep()) {
      if (step === 1) {
        setLoading(true);
        try {
          const q = query(collection(db, 'users'), where('handle', '==', formData.handle));
          const snapshot = await getDocs(q);
          const isTaken = snapshot.docs.some(d => d.id !== profile?.uid);
          if (isTaken) {
            toast.error('Este @nome já está em uso. Escolha outro.');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error checking handle:', err);
        } finally {
          setLoading(false);
        }
      }
      if (step === 3) {
        // Use Gemini to improve bio subtly
        setLoading(true);
        try {
          const result = await validateAndImproveProfile(formData.displayName, formData.bio, formData.phoneNumber);
          if (result.isValid) {
            setFormData(prev => ({ ...prev, bio: result.improvedBio || prev.bio }));
          } else {
            toast.error(result.reason || 'Por favor, escreve uma biografia que faça sentido.');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Gemini bio improvement error:', err);
        } finally {
          setLoading(false);
        }
      }
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!validateStep()) return;
    
    setLoading(true);
    try {
      console.log('Submitting onboarding for:', profile.uid);
      const userRef = doc(db, 'users', profile.uid);
      const privateRef = doc(db, 'users_private', profile.uid);
      
      const { phoneNumber, ...publicData } = formData;
      
      await Promise.all([
        setDoc(userRef, {
          uid: profile.uid,
          ...publicData,
          isComplete: true,
          acceptedTermsAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true }),
        setDoc(privateRef, {
          email: (profile as any).email || '',
          phoneNumber,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      ]);
      
      console.log('Onboarding data saved, refreshing profile...');
      await refreshProfile(profile.uid);
      toast.success('Perfil concluído com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-bg flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-8 md:p-12 my-8 relative"
      >
        {onSkip && (
          <button 
            onClick={onSkip}
            className="absolute top-8 right-8 p-2 text-brand-ink/20 hover:text-brand-ink transition-colors flex flex-col items-center group"
          >
            <X className="w-6 h-6" />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Explorar</span>
          </button>
        )}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo className="scale-150" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-brand-ink">Bem-vindo à KAZI</h2>
          <p className="text-brand-ink/60 font-medium">Configura o teu perfil para começar a transformar talento em oportunidade.</p>
        </div>

        {/* Steps */}
        <div className="flex justify-center space-x-2 mb-10">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all", step >= i ? "w-8 bg-primary" : "w-4 bg-brand-gray")} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center mb-8">
              <ImageUpload 
                onImageUploaded={(url) => setFormData({ ...formData, photoURL: url })}
                currentImage={formData.photoURL}
                label="Foto de Perfil"
                className="w-32 h-32 rounded-[32px]"
              />
              <div className="flex flex-col items-center mt-4 space-y-2">
                <p className="text-xs font-bold text-brand-ink/40 uppercase tracking-widest">Foto de Perfil Real</p>
                <p className="text-[10px] text-brand-ink/30 font-medium text-center max-w-[200px]">Usa uma foto clara do teu rosto para transmitir confiança aos clientes.</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Nome Completo</label>
              <input 
                type="text" 
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Nome de Utilizador (Handle)</label>
              <input 
                type="text" 
                value={formData.handle}
                onChange={e => {
                  let val = e.target.value;
                  if (val && !val.startsWith('@')) val = '@' + val;
                  setFormData({...formData, handle: val.toLowerCase().replace(/[^@a-z0-9_]/g, '')});
                }}
                placeholder="@teu_nome"
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
              />
              <p className="text-[10px] text-brand-ink/30 mt-1">Ex: @kazi (Mínimo 3 caracteres)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Idade</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={e => setFormData({...formData, age: Number(e.target.value)})}
                  className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Telemóvel</label>
                <input 
                  type="tel" 
                  placeholder="+258..."
                  value={formData.phoneNumber}
                  onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-center mb-6">O que pretendes fazer na KAZI?</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setFormData({...formData, role: 'provider'})}
                className={cn(
                  "p-8 rounded-[32px] border-2 transition-all flex flex-col items-center text-center",
                  formData.role === 'provider' ? "border-primary bg-primary/5" : "border-brand-gray hover:border-primary/20"
                )}
              >
                <Briefcase className={cn("w-10 h-10 mb-4", formData.role === 'provider' ? "text-primary" : "text-brand-ink/20")} />
                <span className="font-black text-lg">Prestar Serviços</span>
                <span className="text-xs text-brand-ink/40 mt-2">Quero oferecer o meu talento e ganhar renda.</span>
              </button>
              <button 
                onClick={() => setFormData({...formData, role: 'client'})}
                className={cn(
                  "p-8 rounded-[32px] border-2 transition-all flex flex-col items-center text-center",
                  formData.role === 'client' ? "border-primary bg-primary/5" : "border-brand-gray hover:border-primary/20"
                )}
              >
                <UserIcon className={cn("w-10 h-10 mb-4", formData.role === 'client' ? "text-primary" : "text-brand-ink/20")} />
                <span className="font-black text-lg">Contratar</span>
                <span className="text-xs text-brand-ink/40 mt-2">Procuro talentos para realizar serviços.</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-center mb-6">Onde estás localizado?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Província</label>
                <select 
                  value={formData.location.province}
                  onChange={e => setFormData({
                    ...formData, 
                    location: { 
                      province: e.target.value, 
                      district: MOZAMBIQUE_LOCATIONS[e.target.value][0] 
                    }
                  })}
                  className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
                >
                  {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Distrito / Localidade</label>
                <select 
                  value={formData.location.district}
                  onChange={e => setFormData({
                    ...formData, 
                    location: { ...formData.location, district: e.target.value }
                  })}
                  className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
                >
                  {MOZAMBIQUE_LOCATIONS[formData.location.province].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Biografia Profissional</label>
              <textarea 
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                placeholder="Ex: Sou canalizador com 5 anos de experiência..."
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-40 resize-none font-medium text-brand-ink"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">O que procuras na KAZI?</label>
              <textarea 
                value={formData.lookingFor}
                onChange={e => setFormData({...formData, lookingFor: e.target.value})}
                placeholder="Ex: Procuro serviços de design gráfico ou aulas de matemática..."
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-40 resize-none font-medium text-brand-ink"
              />
              <p className="text-[10px] font-bold text-brand-ink/40 mt-2 uppercase tracking-widest">Isto ajudará o nosso algoritmo inteligente a recomendar-te os melhores serviços.</p>
            </div>
            <div className="bg-secondary/10 p-6 rounded-3xl border border-secondary/20 mb-6">
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                <div>
                  <p className="font-bold text-brand-ink">Quase lá!</p>
                  <p className="text-sm text-brand-ink/60">Ao clicares em concluir, o teu perfil ficará visível para a comunidade KAZI.</p>
                </div>
              </div>
            </div>

            <div className="bg-brand-bg p-6 rounded-3xl border border-brand-gray space-y-4">
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="terms"
                  checked={formData.acceptedTerms}
                  onChange={e => setFormData({...formData, acceptedTerms: e.target.checked})}
                  className="w-5 h-5 rounded border-brand-gray text-primary focus:ring-primary"
                />
                <label htmlFor="terms" className="text-sm font-bold text-brand-ink cursor-pointer">
                  Eu aceito os <button onClick={() => setShowTerms(true)} className="text-primary underline">Termos e Condições</button>
                </label>
              </div>
            </div>

            <AnimatePresence>
              {showTerms && (
                <div className="fixed inset-0 z-[200] bg-brand-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-white w-full max-w-xl rounded-[32px] p-8 max-h-[80vh] overflow-y-auto relative"
                  >
                    <button 
                      onClick={() => setShowTerms(false)}
                      className="absolute top-6 right-6 p-2 hover:bg-brand-gray rounded-xl transition-all"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <h3 className="text-2xl font-black mb-6">Termos e Condições – Kazi</h3>
                    <div className="space-y-6 text-brand-ink/70 leading-relaxed font-medium">
                      <section>
                        <h4 className="font-bold text-brand-ink mb-2">1. Aceitação</h4>
                        <p>Ao usar o Kazi, você confirma que leu e aceita estes Termos e Condições. Você não poderá usar o app sem concordar.</p>
                      </section>
                      <section>
                        <h4 className="font-bold text-brand-ink mb-2">2. Responsabilidade do utilizador</h4>
                        <p>O Kazi fornece ferramentas para criar perfis, anunciar serviços, aprender e contactar clientes. Todas as decisões que tomar usando o app são de sua responsabilidade. O app e os desenvolvedores não se responsabilizam por perdas, danos ou problemas que possam surgir do uso do Kazi.</p>
                      </section>
                      <section>
                        <h4 className="font-bold text-brand-ink mb-2">3. Uso correto</h4>
                        <p>Você concorda em usar o Kazi apenas para atividades legais e éticas. Não é permitido usar o app para enganar ou prejudicar outros utilizadores.</p>
                      </section>
                      <section>
                        <h4 className="font-bold text-brand-ink mb-2">4. Privacidade</h4>
                        <p>Alguns dados podem ser armazenados para funcionamento do app. O Kazi não compartilhará suas informações com terceiros sem autorização.</p>
                      </section>
                      <section>
                        <h4 className="font-bold text-brand-ink mb-2">5. Direitos do app</h4>
                        <p>O conteúdo, design e funcionalidades do Kazi são propriedade do desenvolvedor. Você não pode copiar, modificar ou distribuir o app sem permissão.</p>
                      </section>
                      <section>
                        <h4 className="font-bold text-brand-ink mb-2">6. Alterações nos termos</h4>
                        <p>O Kazi pode atualizar estes Termos e Condições a qualquer momento. As alterações serão notificadas e o uso contínuo do app significa aceitação das novas regras.</p>
                      </section>
                    </div>
                    <button 
                      onClick={() => {
                        setFormData({...formData, acceptedTerms: true});
                        setShowTerms(false);
                      }}
                      className="w-full mt-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all"
                    >
                      Aceitar e Fechar
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex gap-4 mt-12">
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 border border-brand-gray rounded-2xl font-bold text-brand-ink/60 hover:bg-brand-gray transition-all"
            >
              Voltar
            </button>
          ) : onSkip && (
            <button 
              onClick={onSkip}
              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
            >
              <span>Explorar Primeiro</span>
            </button>
          )}
          <button 
            onClick={() => step < 4 ? nextStep() : handleSubmit()}
            disabled={loading || (step === 4 && !formData.acceptedTerms)}
            className={cn(
              "flex-[2] py-4 text-white rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center space-x-2",
              (loading || (step === 4 && !formData.acceptedTerms)) 
                ? "bg-brand-gray cursor-not-allowed shadow-none" 
                : "bg-primary hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>A processar...</span>
              </>
            ) : (
              <span>{step < 4 ? 'Continuar' : 'Concluir Perfil'}</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Logo = ({ className = "" }: { className?: string }) => {
  const { theme } = useTheme();
  
  return (
    <div 
      className={cn("flex items-center justify-center cursor-pointer select-none", className)}
    >
      <div className="w-32 h-12 relative">
        <svg viewBox="0 0 300 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="kaziFull" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme === 'yellow' ? "#FDE047" : "#0066FF"} />
              <stop offset="50%" stopColor={theme === 'yellow' ? "#FACC15" : "#00D4FF"} />
              <stop offset="100%" stopColor={theme === 'yellow' ? "#EAB308" : "#33FF66"} />
            </linearGradient>
          </defs>
          
          <g transform="translate(10, 10) scale(0.8)">
            {/* Left bar top */}
            <polygon points="0,0 25,0 25,50 0,75" fill="url(#kaziFull)" />
            {/* Arrow */}
            <polygon points="0,80 65,15 55,5 85,5 85,35 75,25 0,100" fill="url(#kaziFull)" />
            {/* Bottom leg */}
            <polygon points="5,100 45,60 85,100" fill="url(#kaziFull)" />
          </g>
          
          {/* AZI */}
          <text x="90" y="85" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="85" fill="url(#kaziFull)" letterSpacing="2">AZI</text>
        </svg>
      </div>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8">
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mb-8"
    >
      <Logo />
    </motion.div>
    <div className="w-48 h-1.5 bg-brand-gray/30 rounded-full overflow-hidden relative">
      <motion.div 
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="absolute inset-0 bg-primary rounded-full"
      />
    </div>
    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-brand-ink/30 animate-pulse">
      Conectando ao Servidor...
    </p>
  </div>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout, signIn, loading } = useAuth();
  const { toggleTheme } = useTheme();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [skippedOnboarding, setSkippedOnboarding] = useState(false);

  useEffect(() => {
    if (profile) {
      const q = query(
        collection(db, 'orders'),
        where('clientId', '==', profile.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setOrderCount(snapshot.size);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
      return () => unsubscribe();
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      const q = query(
        collection(db, 'jobs'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const lastChecked = profile.lastCheckedNotifications?.toMillis() || 0;
        const newMatchingJobs = snapshot.docs.filter(d => {
          const job = d.data() as Job;
          const isNew = job.createdAt?.toMillis() > lastChecked;
          const matchesInterest = profile.lookingFor && (job.title.toLowerCase().includes(profile.lookingFor.toLowerCase()) || job.description.toLowerCase().includes(profile.lookingFor.toLowerCase()));
          const matchesLocation = profile.location?.province && job.location?.province === profile.location.province;
          return isNew && (matchesInterest || matchesLocation);
        }).length;
        setUnreadNotifications(newMatchingJobs);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'jobs'));
      return () => unsubscribe();
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', profile.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        // Simple logic for unread: just count chats with status pending if recipient
        const pending = snapshot.docs.filter(d => {
          const data = d.data();
          return data.status === 'pending' && data.initiatorId !== profile.uid;
        }).length;
        setUnreadMessages(pending);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'chats'));
      return () => unsubscribe();
    }
  }, [profile]);

  if (loading) return <LoadingScreen />;

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-ink pb-20 md:pb-0">
      <AnimatePresence>
        {profile && !profile.isComplete && !skippedOnboarding && (
          <Onboarding onSkip={() => setSkippedOnboarding(true)} />
        )}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[32px] max-w-sm w-full text-center shadow-2xl"
            >
              <LogOut className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-black text-gray-900 mb-2">Terminar Sessão?</h3>
              <p className="text-gray-500 mb-8 font-medium">Tens a certeza que queres sair da tua conta KAZI?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                >
                  Sair
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-brand-gray/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="group" onClick={(e) => {
              toggleTheme();
              if (location.pathname === '/') {
                e.preventDefault();
              }
            }}>
              <Logo />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">Início</Link>
              <Link to="/services" className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">Serviços</Link>
              <Link to="/jobs" className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">Empregos</Link>
              <Link to="/communities" className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">Comunidade</Link>
              <Link to="/education" className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">Aprender</Link>
              {profile && profile.role === 'admin' && (
                <Link to="/admin" className="text-sm font-bold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1">
                  <Shield className="w-4 h-4" /> Admin
                </Link>
              )}
              
              <div className="flex items-center space-x-2 pl-4 border-l border-gray-100">
                {profile ? (
                  <div className="flex items-center space-x-2">
                    <Link to="/notifications" className="p-2 hover:bg-primary/5 rounded-full transition-colors relative">
                      <Bell className="w-5 h-5 text-gray-600" />
                      {unreadNotifications > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </Link>
                    <Link to="/chats" className="p-2 hover:bg-primary/5 rounded-full transition-colors relative">
                      <MessageCircle className="w-5 h-5 text-gray-600" />
                      {unreadMessages > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </Link>
                    <Link to="/orders" className="p-2 hover:bg-primary/5 rounded-full transition-colors relative" title="Meus Pedidos">
                      <ClipboardList className="w-5 h-5 text-gray-600" />
                      {orderCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </Link>
                    <Link to={`/profile/${profile.uid}`} className="flex items-center space-x-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full hover:shadow-md transition-all">
                      <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                      <span className="text-sm font-bold text-gray-900">{profile.displayName.split(' ')[0]}</span>
                    </Link>
                    <Link to="/settings" className="p-2 hover:bg-primary/5 rounded-full transition-colors">
                      <SettingsIcon className="w-5 h-5 text-gray-600" />
                    </Link>
                    <button onClick={() => setShowLogoutConfirm(true)} className="p-2 hover:bg-red-50 text-red-600 rounded-full transition-colors">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={signIn} className="bg-primary text-white px-8 py-2.5 rounded-full text-sm font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0">
                    Entrar
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Header Icons */}
            <div className="flex md:hidden items-center space-x-1">
              {profile && (
                <>
                  <Link to="/notifications" className="p-2 bg-gray-100 rounded-full relative">
                    <Bell className="w-5 h-5 text-gray-900" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                  <Link to="/chats" className="p-2 bg-gray-100 rounded-full relative">
                    <MessageCircle className="w-5 h-5 text-gray-900" />
                    {unreadMessages > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                  <Link to="/orders" className="p-2 bg-gray-100 rounded-full relative">
                    <ClipboardList className="w-5 h-5 text-gray-900" />
                    {orderCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                </>
              )}
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-gray-100 rounded-full">
                {isMenuOpen ? <X className="w-5 h-5 text-gray-900" /> : <Menu className="w-5 h-5 text-gray-900" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden bg-white border-b border-gray-100 overflow-hidden shadow-2xl"
            >
              <div className="px-4 pt-2 pb-6 space-y-4">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-gray-900">Início</Link>
                <Link to="/services" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-gray-900">Serviços</Link>
                <Link to="/jobs" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-gray-900">Empregos</Link>
                <Link to="/education" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-gray-900">Aprender</Link>
                {profile ? (
                  <>
                    {profile.role === 'admin' && (
                      <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-red-600">Painel Admin</Link>
                    )}
                    <Link to="/chats" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-gray-900">Mensagens</Link>
                    <Link to="/orders" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-gray-900">Pedidos</Link>
                    <Link to="/settings" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-gray-900">Definições</Link>
                    <Link to={`/profile/${profile.uid}`} onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-gray-900">Meu Perfil</Link>
                    <button onClick={() => setShowLogoutConfirm(true)} className="block text-lg font-bold text-red-600">Sair</button>
                  </>
                ) : (
                  <button onClick={() => { signIn(); setIsMenuOpen(false); }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold">Entrar</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      
      {profile && !profile.isComplete && skippedOnboarding && (
        <div className="bg-primary/5 border-b border-primary/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <UserIcon className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-bold text-brand-ink/60 uppercase tracking-widest">
              Perfil incompleto <span className="hidden sm:inline">— Completa-o para teres acesso total</span>
            </p>
          </div>
          <button 
            onClick={() => setSkippedOnboarding(false)}
            className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-primary/20"
          >
            Completar
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-2 py-3 z-50 flex justify-around items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <Link to="/" className={cn("flex flex-col items-center gap-0.5 min-w-[60px]", location.pathname === "/" ? "text-primary" : "text-gray-400")}>
          <HomeIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold">Explorar</span>
        </Link>
        <Link to="/jobs" className={cn("flex flex-col items-center gap-0.5 min-w-[60px]", location.pathname === "/jobs" ? "text-primary" : "text-gray-400")}>
          <Briefcase className="w-5 h-5" />
          <span className="text-[9px] font-bold">Empregos</span>
        </Link>
        <Link to="/create" className={cn("flex flex-col items-center gap-0.5 min-w-[60px]", location.pathname === "/create" ? "text-primary" : "text-gray-400")}>
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", location.pathname === "/create" ? "bg-primary/10" : "bg-gray-100")}>
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold">Criar</span>
        </Link>
        <Link to={profile ? `/profile/${profile.uid}` : "/"} className={cn("flex flex-col items-center gap-0.5 min-w-[60px]", location.pathname.startsWith("/profile") ? "text-primary" : "text-gray-400")}>
          <UserIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold">Perfil</span>
        </Link>
        <Link to="/settings" className={cn("flex flex-col items-center gap-0.5 min-w-[60px]", location.pathname === "/settings" ? "text-primary" : "text-gray-400")}>
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold">Definições</span>
        </Link>
      </div>
    </div>
  );
};

const Home = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const categories = [
    { id: 'domestico', name: 'Doméstico', icon: <HomeIcon className="w-6 h-6" />, color: 'bg-orange-50 text-orange-600' },
    { id: 'design', name: 'Design', icon: <Briefcase className="w-6 h-6" />, color: 'bg-blue-50 text-primary' },
    { id: 'aulas', name: 'Aulas', icon: <BookOpen className="w-6 h-6" />, color: 'bg-green-50 text-secondary' },
    { id: 'transporte', name: 'Transporte', icon: <MapPin className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600' },
  ];

  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [activeProfiles, setActiveProfiles] = useState<UserProfile[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(6));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'announcements'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('isComplete', '==', true), limit(8));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveProfiles(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => console.error('Error fetching active profiles:', error));
    return () => unsubscribe();
  }, []);

  const localServices = profile?.location 
    ? recentServices.filter(s => s.location?.province === profile.location?.province)
    : recentServices;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (searchQuery.trim().startsWith('@')) {
        // Search for user by handle
        navigate(`/services?u=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        navigate(`/services?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  return (
    <div className="space-y-12">
      {/* Header Greeting */}
      <section className="pt-4">
        <h1 className="text-3xl font-black tracking-tight text-brand-ink mb-1">
          Olá, {profile?.displayName.split(' ')[0] || 'Visitante'}!
          {profile?.handle && <span className="text-xs font-bold text-primary ml-2">{profile.handle}</span>}
        </h1>
        <p className="text-lg font-bold text-brand-ink/60 leading-tight">
          Encontre Trabalhos & Serviços<br />Perto de Si.
        </p>
      </section>

      {/* Search Bar */}
      <section>
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            placeholder="O que procura?" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full p-5 pr-14 bg-white text-brand-ink rounded-2xl outline-none border border-brand-gray/50 shadow-sm font-bold text-lg placeholder:text-brand-ink/30"
          />
          <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
            <Search className="w-6 h-6" />
          </button>
        </form>
      </section>

      {/* Categories Pills */}
      <section className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => (
          <Link 
            key={cat.id} 
            to={`/services?category=${cat.id}`}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm whitespace-nowrap shadow-lg shadow-primary/20"
          >
            {cat.name}
          </Link>
        ))}
        <Link to="/services" className="px-6 py-3 bg-brand-ink/5 text-brand-ink/60 rounded-xl font-bold text-sm whitespace-nowrap">
          Vendas
        </Link>
      </section>

      {/* Opportunities Section */}
      <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black tracking-tight text-brand-ink">
              Oportunidades em {profile?.location?.province || 'Moçambique'}
            </h2>
            <ChevronRight className="w-6 h-6 text-brand-ink/20" />
          </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {localServices.length > 0 ? localServices.map((service) => (
            <Link 
              key={service.id} 
              to={`/service/${service.id}`}
              className="min-w-[280px] bg-white rounded-[32px] overflow-hidden border border-brand-gray/50 shadow-sm"
            >
              <div className="h-40 relative">
                <img src={service.photoURL || `https://picsum.photos/seed/${service.id}/400/300`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-black text-lg leading-tight mb-1">{service.title}</h3>
                  <div className="flex justify-between items-center text-[10px] font-bold opacity-80 uppercase tracking-widest">
                    <span>{service.price} MT / Dia</span>
                    <span>• {service.location?.province || 'Moçambique'}</span>
                  </div>
                </div>
              </div>
            </Link>
          )) : (
            <div className="min-w-[280px] h-40 bg-brand-ink/5 rounded-[32px] flex items-center justify-center border border-dashed border-brand-gray">
              <p className="text-xs font-bold text-brand-ink/30 uppercase tracking-widest">Sem oportunidades locais</p>
            </div>
          )}
        </div>
      </section>

      {/* Announcements Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tracking-tight text-brand-ink">Anúncios da Comunidade</h2>
          <ChevronRight className="w-6 h-6 text-brand-ink/20" />
        </div>
        <div className="space-y-4">
          {recentAnnouncements.map((ann) => (
            <div key={ann.id} className="bg-white p-6 rounded-[32px] border border-brand-gray/50 shadow-sm relative group">
              <div className="flex items-center gap-3 mb-4">
                <img src={ann.authorPhoto || `https://ui-avatars.com/api/?name=${ann.authorName}`} className="w-10 h-10 rounded-full" />
                <div>
                  <h4 className="font-black text-sm text-brand-ink">{ann.authorName}</h4>
                  <p className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">
                    {ann.createdAt ? formatDistanceToNow(ann.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora'}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-brand-ink/80 leading-relaxed">{ann.content}</p>
              {ann.photoURL && (
                <img src={ann.photoURL} className="mt-4 rounded-2xl w-full h-48 object-cover" referrerPolicy="no-referrer" />
              )}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ReportButton reportedId={ann.id} reportedType="announcement" />
              </div>
            </div>
          ))}
          {recentAnnouncements.length === 0 && (
            <div className="p-12 text-center bg-brand-ink/5 rounded-[32px] border border-dashed border-brand-gray">
              <p className="text-xs font-bold text-brand-ink/30 uppercase tracking-widest">Nenhum anúncio recente</p>
            </div>
          )}
        </div>
      </section>

      {/* Quick Courses Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tracking-tight text-brand-ink">Cursos Rápidos</h2>
          <ChevronRight className="w-6 h-6 text-brand-ink/20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setSelectedCourse('Como Fazer um CV de Sucesso')}
            className="bg-white p-4 rounded-[24px] border border-brand-gray/50 shadow-sm flex items-center gap-3 text-left group hover:border-primary/30 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-brand-ink leading-tight">Como Fazer<br />CV</p>
            </div>
          </button>
          <button 
            onClick={() => setSelectedCourse('Dicas de Negócio para Jovens')}
            className="bg-white p-4 rounded-[24px] border border-brand-gray/50 shadow-sm flex items-center gap-3 text-left group hover:border-primary/30 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-brand-ink leading-tight">Dicas de<br />Negócio</p>
            </div>
          </button>
        </div>
      </section>

      {selectedCourse && (
        <CourseModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)} 
        />
      )}

      {/* Active Profiles Section */}
      {activeProfiles.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black tracking-tight text-brand-ink">Talentos em Destaque</h2>
            <ChevronRight className="w-6 h-6 text-brand-ink/20" />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {activeProfiles.map((p) => (
              <Link 
                key={p.uid} 
                to={`/profile/${p.uid}`}
                className="min-w-[140px] flex flex-col items-center p-6 bg-white rounded-[32px] border border-brand-gray/50 shadow-sm hover:border-primary transition-all"
              >
                <div className="relative mb-3">
                  <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}`} className="w-16 h-16 rounded-2xl object-cover" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <p className="text-xs font-black text-brand-ink text-center truncate w-full">{p.displayName.split(' ')[0]}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{p.handle || '@utilizador'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Profile Bar */}
      {profile && (
        <section className="bg-white p-4 rounded-[24px] border border-brand-gray/50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                <CheckCircle className="w-2 h-2 text-white" />
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-brand-ink">
                Perfil de {profile.displayName.split(' ')[0]} 
                {profile.handle && <span className="text-primary ml-1">{profile.handle}</span>}
                : <span className="text-secondary">Prestador</span>
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  <span className="text-[10px] font-bold text-brand-ink ml-1">{profile.rating || '0.0'}</span>
                </div>
                <span className="text-[10px] text-brand-ink/30 font-bold">({profile.reviewCount || 0})</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Slogan */}
      <div className="py-8 text-center">
        <p className="text-lg font-black italic text-brand-ink/80">
          Aprenda. Trabalhe. Cresça com <span className="text-primary">Kazi</span>
        </p>
      </div>
    </div>
  );
};

const ServiceCard = ({ service }: { service: Service; key?: string }) => {
  return (
    <Link to={`/service/${service.id}`} className="group bg-white rounded-[32px] overflow-hidden border border-brand-gray hover:shadow-2xl transition-all flex flex-col hover:-translate-y-1">
      <div className="h-56 bg-brand-gray relative overflow-hidden">
        <img 
          src={service.photoURL || `https://picsum.photos/seed/${service.id}/400/300`} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
          {service.category}
        </div>
      </div>
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-black text-xl leading-tight text-brand-ink group-hover:text-primary transition-colors">{service.title}</h3>
          <div className="flex items-center gap-2">
            <p className="text-secondary font-black text-lg">MT {service.price}</p>
            <ReportButton reportedId={service.id} reportedType="service" className="p-1" />
          </div>
        </div>
        <p className="text-brand-ink/50 text-sm font-medium line-clamp-2 mb-2 flex-1">{service.description}</p>
        <div className="flex items-center justify-between text-[10px] text-brand-ink/40 font-bold uppercase tracking-widest mb-4">
          <div className="flex items-center">
            <MapPin className="w-3 h-3 mr-1" /> {service.location?.district}, {service.location?.province}
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const query = encodeURIComponent(`${service.location?.district}, ${service.location?.province}, Moçambique`);
              window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
            }}
            className="text-primary hover:underline flex items-center"
          >
            <Globe className="w-3 h-3 mr-1" /> Ver no Mapa
          </button>
        </div>
        <div className="flex items-center justify-between pt-6 border-t border-brand-gray">
          <div className="flex items-center space-x-3">
            <img src={service.authorPhoto || `https://ui-avatars.com/api/?name=${service.authorName}`} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
            <div>
              <span className="text-xs font-bold text-brand-ink/70 block leading-none">{service.authorName}</span>
              <div className="flex items-center mt-1">
                <Star className="w-2.5 h-2.5 text-yellow-500 fill-current" />
                <span className="text-[9px] font-bold text-brand-ink/40 ml-1">{service.rating || '0.0'} ({service.reviewCount || 0})</span>
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Navigate to service detail to complete order
              window.location.href = `/service/${service.id}`;
            }}
            className="px-4 py-2 bg-brand-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-ink/90 transition-all shadow-lg shadow-brand-ink/10"
          >
            Contratar
          </button>
        </div>
      </div>
    </Link>
  );
};

const ServiceList = () => {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'price_asc' | 'price_desc'>('recent');
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    const uParam = params.get('u');
    const catParam = params.get('category');
    const provParam = params.get('province');
    
    if (qParam) setSearch(decodeURIComponent(qParam));
    if (uParam) setUserSearch(decodeURIComponent(uParam));
    if (catParam) setSelectedCategory(catParam);
    if (provParam) setSelectedProvince(provParam);
  }, []);

  useEffect(() => {
    let q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userSearch) {
      setUserResults([]);
      return;
    }
    const q = query(
      collection(db, 'users'), 
      where('handle', '>=', userSearch), 
      where('handle', '<=', userSearch + '\uf8ff'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserResults(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    return () => unsubscribe();
  }, [userSearch]);

  const filteredServices = services
    .filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                           s.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || s.category === selectedCategory;
      const matchesProvince = !selectedProvince || s.location?.province === selectedProvince;
      const matchesDistrict = !selectedDistrict || s.location?.district === selectedDistrict;
      const matchesPrice = s.price >= priceRange.min && s.price <= priceRange.max;
      
      return matchesSearch && matchesCategory && matchesProvince && matchesDistrict && matchesPrice;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return b.createdAt?.seconds - a.createdAt?.seconds;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return 0;
    });

  return (
    <div className="space-y-12">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-72 space-y-8">
          <div className="bg-white p-6 rounded-[32px] border border-brand-gray shadow-sm space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Pesquisa</h3>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/40" />
                <input 
                  type="text" 
                  placeholder="Procurar @nome ou serviço..." 
                  value={search || userSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('@')) {
                      setUserSearch(val);
                      setSearch('');
                    } else {
                      setSearch(val);
                      setUserSearch('');
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-brand-bg rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold"
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Categoria</h3>
              <select 
                value={selectedCategory || ''} 
                onChange={e => setSelectedCategory(e.target.value || null)}
                className="w-full p-3 bg-brand-bg rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold"
              >
                <option value="">Todas as Categorias</option>
                <option value="domestico">Doméstico</option>
                <option value="design">Design</option>
                <option value="aulas">Aulas</option>
                <option value="vendas">Vendas</option>
                <option value="transporte">Transporte</option>
                <option value="reparos">Reparos</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Localização</h3>
              <div className="space-y-3">
                <select 
                  value={selectedProvince || ''} 
                  onChange={e => {
                    setSelectedProvince(e.target.value || null);
                    setSelectedDistrict(null);
                  }}
                  className="w-full p-3 bg-brand-bg rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold"
                >
                  <option value="">Todas as Províncias</option>
                  {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {selectedProvince && (
                  <select 
                    value={selectedDistrict || ''} 
                    onChange={e => setSelectedDistrict(e.target.value || null)}
                    className="w-full p-3 bg-brand-bg rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold"
                  >
                    <option value="">Todos os Distritos</option>
                    {MOZAMBIQUE_LOCATIONS[selectedProvince].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Preço Máximo (MT)</h3>
              <input 
                type="range" 
                min="0" 
                max="100000" 
                step="500"
                value={priceRange.max}
                onChange={e => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                className="w-full h-2 bg-brand-bg rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-2 text-[10px] font-black text-brand-ink/40">
                <span>0 MT</span>
                <span>{priceRange.max.toLocaleString()} MT</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Ordenar por</h3>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'recent', label: 'Mais Recentes' },
                  { id: 'rating', label: 'Melhor Avaliados' },
                  { id: 'price_asc', label: 'Menor Preço' },
                  { id: 'price_desc', label: 'Maior Preço' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id as any)}
                    className={cn(
                      "text-left px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      sortBy === opt.id ? "bg-primary text-white shadow-md" : "hover:bg-brand-bg text-brand-ink/60"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => {
                setSearch('');
                setSelectedCategory(null);
                setSelectedProvince(null);
                setSelectedDistrict(null);
                setPriceRange({ min: 0, max: 100000 });
                setSortBy('recent');
                setRecommendedIds([]);
              }}
              className="w-full py-3 text-xs font-black text-red-500 hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest"
            >
              Limpar Filtros
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 space-y-8">
          {userResults.length > 0 && (
            <div className="bg-white p-8 rounded-[40px] border border-brand-gray shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-6">Utilizadores Encontrados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userResults.map(u => (
                  <Link 
                    key={u.uid} 
                    to={`/profile/${u.uid}`}
                    className="flex items-center space-x-4 p-4 bg-brand-bg rounded-2xl hover:bg-brand-gray transition-colors group"
                  >
                    <img 
                      src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                      className="w-12 h-12 rounded-xl object-cover" 
                    />
                    <div>
                      <p className="font-bold text-brand-ink group-hover:text-primary transition-colors">{u.displayName}</p>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">{u.handle || '@utilizador'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black tracking-tighter">
              {filteredServices.length} {filteredServices.length === 1 ? 'Serviço Encontrado' : 'Serviços Encontrados'}
            </h2>
          </div>

          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              {filteredServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[40px] p-20 text-center border border-brand-gray border-dashed">
              <div className="w-20 h-20 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-brand-ink/20" />
              </div>
              <h3 className="text-xl font-black text-brand-ink mb-2">Nenhum serviço encontrado</h3>
              <p className="text-brand-ink/40 font-medium">Tenta ajustar os teus filtros ou pesquisa por algo diferente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LoginPrompt = ({ message = "Precisa entrar para continuar" }: { message?: string }) => {
  const { signIn } = useAuth();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-12 rounded-[40px] border border-brand-gray shadow-2xl max-w-md w-full text-center flex flex-col items-center"
      >
        <Logo className="mb-8 scale-150" />
        <h2 className="text-3xl font-black tracking-tighter text-brand-ink mb-4">{message}</h2>
        <p className="text-brand-ink/40 font-medium mb-10 leading-relaxed">
          Inicie sessão para aceder a todas as funcionalidades do KAZI, incluindo pedidos, mensagens e o seu perfil.
        </p>
        <button 
          onClick={signIn}
          className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:-translate-y-1 active:translate-y-0"
        >
          Entrar com Google
        </button>
      </motion.div>
    </div>
  );
};

const ServiceDetail = () => {
  const { id } = useParams();
  const [service, setService] = useState<Service | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [orderMessage, setOrderMessage] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const { profile, signIn } = useAuth();
  const navigate = useNavigate();

  const handleStartChat = async () => {
    if (!profile) return signIn();
    if (!service) return;
    if (profile.uid === service.authorId) return;

    const chatId = [profile.uid, service.authorId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    
    try {
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [profile.uid, service.authorId],
          status: 'pending',
          initiatorId: profile.uid,
          lastMessage: `Interesse no serviço: ${service.title}`,
          lastMessageAt: serverTimestamp(),
          unreadCount: { [service.authorId]: 1, [profile.uid]: 0 },
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          content: `Interesse no serviço: ${service.title}`,
          senderId: profile.uid,
          createdAt: serverTimestamp(),
          read: false,
          type: 'text'
        });
      }

      navigate(`/chats/${chatId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'services', id), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Service;
        setService({ id: docSnap.id, ...data });
        
        try {
          const authorSnap = await getDoc(doc(db, 'users', data.authorId));
          if (authorSnap.exists()) {
            setAuthor(authorSnap.data() as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${data.authorId}`);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `services/${id}`));
    return () => unsubscribe();
  }, [id]);

  const handleOrder = async () => {
    if (!profile) return signIn();
    if (!service) return;

    setIsOrdering(true);
    try {
      const orderData = {
        serviceId: service.id,
        serviceTitle: service.title,
        clientId: profile.uid,
        clientName: profile.displayName,
        providerId: service.authorId,
        providerName: service.authorName,
        status: 'pending',
        message: orderMessage,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'orders'), orderData);
      navigate('/orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsOrdering(false);
    }
  };

  if (!service) return <div className="animate-pulse space-y-8">
    <div className="h-96 bg-gray-200 rounded-[40px]" />
    <div className="h-8 bg-gray-200 w-1/2 rounded" />
    <div className="h-24 bg-gray-200 rounded" />
  </div>;

  return (
    <div className="grid md:grid-cols-3 gap-12">
      <div className="md:col-span-2 space-y-8">
        <div className="h-96 rounded-[40px] overflow-hidden shadow-2xl">
          <img src={service.photoURL || `https://picsum.photos/seed/${service.id}/1200/800`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div>
          <div className="flex items-center space-x-2 text-primary font-bold uppercase tracking-widest text-xs mb-2">
            <span>{service.category}</span>
            <ChevronRight className="w-3 h-3" />
            <span>{service.location?.district}, {service.location?.province}</span>
          </div>
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-4xl font-bold">{service.title}</h1>
            {profile?.uid !== service.authorId && (
              <ReportButton reportedId={service.id} reportedType="service" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-brand-ink/60">
            <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {service.location?.district}, {service.location?.province}</div>
            <button 
              onClick={() => {
                const query = encodeURIComponent(`${service.location?.district}, ${service.location?.province}, Moçambique`);
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
              }}
              className="flex items-center text-primary hover:underline font-bold"
            >
              <Globe className="w-4 h-4 mr-1" /> Ver no Mapa
            </button>
            <div className="flex items-center"><Clock className="w-4 h-4 mr-1" /> Postado {service.createdAt ? formatDistanceToNow(service.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'recentemente'}</div>
          </div>
        </div>
        <div className="prose prose-stone max-w-none">
          <h3 className="text-xl font-bold mb-4">Sobre este serviço</h3>
          <p className="text-lg text-brand-ink/80 leading-relaxed">{service.description}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-[32px] border border-brand-gray shadow-xl sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-medium text-brand-ink/60">Preço sugerido</span>
            <span className="text-3xl font-bold text-brand-ink">MT {service.price}</span>
          </div>
          
          <div className="space-y-4 mb-8">
            {profile?.uid === service.authorId ? (
              <div className="p-4 bg-brand-bg rounded-2xl border border-brand-gray text-center">
                <p className="text-xs font-bold text-brand-ink/40 uppercase tracking-widest">Este é o teu próprio serviço</p>
                <p className="text-[10px] text-brand-ink/30 mt-1">Não podes fazer pedidos a ti mesmo.</p>
              </div>
            ) : !profile ? (
              <div className="p-8 bg-brand-bg rounded-3xl border border-brand-gray text-center space-y-6">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary mx-auto shadow-sm">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-black tracking-tight mb-2">Login necessário</h4>
                  <p className="text-xs text-brand-ink/40 font-medium leading-relaxed">
                    Inicie sessão para fazer pedidos, enviar mensagens e ver detalhes de contacto.
                  </p>
                </div>
                <button 
                  onClick={signIn}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Entrar para pedir/contatar
                </button>
              </div>
            ) : (
              <>
                <textarea 
                  placeholder="Olá! Gostaria de saber mais sobre este serviço..."
                  value={orderMessage}
                  onChange={(e) => setOrderMessage(e.target.value)}
                  className="w-full p-4 bg-brand-bg rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none h-32 resize-none text-sm"
                />
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleOrder}
                    disabled={isOrdering}
                    className="py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {isOrdering ? 'A processar...' : 'Fazer Pedido'}
                  </button>
                  <button 
                    onClick={handleStartChat}
                    className="py-4 bg-brand-ink text-white rounded-2xl font-bold hover:bg-brand-ink/90 transition-all shadow-lg shadow-brand-ink/20 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Mensagem</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="pt-6 border-t border-brand-gray">
            <Link to={`/profile/${service.authorId}`} className="flex items-center group">
              <img src={service.authorPhoto || `https://ui-avatars.com/api/?name=${service.authorName}`} className="w-12 h-12 rounded-full mr-4 object-cover" />
              <div>
                <p className="font-bold group-hover:text-primary transition-colors">{service.authorName}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-xs font-bold text-brand-ink ml-1">{author?.rating || '0.0'}</span>
                  </div>
                  <span className="text-xs text-brand-ink/40 font-bold">({author?.reviewCount || 0} avaliações)</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Reviews Section */}
          <div className="pt-8 border-t border-brand-gray">
            <h3 className="text-lg font-black tracking-tight mb-6">Avaliações dos Clientes</h3>
            <ReviewList serviceId={service.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ReviewList = ({ serviceId, targetId }: { serviceId?: string; targetId?: string }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    if (serviceId) {
      q = query(
        collection(db, 'reviews'), 
        where('serviceId', '==', serviceId),
        orderBy('createdAt', 'desc')
      );
    } else if (targetId) {
      q = query(
        collection(db, 'reviews'), 
        where('targetId', '==', targetId),
        orderBy('createdAt', 'desc')
      );
    } else {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching reviews:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [serviceId, targetId]);

  if (loading) return <div className="space-y-4 animate-pulse">
    {[1, 2].map(i => <div key={i} className="h-24 bg-brand-bg rounded-2xl" />)}
  </div>;

  if (reviews.length === 0) return (
    <div className="p-8 bg-brand-bg rounded-3xl border border-dashed border-brand-gray text-center">
      <Star className="w-8 h-8 text-brand-ink/10 mx-auto mb-2" />
      <p className="text-xs font-bold text-brand-ink/30 uppercase tracking-widest">Ainda não há avaliações</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white p-6 rounded-3xl border border-brand-gray shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <img 
                src={review.authorPhoto || `https://ui-avatars.com/api/?name=${review.authorName}`} 
                className="w-8 h-8 rounded-full mr-3 object-cover" 
              />
              <div>
                <p className="text-sm font-bold">{review.authorName}</p>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={cn("w-3 h-3", review.rating >= star ? "text-yellow-500 fill-current" : "text-brand-gray")} 
                    />
                  ))}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-brand-ink/30 font-bold">
              {review.createdAt ? formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'recentemente'}
            </span>
          </div>
          <p className="text-sm text-brand-ink/70 leading-relaxed">{review.comment}</p>
        </div>
      ))}
    </div>
  );
};

const ChatList: React.FC = () => {
  const { profile, loading } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'communities' | 'archived'>('all');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'communities') setActiveTab('communities');
  }, [location]);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', profile.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        const otherId = data.participants.find((id: string) => id !== profile.uid);
        let otherProfile = null;
        if (otherId) {
          try {
            const otherProfileDoc = await getDoc(doc(db, 'users', otherId));
            if (otherProfileDoc.exists()) {
              otherProfile = otherProfileDoc.data();
            }
          } catch (err) {
            console.error('Error fetching other profile:', err);
          }
        }
        return {
          id: d.id,
          ...data,
          otherProfile: otherProfile || { displayName: 'Utilizador', photoURL: '' }
        };
      }));
      setChats(chatData);
      setChatLoading(false);
    }, (error) => {
      console.error('Chat list error:', error);
      setChatLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  if (loading) return <LoadingScreen />;
  if (!profile) return <LoginPrompt message="Inicie sessão para ver as suas mensagens" />;

  if (chatLoading && activeTab !== 'communities') return <LoadingScreen />;

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.otherProfile?.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'requests') return matchesSearch && chat.status === 'pending';
    if (activeTab === 'all') return matchesSearch && chat.status === 'active';
    if (activeTab === 'archived') return matchesSearch && chat.status === 'archived';
    return matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-64px)] flex flex-col bg-white">
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-gray-900">Conversas</h1>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Procurar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex gap-6 border-b border-gray-100 mb-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Conversas' },
            { id: 'requests', label: 'Pedidos' },
            { id: 'communities', label: 'Comunidades' },
            { id: 'archived', label: 'Arquivadas' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "pb-3 text-sm font-bold transition-all relative whitespace-nowrap",
                activeTab === tab.id ? "text-primary" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <div className="flex items-center gap-2">
                {tab.label}
                {tab.id === 'requests' && chats.filter(c => c.status === 'pending' && c.initiatorId !== profile?.uid).length > 0 && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {activeTab === 'communities' ? (
          <CommunityList hideHeader />
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-16 h-16 text-gray-100 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Nenhuma conversa encontrada.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map((chat) => (
              <Link 
                key={chat.id} 
                to={`/chats/${chat.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-3xl transition-all group relative"
              >
                <div className="relative">
                  <img 
                    src={chat.otherProfile?.photoURL || `https://ui-avatars.com/api/?name=${chat.otherProfile?.displayName}`} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-transparent group-hover:border-primary/10 transition-all"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-gray-900 truncate">{chat.otherProfile?.displayName}</h3>
                    <span className="text-[11px] font-bold text-gray-400">
                      {chat.lastMessageAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={cn(
                      "text-sm truncate flex-1 pr-4",
                      chat.status === 'pending' ? "text-primary font-bold" : "text-gray-500"
                    )}>
                      {chat.status === 'pending' 
                        ? (chat.initiatorId === profile?.uid ? 'Pedido de amizade enviado' : 'Enviou-te um pedido de amizade') 
                        : chat.lastMessage}
                    </p>
                    {chat.status === 'pending' && chat.initiatorId !== profile?.uid && (
                      <div className="px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                        Novo Pedido
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AudioRecorder: React.FC<{ onStop: (blob: Blob) => void }> = ({ onStop }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<any>(null);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(15).fill(2));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        onStop(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startTimer();
      startVisualizer();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Não foi possível aceder ao microfone.');
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration(prev => {
        if (prev >= 119) { // Limit to 2 minutes
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const startVisualizer = () => {
    // Simple simulated visualizer for "body" and "life"
    const interval = setInterval(() => {
      if (!isPaused) {
        setVisualizerData(new Array(15).fill(0).map(() => Math.floor(Math.random() * 12) + 2));
      }
    }, 100);
    return () => clearInterval(interval);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center">
      {isRecording ? (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-2.5 rounded-[24px] border border-red-100 shadow-lg shadow-red-100/50 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-1.5 px-2">
            {visualizerData.map((h, i) => (
              <motion.div 
                key={i}
                animate={{ height: isPaused ? 2 : h }}
                className="w-0.5 bg-red-500 rounded-full"
                style={{ height: 2 }}
              />
            ))}
          </div>
          
          <span className="text-[11px] font-black tracking-widest min-w-[40px] font-mono">{formatDuration(duration)}</span>
          
          <div className="flex items-center gap-1.5 border-l border-red-200 pl-3 ml-1">
            {isPaused ? (
              <button 
                onClick={resumeRecording} 
                className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-full transition-all hover:scale-110 active:scale-95"
                title="Retomar"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button 
                onClick={pauseRecording} 
                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full transition-all hover:scale-110 active:scale-95"
                title="Pausar"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
            )}
            <button 
              onClick={stopRecording} 
              className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-full transition-all hover:scale-110 active:scale-95 shadow-md shadow-red-200"
              title="Parar e Enviar"
            >
              <Send className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={startRecording}
          className="p-3.5 text-gray-400 hover:bg-primary/10 hover:text-primary rounded-2xl transition-all group relative overflow-hidden"
        >
          <Mic className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" />
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
};

const ChatWindow: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { profile, loading } = useAuth();
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!chatId || !profile) return;

    const unsubscribeChat = onSnapshot(doc(db, 'chats', chatId), async (d) => {
      if (d.exists()) {
        const data = { id: d.id, ...d.data() };
        setChat(data);
        const otherId = (data as any).participants.find((id: string) => id !== profile.uid);
        if (otherId) {
          // Listen to other user's profile in real-time
          onSnapshot(doc(db, 'users', otherId), (profileDoc) => {
            if (profileDoc.exists()) {
              setOtherProfile(profileDoc.data());
            } else {
              setOtherProfile({ displayName: 'Utilizador Eliminado', photoURL: '' });
            }
          }, (err) => {
            console.error('Error fetching other profile:', err);
          });
        }
      } else {
        toast.error('Conversa não encontrada.');
        navigate('/chats');
      }
    }, (err) => {
      console.error('Error fetching chat:', err);
      toast.error('Erro ao carregar a conversa. Verifica as tuas permissões.');
      navigate('/chats');
    });

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      console.error('Error fetching messages:', err);
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [chatId, profile]);

  // Mark messages as read and reset unreadCount
  useEffect(() => {
    if (!chatId || !profile || messages.length === 0) return;

    const unreadMessages = messages.filter(m => m.senderId !== profile.uid && !m.read);
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(m => {
        updateDoc(doc(db, 'chats', chatId, 'messages', m.id), { read: true });
      });
    }

    // Reset unreadCount for current user
    if (chat && chat.unreadCount && chat.unreadCount[profile.uid] > 0) {
      updateDoc(doc(db, 'chats', chatId), {
        [`unreadCount.${profile.uid}`]: 0
      });
    }
  }, [messages, chatId, profile, chat?.unreadCount?.[profile?.uid]]);

  const sendMessage = async (content: string, type: 'text' | 'audio' | 'image' | 'file' = 'text', audioURL?: string, imageURL?: string, fileURL?: string, fileName?: string) => {
    if (!chatId || !profile) return;

    let finalType = type;
    let finalImageURL = imageURL;
    let finalContent = content;

    if (pendingImage && !imageURL && type === 'text') {
      finalImageURL = pendingImage;
      finalType = 'image';
      setPendingImage(null);
    }

    if (!finalContent.trim() && !audioURL && !finalImageURL && !fileURL) {
      setIsSending(false);
      return;
    }
    
    // Check if chat is pending and user is not initiator
    if (chat.status === 'pending' && chat.initiatorId !== profile.uid) {
      toast.error('Precisas de aceitar a conversa antes de enviar mensagens.');
      setIsSending(false);
      return;
    }

    // Check if blocked
    if (profile.blockedUsers?.includes(otherProfile?.uid)) {
      toast.error('Desbloqueia o utilizador para enviar mensagens.');
      setIsSending(false);
      return;
    }
    if (otherProfile?.blockedUsers?.includes(profile.uid)) {
      toast.error('Não podes enviar mensagens a este utilizador.');
      setIsSending(false);
      return;
    }

    setIsSending(true);
    const timeoutId = setTimeout(() => {
      if (isSending) {
        setIsSending(false);
        toast.error('O envio está a demorar mais do que o esperado. Verifica a tua ligação.');
      }
    }, 30000); // 30s timeout

    try {
      const messageData = {
        chatId,
        senderId: profile.uid,
        content: finalContent.trim() || (finalType === 'image' ? 'Imagem' : (finalType === 'file' ? fileName : '')),
        type: finalType,
        audioURL: audioURL || null,
        imageURL: finalImageURL || null,
        fileURL: fileURL || null,
        fileName: fileName || null,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      const otherId = chat.participants.find((id: string) => id !== profile.uid);
      const updateData: any = {
        lastMessage: finalType === 'audio' ? '🎤 Áudio' : (finalType === 'image' ? '🖼️ Imagem' : (finalType === 'file' ? `📄 ${fileName}` : finalContent)),
        lastMessageAt: serverTimestamp()
      };
      
      if (otherId) {
        updateData[`unreadCount.${otherId}`] = increment(1);
      }

      await updateDoc(doc(db, 'chats', chatId), updateData);
      setNewMessage('');
      clearTimeout(timeoutId);
    } catch (error: any) {
      console.error('Error sending message:', error);
      clearTimeout(timeoutId);
      if (error.code === 'permission-denied') {
        toast.error('Não tens permissão para enviar mensagens nesta conversa.');
      } else {
        toast.error('Erro ao enviar mensagem. Tenta novamente.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
    if (!chatId || !profile) return;
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      if (forEveryone) {
        await updateDoc(msgRef, {
          deletedForAll: true,
          content: '🚫 Esta mensagem foi apagada',
          imageURL: null,
          audioURL: null,
          type: 'text'
        });
        
        // If it's the last message, update the chat document
        if (messages.length > 0 && messages[messages.length - 1].id === messageId) {
          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: '🚫 Mensagem apagada'
          });
        }
      } else {
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
          const deletedFor = msg.deletedFor || [];
          await updateDoc(msgRef, {
            deletedFor: [...deletedFor, profile.uid]
          });
        }
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      toast.error('Erro ao apagar a mensagem.');
    }
  };

  const handleBlockUser = async () => {
    if (!profile || !otherProfile) return;
    try {
      const isBlocked = profile.blockedUsers?.includes(otherProfile.uid);
      const newBlockedUsers = isBlocked
        ? (profile.blockedUsers || []).filter(id => id !== otherProfile.uid)
        : [...(profile.blockedUsers || []), otherProfile.uid];

      await updateDoc(doc(db, 'users', profile.uid), {
        blockedUsers: newBlockedUsers
      });
      
      toast.success(isBlocked ? 'Utilizador desbloqueado.' : 'Utilizador bloqueado.');
    } catch (err) {
      console.error('Error blocking user:', err);
      toast.error('Erro ao bloquear utilizador.');
    }
  };

  const handleApprove = async () => {
    if (!chatId) return;
    await updateDoc(doc(db, 'chats', chatId), { 
      status: 'active',
      lastMessageAt: serverTimestamp()
    });
  };

  const handleAudioStop = async (blob: Blob) => {
    if (!profile || !chatId) return;
    setIsSending(true);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await sendMessage('Mensagem de voz', 'audio', base64Audio);
    } catch (err) {
      console.error('Error processing audio:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !chatId) return;
    try {
      const compressedBase64 = await compressImage(file, 1200, 1200, 0.7);
      setPendingImage(compressedBase64);
    } catch (err) {
      console.error('Error processing image:', err);
      toast.error('Erro ao processar a imagem.');
    } finally {
      e.target.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !chatId) return;
    
    // Limit file size to 5MB for base64
    if (file.size > 5 * 1024 * 1024) {
      toast.error('O ficheiro é demasiado grande. Limite de 5MB.');
      return;
    }

    setIsSending(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await sendMessage(file.name, 'file', undefined, undefined, base64, file.name);
    } catch (err) {
      console.error('Error processing file:', err);
      toast.error('Erro ao processar o ficheiro.');
    } finally {
      setIsSending(false);
      e.target.value = '';
    }
  };

  if (loading) return <LoadingScreen />;
  if (!profile) return <LoginPrompt message="Inicie sessão para conversar" />;
  if (!chat || !otherProfile) return <LoadingScreen />;

  const isPending = chat.status === 'pending';
  const isInitiator = chat.initiatorId === profile?.uid;

  return (
    <div className="flex flex-col fixed inset-0 bg-white z-[60] md:relative md:inset-auto md:h-[calc(100vh-64px)] md:max-w-4xl md:mx-auto md:border-x md:border-gray-100">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center gap-4 sticky top-0 z-10">
        <Link to="/chats" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link to={`/profile/${chat.participants.find((id: string) => id !== profile.uid)}`} className="relative group shrink-0">
            <img 
              src={otherProfile.photoURL || `https://ui-avatars.com/api/?name=${otherProfile.displayName}`} 
              className="w-10 h-10 rounded-full object-cover group-hover:ring-2 group-hover:ring-primary/20 transition-all"
              referrerPolicy="no-referrer"
            />
            <div className={cn(
              "absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full transition-colors duration-500",
              otherProfile.updatedAt && Date.now() - otherProfile.updatedAt.toDate().getTime() < 300000 ? "bg-green-500" : "bg-gray-300"
            )} />
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/profile/${chat.participants.find((id: string) => id !== profile.uid)}`} className="hover:text-primary transition-colors block">
              <h3 className="font-black text-base text-gray-900 leading-none truncate">{otherProfile.displayName}</h3>
            </Link>
            <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wider">
              {otherProfile.updatedAt ? (
                Date.now() - otherProfile.updatedAt.toDate().getTime() < 300000 ? (
                  <span className="text-green-500">Online Agora</span>
                ) : (
                  `Visto ${formatDistanceToNow(otherProfile.updatedAt.toDate(), { locale: ptBR, addSuffix: true })}`
                )
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Logo className="scale-75 opacity-20 hover:opacity-100 transition-opacity hidden md:block" />
          <button 
            onClick={handleBlockUser}
            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
            title={profile.blockedUsers?.includes(otherProfile.uid) ? "Desbloquear utilizador" : "Bloquear utilizador"}
          >
            {profile.blockedUsers?.includes(otherProfile.uid) ? <Unlock className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50" 
        style={{ 
          backgroundImage: 'radial-gradient(#00000005 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
        onClick={() => setActiveMessageMenu(null)}
      >
        {messages.filter(m => !m.deletedFor?.includes(profile?.uid || '')).map((msg, idx) => {
          const isMe = msg.senderId === profile?.uid;
          
          return (
            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
              <div className={cn("flex items-end gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && (
                  <Link to={`/profile/${msg.senderId}`}>
                    <img 
                      src={otherProfile.photoURL || `https://ui-avatars.com/api/?name=${otherProfile.displayName}`} 
                      className="w-8 h-8 rounded-full object-cover mb-1 hover:ring-2 hover:ring-primary/20 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                )}
                <div className={cn(
                  "max-w-[85%] px-5 py-3 rounded-[24px] relative group transition-all shadow-sm",
                  isMe 
                    ? "bg-primary text-white rounded-tr-none shadow-md" 
                    : "bg-white text-gray-900 rounded-tl-none border border-gray-100"
                )}>
                  {msg.deletedForAll ? (
                    <p className="text-sm leading-relaxed font-medium py-0.5 italic opacity-80">{msg.content}</p>
                  ) : msg.type === 'audio' && msg.audioURL ? (
                    <AudioPlayer src={msg.audioURL} isMe={isMe} />
                  ) : msg.type === 'image' && msg.imageURL ? (
                    <div className="space-y-2 py-1">
                      <img 
                        src={msg.imageURL} 
                        className="rounded-xl max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity shadow-sm" 
                        onClick={() => window.open(msg.imageURL, '_blank')}
                        referrerPolicy="no-referrer"
                      />
                      {msg.content && msg.content !== 'Imagem' && <p className="text-sm font-medium px-1">{msg.content}</p>}
                    </div>
                  ) : msg.type === 'file' && msg.fileURL ? (
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      isMe ? "bg-white/10 border-white/20" : "bg-gray-50 border-gray-100"
                    )}>
                      <div className={cn("p-2 rounded-lg", isMe ? "bg-white/20" : "bg-primary/10")}>
                        <FileText className={cn("w-6 h-6", isMe ? "text-white" : "text-primary")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-bold truncate", isMe ? "text-white" : "text-gray-900")}>{msg.fileName || 'Ficheiro'}</p>
                        <a 
                          href={msg.fileURL} 
                          download={msg.fileName}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={cn("text-[10px] font-black uppercase tracking-widest underline", isMe ? "text-white/80" : "text-primary")}
                        >
                          Descarregar
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed font-medium py-0.5">{msg.content}</p>
                  )}

                  {/* Message Menu Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                    }}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black/5",
                      isMe ? "-left-10 text-gray-400" : "-right-10 text-gray-400"
                    )}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Message Menu Dropdown */}
                  {activeMessageMenu === msg.id && (
                    <div 
                      className={cn(
                        "absolute top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10",
                        isMe ? "right-0" : "left-0"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          deleteMessage(msg.id, false);
                          setActiveMessageMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Apagar para mim
                      </button>
                      {isMe && !msg.deletedForAll && (
                        <button
                          onClick={() => {
                            deleteMessage(msg.id, true);
                            setActiveMessageMenu(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Apagar para todos
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-1 mt-1 px-2",
                isMe ? "flex-row-reverse" : "flex-row"
              )}>
                <span className="text-[10px] font-bold text-gray-400">
                  {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMe && (
                  <div className="flex -space-x-1 ml-1">
                    <Check className="w-3 h-3 text-primary" />
                    {msg.read && <Check className="w-3 h-3 text-primary -ml-1.5" />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-gray-100">
        {profile.blockedUsers?.includes(otherProfile?.uid) ? (
          <div className="text-center py-6 bg-red-50 rounded-[32px] border border-dashed border-red-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h4 className="text-lg font-black text-red-900 mb-2">Utilizador Bloqueado</h4>
            <p className="text-sm text-red-600 font-medium max-w-xs mx-auto mb-6">
              Desbloqueia este utilizador para voltar a enviar mensagens.
            </p>
            <button 
              onClick={handleBlockUser}
              className="px-6 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              Desbloquear
            </button>
          </div>
        ) : otherProfile?.blockedUsers?.includes(profile.uid) ? (
          <div className="text-center py-6 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-black text-gray-900 mb-2">Não podes responder</h4>
            <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
              Este utilizador bloqueou-te.
            </p>
          </div>
        ) : isPending ? (
          <div className="text-center py-6 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-lg font-black text-gray-900 mb-2">
              {isInitiator ? 'Pedido de Amizade Enviado' : 'Novo Pedido de Amizade'}
            </h4>
            <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto mb-6">
              {isInitiator 
                ? `Aguardando que ${otherProfile.displayName} aceite o teu pedido para começarem a conversar.` 
                : `${otherProfile.displayName} quer conectar-se contigo. Aceita o pedido para começarem a conversar.`}
            </p>
            {!isInitiator && (
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={handleApprove}
                  className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Aceitar Amizade
                </button>
                <button 
                  onClick={() => navigate('/chats')}
                  className="bg-white text-gray-500 px-8 py-3.5 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-200"
                >
                  Agora Não
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {pendingImage && (
              <div className="relative inline-block group">
                <img src={pendingImage} className="w-24 h-24 object-cover rounded-2xl border-2 border-primary/20 shadow-md" />
                <button 
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full shadow-lg border border-gray-100 hover:scale-110 transition-transform"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute inset-0 bg-black/5 rounded-2xl pointer-events-none" />
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="p-3.5 text-gray-400 hover:bg-primary/10 hover:text-primary rounded-2xl transition-all cursor-pointer group relative overflow-hidden">
                  <Paperclip className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" strokeWidth={2.5} />
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileUpload} disabled={isSending} />
                </label>
                <label className="p-3.5 text-gray-400 hover:bg-primary/10 hover:text-primary rounded-2xl transition-all cursor-pointer group relative overflow-hidden">
                  <ImageIcon className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" strokeWidth={2.5} />
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSending} />
                </label>
                <AudioRecorder onStop={handleAudioStop} />
              </div>
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={pendingImage ? "Adiciona uma legenda..." : "Escreve uma mensagem..."}
                  className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 pr-24 text-sm focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage(newMessage);
                    }
                  }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <div className="relative">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={cn("p-2 rounded-full transition-colors", showEmojiPicker ? "text-primary bg-primary/10" : "text-gray-400 hover:text-primary")}
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-4 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 grid grid-cols-6 gap-2 w-64 z-50">
                        {['😀', '😂', '😍', '🤔', '😎', '👍', '🔥', '❤️', '✨', '🙌', '💪', '🚀', '🇲🇿', '💼', '💰', '🤝', '📍', '✅'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setNewMessage(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="text-2xl hover:scale-125 transition-transform p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => sendMessage(newMessage)}
                disabled={(!newMessage.trim() && !pendingImage && !isSending) || isSending}
                className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Profile = () => {
  const { id: paramId } = useParams();
  const { profile: currentUserProfile, refreshProfile, signIn } = useAuth();
  const navigate = useNavigate();
  const id = paramId || currentUserProfile?.uid;
  const isOwnProfile = currentUserProfile?.uid === id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [existingChat, setExistingChat] = useState<any>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const toggleFollow = async () => {
    if (!currentUserProfile || !profile || isFollowLoading) return signIn();
    if (isOwnProfile) return;

    setIsFollowLoading(true);
    const followId = `${currentUserProfile.uid}_${profile.uid}`;
    const followRef = doc(db, 'follows', followId);

    try {
      if (isFollowing) {
        // Unfollow
        await deleteDoc(followRef);
        try {
          await updateDoc(doc(db, 'users', currentUserProfile.uid), {
            followingCount: increment(-1)
          });
        } catch (e) {
          console.error('Error updating own followingCount:', e);
        }
        try {
          await updateDoc(doc(db, 'users', profile.uid), {
            followerCount: increment(-1)
          });
        } catch (e) {
          console.error('Error updating target followerCount:', e);
        }
      } else {
        // Follow
        await setDoc(followRef, {
          followerId: currentUserProfile.uid,
          followingId: profile.uid,
          createdAt: serverTimestamp()
        });
        try {
          await updateDoc(doc(db, 'users', currentUserProfile.uid), {
            followingCount: increment(1)
          });
        } catch (e) {
          console.error('Error updating own followingCount:', e);
        }
        try {
          await updateDoc(doc(db, 'users', profile.uid), {
            followerCount: increment(1)
          });
        } catch (e) {
          console.error('Error updating target followerCount:', e);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'follows');
    } finally {
      setIsFollowLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUserProfile || !id || isOwnProfile) return;
    const followId = `${currentUserProfile.uid}_${id}`;
    const reverseFollowId = `${id}_${currentUserProfile.uid}`;
    
    const unsub1 = onSnapshot(doc(db, 'follows', followId), (docSnap) => {
      setIsFollowing(docSnap.exists());
    });
    
    const unsub2 = onSnapshot(doc(db, 'follows', reverseFollowId), (docSnap) => {
      setFollowsMe(docSnap.exists());
    });
    
    return () => {
      unsub1();
      unsub2();
    };
  }, [currentUserProfile, id, isOwnProfile]);

  useEffect(() => {
    if (!currentUserProfile || !id || isOwnProfile) return;
    const chatId = [currentUserProfile.uid, id].sort().join('_');
    const unsubscribe = onSnapshot(doc(db, 'chats', chatId), (docSnap) => {
      if (docSnap.exists()) {
        setExistingChat({ id: docSnap.id, ...docSnap.data() });
      } else {
        setExistingChat(null);
      }
    }, (error) => {
      console.error('Error checking chat existence:', error);
      setExistingChat(null);
    });
    return () => unsubscribe();
  }, [currentUserProfile, id, isOwnProfile]);

  const handleStartChat = async () => {
    if (!currentUserProfile) return signIn();
    if (currentUserProfile.uid === id) return;

    const chatId = [currentUserProfile.uid, id].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    setIsChatLoading(true);
    try {
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        const isProvider = profile?.role === 'provider';
        const initialMessage = isProvider ? 'Iniciou uma conversa' : 'Enviou um pedido de amizade';
        
        await setDoc(chatRef, {
          participants: [currentUserProfile.uid, id],
          status: 'pending',
          initiatorId: currentUserProfile.uid,
          lastMessage: initialMessage,
          lastMessageAt: serverTimestamp(),
          unreadCount: { [id]: 1, [currentUserProfile.uid]: 0 },
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          content: initialMessage,
          senderId: currentUserProfile.uid,
          createdAt: serverTimestamp(),
          read: false,
          type: 'text'
        });
        
        if (!isProvider) {
          toast.success('Pedido de amizade enviado!');
        }
      }

      navigate(`/chats/${chatId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'users', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(id === currentUserProfile?.uid ? currentUserProfile : data);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${id}`));
    return () => unsubscribe();
  }, [id, currentUserProfile]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'services'), where('authorId', '==', id), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'announcements'), where('authorId', '==', id), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'announcements'));
    return () => unsubscribe();
  }, [id]);

  const handleBlockUser = async (targetId: string, isBlocked: boolean) => {
    if (!currentUserProfile) return signIn();
    try {
      const newBlockedUsers = isBlocked
        ? (currentUserProfile.blockedUsers || []).filter(uid => uid !== targetId)
        : [...(currentUserProfile.blockedUsers || []), targetId];

      await updateDoc(doc(db, 'users', currentUserProfile.uid), {
        blockedUsers: newBlockedUsers
      });
      
      toast.success(isBlocked ? 'Utilizador desbloqueado.' : 'Utilizador bloqueado.');
    } catch (err) {
      console.error('Error blocking user:', err);
      toast.error('Erro ao bloquear utilizador.');
    }
  };

  if (!profile && !paramId) return <LoginPrompt />;

  if (!profile) return <div className="min-h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-[40px] border border-brand-gray shadow-xl">
        {/* Banner */}
        <div className="h-48 md:h-64 bg-brand-gray relative overflow-hidden">
          {profile.bannerURL ? (
            <img src={profile.bannerURL} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-primary/20" />
            </div>
          )}
          {isOwnProfile && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg hover:scale-110 transition-transform z-10 text-brand-ink"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-6 md:px-12 pb-12 -mt-12 md:-mt-20 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 text-center md:text-left">
            <div className="relative group">
              <div className="w-28 h-28 md:w-48 md:h-48 rounded-[32px] md:rounded-[40px] overflow-hidden border-4 md:border-8 border-white shadow-2xl bg-white">
                <img 
                  src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&size=200`} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              {isOwnProfile && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="absolute bottom-2 right-2 bg-primary text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-transform z-10"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex-1 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                    <div>
                      <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-brand-ink leading-tight">{profile.displayName}</h1>
                      {profile.handle && (
                        <p className="text-xs md:text-sm font-bold text-primary tracking-tight">{profile.handle}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {followsMe && (
                        <span className="px-2 py-0.5 bg-brand-gray text-brand-ink/60 text-[8px] font-black uppercase tracking-widest rounded-md">
                          Segue-te
                        </span>
                      )}
                      {profile.isComplete && (
                        <div className="bg-blue-500 text-white p-1 rounded-full" title="Perfil Verificado">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      )}
                      {!isOwnProfile && (
                        <>
                          <ReportButton reportedId={profile.uid} reportedType="user" />
                          <button
                            onClick={() => handleBlockUser(profile.uid, currentUserProfile?.blockedUsers?.includes(profile.uid) || false)}
                            className="text-brand-ink/40 hover:text-red-500 transition-colors"
                            title={currentUserProfile?.blockedUsers?.includes(profile.uid) ? "Desbloquear utilizador" : "Bloquear utilizador"}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4">
                    <span className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                      {profile.role === 'provider' ? 'Especialista KAZI' : 'Cliente Premium'}
                    </span>
                    <div className="flex items-center text-brand-ink/40 text-xs font-bold">
                      <MapPin className="w-3 h-3 mr-1 text-primary" />
                      {profile.location?.district}, {profile.location?.province}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center md:justify-start gap-6 md:gap-8 mt-6">
                    <div className="text-center">
                      <p className="text-xl font-black text-brand-ink">{profile.followerCount || 0}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40">Seguidores</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-brand-ink">{profile.followingCount || 0}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40">A Seguir</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-brand-ink">{announcements.length}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40">Posts</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {!isOwnProfile && (
                      <button 
                        onClick={toggleFollow}
                        disabled={isFollowLoading}
                        className={cn(
                          "px-4 md:px-8 py-3 md:py-4 rounded-2xl text-xs md:text-sm font-bold transition-all shadow-xl flex items-center space-x-2",
                          isFollowing 
                            ? "bg-brand-gray text-brand-ink hover:bg-red-50 hover:text-red-600 shadow-brand-gray/20" 
                            : "bg-brand-ink text-white hover:bg-brand-ink/90 shadow-brand-ink/20"
                        )}
                      >
                      {isFollowLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isFollowing ? (
                        <span>Seguindo</span>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Seguir</span>
                        </>
                      )}
                    </button>
                  )}
                  {isOwnProfile ? (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIsEditing(true)} 
                        className="px-4 md:px-8 py-3 md:py-4 bg-brand-bg text-brand-ink rounded-2xl text-xs md:text-sm font-bold hover:bg-brand-gray transition-all shadow-xl shadow-brand-bg/20 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Editar Perfil</span>
                      </button>
                      <button 
                        onClick={() => setIsAddingJob(true)}
                        className="px-4 md:px-8 py-3 md:py-4 bg-brand-ink text-white rounded-2xl text-xs md:text-sm font-bold hover:bg-brand-ink/90 transition-all shadow-xl shadow-brand-ink/20 flex items-center space-x-2"
                      >
                        <Briefcase className="w-4 h-4" />
                        <span>Publicar Oportunidade</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handleStartChat}
                        disabled={isChatLoading}
                        className={cn(
                          "px-4 md:px-8 py-3 md:py-4 rounded-2xl text-xs md:text-sm font-bold transition-all shadow-xl flex items-center space-x-2",
                          existingChat?.status === 'pending' && existingChat?.initiatorId === currentUserProfile?.uid
                            ? "bg-brand-gray text-brand-ink/60"
                            : "bg-brand-gray text-brand-ink hover:bg-brand-gray/80 shadow-brand-gray/10"
                        )}
                      >
                        {isChatLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : !currentUserProfile ? (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Entrar para contactar</span>
                          </>
                        ) : existingChat?.status === 'active' ? (
                          <>
                            <MessageCircle className="w-4 h-4" />
                            <span>Mensagem</span>
                          </>
                        ) : existingChat?.status === 'pending' ? (
                          existingChat.initiatorId === currentUserProfile.uid ? (
                            <>
                              <Clock className="w-4 h-4" />
                              <span>Pedido Enviado</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span>Aceitar Amizade</span>
                            </>
                          )
                        ) : (
                          <>
                            {profile.role === 'provider' ? <MessageCircle className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                            <span>{profile.role === 'provider' ? 'Mensagem' : 'Adicionar Amigo'}</span>
                          </>
                        )}
                      </button>
                      {profile.role === 'provider' && (
                        <button 
                          onClick={() => navigate('/services?u=' + encodeURIComponent('@' + profile.handle))}
                          className="px-4 md:px-8 py-3 md:py-4 bg-primary text-white rounded-2xl text-xs md:text-sm font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center space-x-2"
                        >
                          <Briefcase className="w-4 h-4" />
                          <span>Contratar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12 pt-12 border-t border-brand-gray">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/30 mb-4">Sobre</h3>
                <p className="text-lg text-brand-ink/80 leading-relaxed font-medium">
                  {profile.bio || 'Este profissional ainda não adicionou uma biografia.'}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/30 mb-4">Especialidades</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills?.map(skill => (
                    <span key={skill} className="px-5 py-2 bg-brand-bg text-brand-ink rounded-xl text-xs font-bold border border-brand-gray hover:border-primary/30 transition-colors">
                      {skill}
                    </span>
                  )) || <span className="text-sm text-brand-ink/40 italic">Nenhuma especialidade listada.</span>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-brand-bg rounded-3xl p-6 border border-brand-gray">
                <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/30 mb-6">Informações de Contacto</h3>
                <div className="space-y-4">
                  {!currentUserProfile ? (
                    <div className="p-6 bg-white rounded-2xl border border-dashed border-brand-gray text-center space-y-3">
                      <Lock className="w-6 h-6 text-brand-ink/20 mx-auto" />
                      <p className="text-[10px] text-brand-ink/40 font-black uppercase tracking-widest leading-tight">
                        Login necessário para ver<br />informações de contacto
                      </p>
                      <button 
                        onClick={signIn}
                        className="w-full py-3 bg-white border border-brand-gray rounded-xl flex items-center justify-center gap-2 hover:bg-brand-bg transition-all shadow-sm"
                      >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Entrar com Google</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {profile.phoneNumber && (
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-brand-gray">
                            <Phone className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-brand-ink/30 uppercase tracking-widest">Telemóvel</p>
                            <p className="text-sm font-bold text-brand-ink">{profile.phoneNumber}</p>
                          </div>
                        </div>
                      )}
                      {profile.email && (
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-brand-gray">
                            <Mail className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-brand-ink/30 uppercase tracking-widest">Email</p>
                            <p className="text-sm font-bold text-brand-ink">{profile.email}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-brand-gray">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-brand-ink/30 uppercase tracking-widest">Localização</p>
                      <p className="text-sm font-bold text-brand-ink">{profile.location?.district}, {profile.location?.province}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-brand-gray/50 flex gap-4">
                  {profile.socialLinks?.instagram && (
                    <a href={profile.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-brand-gray hover:text-primary transition-colors">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {profile.socialLinks?.facebook && (
                    <a href={profile.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-brand-gray hover:text-primary transition-colors">
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {profile.socialLinks?.twitter && (
                    <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-brand-gray hover:text-primary transition-colors">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {profile.socialLinks?.whatsapp && (
                    <a href={`https://wa.me/${profile.socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-brand-gray hover:text-primary transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black tracking-tighter">Serviços Oferecidos</h2>
          {isOwnProfile && (
            <button 
              onClick={() => setIsAddingService(true)}
              className="flex items-center space-x-2 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> <span>Novo Serviço</span>
            </button>
          )}
        </div>
        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map(service => <ServiceCard key={service.id} service={service} />)}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-brand-gray">
            <Briefcase className="w-12 h-12 text-brand-ink/20 mx-auto mb-4" />
            <p className="text-brand-ink/60">Nenhum serviço publicado ainda.</p>
          </div>
        )}
      </section>

      {/* Work Examples */}
      <section>
        <h2 className="text-2xl font-black tracking-tighter mb-8">Exemplos de Trabalho</h2>
        {profile.workExamples && profile.workExamples.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {profile.workExamples.map((img, idx) => (
              <div key={idx} className="aspect-square rounded-3xl overflow-hidden border border-brand-gray group relative">
                <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-brand-gray">
            <ImageIcon className="w-12 h-12 text-brand-ink/20 mx-auto mb-4" />
            <p className="text-brand-ink/60">Ainda não foram adicionados exemplos de trabalho.</p>
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="bg-white p-8 rounded-[40px] border border-brand-gray shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black tracking-tighter">Avaliações dos Clientes</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <span className="text-xl font-black text-brand-ink ml-1">{profile.rating || '0.0'}</span>
            </div>
            <span className="text-sm text-brand-ink/40 font-bold">({profile.reviewCount || 0} avaliações)</span>
          </div>
        </div>
        <ReviewList targetId={profile.uid} />
      </section>

      {/* Modals */}
      <AnimatePresence>
        {isAddingService && (
          <AddServiceModal onClose={() => setIsAddingService(false)} />
        )}
        {isAddingAnnouncement && (
          <CreateAnnouncementModal onClose={() => setIsAddingAnnouncement(false)} />
        )}
        {isEditing && (
          <EditProfileModal onClose={() => setIsEditing(false)} />
        )}
        {isAddingJob && (
          <CreateJob onClose={() => setIsAddingJob(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const CreateAnnouncementModal = ({ onClose }: { onClose: () => void }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    photoURL: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!formData.content) {
      toast.error('Por favor, escreve o conteúdo do anúncio.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || '',
        content: formData.content,
        photoURL: formData.photoURL,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-8 md:p-12"
      >
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black tracking-tighter">Novo Anúncio</h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-full transition-colors"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Conteúdo do Anúncio</label>
            <textarea 
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              placeholder="O que tens para partilhar hoje?"
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium min-h-[120px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Foto (Opcional)</label>
            <ImageUpload 
              onImageUploaded={(url) => setFormData({ ...formData, photoURL: url })}
              currentImage={formData.photoURL}
              label="Adicionar Foto ao Anúncio"
              aspectRatio="video"
              className="w-full h-48"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-primary text-white rounded-2xl text-lg font-black tracking-tighter hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'A publicar...' : 'Publicar Anúncio'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const EditProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    handle: profile?.handle || '',
    age: profile?.age || 18,
    bio: profile?.bio || '',
    phoneNumber: profile?.phoneNumber || '',
    photoURL: profile?.photoURL || '',
    bannerURL: profile?.bannerURL || '',
    skills: profile?.skills?.join(', ') || '',
    lookingFor: profile?.lookingFor || '',
    workExamples: profile?.workExamples || [],
    location: { 
      province: profile?.location?.province || '', 
      district: profile?.location?.district || '' 
    },
    socialLinks: profile?.socialLinks || {
      instagram: '',
      facebook: '',
      whatsapp: '',
      twitter: ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      if (formData.handle !== profile.handle) {
        const q = query(collection(db, 'users'), where('handle', '==', formData.handle));
        const snapshot = await getDocs(q);
        const isTaken = snapshot.docs.some(d => d.id !== profile.uid);
        if (isTaken) {
          toast.error('Este @nome já está em uso. Escolha outro.');
          setLoading(false);
          return;
        }
      }

      const { phoneNumber, ...publicData } = formData;
      const userRef = doc(db, 'users', profile.uid);
      const privateRef = doc(db, 'users_private', profile.uid);

      await Promise.all([
        setDoc(userRef, {
          ...publicData,
          skills: formData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
          updatedAt: serverTimestamp()
        }, { merge: true }),
        setDoc(privateRef, {
          phoneNumber: phoneNumber
        }, { merge: true })
      ]);
      await refreshProfile(profile.uid);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-8 md:p-12 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black tracking-tighter">Editar Perfil</h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-full transition-colors"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col items-center">
              <ImageUpload 
                onImageUploaded={(url) => setFormData({ ...formData, photoURL: url })}
                currentImage={formData.photoURL}
                label="Foto de Perfil"
                className="w-32 h-32 rounded-[32px]"
              />
              <p className="text-[10px] font-black text-brand-ink/40 uppercase tracking-widest mt-2">Foto de Perfil</p>
            </div>
            <div className="flex flex-col items-center">
              <ImageUpload 
                onImageUploaded={(url) => setFormData({ ...formData, bannerURL: url })}
                currentImage={formData.bannerURL}
                label="Banner do Perfil"
                className="w-full h-32 rounded-[32px]"
              />
              <p className="text-[10px] font-black text-brand-ink/40 uppercase tracking-widest mt-2">Banner do Perfil</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Nome de Utilizador (Handle)</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.handle}
                onChange={e => {
                  let val = e.target.value;
                  if (val && !val.startsWith('@')) val = '@' + val;
                  setFormData({...formData, handle: val.toLowerCase().replace(/[^@a-z0-9_]/g, '')});
                }}
                placeholder="@teu_nome"
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
              />
              <p className="text-[10px] text-brand-ink/30 mt-1">Ex: @kazi (Mínimo 3 caracteres, letras, números e sublinhados)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Nome</label>
              <input 
                type="text" 
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Idade</label>
              <input 
                type="number" 
                value={formData.age}
                onChange={e => setFormData({...formData, age: Number(e.target.value)})}
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Telemóvel</label>
            <input 
              type="tel" 
              value={formData.phoneNumber}
              onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Província</label>
              <select 
                value={formData.location.province}
                onChange={e => setFormData({
                  ...formData, 
                  location: { 
                    province: e.target.value, 
                    district: MOZAMBIQUE_LOCATIONS[e.target.value][0] 
                  }
                })}
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
              >
                {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Distrito</label>
              <select 
                value={formData.location.district}
                onChange={e => setFormData({
                  ...formData, 
                  location: { ...formData.location, district: e.target.value }
                })}
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
              >
                {MOZAMBIQUE_LOCATIONS[formData.location.province].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Habilidades (separadas por vírgula)</label>
            <input 
              type="text" 
              value={formData.skills}
              onChange={e => setFormData({...formData, skills: e.target.value})}
              placeholder="Ex: Design, Limpeza, Matemática..."
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">O que procuras na KAZI?</label>
            <input 
              type="text" 
              value={formData.lookingFor}
              onChange={e => setFormData({...formData, lookingFor: e.target.value})}
              placeholder="Ex: Alguém para limpar o meu quintal"
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Biografia</label>
            <textarea 
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-32 resize-none font-medium"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40">Redes Sociais</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/30" />
                <input 
                  type="text" 
                  placeholder="Link do Instagram"
                  value={formData.socialLinks.instagram}
                  onChange={e => setFormData({
                    ...formData, 
                    socialLinks: { ...formData.socialLinks, instagram: e.target.value }
                  })}
                  className="w-full p-4 pl-12 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                />
              </div>
              <div className="relative">
                <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/30" />
                <input 
                  type="text" 
                  placeholder="Link do Facebook"
                  value={formData.socialLinks.facebook}
                  onChange={e => setFormData({
                    ...formData, 
                    socialLinks: { ...formData.socialLinks, facebook: e.target.value }
                  })}
                  className="w-full p-4 pl-12 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                />
              </div>
              <div className="relative">
                <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/30" />
                <input 
                  type="text" 
                  placeholder="Link do Twitter"
                  value={formData.socialLinks.twitter}
                  onChange={e => setFormData({
                    ...formData, 
                    socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                  })}
                  className="w-full p-4 pl-12 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                />
              </div>
              <div className="relative">
                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/30" />
                <input 
                  type="text" 
                  placeholder="Número do WhatsApp"
                  value={formData.socialLinks.whatsapp}
                  onChange={e => setFormData({
                    ...formData, 
                    socialLinks: { ...formData.socialLinks, whatsapp: e.target.value }
                  })}
                  className="w-full p-4 pl-12 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-4">Exemplos de Trabalho (Portfólio)</label>
            <div className="grid grid-cols-3 gap-4">
              {formData.workExamples.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-brand-gray">
                  <img src={img} className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, workExamples: formData.workExamples.filter((_, i) => i !== idx) })}
                    className="absolute top-1 right-1 p-1 bg-white/90 text-brand-ink rounded-lg shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {formData.workExamples.length < 6 && (
                <ImageUpload 
                  onImageUploaded={(url) => setFormData({ ...formData, workExamples: [...formData.workExamples, url] })}
                  label="Adicionar"
                  className="aspect-square rounded-2xl"
                />
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'A guardar...' : 'Guardar Alterações'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const CourseModal: React.FC<{ course: string; onClose: () => void }> = ({ course, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey === 'undefined') {
          setContent('# ⚠️ Indisponível\n\nO serviço de IA não está configurado. Por favor, adicione uma chave de API válida para aceder aos cursos.');
          setLoading(false);
          return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Cria um guia prático, profissional e motivador em português de Moçambique sobre: "${course}". 
          
          Estrutura o conteúdo EXATAMENTE assim:
          # 🚀 ${course}
          
          ## 💡 Introdução
          Uma breve explicação do porquê isto é importante para o teu sucesso.
          
          ## 🛠️ Passos Práticos
          Usa uma lista numerada com passos claros e acionáveis.
          
          ## ✨ Dicas de Ouro
          Usa uma lista de pontos com emojis para destacar conselhos valiosos.
          
          ## ⚠️ O que Evitar
          Erros comuns que deves evitar.
          
          ## 🏁 Conclusão
          Uma frase final de encorajamento.
          
          Usa Markdown rico. Foca na realidade de Moçambique e em ajudar jovens a brilhar.`,
        });
        setContent(response.text || 'Não foi possível carregar o conteúdo.');
      } catch (err) {
        console.error('Error fetching course:', err);
        setContent('Erro ao carregar o curso. Tenta novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [course]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col relative"
      >
        {/* Header */}
        <div className="p-8 md:p-12 pb-4 border-b border-gray-50 shrink-0">
          <button onClick={onClose} className="absolute top-8 right-8 p-2 text-brand-ink/20 hover:text-brand-ink transition-colors z-10">
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Curso Rápido KAZI</p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-brand-ink leading-none">{course}</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 pt-4 custom-scrollbar">
          <div className="prose prose-brand max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-brand-ink/80 prose-li:text-brand-ink/80">
            {loading ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-full" />
              </div>
            ) : (
              <div className="markdown-body">
                <Markdown>{content}</Markdown>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 md:p-12 pt-4 border-t border-gray-50 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-brand-ink text-white rounded-2xl font-black hover:bg-brand-ink/90 transition-all shadow-xl shadow-brand-ink/10 active:scale-[0.98]"
          >
            Entendido, vamos a isso!
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AddServiceModal = ({ onClose, isStandalone = false }: { onClose: () => void; isStandalone?: boolean }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'domestico',
    price: 0,
    photoURL: '',
    location: { 
      province: profile?.location?.province || '', 
      district: profile?.location?.district || '' 
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      // AI Validation and Improvement
      const validation = await validateAndImproveService(formData.title, formData.description, formData.category);
      if (!validation.isValid) {
        toast.error(validation.reason || 'A descrição do serviço não parece válida. Por favor, descreve melhor o que ofereces.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'services'), {
        ...formData,
        title: validation.improvedTitle || formData.title,
        description: validation.improvedDescription || formData.description,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || null,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'services');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className={cn("bg-white w-full rounded-[40px] p-8 shadow-2xl my-8", !isStandalone && "max-w-lg")}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Novo Serviço</h2>
        {!isStandalone && <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-4">
          <ImageUpload 
            onImageUploaded={(url) => setFormData({ ...formData, photoURL: url })}
            currentImage={formData.photoURL}
            label="Foto do Trabalho"
            aspectRatio="video"
            className="w-full h-40"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Título do Serviço</label>
          <input 
            required
            type="text" 
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Ex: Limpeza de Quintal"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Categoria</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="domestico">Doméstico</option>
              <option value="design">Design</option>
              <option value="aulas">Aulas</option>
              <option value="transporte">Transporte</option>
              <option value="reparos">Reparos</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Preço (MT)</label>
            <input 
              required
              type="number" 
              value={formData.price}
              onChange={e => setFormData({...formData, price: Number(e.target.value)})}
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Província</label>
            <select 
              value={formData.location.province}
              onChange={e => setFormData({
                ...formData, 
                location: { 
                  province: e.target.value, 
                  district: MOZAMBIQUE_LOCATIONS[e.target.value][0] 
                }
              })}
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
            >
              {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Distrito</label>
            <select 
              value={formData.location.district}
              onChange={e => setFormData({
                ...formData, 
                location: { ...formData.location, district: e.target.value }
              })}
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
            >
              {MOZAMBIQUE_LOCATIONS[formData.location.province].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Descrição</label>
          <textarea 
            required
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-32 resize-none"
            placeholder="Descreve o que fazes e como trabalhas..."
          />
        </div>
        <button 
          disabled={loading}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          {loading ? 'A publicar...' : 'Publicar Serviço'}
        </button>
      </form>
    </div>
  );

  if (isStandalone) return modalContent;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {modalContent}
      </motion.div>
    </motion.div>
  );
};

const ReviewModal = ({ order, onClose }: { order: Order; onClose: () => void }) => {
  const { profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (order.clientId === order.providerId) {
        throw new Error('Não podes avaliar o teu próprio serviço.');
      }

      // Add review
      await addDoc(collection(db, 'reviews'), {
        orderId: order.id,
        serviceId: order.serviceId,
        authorId: order.clientId, // Match rules: authorId
        authorName: order.clientName,
        authorPhoto: profile.photoURL || null,
        targetId: order.providerId, // Match rules: targetId (provider)
        rating,
        comment,
        createdAt: serverTimestamp(),
      });

      // Update order to mark as reviewed
      const orderRef = doc(db, 'orders', order.id);
      await setDoc(orderRef, { isReviewed: true }, { merge: true });

      // Update service rating
      const serviceRef = doc(db, 'services', order.serviceId);
      const serviceSnap = await getDoc(serviceRef);
      if (serviceSnap.exists()) {
        const data = serviceSnap.data();
        const currentRating = data.rating || 0;
        const currentCount = data.reviewCount || 0;
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + rating) / newCount;
        
        // We use setDoc with merge: true to update rating fields
        // Note: This might still fail if rules don't allow non-authors to update services
        await setDoc(serviceRef, { 
          rating: Number(newRating.toFixed(1)), 
          reviewCount: newCount 
        }, { merge: true });
      }

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reviews');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-brand-bg rounded-xl transition-all"
        >
          <X className="w-5 h-5 text-brand-ink/40" />
        </button>

        <h2 className="text-2xl font-bold mb-2">Avaliar Serviço</h2>
        <p className="text-brand-ink/60 text-sm mb-6">Como foi a tua experiência com {order.serviceTitle}?</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button 
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star className={cn("w-10 h-10", rating >= star ? "text-yellow-500 fill-current" : "text-brand-gray")} />
              </button>
            ))}
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Comentário</label>
            <textarea 
              required
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-32 resize-none"
              placeholder="Partilha a tua opinião sincera..."
            />
          </div>

          <button 
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            {loading ? 'A enviar...' : 'Enviar Avaliação'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const Orders = () => {
  const { profile, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [receivedOrders, setReceivedOrders] = useState<Order[]>([]);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!profile) return;
    
    const q1 = query(collection(db, 'orders'), where('clientId', '==', profile.uid), orderBy('createdAt', 'desc'));
    const unsub1 = onSnapshot(q1, (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))));

    const q2 = query(collection(db, 'orders'), where('providerId', '==', profile.uid), orderBy('createdAt', 'desc'));
    const unsub2 = onSnapshot(q2, (snap) => setReceivedOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))));

    return () => { unsub1(); unsub2(); };
  }, [profile]);

  if (loading) return <LoadingScreen />;
  if (!profile) return <LoginPrompt message="Inicie sessão para ver os seus pedidos" />;

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await setDoc(doc(db, 'orders', orderId), { status }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-bold">Meus Pedidos</h1>
      
      <div className="grid md:grid-cols-2 gap-12">
        {/* Sent Orders */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center"><ChevronRight className="w-5 h-5 mr-2" /> Serviços que Pedi</h2>
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-[32px] border border-brand-gray shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg">{order.serviceTitle}</h4>
                    <p className="text-xs text-brand-ink/60">Para: {order.providerName || 'Prestador'}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-brand-ink/80 mb-4 italic">"{order.message}"</p>
                
                {order.status === 'completed_by_provider' && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">O prestador marcou como concluído</p>
                    <button 
                      onClick={() => updateStatus(order.id, 'completed')}
                      className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md"
                    >
                      Confirmar Conclusão
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-[10px] text-brand-ink/40 uppercase tracking-widest">
                    {order.createdAt ? formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Recentemente'}
                  </div>
                  {order.status === 'completed' && !order.isReviewed && (
                    <button 
                      onClick={() => setReviewOrder(order)}
                      className="px-4 py-1.5 bg-yellow-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-yellow-600 transition-colors"
                    >
                      Avaliar
                    </button>
                  )}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-brand-ink/40 text-center py-8">Nenhum pedido feito ainda.</p>}
          </div>
        </section>

        {/* Received Orders */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center"><ChevronRight className="w-5 h-5 mr-2" /> Pedidos Recebidos</h2>
          <div className="space-y-4">
            {receivedOrders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-[32px] border border-brand-gray shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg">{order.serviceTitle}</h4>
                    <p className="text-xs text-brand-ink/60">De: {order.clientName}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-brand-ink/80 mb-6 italic">"{order.message}"</p>
                {order.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateStatus(order.id, 'accepted')}
                      className="flex-1 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90"
                    >
                      Aceitar
                    </button>
                    <button 
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      className="flex-1 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50"
                    >
                      Recusar
                    </button>
                  </div>
                )}
                {order.status === 'accepted' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'completed_by_provider')}
                    className="w-full py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700"
                  >
                    Marcar como Concluído
                  </button>
                )}
                {order.status === 'completed_by_provider' && (
                  <div className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold text-center border border-blue-100">
                    A aguardar confirmação do cliente
                  </div>
                )}
              </div>
            ))}
            {receivedOrders.length === 0 && <p className="text-brand-ink/40 text-center py-8">Ainda não recebeste pedidos.</p>}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {reviewOrder && <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} />}
      </AnimatePresence>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    completed_by_provider: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    pending: 'Pendente',
    accepted: 'Em curso',
    completed_by_provider: 'Pendente de Confirmação',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", styles[status])}>
      {labels[status]}
    </span>
  );
};

const EducationList = () => {
  const [resources, setResources] = useState<Education[]>([]);
  const [selectedResource, setSelectedResource] = useState<Education | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'education'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Education)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'education'));
    return () => unsubscribe();
  }, []);

  // Default resources if empty
  const defaultResources = [
    { id: '1', title: 'Como negociar o teu preço', category: 'Negócios', content: 'Aprende a valorizar o teu trabalho e a chegar a um acordo justo com o cliente.\n\n### Dicas de Negociação\n1. Conhece os teus custos\n2. Pesquisa o mercado\n3. Sê flexível mas firme\n4. Oferece pacotes de serviços' },
    { id: '2', title: 'Marketing para pequenos serviços', category: 'Marketing', content: 'Dicas simples para seres visto na tua comunidade e atrair mais clientes.\n\n### Estratégias de Marketing\n- Usa as redes sociais (WhatsApp, Facebook)\n- Pede recomendações aos clientes satisfeitos\n- Mantém o teu perfil KAZI atualizado com boas fotos' },
    { id: '3', title: 'Atendimento ao cliente de excelência', category: 'Soft Skills', content: 'Como garantir que o cliente te volta a chamar e te recomenda a outros.\n\n### Pilares do Atendimento\n- Pontualidade\n- Comunicação clara\n- Organização e limpeza\n- Honestidade nos prazos' }
  ];

  const displayResources = resources.length > 0 ? resources : defaultResources;

  return (
    <div className="space-y-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">Centro de Aprendizagem</h1>
        <p className="text-brand-ink/60 text-lg">Dicas práticas e mini-cursos para te tornares um profissional de sucesso.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {displayResources.map((res) => (
          <div key={res.id} className="bg-white p-8 rounded-[40px] border border-brand-gray hover:shadow-2xl transition-all group">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2 block">{res.category}</span>
            <h3 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors">{res.title}</h3>
            <div className="text-brand-ink/60 text-sm mb-6 leading-relaxed line-clamp-3">
              {res.content}
            </div>
            <button 
              onClick={() => setSelectedResource(res as Education)}
              className="text-sm font-bold text-primary flex items-center hover:translate-x-1 transition-transform"
            >
              Ler mais <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedResource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-8 md:p-12 relative"
            >
              <button 
                onClick={() => setSelectedResource(null)}
                className="absolute top-6 right-6 p-2 hover:bg-brand-bg rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="mb-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">{selectedResource.category}</span>
                <h2 className="text-3xl font-black tracking-tighter">{selectedResource.title}</h2>
              </div>

              <div className="prose prose-brand max-w-none text-brand-ink/70 leading-relaxed markdown-body">
                <Markdown>{selectedResource.content}</Markdown>
              </div>

              <div className="mt-12 pt-8 border-t border-brand-gray flex justify-end">
                <button 
                  onClick={() => setSelectedResource(null)}
                  className="px-8 py-3 bg-brand-ink text-white rounded-2xl font-bold hover:bg-brand-ink/90 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


const ReportModal = ({ 
  reportedId, 
  reportedType, 
  onClose 
}: { 
  reportedId: string; 
  reportedType: Report['reportedType']; 
  onClose: () => void; 
}) => {
  const { profile } = useAuth();
  const [type, setType] = useState<Report['type']>('spam');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const categories = [
    { id: 'spam', label: 'Spam / Publicidade não autorizada' },
    { id: 'inappropriate', label: 'Conteúdo impróprio (nudez, violência, ódio)' },
    { id: 'harassment', label: 'Assédio ou bullying' },
    { id: 'fraud', label: 'Fraude ou tentativa de golpe' },
    { id: 'fake_review', label: 'Avaliação falsa ou enganosa' },
    { id: 'technical', label: 'Problema técnico / conteúdo incorreto' },
    { id: 'other', label: 'Outro' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);

    try {
      // Check if already reported by this user
      const q = query(
        collection(db, 'reports'),
        where('reportedId', '==', reportedId),
        where('reporterId', '==', profile.uid)
      );
      
      let existingSnap;
      try {
        existingSnap = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'reports');
        return;
      }
      
      if (!existingSnap.empty) {
        toast.error('Já denunciaste este item anteriormente.');
        onClose();
        return;
      }
      
      try {
        await addDoc(collection(db, 'reports'), {
          reportedId,
          reportedType,
          reporterId: profile.uid,
          type,
          description,
          status: 'pending',
          priority: 'low',
          createdAt: serverTimestamp(),
        });
        setIsSuccess(true);
        setTimeout(() => onClose(), 2000);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'reports');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-[32px] text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-gray-900">Denúncia Registrada</h3>
        <p className="text-gray-500 font-medium">Sua denúncia foi registrada com sucesso e será analisada pela nossa equipa.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[32px] space-y-6 max-w-md w-full shadow-2xl relative">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">Denunciar Conteúdo</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Motivo da Denúncia</label>
          <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setType(cat.id as any)}
                className={cn(
                  "w-full p-4 rounded-2xl text-left font-bold text-sm border-2 transition-all",
                  type === cat.id 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-gray-100 text-gray-600 hover:border-gray-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição (Opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dê-nos mais detalhes..."
            className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary outline-none min-h-[100px] text-sm font-medium transition-all"
            required={type === 'other'}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'A Enviar...' : 'Enviar Denúncia'}
        </button>
      </form>
    </div>
  );
};

const ReportButton = ({ reportedId, reportedType, className }: { reportedId: string; reportedType: Report['reportedType']; className?: string }) => {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
        className={cn("p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-full transition-colors", className)}
        title="Denunciar"
      >
        <AlertTriangle className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-md"
            >
              <ReportModal 
                reportedId={reportedId} 
                reportedType={reportedType} 
                onClose={() => setShowModal(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reports'));
    
    return () => unsubscribe();
  }, [profile]);

  const handleUpdateStatus = async (reportId: string, status: Report['status']) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  if (profile?.role !== 'admin') {
    return <div className="p-20 text-center">Acesso negado. Apenas administradores podem ver esta página.</div>;
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-tighter">Gestão de Denúncias</h1>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
          {reports.length} Denúncias
        </div>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-white p-6 rounded-[32px] border border-brand-gray shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    report.priority === 'high' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  )}>
                    Prioridade {report.priority}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {report.reportedType} • {report.type}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">ID Denunciado: {report.reportedId}</h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleUpdateStatus(report.id, 'in_review')}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  Em Revisão
                </button>
                <button 
                  onClick={() => handleUpdateStatus(report.id, 'resolved')}
                  className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors"
                >
                  Resolver
                </button>
                <button 
                  onClick={() => handleUpdateStatus(report.id, 'rejected')}
                  className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  Rejeitar
                </button>
              </div>
            </div>
            
            {report.description && (
              <div className="bg-gray-50 p-4 rounded-2xl mb-4 text-sm text-gray-600 italic">
                "{report.description}"
              </div>
            )}

            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Denunciado por: {report.reporterId}</span>
              <span>{report.createdAt?.toDate().toLocaleString()}</span>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-brand-gray">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma denúncia pendente. Bom trabalho!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Terms = () => (
  <div className="max-w-3xl mx-auto py-20 px-4">
    <h1 className="text-4xl font-bold mb-8">Termos de Serviço</h1>
    <div className="prose prose-brand max-w-none text-brand-ink/70 leading-relaxed space-y-6">
      <p>Bem-vindo à KAZI. Ao utilizar a nossa plataforma, concordas com os seguintes termos:</p>
      <h2 className="text-xl font-bold text-brand-ink mt-8">1. Uso da Plataforma</h2>
      <p>A KAZI é um mercado que conecta prestadores de serviços a clientes em Moçambique. Não somos responsáveis pela execução dos serviços, mas facilitamos a conexão.</p>
      <h2 className="text-xl font-bold text-brand-ink mt-8">2. Responsabilidades do Utilizador</h2>
      <p>Deves fornecer informações verdadeiras e precisas no teu perfil. Fotos reais e descrições honestas são obrigatórias para manter a integridade da comunidade.</p>
      <h2 className="text-xl font-bold text-brand-ink mt-8">3. Pagamentos</h2>
      <p>Os pagamentos são negociados diretamente entre o cliente e o prestador. Recomendamos o uso de métodos seguros e a confirmação do serviço antes do pagamento total.</p>
    </div>
  </div>
);

const Privacy = () => (
  <div className="max-w-3xl mx-auto py-20 px-4">
    <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>
    <div className="prose prose-brand max-w-none text-brand-ink/70 leading-relaxed space-y-6">
      <p>Na KAZI, a tua privacidade é a nossa prioridade.</p>
      <h2 className="text-xl font-bold text-brand-ink mt-8">1. Dados Recolhidos</h2>
      <p>Recolhemos o teu nome, telemóvel, localização e informações profissionais para criar o teu perfil e permitir que outros utilizadores te encontrem.</p>
      <h2 className="text-xl font-bold text-brand-ink mt-8">2. Uso de Dados</h2>
      <p>Os teus dados são usados exclusivamente para o funcionamento da plataforma e para melhorar as nossas recomendações inteligentes.</p>
      <h2 className="text-xl font-bold text-brand-ink mt-8">3. Partilha de Informação</h2>
      <p>Nunca venderemos os teus dados a terceiros. A tua informação de contacto só é partilhada com utilizadores com quem inicias uma transação.</p>
    </div>
  </div>
);

const Contact = () => (
  <div className="max-w-3xl mx-auto py-20 px-4">
    <h1 className="text-4xl font-bold mb-8">Contactos</h1>
    <div className="bg-white p-12 rounded-[40px] border border-brand-gray shadow-xl">
      <p className="text-lg text-brand-ink/60 mb-12 text-center">Estamos aqui para ajudar. Entra em contacto connosco através de qualquer um dos canais abaixo.</p>
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-ink/40">Email</p>
              <p className="font-bold">suporte@kazi.co.mz</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-ink/40">Telefone</p>
              <p className="font-bold">+258 84 000 0000</p>
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-ink/40">Escritório</p>
              <p className="font-bold">Moçambique</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-ink/40">Website</p>
              <p className="font-bold">www.kazi.co.mz</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CreateService = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'select' | 'offer'>('select');

  if (loading) return <LoadingScreen />;
  if (!profile) return <LoginPrompt message="Inicie sessão para criar um serviço" />;

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-brand-bg pb-24">
        <div className="max-w-2xl mx-auto px-4 pt-12">
          <h1 className="text-4xl font-black tracking-tighter mb-2 text-brand-ink">O que queres fazer?</h1>
          <p className="text-brand-ink/40 font-bold mb-12 uppercase tracking-widest text-xs">Escolhe uma opção para continuar</p>
          
          <div className="grid gap-6">
            <button 
              onClick={() => setMode('offer')}
              className="bg-white p-8 rounded-[40px] border border-brand-gray shadow-sm text-left group hover:border-primary/30 transition-all flex items-center gap-6"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-brand-ink">Oferecer um Serviço</h3>
                <p className="text-sm font-medium text-brand-ink/40">Publica o que sabes fazer e começa a ganhar dinheiro.</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/services')}
              className="bg-white p-8 rounded-[40px] border border-brand-gray shadow-sm text-left group hover:border-primary/30 transition-all flex items-center gap-6"
            >
              <div className="w-16 h-16 bg-brand-ink/5 rounded-2xl flex items-center justify-center text-brand-ink/40 group-hover:scale-110 transition-transform">
                <Search className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-brand-ink">Contratar Alguém</h3>
                <p className="text-sm font-medium text-brand-ink/40">Procura talentos e serviços para resolver os teus problemas.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <AddServiceModal onClose={() => setMode('select')} isStandalone />
      </div>
    </div>
  );
};

const Settings = () => {
  const { profile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!profile) return <LoginPrompt message="Inicie sessão para ver as definições" />;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-black tracking-tighter mb-12">Definições</h1>
      
      <div className="space-y-4">
        {/* Profile Section */}
        <div className="bg-white rounded-[32px] p-6 border border-brand-gray shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-widest text-brand-ink/30 mb-6">Conta</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                className="w-12 h-12 rounded-2xl object-cover" 
              />
              <div>
                <p className="font-bold">{profile?.displayName}</p>
                <p className="text-xs text-brand-ink/40">{profile?.email}</p>
              </div>
            </div>
            <Link 
              to={`/profile/${profile?.uid}`}
              className="px-4 py-2 bg-brand-bg text-brand-ink rounded-xl text-xs font-bold hover:bg-brand-gray transition-colors"
            >
              Ver Perfil
            </Link>
          </div>
        </div>

        {/* Legal & Support Section */}
        <div className="bg-white rounded-[32px] overflow-hidden border border-brand-gray shadow-sm">
          <div className="p-6 border-b border-brand-gray/50">
            <h2 className="text-xs font-black uppercase tracking-widest text-brand-ink/30">Legal & Suporte</h2>
          </div>
          <div className="divide-y divide-brand-gray/50">
            <Link to="/terms" className="flex items-center justify-between p-6 hover:bg-brand-bg transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="font-bold text-brand-ink/80 group-hover:text-brand-ink">Termos e Condições</span>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-ink/20 group-hover:text-brand-ink/40" />
            </Link>
            <Link to="/privacy" className="flex items-center justify-between p-6 hover:bg-brand-bg transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
                  <Info className="w-5 h-5" />
                </div>
                <span className="font-bold text-brand-ink/80 group-hover:text-brand-ink">Política de Privacidade</span>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-ink/20 group-hover:text-brand-ink/40" />
            </Link>
            <Link to="/contact" className="flex items-center justify-between p-6 hover:bg-brand-bg transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="font-bold text-brand-ink/80 group-hover:text-brand-ink">Suporte & Ajuda</span>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-ink/20 group-hover:text-brand-ink/40" />
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-[32px] p-6 border border-brand-gray shadow-sm">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center space-x-2 p-4 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </div>

      <ConfirmModal 
        show={showLogoutConfirm}
        title="Terminar Sessão"
        message="Tens a certeza que queres sair da tua conta?"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};

// --- App Root ---

// --- Jobs Feature ---
const Jobs: React.FC = () => {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterProvince, setFilterProvince] = useState(profile?.location?.province || '');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(50));
    
    if (filterProvince) {
      q = query(collection(db, 'jobs'), where('location.province', '==', filterProvince), orderBy('createdAt', 'desc'), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching jobs:', error);
      toast.error('Erro ao carregar oportunidades de emprego.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filterProvince]);

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Oportunidades de Emprego</h1>
          <p className="text-gray-500 font-medium">Encontra o teu próximo desafio ou contrata talentos jovens.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Filtros</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Província</label>
                <select 
                  value={filterProvince}
                  onChange={(e) => setFilterProvince(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Todas as Províncias</option>
                  {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pesquisar</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Título, empresa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Job List */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map(job => (
              <motion.div 
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      <Briefcase className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{job.title}</h3>
                      <p className="text-gray-600 font-bold mb-2">{job.company}</p>
                      <div className="flex flex-wrap gap-3 text-sm font-medium text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                          <MapPin className="w-3.5 h-3.5" /> {job.location.province}, {job.location.district}
                        </span>
                        <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-bold">
                          {job.type}
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                            MT {job.salary}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                      {job.createdAt ? formatDistanceToNow(job.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Recentemente'}
                    </p>
                    <Link 
                      to={`/jobs/${job.id}`}
                      className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
                    >
                      Ver Detalhes <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-24 bg-white rounded-[48px] border-2 border-dashed border-gray-100">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Sem oportunidades encontradas</h3>
              <p className="text-gray-500 font-medium">Tenta ajustar os teus filtros ou pesquisa.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

// --- Shared Components ---
const ConfirmModal: React.FC<{
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}> = ({ show, title, message, onConfirm, onCancel, loading }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 font-medium mb-8">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'jobs', id), (d) => {
      if (d.exists()) {
        setJob({ id: d.id, ...d.data() } as Job);
      } else {
        toast.error('Vaga não encontrada.');
        navigate('/jobs');
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching job details:', error);
      toast.error('Erro ao carregar detalhes da vaga.');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const contactRecruiter = async () => {
    if (!profile) {
      toast.error('Faz login para contactar o recrutador.');
      return;
    }
    if (!job) return;
    if (profile.uid === job.authorId) {
      toast.error('Não podes contactar-te a ti mesmo.');
      return;
    }

    try {
      const chatId = [profile.uid, job.authorId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [profile.uid, job.authorId],
          lastMessage: `Olá, vi a tua vaga de "${job.title}" e estou interessado.`,
          lastMessageAt: serverTimestamp(),
          unreadCount: { [job.authorId]: 1, [profile.uid]: 0 },
          status: 'active',
          initiatorId: profile.uid,
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          content: `Olá, vi a tua vaga de "${job.title}" e estou interessado.`,
          senderId: profile.uid,
          createdAt: serverTimestamp(),
          read: false,
          type: 'text'
        });
      }

      navigate(`/chats/${chatId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${[profile.uid, job.authorId].sort().join('_')}`);
    }
  };

  const handleCloseJob = async () => {
    if (!job) return;
    setIsClosing(true);
    try {
      await updateDoc(doc(db, 'jobs', job.id), { status: 'closed' });
      toast.success('Vaga fechada com sucesso!');
      setShowConfirmClose(false);
    } catch (err) {
      console.error('Error closing job:', err);
      toast.error('Erro ao fechar vaga.');
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!job) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 font-bold hover:text-primary transition-colors mb-8"
      >
        <ChevronLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center text-primary">
                <Briefcase className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">{job.title}</h1>
                <p className="text-xl font-bold text-gray-600">{job.company}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                {job.type}
              </span>
              <p className="text-sm font-bold text-gray-400 mt-2">
                Publicado {job.createdAt ? formatDistanceToNow(job.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Recentemente'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Província</p>
              <p className="font-bold text-gray-900">{job.location.province}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Distrito</p>
              <p className="font-bold text-gray-900">{job.location.district}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Salário</p>
              <p className="font-bold text-gray-900">{job.salary || 'A combinar'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estado</p>
              <p className={cn("font-bold uppercase tracking-wider text-xs", job.status === 'open' ? "text-green-600" : "text-red-600")}>
                {job.status === 'open' ? 'Aberta' : 'Fechada'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Descrição da Vaga</h3>
          <div className="prose prose-gray max-w-none mb-12">
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">{job.description}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={contactRecruiter}
              className="flex-1 bg-primary text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
            >
              Contactar Recrutador
            </button>
            {profile?.uid === job.authorId && job.status === 'open' && (
              <button 
                onClick={() => setShowConfirmClose(true)}
                className="flex-1 bg-gray-100 text-gray-900 py-5 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Fechar Vaga
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal 
        show={showConfirmClose}
        title="Fechar Vaga?"
        message="Tens a certeza que queres fechar esta vaga? Ninguém mais poderá candidatar-se."
        onConfirm={handleCloseJob}
        onCancel={() => setShowConfirmClose(false)}
        loading={isClosing}
      />
    </div>
  );
};

// --- Communities Feature ---

interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  photoURL?: string;
  creatorId: string;
  createdAt: any;
  requiresApproval?: boolean;
}

// --- Communities Feature ---

const CommunityList: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newComm, setNewComm] = useState({ name: '', description: '', category: 'Geral', requiresApproval: false });
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'communities'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCommunities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Community)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching communities:', error);
      handleFirestoreError(error, OperationType.LIST, 'communities');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file, 800, 800, 0.7);
      setPendingPhoto(compressedBase64);
    } catch (err) {
      console.error('Error processing image:', err);
      toast.error('Erro ao processar a imagem.');
    }
  };

  const handleCreate = async () => {
    if (!newComm.name || !newComm.description || !profile) return;
    setIsCreating(true);
    try {
      let photoURL = pendingPhoto || null;

      const docRef = await addDoc(collection(db, 'communities'), {
        ...newComm,
        photoURL,
        memberCount: 1,
        creatorId: profile.uid,
        createdAt: serverTimestamp()
      });

      // Add creator as approved member
      await setDoc(doc(db, 'communities', docRef.id, 'members', profile.uid), {
        uid: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        status: 'approved',
        role: 'admin',
        joinedAt: serverTimestamp()
      });

      setShowCreate(false);
      setPendingPhoto(null);
      setNewComm({ name: '', description: '', category: 'Geral', requiresApproval: false });
      navigate(`/communities/${docRef.id}`);
    } catch (err) {
      console.error('Error creating community:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className={cn("max-w-4xl mx-auto", !hideHeader && "p-6 pb-24")}>
      {!hideHeader && (
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Comunidades</h1>
            <p className="text-gray-500 font-medium mt-1">Conecta-te com outros profissionais e clientes.</p>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-end mb-4 px-2">
           <button 
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Comunidade
          </button>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6">Criar Comunidade</h2>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="flex justify-center mb-6">
                  <label className="relative cursor-pointer group">
                    <div className="w-24 h-24 rounded-3xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 group-hover:border-primary/50 transition-all">
                      {pendingPhoto ? (
                        <img src={pendingPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg">
                      <Plus className="w-4 h-4" />
                    </div>
                  </label>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Nome</label>
                  <input 
                    type="text"
                    value={newComm.name}
                    onChange={(e) => setNewComm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-medium"
                    placeholder="Ex: Designers locais"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Categoria</label>
                  <select 
                    value={newComm.category}
                    onChange={(e) => setNewComm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-medium"
                  >
                    <option value="Geral">Geral</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Artes">Artes</option>
                    <option value="Negócios">Negócios</option>
                    <option value="Educação">Educação</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Descrição</label>
                  <textarea 
                    value={newComm.description}
                    onChange={(e) => setNewComm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-medium h-24 resize-none"
                    placeholder="Sobre o que é esta comunidade?"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-black text-gray-900">Requer Aprovação</p>
                    <p className="text-[10px] text-gray-400 font-bold">Administrador aprova novos membros</p>
                  </div>
                  <button 
                    onClick={() => setNewComm(prev => ({ ...prev, requiresApproval: !prev.requiresApproval }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      newComm.requiresApproval ? "bg-primary" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      newComm.requiresApproval ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Criar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {communities.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Ainda não existem comunidades.</p>
            <button className="mt-4 text-primary font-black text-sm">Sê o primeiro a criar uma!</button>
          </div>
        ) : (
          communities.map((community) => (
            <Link 
              key={community.id} 
              to={`/communities/${community.id}`}
              className="bg-white p-6 rounded-[32px] border border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  {community.photoURL ? (
                    <img src={community.photoURL} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                  ) : (
                    <Users className="w-8 h-8" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-900 text-lg truncate">{community.name}</h3>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mt-0.5">{community.category}</p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2 font-medium leading-relaxed">
                    {community.description}
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-bold">{community.memberCount} membros</span>
                    </div>
                    {community.creatorId === profile?.uid && (
                      <div className="flex items-center gap-1.5 text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                        <Shield className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Admin</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

const CommunityChat: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { profile, loading: authLoading } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [membership, setMembership] = useState<any | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!communityId) return;

    const unsubscribeComm = onSnapshot(doc(db, 'communities', communityId), (d) => {
      if (d.exists()) setCommunity({ id: d.id, ...d.data() } as Community);
      else {
        toast.error('Comunidade não encontrada.');
        navigate('/communities');
      }
    }, (err) => {
      console.error('Error fetching community:', err);
      toast.error('Erro ao carregar a comunidade. Verifica as tuas permissões.');
      navigate('/communities');
    });

    return () => unsubscribeComm();
  }, [communityId]);

  useEffect(() => {
    if (!communityId || !profile) return;

    const unsubscribeMembership = onSnapshot(doc(db, 'communities', communityId, 'members', profile.uid), (d) => {
      if (d.exists()) setMembership(d.data());
      else setMembership(null);
    }, (err) => {
      console.error('Error fetching membership:', err);
    });

    return () => unsubscribeMembership();
  }, [communityId, profile]);

  useEffect(() => {
    if (!communityId || !membership || membership.status !== 'approved') return;

    const q = query(
      collection(db, 'communities', communityId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.error('Error fetching community messages:', err);
    });

    return () => unsubscribeMessages();
  }, [communityId, membership]);

  useEffect(() => {
    if (!communityId || !profile || community?.creatorId !== profile.uid) return;

    const q = query(collection(db, 'communities', communityId, 'members'), where('status', '==', 'pending'));
    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      setPendingRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Error fetching pending requests:', err);
    });

    return () => unsubscribeRequests();
  }, [communityId, profile, community]);

  const handleJoin = async () => {
    if (!communityId || !profile || !community) return;
    try {
      const status = community.requiresApproval ? 'pending' : 'approved';
      await setDoc(doc(db, 'communities', communityId, 'members', profile.uid), {
        uid: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        status,
        role: 'member',
        joinedAt: serverTimestamp()
      });
      if (status === 'approved') {
        await updateDoc(doc(db, 'communities', communityId), {
          memberCount: increment(1)
        });
      }
    } catch (err) {
      console.error('Error joining community:', err);
    }
  };

  const approveMember = async (memberId: string) => {
    if (!communityId) return;
    try {
      await updateDoc(doc(db, 'communities', communityId, 'members', memberId), {
        status: 'approved'
      });
      await updateDoc(doc(db, 'communities', communityId), {
        memberCount: increment(1)
      });
    } catch (err) {
      console.error('Error approving member:', err);
    }
  };

  const rejectMember = async (memberId: string) => {
    if (!communityId) return;
    try {
      await deleteDoc(doc(db, 'communities', communityId, 'members', memberId));
    } catch (err) {
      console.error('Error rejecting member:', err);
    }
  };

  const sendMessage = async (contentOverride?: string, type: 'text' | 'audio' | 'image' = 'text', audioURL?: string) => {
    if (!communityId || !profile) return;
    
    let imageURL = null;
    let content = contentOverride || newMessage.trim();
    let finalType = type;

    if (pendingImage && !audioURL) {
      imageURL = pendingImage;
      finalType = 'image';
      setPendingImage(null);
    }

    if (!content && !imageURL && !audioURL) {
      setIsSending(false);
      return;
    }

    setIsSending(true);
    const timeoutId = setTimeout(() => {
      if (isSending) {
        setIsSending(false);
        toast.error('O envio está a demorar mais do que o esperado. Verifica a tua ligação.');
      }
    }, 30000);

    try {
      await addDoc(collection(db, 'communities', communityId, 'messages'), {
        senderId: profile.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL,
        content: content || (finalType === 'image' ? 'Imagem' : (finalType === 'audio' ? 'Mensagem de voz' : '')),
        imageURL: imageURL || null,
        audioURL: audioURL || null,
        type: finalType,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error sending community message:', error);
      clearTimeout(timeoutId);
    } finally {
      setIsSending(false);
    }
  };

  const handleAudioStop = async (blob: Blob) => {
    if (!profile || !communityId) return;
    setIsSending(true);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await sendMessage('Mensagem de voz', 'audio', base64Audio);
    } catch (err) {
      console.error('Error processing audio:', err);
      toast.error('Erro ao processar o áudio.');
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !communityId) return;
    try {
      const compressedBase64 = await compressImage(file, 1200, 1200, 0.7);
      setPendingImage(compressedBase64);
    } catch (err) {
      console.error('Error processing image:', err);
      toast.error('Erro ao processar a imagem.');
    } finally {
      e.target.value = '';
    }
  };

  const deleteCommunity = async () => {
    if (!communityId || !community || community.creatorId !== profile?.uid) return;
    
    try {
      await deleteDoc(doc(db, 'communities', communityId));
      navigate('/chats?tab=communities');
    } catch (err) {
      console.error('Error deleting community:', err);
    }
  };

  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
    if (!communityId || !profile) return;
    
    try {
      const msgRef = doc(db, 'communities', communityId, 'messages', messageId);
      if (forEveryone) {
        if (!isAdmin && messages.find(m => m.id === messageId)?.senderId !== profile.uid) return;
        
        await updateDoc(msgRef, {
          deletedForAll: true,
          content: '🚫 Esta mensagem foi apagada',
          imageURL: null,
          audioURL: null,
          type: 'text'
        });
      } else {
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
          const deletedFor = msg.deletedFor || [];
          await updateDoc(msgRef, {
            deletedFor: [...deletedFor, profile.uid]
          });
        }
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      toast.error('Erro ao apagar mensagem.');
    }
  };

  if (authLoading || !community) return <LoadingScreen />;

  const isAdmin = community.creatorId === profile?.uid;
  const isApproved = membership?.status === 'approved';
  const isPending = membership?.status === 'pending';

  if (!isApproved) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] bg-white max-w-4xl mx-auto border-x border-gray-100">
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center gap-4">
          <Link to="/chats?tab=communities" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-lg text-gray-900 truncate">{community.name}</h3>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-32 h-32 rounded-[40px] bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-xl shadow-primary/5">
            {community.photoURL ? (
              <img src={community.photoURL} className="w-full h-full object-cover rounded-[40px]" referrerPolicy="no-referrer" />
            ) : (
              <Users className="w-16 h-16" />
            )}
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">{community.name}</h2>
          <p className="text-primary font-black uppercase tracking-widest text-xs mb-4">{community.category}</p>
          <p className="text-gray-500 font-medium max-w-md mb-8 leading-relaxed">
            {community.description}
          </p>
          
          <div className="flex items-center gap-6 mb-10">
            <div className="text-center">
              <p className="text-2xl font-black text-gray-900">{community.memberCount}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membros</p>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-black text-gray-900">{community.requiresApproval ? 'Sim' : 'Não'}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aprovação</p>
            </div>
          </div>

          {isPending ? (
            <div className="bg-yellow-50 text-yellow-700 px-8 py-4 rounded-2xl font-black flex items-center gap-3 border border-yellow-100">
              <Loader2 className="w-5 h-5 animate-spin" />
              Aguardando aprovação do administrador...
            </div>
          ) : (
            <button 
              onClick={handleJoin}
              className="w-full max-w-xs py-5 bg-primary text-white rounded-[24px] font-black text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Plus className="w-6 h-6" />
              {community.requiresApproval ? 'Pedir para Entrar' : 'Entrar na Comunidade'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white max-w-4xl mx-auto border-x border-gray-100">
      <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center gap-4 relative">
        <Link to="/chats?tab=communities" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {community.photoURL ? (
            <img src={community.photoURL} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
          ) : (
            <Users className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-lg text-gray-900 leading-none truncate">{community.name}</h3>
          <p className="text-xs text-gray-400 mt-1 font-bold">{community.memberCount} membros</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && pendingRequests.length > 0 && (
            <button 
              onClick={() => setShowRequests(true)}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-primary"
            >
              <Users className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {pendingRequests.length}
              </span>
            </button>
          )}
          {isAdmin && (
            <div className="relative">
              <button 
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {showAdminMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowAdminMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden"
                    >
                      <button 
                        onClick={deleteCommunity}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar Comunidade
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showRequests && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">Pedidos de Adesão</h2>
                <button onClick={() => setShowRequests(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {pendingRequests.length === 0 ? (
                  <p className="text-center text-gray-400 font-bold py-8">Nenhum pedido pendente.</p>
                ) : (
                  pendingRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <img src={req.photoURL || `https://ui-avatars.com/api/?name=${req.displayName}`} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 truncate">{req.displayName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Membro</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => rejectMember(req.id)}
                          className="p-2 bg-red-100 text-red-500 rounded-xl hover:bg-red-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => approveMember(req.id)}
                          className="p-2 bg-green-100 text-green-500 rounded-xl hover:bg-green-200 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-6 space-y-4" onClick={() => setActiveMessageMenu(null)}>
        {messages.filter(m => !m.deletedFor?.includes(profile?.uid || '')).map((msg) => {
          const isMe = msg.senderId === profile?.uid;
          return (
            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
              {!isMe && (
                <Link to={`/profile/${msg.senderId}`} className="text-[10px] font-black text-gray-400 mb-1 ml-11 uppercase tracking-widest hover:text-primary transition-colors">
                  {msg.senderName}
                </Link>
              )}
              <div className={cn("flex items-end gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && (
                  <Link to={`/profile/${msg.senderId}`}>
                    <img 
                      src={msg.senderPhoto || `https://ui-avatars.com/api/?name=${msg.senderName}`} 
                      className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-primary/20 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                )}
                <div className={cn(
                  "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm relative group/msg",
                  isMe ? "bg-blue-600 text-white rounded-tr-none shadow-md" : "bg-gray-100 text-gray-900 rounded-tl-none"
                )}>
                  {msg.deletedForAll ? (
                    <p className="italic opacity-70">{msg.content}</p>
                  ) : (
                    <>
                      {msg.imageURL && (
                        <img 
                          src={msg.imageURL} 
                          className="rounded-xl max-w-full h-auto mb-2 cursor-pointer hover:opacity-95 transition-opacity" 
                          onClick={() => window.open(msg.imageURL, '_blank')}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {msg.audioURL && (
                        <div className="mb-2">
                          <AudioPlayer src={msg.audioURL} isMe={isMe} />
                        </div>
                      )}
                      {msg.content && (msg.content !== 'Imagem' && msg.content !== 'Mensagem de voz' || (!msg.imageURL && !msg.audioURL)) && msg.content}
                    </>
                  )}
                  
                  {/* Message Menu Button */}
                  {(isAdmin || isMe) && !msg.deletedForAll && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                      }}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover/msg:opacity-100 transition-all hover:bg-black/5",
                        isMe ? "-left-10 text-gray-400" : "-right-10 text-gray-400"
                      )}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}

                  {/* Message Menu Dropdown */}
                  {activeMessageMenu === msg.id && (
                    <div 
                      className={cn(
                        "absolute top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10",
                        isMe ? "right-0" : "left-0"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          deleteMessage(msg.id, false);
                          setActiveMessageMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Apagar para mim
                      </button>
                      {(isMe || isAdmin) && !msg.deletedForAll && (
                        <button
                          onClick={() => {
                            deleteMessage(msg.id, true);
                            setActiveMessageMenu(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Apagar para todos
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-6 border-t border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto space-y-4">
          {pendingImage && (
            <div className="relative inline-block group">
              <img src={pendingImage} className="w-24 h-24 object-cover rounded-2xl border-2 border-primary/20 shadow-md" />
              <button 
                onClick={() => setPendingImage(null)}
                className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full shadow-lg border border-gray-100 hover:scale-110 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <label className="p-3 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all cursor-pointer">
                <Camera className="w-6 h-6" />
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={isSending} />
              </label>
              <label className="p-3 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all cursor-pointer">
                <ImageIcon className="w-6 h-6" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSending} />
              </label>
              <AudioRecorder onStop={handleAudioStop} />
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={pendingImage ? "Adiciona uma legenda..." : "Fala com a comunidade..."}
                className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
            </div>

            <button 
              onClick={() => sendMessage()}
              disabled={isSending || (!newMessage.trim() && !pendingImage)}
              className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Notifications: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    // Update lastCheckedNotifications
    const updateLastChecked = async () => {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          lastCheckedNotifications: serverTimestamp()
        });
      } catch (err) {
        console.error('Error updating lastCheckedNotifications:', err);
      }
    };
    updateLastChecked();

    const q = query(
      collection(db, 'jobs'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchingJobs = snapshot.docs.filter(d => {
        const job = d.data() as Job;
        const matchesInterest = profile.lookingFor && (job.title.toLowerCase().includes(profile.lookingFor.toLowerCase()) || job.description.toLowerCase().includes(profile.lookingFor.toLowerCase()));
        const matchesLocation = profile.location?.province && job.location?.province === profile.location.province;
        return matchesInterest || matchesLocation;
      }).map(d => ({ id: d.id, ...d.data() } as Job));
      
      setNotifications(matchingJobs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      toast.error('Erro ao carregar notificações.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-brand-bg pt-20 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-brand-ink">Notificações</h1>
            <p className="text-sm font-medium text-brand-ink/60 mt-1">Vagas que combinam com o teu perfil</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Bell className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-brand-gray/10 shadow-sm">
              <Bell className="w-12 h-12 text-brand-ink/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-brand-ink">Sem notificações</h3>
              <p className="text-sm text-brand-ink/60 mt-2">Avisaremos quando houver novas vagas para ti.</p>
            </div>
          ) : (
            notifications.map(job => (
              <Link 
                key={job.id} 
                to={`/jobs/${job.id}`}
                className="block bg-white p-6 rounded-3xl border border-brand-gray/10 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-brand-ink">{job.title}</h3>
                    <p className="text-sm font-medium text-primary">{job.company}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold whitespace-nowrap">
                    Nova Vaga
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="flex items-center gap-1 text-xs font-bold text-brand-ink/60 bg-brand-bg px-3 py-1.5 rounded-full">
                    <MapPin className="w-3 h-3" />
                    {job.location.district}, {job.location.province}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-brand-ink/60 bg-brand-bg px-3 py-1.5 rounded-full">
                    <Briefcase className="w-3 h-3" />
                    {job.type}
                  </span>
                </div>
                
                <p className="text-sm text-brand-ink/70 line-clamp-2">{job.description}</p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface ThemeContextType {
  theme: 'blue' | 'yellow';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'blue' | 'yellow'>('blue');

  const toggleTheme = () => {
    setTheme(prev => prev === 'blue' ? 'yellow' : 'blue');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'yellow') {
      root.style.setProperty('--primary', '#EAB308'); // yellow-600
      root.style.setProperty('--primary-foreground', '#000000');
    } else {
      root.style.setProperty('--primary', '#2563EB'); // blue-600
      root.style.setProperty('--primary-foreground', '#FFFFFF');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const BackButtonHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const backListener = App.addListener('backButton', () => {
      if (location.pathname === '/') {
        App.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [location.pathname, navigate]);

  return null;
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-center" richColors />
          <Router>
            <BackButtonHandler />
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<ServiceList />} />
                <Route path="/service/:id" element={<ServiceDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/communities" element={<CommunityList />} />
                <Route path="/communities/:communityId" element={<CommunityChat />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetails />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/chats" element={<ChatList />} />
                <Route path="/chats/:chatId" element={<ChatWindow />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/create" element={<CreateService />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/education" element={<EducationList />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
