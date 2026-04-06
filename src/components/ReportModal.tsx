import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { query, collection, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn, handleFirestoreError } from '../lib/utils';
import { OperationType, Report } from '../types';
import { toast } from 'sonner';

export const ReportModal = ({ 
  reportedId, 
  reportedType, 
  onClose 
}: { 
  reportedId: string; 
  reportedType: Report['reportedType']; 
  onClose: () => void; 
}) => {
  const { profile } = useAuth();
  const [type, setType] = useState<Report['type']>('spam');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const categories = [
    { id: 'fake_profile', label: 'Perfil Falso / Conta Falsa' },
    { id: 'fraud', label: 'Golpe / Fraude / Tentativa de burlar' },
    { id: 'inappropriate', label: 'Conteúdo Impróprio (Nudez, Violência, Ódio)' },
    { id: 'harassment', label: 'Assédio / Bullying / Desrespeito' },
    { id: 'spam', label: 'Spam / Publicidade não autorizada' },
    { id: 'fake_review', label: 'Avaliação falsa ou enganosa' },
    { id: 'technical', label: 'Problema técnico / Conteúdo incorreto' },
    { id: 'other', label: 'Outro' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);

    try {
      // Check if already reported by this user
      const q = query(
        collection(db, 'reports'),
        where('reportedId', '==', reportedId),
        where('reporterId', '==', profile.uid)
      );
      
      let existingSnap;
      try {
        existingSnap = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'reports');
        return;
      }
      
      if (!existingSnap.empty) {
        toast.error('Já denunciaste este item anteriormente.');
        onClose();
        return;
      }
      
      try {
        await addDoc(collection(db, 'reports'), {
          reportedId,
          reportedType,
          reporterId: profile.uid,
          type,
          description,
          status: 'pending',
          priority: 'low',
          createdAt: serverTimestamp(),
        });
        setIsSuccess(true);
        setTimeout(() => onClose(), 2000);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'reports');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-[32px] text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-gray-900">Denúncia Registrada</h3>
        <p className="text-gray-500 font-medium">Sua denúncia foi registrada com sucesso e será analisada pela nossa equipa.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[32px] space-y-6 max-w-md w-full shadow-2xl relative">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">Denunciar Conteúdo</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Motivo da Denúncia</label>
          <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setType(cat.id as any)}
                className={cn(
                  "w-full p-4 rounded-2xl text-left font-bold text-sm border-2 transition-all",
                  type === cat.id 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-gray-100 text-gray-600 hover:border-gray-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição (Opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dê-nos mais detalhes..."
            className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary outline-none min-h-[100px] text-sm font-medium transition-all"
            required={type === 'other'}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Denúncia'}
        </button>
      </form>
    </div>
  );
};
