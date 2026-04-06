import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  MessageCircle, 
  Users, 
  Check, 
  Clock, 
  ChevronRight, 
  ShieldAlert, 
  ArrowRight, 
  Plus, 
  Lock, 
  Trash2, 
  MoreVertical 
} from 'lucide-react';
import { 
  query, 
  collection, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { CommunityList } from '../components/CommunityList';
import { LoadingScreen } from '../components/LoadingScreen';
import { LoginPage } from './LoginPage';
import { Logo } from '../components/Logo';
import { cn, handleFirestoreError, safeToDate, safeToMillis } from '../lib/utils';
import { OperationType, Chat } from '../types';
import { toast } from 'sonner';

export const ChatList = () => {
  const { profile, loading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeTab, setActiveTab] = useState<'messages' | 'communities'>('messages');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', profile.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data() as Chat;
        const otherId = data.participants.find(id => id !== profile.uid);
        let otherProfile = null;
        if (otherId) {
          const pDoc = await getDoc(doc(db, 'users', otherId));
          otherProfile = pDoc.exists() ? pDoc.data() : { displayName: 'Utilizador Eliminado', photoURL: '' };
        }
        return { id: d.id, ...data, otherProfile };
      }));
      setChats(chatData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chats'));

    return () => unsubscribe();
  }, [profile]);

  const deleteChat = async (chatId: string) => {
    if (!profile) return;
    try {
      // In a real app, we might want to just hide it for the user
      // but for simplicity here we delete it if both users delete it
      // or just remove the user from participants
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const data = chatSnap.data();
        const newParticipants = data.participants.filter((id: string) => id !== profile.uid);
        if (newParticipants.length === 0) {
          await deleteDoc(chatRef);
        } else {
          await updateDoc(chatRef, { participants: newParticipants });
        }
        toast.success('Conversa removida.');
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
      toast.error('Erro ao remover conversa.');
    }
  };

  if (loading) return <LoadingScreen />;
  if (!profile) return <LoginPage message="Inicie sessão para ver as suas mensagens" />;

  const filteredChats = chats.filter(c => 
    c.otherProfile?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount?.[profile.uid] || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 flex items-center gap-3">
            Mensagens
            {totalUnread > 0 && (
              <span className="bg-primary text-white text-xs px-3 py-1 rounded-full animate-pulse">
                {totalUnread} novas
              </span>
            )}
          </h1>
          <p className="text-brand-ink/40 font-medium">Gere as tuas conversas e conexões.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-brand-gray shadow-sm">
          <button 
            onClick={() => setActiveTab('messages')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2",
              activeTab === 'messages' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-brand-ink/40 hover:text-brand-ink"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            Privadas
          </button>
          <button 
            onClick={() => setActiveTab('communities')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2",
              activeTab === 'communities' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-brand-ink/40 hover:text-brand-ink"
            )}
          >
            <Users className="w-4 h-4" />
            Comunidades
          </button>
        </div>
      </div>

      {activeTab === 'messages' ? (
        <div className="space-y-6">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ink/20 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Procurar conversas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white rounded-[32px] border border-brand-gray shadow-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-brand-ink"
            />
          </div>

          <div className="bg-white rounded-[40px] border border-brand-gray shadow-xl overflow-hidden">
            {filteredChats.length > 0 ? (
              <div className="divide-y divide-brand-gray">
                {filteredChats.map((chat) => (
                  <div key={chat.id} className="group relative">
                    <Link 
                      to={`/chats/${chat.id}`}
                      className="flex items-center p-6 hover:bg-brand-bg transition-all flex-1"
                    >
                      <div className="relative shrink-0">
                        <img 
                          src={chat.otherProfile?.photoURL || `https://ui-avatars.com/api/?name=${chat.otherProfile?.displayName}`} 
                          className="w-14 h-14 rounded-2xl object-cover shadow-md" 
                          referrerPolicy="no-referrer"
                        />
                        {chat.otherProfile?.updatedAt && Date.now() - safeToMillis(chat.otherProfile.updatedAt) < 300000 && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                        )}
                      </div>
                      <div className="ml-5 flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-black text-brand-ink truncate group-hover:text-primary transition-colors">{chat.otherProfile?.displayName}</h3>
                          <span className="text-[10px] font-black text-brand-ink/20 uppercase tracking-widest whitespace-nowrap ml-2">
                            {formatDistanceToNow(safeToDate(chat.lastMessageAt), { locale: ptBR, addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            "text-sm truncate pr-4",
                            chat.unreadCount?.[profile.uid] > 0 ? "text-brand-ink font-black" : "text-brand-ink/40 font-medium"
                          )}>
                            {chat.lastMessage}
                          </p>
                          {chat.unreadCount?.[profile.uid] > 0 && (
                            <span className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md shadow-primary/20">
                              {chat.unreadCount[profile.uid]}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-brand-ink/10 group-hover:text-primary group-hover:translate-x-1 transition-all ml-4" />
                    </Link>
                    <button 
                      onClick={() => deleteChat(chat.id)}
                      className="absolute right-16 top-1/2 -translate-y-1/2 p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                      title="Remover conversa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-brand-ink/10" />
                </div>
                <h3 className="text-xl font-black text-brand-ink mb-2">Sem mensagens ainda</h3>
                <p className="text-brand-ink/40 font-medium max-w-xs mx-auto mb-8">
                  Explora os serviços e entra em contacto com profissionais para começar uma conversa.
                </p>
                <Link 
                  to="/services" 
                  className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
                >
                  Explorar Serviços
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CommunityList />
      )}
    </div>
  );
};
