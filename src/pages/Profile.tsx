import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  MapPin, 
  CheckCircle, 
  Ban, 
  ImageIcon, 
  Loader2, 
  Lock, 
  MessageCircle, 
  Clock, 
  UserPlus, 
  Briefcase, 
  Instagram, 
  Facebook, 
  Twitter, 
  Trash2, 
  Star,
  X,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  doc, 
  onSnapshot, 
  query, 
  collection, 
  where, 
  orderBy, 
  deleteDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  getDoc,
  addDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { LoginPage } from './LoginPage';
import { ServiceCard } from '../components/ServiceCard';
import { ReviewList } from '../components/ReviewList';
import { AddServiceModal } from '../components/AddServiceModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReportButton } from '../components/ReportButton';
import { ImageUpload } from '../components/ImageUpload';
import { CreateJobModal } from '../components/CreateJobModal';
import { JobCard } from '../components/JobCard';
import { cn, handleFirestoreError, safeToDate } from '../lib/utils';
import { OperationType, UserProfile, Service, Announcement } from '../types';
import { ValidationService } from '../services/validationService';
import { toast } from 'sonner';
import { MOZAMBIQUE_LOCATIONS } from '../constants';

export const Profile = () => {
  const { id: paramId } = useParams();
  const { profile: currentUserProfile, refreshProfile, setShowLoginPrompt, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const id = paramId || currentUserProfile?.uid;
  const isOwnProfile = currentUserProfile?.uid === id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [existingChat, setExistingChat] = useState<any>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [workExampleToDelete, setWorkExampleToDelete] = useState<number | null>(null);

  const toggleFollow = async () => {
    if (!currentUserProfile || !profile || isFollowLoading) {
      setShowLoginPrompt(true);
      return;
    }
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
    if (!currentUserProfile) {
      setShowLoginPrompt(true);
      return;
    }
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

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'jobs'), where('authorId', '==', id), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'jobs'));
    return () => unsubscribe();
  }, [id]);

  const handleBlockUser = async (targetId: string, isBlocked: boolean) => {
    if (!currentUserProfile) {
      setShowLoginPrompt(true);
      return;
    }
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

  if (authLoading) return <LoadingScreen />;

  if (!currentUserProfile && !paramId) return <LoginPage />;

  if (!profile) return <div className="min-h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>;

  if (!isOwnProfile && !profile.isComplete && currentUserProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-brand-gray rounded-[32px] flex items-center justify-center">
          <Lock className="w-10 h-10 text-brand-ink/20" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">Perfil em Construção</h2>
          <p className="text-brand-ink/40 font-medium max-w-xs mx-auto">
            Este utilizador ainda não completou o seu perfil. Volta mais tarde para ver os seus serviços e portfólio.
          </p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-brand-ink text-white rounded-2xl font-bold hover:bg-brand-ink/90 transition-all"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-12">
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
                        onClick={() => navigate('/orders')} 
                        className="px-4 md:px-8 py-3 md:py-4 bg-brand-ink text-white rounded-2xl text-xs md:text-sm font-bold hover:bg-brand-ink/90 transition-all shadow-xl shadow-brand-ink/20 flex items-center space-x-2"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Meus Pedidos</span>
                      </button>
                      <button 
                        onClick={() => setIsAddingJob(true)} 
                        className="px-4 md:px-8 py-3 md:py-4 bg-primary text-white rounded-2xl text-xs md:text-sm font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center space-x-2"
                      >
                        <Briefcase className="w-4 h-4" />
                        <span>Criar Emprego</span>
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
                        onClick={() => setShowLoginPrompt(true)}
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
                            <MessageCircle className="w-4 h-4 text-primary" />
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

      {/* Jobs */}
      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black tracking-tighter">Oportunidades de Emprego</h2>
          {isOwnProfile && (
            <button 
              onClick={() => setIsAddingJob(true)}
              className="flex items-center space-x-2 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> <span>Novo Emprego</span>
            </button>
          )}
        </div>
        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-brand-gray">
            <Briefcase className="w-12 h-12 text-brand-ink/20 mx-auto mb-4" />
            <p className="text-brand-ink/60">Nenhuma vaga de emprego publicada ainda.</p>
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
                {isOwnProfile && (
                  <button 
                    onClick={() => setWorkExampleToDelete(idx)}
                    className="absolute top-2 right-2 p-2 bg-red-50 text-red-600 rounded-xl transition-all hover:bg-red-100 shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
        {isAddingJob && (
          <CreateJobModal onClose={() => setIsAddingJob(false)} />
        )}

      {isEditing && (
          <EditProfileModal onClose={() => setIsEditing(false)} />
        )}
      </AnimatePresence>
      <ConfirmModal 
        show={workExampleToDelete !== null}
        title="Remover Exemplo?"
        message="Queres remover este exemplo de trabalho?"
        onConfirm={async () => {
          if (workExampleToDelete === null) return;
          try {
            const newExamples = profile.workExamples?.filter((_, i) => i !== workExampleToDelete);
            await updateDoc(doc(db, 'users', profile.uid), {
              workExamples: newExamples
            });
            toast.success('Exemplo removido.');
          } catch (err) {
            console.error('Error removing work example:', err);
            toast.error('Erro ao remover exemplo.');
          } finally {
            setWorkExampleToDelete(null);
          }
        }}
        onCancel={() => setWorkExampleToDelete(null)}
      />
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
      province: profile?.location?.province || Object.keys(MOZAMBIQUE_LOCATIONS)[0], 
      district: profile?.location?.district || MOZAMBIQUE_LOCATIONS[Object.keys(MOZAMBIQUE_LOCATIONS)[0]][0] 
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

    // Internal Validation Algorithm
    const nameVal = ValidationService.isValidData('name', formData.displayName);
    if (!nameVal.valid) {
      toast.error(nameVal.error);
      return;
    }

    const handleVal = ValidationService.isValidData('handle', formData.handle);
    if (!handleVal.valid) {
      toast.error(handleVal.error);
      return;
    }

    if (formData.bio) {
      const bioVal = ValidationService.validateContent(formData.bio, 5);
      if (!bioVal.valid) {
        toast.error(`Bio: ${bioVal.error}`);
        return;
      }
    }

    if (formData.phoneNumber) {
      const phoneVal = ValidationService.isValidData('phone', formData.phoneNumber);
      if (!phoneVal.valid) {
        toast.error(phoneVal.error);
        return;
      }
    }

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

      const isComplete = !!(
        formData.displayName && 
        formData.handle && 
        formData.bio && 
        formData.photoURL && 
        formData.location.province && 
        formData.location.district
      );

      const { phoneNumber, ...publicData } = formData;
      const userRef = doc(db, 'users', profile.uid);
      const privateRef = doc(db, 'users_private', profile.uid);

      await Promise.all([
        setDoc(userRef, {
          ...publicData,
          skills: formData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
          isComplete,
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
                onChange={e => {
                  const province = e.target.value;
                  const districts = MOZAMBIQUE_LOCATIONS[province] || [];
                  setFormData({
                    ...formData, 
                    location: { 
                      province, 
                      district: districts[0] || '' 
                    }
                  });
                }}
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
                {(MOZAMBIQUE_LOCATIONS[formData.location.province] || []).map(d => (
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
