import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { ValidationService } from '../services/validationService';
import { MOZAMBIQUE_LOCATIONS } from '../constants';
import { Job } from '../types';

interface CreateJobModalProps {
  onClose: () => void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company: profile?.displayName || '',
    province: '',
    district: '',
    salary: '',
    type: 'full-time' as Job['type']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.title || !formData.description || !formData.company || !formData.province || !formData.district) {
      toast.error('Preenche todos os campos obrigatórios.');
      return;
    }

    const titleVal = ValidationService.validateContent(formData.title, 5);
    if (!titleVal.valid) {
      toast.error(`Título: ${titleVal.error}`);
      return;
    }

    const descVal = ValidationService.validateContent(formData.description, 10);
    if (!descVal.valid) {
      toast.error(`Descrição: ${descVal.error}`);
      return;
    }

    const companyVal = ValidationService.isValidData('name', formData.company);
    if (!companyVal.valid) {
      toast.error(`Empresa: ${companyVal.error}`);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'jobs'), {
        title: formData.title,
        description: formData.description,
        company: formData.company,
        location: {
          province: formData.province,
          district: formData.district
        },
        salary: formData.salary,
        type: formData.type,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || null,
        createdAt: serverTimestamp(),
        status: 'open'
      });
      toast.success('Oportunidade publicada com sucesso!');
      onClose();
    } catch (err) {
      console.error('Error creating job:', err);
      toast.error('Erro ao publicar oportunidade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Publicar Oportunidade</h2>
            <p className="text-gray-500 font-medium">Ajuda jovens talentos a encontrar o seu caminho.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Título da Vaga *</label>
              <input 
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: Designer Gráfico Júnior"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Empresa *</label>
              <input 
                type="text"
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                placeholder="Nome da empresa"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tipo de Contrato *</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
              >
                <option value="full-time">Tempo Inteiro</option>
                <option value="part-time">Part-time</option>
                <option value="internship">Estágio</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Província *</label>
              <select 
                required
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value, district: '' })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecionar Província</option>
                <option value="Todas as Províncias">Todas as Províncias</option>
                {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Distrito *</label>
              <select 
                required
                disabled={!formData.province}
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">Selecionar Distrito</option>
                {formData.province && MOZAMBIQUE_LOCATIONS[formData.province] && MOZAMBIQUE_LOCATIONS[formData.province].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Salário (Opcional)</label>
              <input 
                type="text"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: 15.000 - 20.000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição da Vaga *</label>
              <textarea 
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Descreve as responsabilidades e requisitos..."
              />
            </div>
          </div>

          <div className="pt-4 sticky bottom-0 bg-white">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-5 rounded-2xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Briefcase className="w-6 h-6" />}
              <span>{loading ? 'A publicar...' : 'Publicar Oportunidade'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
