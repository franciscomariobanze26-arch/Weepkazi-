import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, BookOpen, Users, Shield, Trash2, LogOut, Settings as SettingsIcon, X, Camera, Plus, Loader2, Image as ImageIcon, UserMinus, Check, Send, MoreVertical 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  doc, onSnapshot, query, collection, orderBy, limit, where, setDoc, updateDoc, increment, addDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { cn, handleFirestoreError, safeToDate } from '../lib/utils';
import { OperationType, Community } from '../types';
import { toast } from 'sonner';
import { compressImage } from '../lib/imageUtils';
import { ValidationService } from '../services/validationService';
import { AudioPlayer } from '../components/AudioPlayer';
import { AudioRecorder } from '../components/AudioRecorder';
import { ConfirmModal } from '../components/ConfirmModal';
import { TermsModal } from '../components/TermsModal';

export const CommunityChat: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { profile, loading: authLoading, setShowLoginPrompt } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [membership, setMembership] = useState<any | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isEditingCommunity, setIsEditingCommunity] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [editCommunityData, setEditCommunityData] = useState({ name: '', description: '', photoURL: '', rules: '' });
  const [messageToDelete, setMessageToDelete] = useState<{ id: string, forEveryone: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isAdmin = community?.creatorId === profile?.uid;
  const isApproved = membership?.status === 'approved';
  const isPending = membership?.status === 'pending';

  // Offline Persistence: Load from localStorage on mount
  useEffect(() => {
    if (!communityId) return;
    const cached = localStorage.getItem(`community_messages_${communityId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setMessages(parsed);
      } catch (e) {
        console.error('Error parsing cached community messages', e);
      }
    }
  }, [communityId]);

  // Offline Persistence: Save to localStorage when messages update
  useEffect(() => {
    if (!communityId || messages.length === 0) return;
    localStorage.setItem(`community_messages_${communityId}`, JSON.stringify(messages.slice(-100)));
  }, [communityId, messages]);

  useEffect(() => {
    if (!communityId) return;

    const unsubscribeComm = onSnapshot(doc(db, 'communities', communityId), (d) => {
      if (d.exists()) {
        const data = d.data();
        const comm = { id: d.id, ...data } as Community;
        setCommunity(comm);
        setEditCommunityData({
          name: comm.name || '',
          description: comm.description || '',
          photoURL: comm.photoURL || '',
          rules: comm.rules || ''
        });
      } else {
        toast.error('Comunidade não encontrada.');
        navigate('/communities');
      }
    }, (err) => {
      console.error('Error fetching community:', err);
      toast.error('Erro ao carregar a comunidade. Verifica as tuas permissões.');
      navigate('/communities');
    });

    return () => unsubscribeComm();
  }, [communityId, navigate]);

  useEffect(() => {
    if (!communityId || !profile) return;

    const unsubscribeMembership = onSnapshot(doc(db, 'communities', communityId, 'members', profile.uid), (d) => {
      if (d.exists()) setMembership(d.data());
      else setMembership(null);
    }, (err) => handleFirestoreError(err, OperationType.GET, `communities/${communityId}/members/${profile.uid}`));

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
      const newMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      setMessages(prev => {
        const merged = [...prev];
        newMessages.forEach(msg => {
          const index = merged.findIndex(m => m.id === msg.id);
          if (index === -1) {
            merged.push(msg);
          } else {
            merged[index] = msg;
          }
        });
        return merged.sort((a, b) => {
          const dateA = safeToDate(a.createdAt).getTime();
          const dateB = safeToDate(b.createdAt).getTime();
          return dateA - dateB;
        });
      });

      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => handleFirestoreError(err, OperationType.GET, `communities/${communityId}/messages`));

    // Fetch all members
    const membersQ = query(collection(db, 'communities', communityId, 'members'), where('status', '==', 'approved'));
    const unsubscribeMembers = onSnapshot(membersQ, (snapshot) => {
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `communities/${communityId}/members`));

    return () => {
      unsubscribeMessages();
      unsubscribeMembers();
    };
  }, [communityId, membership]);

  useEffect(() => {
    if (!communityId || !profile || community?.creatorId !== profile.uid) return;

    const q = query(collection(db, 'communities', communityId, 'members'), where('status', '==', 'pending'));
    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      setPendingRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `communities/${communityId}/members`));

    return () => unsubscribeRequests();
  }, [communityId, profile, community]);

  const handleJoin = async () => {
    if (!profile) {
      setShowLoginPrompt(true);
      return;
    }
    if (!communityId || !community) return;
    try {
      const status = community.requiresApproval ? 'pending' : 'approved';
      await setDoc(doc(db, 'communities', communityId, 'members', profile.uid), {
        uid: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL || null,
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

    if (finalType === 'text' && content.trim()) {
      const msgVal = ValidationService.validateContent(content, 1);
      if (!msgVal.valid) {
        toast.error(`Mensagem: ${msgVal.error}`);
        setIsSending(false);
        return;
      }
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
        senderPhoto: profile.photoURL || null,
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
  
  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    try {
      const compressedBase64 = await compressImage(file, 800, 800, 0.7);
      setEditCommunityData({ ...editCommunityData, photoURL: compressedBase64 });
    } catch (err) {
      console.error('Error processing image:', err);
      toast.error('Erro ao processar a imagem.');
    }
  };

  const handleRemoveMember = async () => {
    if (!communityId || !isAdmin || !memberToRemove || memberToRemove === profile?.uid) return;
    
    try {
      await deleteDoc(doc(db, 'communities', communityId, 'members', memberToRemove));
      await updateDoc(doc(db, 'communities', communityId), {
        memberCount: increment(-1)
      });
      toast.success('Membro removido com sucesso.');
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Erro ao remover membro.');
    } finally {
      setMemberToRemove(null);
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

  const handleUpdateCommunity = async () => {
    if (!communityId || !isAdmin) return;
    if (!editCommunityData.name.trim() || !editCommunityData.description.trim()) {
      toast.error('Nome e descrição são obrigatórios.');
      return;
    }
    try {
      await updateDoc(doc(db, 'communities', communityId), {
        name: editCommunityData.name.trim(),
        description: editCommunityData.description.trim(),
        photoURL: editCommunityData.photoURL.trim() || null,
        rules: editCommunityData.rules.trim() || null
      });
      toast.success('Comunidade atualizada com sucesso.');
      setIsEditingCommunity(false);
    } catch (err) {
      console.error('Error updating community:', err);
      toast.error('Erro ao atualizar comunidade.');
    }
  };

  const handleLeaveCommunity = async () => {
    if (!communityId || !profile) return;
    try {
      await deleteDoc(doc(db, 'communities', communityId, 'members', profile.uid));
      await updateDoc(doc(db, 'communities', communityId), {
        memberCount: increment(-1)
      });
      toast.success('Saíste da comunidade.');
      navigate('/chats?tab=communities');
    } catch (err) {
      console.error('Error leaving community:', err);
      toast.error('Erro ao sair da comunidade.');
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

  if (!isApproved) {
    return (
      <div className="flex flex-col fixed inset-0 bg-white z-[60] md:relative md:inset-auto md:h-[calc(100vh-64px)] md:max-w-4xl md:mx-auto md:border-x md:border-gray-100">
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center gap-4">
          <Link to="/chats?tab=communities" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-lg text-gray-900 truncate">{community.name}</h3>
          </div>
          {community.rules && (
            <button 
              onClick={() => setShowRules(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-primary"
              title="Ver Regras"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
          <div className="w-32 h-32 rounded-[40px] bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-xl shadow-primary/5 relative">
            {community.photoURL ? (
              <img src={community.photoURL} className="w-full h-full object-cover rounded-[40px]" referrerPolicy="no-referrer" alt={community.name} />
            ) : (
              <Users className="w-16 h-16" />
            )}
            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-2xl shadow-lg">
              <Shield className="w-6 h-6 text-primary" />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 mb-2">{community.name}</h2>
          <p className="text-primary font-black uppercase tracking-widest text-[10px] mb-4 bg-primary/5 px-3 py-1 rounded-full">{community.category}</p>
          
          <p className="text-gray-500 font-medium max-w-md mb-8 leading-relaxed">
            {community.description}
          </p>
          
          <div className="flex flex-col items-center gap-6 mb-10 w-full max-w-sm">
            <div className="flex items-center justify-center -space-x-3">
              {members.slice(0, 5).map((m, i) => (
                <img 
                  key={m.id}
                  src={m.photoURL || `https://ui-avatars.com/api/?name=${m.displayName}`}
                  className="w-10 h-10 rounded-full border-4 border-white object-cover shadow-sm"
                  style={{ zIndex: 5 - i }}
                  referrerPolicy="no-referrer"
                  alt={m.displayName}
                />
              ))}
              {members.length > 5 && (
                <div className="w-10 h-10 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 z-0 shadow-sm">
                  +{members.length - 5}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-100">
                <p className="text-2xl font-black text-gray-900">{members.length}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membros</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-100">
                <p className="text-2xl font-black text-gray-900">{community.requiresApproval ? 'Sim' : 'Não'}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aprovação</p>
              </div>
            </div>
          </div>

          {isPending ? (
            <div className="w-full max-w-xs bg-yellow-50 text-yellow-700 p-6 rounded-[32px] font-black text-sm flex flex-col items-center gap-3 border border-yellow-100 shadow-lg shadow-yellow-500/5">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              Aguardando aprovação do administrador...
            </div>
          ) : (
            <button 
              onClick={handleJoin}
              className="w-full max-w-xs py-5 bg-primary text-white rounded-[32px] font-black text-lg shadow-2xl shadow-primary/30 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3"
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
    <div className="flex flex-col fixed inset-0 bg-white z-[60] md:relative md:inset-auto md:h-[calc(100vh-64px)] md:max-w-4xl md:mx-auto md:border-x md:border-gray-100">
      <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center gap-4 relative">
        <Link to="/chats?tab=communities" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {community.photoURL ? (
            <img src={community.photoURL} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" alt={community.name} />
          ) : (
            <Users className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowMembers(true)}>
          <h3 className="font-black text-lg text-gray-900 leading-none truncate">{community.name}</h3>
          <p className="text-xs text-gray-400 mt-1 font-bold">{members.length} membros</p>
        </div>
        <div className="flex items-center gap-2">
          {community.rules && (
            <button 
              onClick={() => setShowRules(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-primary"
              title="Ver Regras"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}
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
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => {
                            setIsEditingCommunity(true);
                            setShowAdminMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <SettingsIcon className="w-4 h-4" />
                          Editar Comunidade
                        </button>
                        <button 
                          onClick={deleteCommunity}
                          className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar Comunidade
                        </button>
                      </>
                    )}
                    {!isAdmin && (
                      <button 
                        onClick={handleLeaveCommunity}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair da Comunidade
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">Regras da Comunidade</h3>
                <button onClick={() => setShowRules(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                {community.rules}
              </div>
              <button 
                onClick={() => setShowRules(false)}
                className="w-full mt-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingCommunity && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">Editar Comunidade</h3>
                <button onClick={() => setIsEditingCommunity(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Foto da Comunidade</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200">
                      {editCommunityData.photoURL ? (
                        <img src={editCommunityData.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Community" />
                      ) : (
                        <Users className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <label className="flex-1">
                      <div className="bg-brand-bg text-brand-ink px-4 py-3 rounded-xl text-xs font-black cursor-pointer hover:bg-brand-gray transition-colors text-center border border-brand-gray">
                        Alterar Foto
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleEditPhotoUpload} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nome</label>
                  <input 
                    type="text"
                    value={editCommunityData.name}
                    onChange={(e) => setEditCommunityData({ ...editCommunityData, name: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição</label>
                  <textarea 
                    value={editCommunityData.description}
                    onChange={(e) => setEditCommunityData({ ...editCommunityData, description: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Regras (Opcional)</label>
                  <textarea 
                    value={editCommunityData.rules}
                    onChange={(e) => setEditCommunityData({ ...editCommunityData, rules: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium min-h-[100px]"
                    placeholder="Regras da comunidade..."
                  />
                </div>
                <button 
                  onClick={handleUpdateCommunity}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Guardar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMembers && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Membros</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{members.length} participantes</p>
                </div>
                <button onClick={() => setShowMembers(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {members.map((member) => (
                  <Link 
                    key={member.id} 
                    to={`/profile/${member.uid}`}
                    onClick={() => setShowMembers(false)}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                  >
                    <img 
                      src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}`} 
                      className="w-12 h-12 rounded-full object-cover" 
                      referrerPolicy="no-referrer" 
                      alt={member.displayName}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 truncate">{member.displayName}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {member.role === 'admin' ? 'Administrador' : 'Membro'}
                      </p>
                    </div>
                    {member.role === 'admin' ? (
                      <Shield className="w-4 h-4 text-primary" />
                    ) : isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMemberToRemove(member.uid);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Remover membro"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                      <img src={req.photoURL || `https://ui-avatars.com/api/?name=${req.displayName}`} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" alt={req.displayName} />
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
                      alt={msg.senderName}
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
                          alt="Community attachment"
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
                  
                  {/* Message Actions */}
                  {!msg.deletedForAll && (isAdmin || isMe) && (
                    <div className={cn(
                      "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all",
                      isMe ? "-left-12" : "-right-12"
                    )}>
                      {(isMe || isAdmin) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMessageToDelete({ id: msg.id, forEveryone: true });
                          }}
                          className="p-1.5 rounded-full text-red-400 hover:bg-red-50 transition-colors"
                          title="Apagar para todos"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                        }}
                        className="p-1.5 rounded-full text-gray-400 hover:bg-black/5 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
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
                          setMessageToDelete({ id: msg.id, forEveryone: false });
                          setActiveMessageMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Apagar para mim
                      </button>
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
              <img src={pendingImage} className="w-24 h-24 object-cover rounded-2xl border-2 border-primary/20 shadow-md" alt="Pending upload" />
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
      <ConfirmModal
        show={!!messageToDelete}
        title="Apagar Mensagem"
        message={messageToDelete?.forEveryone ? "Tens a certeza que queres apagar esta mensagem para todos?" : "Tens a certeza que queres apagar esta mensagem para ti?"}
        onConfirm={() => {
          if (messageToDelete) {
            deleteMessage(messageToDelete.id, messageToDelete.forEveryone);
            setMessageToDelete(null);
          }
        }}
        onCancel={() => setMessageToDelete(null)}
      />
      <ConfirmModal 
        show={!!memberToRemove}
        title="Remover Membro?"
        message="Tens a certeza que queres remover este membro da comunidade?"
        onConfirm={handleRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
};
