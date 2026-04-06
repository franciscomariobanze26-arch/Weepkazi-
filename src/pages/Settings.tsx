import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Info, 
  HelpCircle, 
  LogOut, 
  ChevronRight 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoginPage } from './LoginPage';
import { ConfirmModal } from '../components/ConfirmModal';

export const Settings: React.FC = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!profile) return <LoginPage message="Inicie sessão para ver as definições" />;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-black tracking-tighter mb-12">Definições</h1>
      
      <div className="space-y-4">
        {/* Profile Section */}
        <div className="bg-white rounded-[32px] p-6 border border-brand-gray shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-widest text-brand-ink/30 mb-6">Conta</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                className="w-12 h-12 rounded-2xl object-cover" 
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="font-bold">{profile?.displayName}</p>
                <p className="text-xs text-brand-ink/40">{profile?.email}</p>
              </div>
            </div>
            <Link 
              to={`/profile/${profile?.uid}`}
              className="px-4 py-2 bg-brand-bg text-brand-ink rounded-xl text-xs font-bold hover:bg-brand-gray transition-colors"
            >
              Ver Perfil
            </Link>
          </div>
        </div>

        {/* Legal & Support Section */}
        <div className="bg-white rounded-[32px] overflow-hidden border border-brand-gray shadow-sm">
          <div className="p-6 border-b border-brand-gray/50">
            <h2 className="text-xs font-black uppercase tracking-widest text-brand-ink/30">Legal & Suporte</h2>
          </div>
          <div className="divide-y divide-brand-gray/50">
            <Link to="/terms" className="flex items-center justify-between p-6 hover:bg-brand-bg transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="font-bold text-brand-ink/80 group-hover:text-brand-ink">Termos e Condições</span>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-ink/20 group-hover:text-brand-ink/40" />
            </Link>
            <Link to="/privacy" className="flex items-center justify-between p-6 hover:bg-brand-bg transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
                  <Info className="w-5 h-5" />
                </div>
                <span className="font-bold text-brand-ink/80 group-hover:text-brand-ink">Política de Privacidade</span>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-ink/20 group-hover:text-brand-ink/40" />
            </Link>
            <Link to="/contact" className="flex items-center justify-between p-6 hover:bg-brand-bg transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="font-bold text-brand-ink/80 group-hover:text-brand-ink">Suporte & Ajuda</span>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-ink/20 group-hover:text-brand-ink/40" />
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-[32px] p-6 border border-brand-gray shadow-sm">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center space-x-2 p-4 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </div>

      <ConfirmModal 
        show={showLogoutConfirm}
        title="Terminar Sessão"
        message="Tens a certeza que queres sair da tua conta?"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};


