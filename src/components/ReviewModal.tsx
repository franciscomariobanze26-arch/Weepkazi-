import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn, handleFirestoreError } from '../lib/utils';
import { OperationType, Order } from '../types';

export const ReviewModal = ({ order, onClose }: { order: Order; onClose: () => void }) => {
  const { profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
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
