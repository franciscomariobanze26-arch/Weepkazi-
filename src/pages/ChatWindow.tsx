import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  ShieldAlert, 
  Unlock, 
  Trash2, 
  MoreVertical, 
  Check, 
  Paperclip, 
  ImageIcon, 
  Smile, 
  Send, 
  Loader2, 
  X, 
  UserPlus, 
  Lock,
  FileText,
  Mic,
  Play,
  Pause
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  doc, 
  onSnapshot, 
  query, 
  collection, 
  orderBy, 
  where, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  increment,
  getDoc
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { LoginPage } from './LoginPage';
import { ConfirmModal } from '../components/ConfirmModal';
import { Logo } from '../components/Logo';
import { cn, handleFirestoreError, safeToDate, safeToMillis } from '../lib/utils';
import { compressImage } from '../lib/imageUtils';
import { OperationType, Message } from '../types';
import { ValidationService } from '../services/validationService';
import { toast } from 'sonner';

const AudioPlayer = ({ src, isMe }: { src: string; isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    audio.ontimeupdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={cn("flex items-center gap-3 min-w-[160px] py-1", isMe ? "text-white" : "text-primary")}>
      <button 
        onClick={togglePlay}
        className={cn("p-2 rounded-full transition-all hover:scale-110", isMe ? "bg-white/20" : "bg-primary/10")}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
      </button>
      <div className="flex-1 h-1 bg-current/20 rounded-full overflow-hidden">
        <div className="h-full bg-current transition-all duration-100" style={{ width: `${progress}%` }} />
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
          return 120;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const startVisualizer = () => {
    const interval = setInterval(() => {
      setVisualizerData(prev => prev.map(() => Math.floor(Math.random() * 16) + 4));
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

export const ChatWindow: React.FC = () => {
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
  const [messageToDelete, setMessageToDelete] = useState<{ id: string, forEveryone: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Offline Persistence: Load from localStorage on mount
  useEffect(() => {
    if (!chatId) return;
    const cached = localStorage.getItem(`chat_messages_${chatId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setMessages(parsed);
      } catch (e) {
        console.error('Error parsing cached messages', e);
      }
    }
  }, [chatId]);

  // Offline Persistence: Save to localStorage when messages update
  useEffect(() => {
    if (!chatId || messages.length === 0) return;
    // We only save the last 100 messages to avoid localStorage limits
    localStorage.setItem(`chat_messages_${chatId}`, JSON.stringify(messages.slice(-100)));
  }, [chatId, messages]);

  // 24h Deletion: Cleanup old messages from server
  useEffect(() => {
    if (!chatId || !profile) return;
    
    const cleanupOldMessages = async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        where('createdAt', '<', twentyFourHoursAgo)
      );
      
      try {
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      } catch (err) {
        console.error('Error cleaning up old messages:', err);
      }
    };

    // Run cleanup once on mount
    cleanupOldMessages();
  }, [chatId, profile]);

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
      const newMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      
      setMessages(prev => {
        // Merge new messages with existing ones, avoiding duplicates
        const merged = [...prev];
        newMessages.forEach(msg => {
          const index = merged.findIndex(m => m.id === msg.id);
          if (index === -1) {
            merged.push(msg);
          } else {
            merged[index] = msg;
          }
        });
        // Sort by creation time
        return merged.sort((a, b) => {
          const dateA = safeToDate(a.createdAt).getTime();
          const dateB = safeToDate(b.createdAt).getTime();
          return dateA - dateB;
        });
      });

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

    // Internal Validation Algorithm for text messages
    if (finalType === 'text' && finalContent.trim()) {
      const msgVal = ValidationService.validateContent(finalContent, 1);
      if (!msgVal.valid) {
        toast.error(`Mensagem: ${msgVal.error}`);
        setIsSending(false);
        return;
      }
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
  if (!profile) return <LoginPage message="Inicie sessão para conversar" />;
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
              otherProfile.updatedAt && Date.now() - safeToMillis(otherProfile.updatedAt) < 300000 ? "bg-green-500" : "bg-gray-300"
            )} />
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/profile/${chat.participants.find((id: string) => id !== profile.uid)}`} className="hover:text-primary transition-colors block">
              <h3 className="font-black text-base text-gray-900 leading-none truncate">{otherProfile.displayName}</h3>
            </Link>
            <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wider">
              {otherProfile.updatedAt ? (
                Date.now() - safeToMillis(otherProfile.updatedAt) < 300000 ? (
                  <span className="text-green-500">Online Agora</span>
                ) : (
                  `Visto ${formatDistanceToNow(safeToDate(otherProfile.updatedAt), { locale: ptBR, addSuffix: true })}`
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

                  {/* Message Actions */}
                  <div className={cn(
                    "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all",
                    isMe ? "-left-12" : "-right-12"
                  )}>
                    {isMe && !msg.deletedForAll && (
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
              <div className={cn(
                "flex items-center gap-1 mt-1 px-2",
                isMe ? "flex-row-reverse" : "flex-row"
              )}>
                <span className="text-[10px] font-bold text-gray-400">
                  {safeToDate(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    </div>
  );
};
