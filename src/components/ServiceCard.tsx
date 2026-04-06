import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  MapPin, 
  Globe, 
  Trash2 
} from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';
import { ReportButton } from './ReportButton';
import { cn, calculateDistance } from '../lib/utils';
import { Service } from '../types';
import { toast } from 'sonner';

export const ServiceCard = ({ service }: { service: Service }) => {
  const { profile, toggleFavorite } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isFavorite = profile?.favorites?.services?.includes(service.id);
  const distance = calculateDistance(
    profile?.location?.lat, 
    profile?.location?.lng, 
    service.location?.lat, 
    service.location?.lng
  );

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'services', service.id));
      toast.success('Serviço apagado com sucesso.');
    } catch (err) {
      console.error('Error deleting service:', err);
      toast.error('Erro ao apagar serviço.');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div 
      onClick={() => navigate(`/service/${service.id}`)}
      className="group bg-white rounded-[32px] overflow-hidden border border-brand-gray hover:shadow-2xl transition-all flex flex-col hover:-translate-y-1 cursor-pointer relative"
    >
      <ConfirmModal 
        show={showDeleteConfirm}
        title="Apagar Serviço?"
        message="Tens a certeza que queres apagar este serviço? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <div className="h-56 bg-brand-gray relative overflow-hidden">
        <img 
          src={service.photoURL || `https://picsum.photos/seed/${service.id}/400/300`} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
          {service.category}
        </div>
        
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(service.id, 'services');
          }}
          className={cn(
            "absolute top-4 right-4 p-2.5 rounded-2xl backdrop-blur transition-all shadow-lg",
            isFavorite ? "bg-primary text-white" : "bg-white/90 text-gray-400 hover:text-primary"
          )}
        >
          <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </button>
      </div>
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-black text-xl leading-tight text-brand-ink group-hover:text-primary transition-colors">{service.title}</h3>
          <div className="flex items-center gap-2">
            <p className="text-secondary font-black text-lg">MT {service.price}</p>
            {profile?.uid === service.authorId && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                title="Apagar serviço"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <ReportButton reportedId={service.id} reportedType="service" className="p-1" />
          </div>
        </div>
        <p className="text-brand-ink/50 text-sm font-medium line-clamp-2 mb-2 flex-1">{service.description}</p>
        <div className="flex items-center justify-between text-[10px] text-brand-ink/40 font-bold uppercase tracking-widest mb-4">
          <div className="flex items-center">
            <MapPin className="w-3 h-3 mr-1" /> {service.location?.district}, {service.location?.province}
            {distance !== null && (
              <span className="ml-2 text-primary">({distance.toFixed(1)} km)</span>
            )}
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
              navigate(`/service/${service.id}`);
            }}
            className="px-4 py-2 bg-brand-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-ink/90 transition-all shadow-lg shadow-brand-ink/10"
          >
            Contratar
          </button>
        </div>
      </div>
    </div>
  );
};
