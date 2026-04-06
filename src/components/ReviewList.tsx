import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { query, collection, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Review } from '../types';
import { cn, safeToDate } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ReviewList = ({ serviceId, targetId }: { serviceId?: string; targetId?: string }) => {
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

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map(i => <div key={i} className="h-24 bg-brand-bg rounded-2xl" />)}
    </div>
  );

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
                referrerPolicy="no-referrer"
                alt={review.authorName}
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
              {formatDistanceToNow(safeToDate(review.createdAt), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <p className="text-sm text-brand-ink/70 leading-relaxed">{review.comment}</p>
        </div>
      ))}
    </div>
  );
};
