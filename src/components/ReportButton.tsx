import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flag, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Report } from '../types';

export const ReportButton = ({ reportedId, reportedType, className }: { reportedId: string; reportedType: Report['reportedType']; className?: string }) => {
  const { profile, setShowLoginPrompt } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    if (!profile) {
      setShowLoginPrompt(true);
      return;
    }
    if (!reason.trim()) {
      toast.error('Por favor, descreve o motivo da denúncia.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reportedId,
        reportedType,
        reporterId: profile.uid,
        reporterName: profile.displayName,
        reason: reason.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Denúncia enviada com sucesso. A nossa equipa irá analisar.');
      setShowModal(false);
      setReason('');
    } catch (err) {
      console.error('Error reporting:', err);
      toast.error('Erro ao enviar denúncia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className={cn("p-2 text-gray-400 hover:text-red-500 transition-colors", className)}
        title="Denunciar"
      >
        <Flag className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900">Denunciar Conteúdo</h3>
                <p className="text-sm text-gray-500 font-medium mt-2">Ajuda-nos a manter a KAZI segura.</p>
              </div>

              <div className="space-y-4">
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreve o motivo da denúncia..."
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl h-32 resize-none text-sm font-medium focus:ring-2 focus:ring-red-500/20"
                />
                <button 
                  onClick={handleReport}
                  disabled={loading}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Denúncia'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
