import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ImageUpload } from './ImageUpload';
import { cn, handleFirestoreError } from '../lib/utils';
import { OperationType } from '../types';
import { ValidationService } from '../services/validationService';
import { toast } from 'sonner';
import { MOZAMBIQUE_LOCATIONS } from '../constants';

export const AddServiceModal = ({ onClose, isStandalone = false }: { onClose: () => void; isStandalone?: boolean }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'domestico',
    price: 0,
    photoURL: '',
    location: { 
      province: profile?.location?.province || Object.keys(MOZAMBIQUE_LOCATIONS)[0], 
      district: profile?.location?.district || MOZAMBIQUE_LOCATIONS[Object.keys(MOZAMBIQUE_LOCATIONS)[0]][0] 
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      // Internal Validation Algorithm
      const titleVal = ValidationService.validateContent(formData.title, 5);
      if (!titleVal.valid) {
        toast.error(`Título: ${titleVal.error}`);
        setLoading(false);
        return;
      }

      const descVal = ValidationService.validateContent(formData.description, 10);
      if (!descVal.valid) {
        toast.error(`Descrição: ${descVal.error}`);
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'services'), {
        ...formData,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || null,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'services');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className={cn("bg-white w-full rounded-[40px] p-8 shadow-2xl my-8", !isStandalone && "max-w-lg")}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Novo Serviço</h2>
        {!isStandalone && <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-4">
          <ImageUpload 
            onImageUploaded={(url) => setFormData({ ...formData, photoURL: url })}
            currentImage={formData.photoURL}
            label="Foto do Trabalho"
            aspectRatio="video"
            className="w-full h-40"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Título do Serviço</label>
          <input 
            required
            type="text" 
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Ex: Limpeza de Quintal"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Categoria</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="domestico">Doméstico</option>
              <option value="design">Design</option>
              <option value="aulas">Aulas</option>
              <option value="transporte">Transporte</option>
              <option value="reparos">Reparos</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Preço (MT)</label>
            <input 
              required
              type="number" 
              value={formData.price}
              onChange={e => setFormData({...formData, price: Number(e.target.value)})}
              className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Província</label>
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
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Distrito</label>
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
          <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/60 mb-2">Descrição</label>
          <textarea 
            required
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-32 resize-none"
            placeholder="Descreve o que fazes e como trabalhas..."
          />
        </div>
        <button 
          disabled={loading}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          {loading ? 'A publicar...' : 'Publicar Serviço'}
        </button>
      </form>
    </div>
  );

  if (isStandalone) return modalContent;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {modalContent}
      </motion.div>
    </motion.div>
  );
};
