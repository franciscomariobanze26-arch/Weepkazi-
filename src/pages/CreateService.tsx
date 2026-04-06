import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { LoginPage } from './LoginPage';
import { AddServiceModal } from '../components/AddServiceModal';

export const CreateService = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'select' | 'offer'>('select');

  if (loading) return <LoadingScreen />;
  if (!profile) return <LoginPage message="Inicie sessão para criar um serviço" />;

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-brand-bg pb-24">
        <div className="max-w-2xl mx-auto px-4 pt-12">
          <h1 className="text-4xl font-black tracking-tighter mb-2 text-brand-ink">O que queres fazer?</h1>
          <p className="text-brand-ink/40 font-bold mb-12 uppercase tracking-widest text-xs">Escolhe uma opção para continuar</p>
          
          <div className="grid gap-6">
            <button 
              onClick={() => setMode('offer')}
              className="bg-white p-8 rounded-[40px] border border-brand-gray shadow-sm text-left group hover:border-primary/30 transition-all flex items-center gap-6"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-brand-ink">Oferecer um Serviço</h3>
                <p className="text-sm font-medium text-brand-ink/40">Publica o que sabes fazer e começa a ganhar dinheiro.</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/services')}
              className="bg-white p-8 rounded-[40px] border border-brand-gray shadow-sm text-left group hover:border-primary/30 transition-all flex items-center gap-6"
            >
              <div className="w-16 h-16 bg-brand-ink/5 rounded-2xl flex items-center justify-center text-brand-ink/40 group-hover:scale-110 transition-transform">
                <Search className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-brand-ink">Contratar Alguém</h3>
                <p className="text-sm font-medium text-brand-ink/40">Procura talentos e serviços para resolver os teus problemas.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <AddServiceModal onClose={() => setMode('select')} isStandalone />
      </div>
    </div>
  );
};
