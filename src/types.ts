import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
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
  isBanned?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  suspensionUntil?: any;
  favorites?: { services: string[]; providers: string[] };
  viewHistory?: { id: string; type: 'service' | 'provider'; timestamp: any }[];
}

export interface Announcement {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  photoURL?: string;
  createdAt: any;
}

export interface Service {
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

export interface Order {
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

export interface Job {
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

export interface Review {
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

export interface Education {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: any;
}

export interface Message {
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

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'message' | 'interest' | 'review' | 'promotion' | 'system';
  link?: string;
  read: boolean;
  createdAt: any;
}

export interface Report {
  id: string;
  reportedId: string;
  reportedType: 'user' | 'service' | 'message' | 'announcement';
  reporterId: string;
  type: 'spam' | 'inappropriate' | 'harassment' | 'fraud' | 'fake_review' | 'fake_profile' | 'technical' | 'other';
  description?: string;
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  createdAt: any;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  photoURL?: string;
  bannerURL?: string;
  creatorId: string;
  creatorName: string;
  members: string[];
  memberCount: number;
  createdAt: any;
  isPrivate?: boolean;
  rules?: string;
  requiresApproval?: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  unreadCount?: { [uid: string]: number };
  status: 'pending' | 'accepted' | 'rejected';
  initiatorId: string;
  otherProfile?: UserProfile;
}

export interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (uid: string) => Promise<void>;
  showLoginPrompt: boolean;
  setShowLoginPrompt: (show: boolean) => void;
  toggleFavorite: (id: string, type: 'services' | 'providers') => Promise<void>;
}

export interface ThemeContextType {
  theme: 'blue' | 'yellow';
  setTheme: (theme: 'blue' | 'yellow') => void;
  toggleTheme: () => void;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
