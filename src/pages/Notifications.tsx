import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Sparkles, Star, Bell } from 'lucide-react';
import { query, collection, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { cn, handleFirestoreError, safeToDate } from '../lib/utils';
import { OperationType, Notification } from '../types';
import { toast } from 'sonner';

export const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications'));
    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Erro ao marcar notificação como lida.');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;
      
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
      toast.success('Todas as notificações marcadas como lidas');
    } catch (err) {
      console.error('Error marking all as read:', err);
      toast.error('Erro ao marcar todas como lidas.');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="max-w-2xl mx-auto space-y-8 px-4 py-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-tighter">Notificações</h1>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="text-primary text-sm font-bold hover:underline"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div 
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={cn(
                "p-6 rounded-[32px] border transition-all cursor-pointer",
                n.read ? "bg-white border-brand-gray opacity-60" : "bg-white border-primary shadow-lg shadow-primary/5"
              )}
            >
              <div className="flex gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  n.type === 'message' ? "bg-blue-100 text-blue-600" :
                  n.type === 'interest' ? "bg-green-100 text-green-600" :
                  n.type === 'review' ? "bg-yellow-100 text-yellow-600" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {n.type === 'message' ? <MessageCircle className="w-6 h-6" /> :
                   n.type === 'interest' ? <Sparkles className="w-6 h-6" /> :
                   n.type === 'review' ? <Star className="w-6 h-6" /> :
                   <Bell className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-brand-ink">{n.title}</h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {n.createdAt ? formatDistanceToNow(safeToDate(n.createdAt), { addSuffix: true, locale: ptBR }) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-brand-ink/60 font-medium leading-relaxed">{n.message}</p>
                  {n.link && (
                    <Link 
                      to={n.link}
                      className="inline-block mt-4 text-xs font-black text-primary uppercase tracking-widest hover:underline"
                    >
                      Ver Detalhes
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-brand-gray">
            <Bell className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-brand-ink/40 font-bold">Não tens notificações de momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};
