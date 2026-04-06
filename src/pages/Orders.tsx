import React, { useState, useEffect } from 'react';
import { query, collection, where, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { LoginPage } from './LoginPage';
import { ReviewModal } from '../components/ReviewModal';
import { cn, handleFirestoreError } from '../lib/utils';
import { OperationType, Order } from '../types';

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    accepted: "bg-blue-100 text-blue-700",
    completed_by_provider: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-700",
  }[status] || "bg-gray-100 text-gray-700";

  const labels = {
    pending: "Pendente",
    accepted: "Em curso",
    completed_by_provider: "Concluído (Pelo Prestador)",
    completed: "Concluído",
    rejected: "Rejeitado",
    cancelled: "Cancelado",
  }[status] || status;

  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", styles)}>
      {labels}
    </span>
  );
};

export const Orders = () => {
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
  if (!profile) return <LoginPage message="Inicie sessão para ver os seus pedidos" />;

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await setDoc(doc(db, 'orders', orderId), { status }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-12">
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
                      className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      Confirmar Conclusão
                    </button>
                  </div>
                )}

                {order.status === 'completed' && !order.isReviewed && (
                  <button 
                    onClick={() => setReviewOrder(order)}
                    className="w-full py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
                  >
                    Avaliar Serviço
                  </button>
                )}
              </div>
            ))}
            {orders.length === 0 && (
              <div className="p-12 text-center bg-white rounded-[32px] border border-dashed border-brand-gray">
                <p className="text-brand-ink/40 font-bold">Ainda não pediste nenhum serviço.</p>
              </div>
            )}
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
                    <p className="text-xs text-brand-ink/60">De: {order.clientName || 'Cliente'}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-brand-ink/80 mb-6 italic">"{order.message}"</p>
                
                {order.status === 'pending' && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => updateStatus(order.id, 'accepted')}
                      className="flex-1 py-3 bg-brand-ink text-white rounded-xl text-xs font-bold hover:bg-brand-ink/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Aceitar
                    </button>
                    <button 
                      onClick={() => updateStatus(order.id, 'rejected')}
                      className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Rejeitar
                    </button>
                  </div>
                )}

                {order.status === 'accepted' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'completed_by_provider')}
                    className="w-full py-3 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors"
                  >
                    Marcar como Concluído
                  </button>
                )}
              </div>
            ))}
            {receivedOrders.length === 0 && (
              <div className="p-12 text-center bg-white rounded-[32px] border border-dashed border-brand-gray">
                <p className="text-brand-ink/40 font-bold">Ainda não recebeste nenhum pedido.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {reviewOrder && (
        <ReviewModal 
          order={reviewOrder} 
          onClose={() => setReviewOrder(null)} 
        />
      )}
    </div>
  );
};
