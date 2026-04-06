import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPromptProps {
  show: boolean;
  onClose: () => void;
  message?: string;
}

export const LoginPrompt: React.FC<LoginPromptProps> = ({ 
  show, onClose, message = "Precisa entrar para continuar" 
}) => {
  const { signIn, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      onClose();
    } catch (err) {
      // Error handled in signInWithEmail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-black text-gray-900">Entrar na KAZI</h3>
          <p className="text-gray-500 font-medium mt-2">{message}</p>
        </div>

        <div className="space-y-4">
          {!isEmailMode ? (
            <>
              <button 
                onClick={() => {
                  signIn();
                  onClose();
                }}
                className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                <span>Continuar com Google</span>
              </button>
              <button 
                onClick={() => setIsEmailMode(true)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/20"
              >
                <Mail className="w-5 h-5" />
                <span>Entrar com E-mail</span>
              </button>
            </>
          ) : (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <input 
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20"
              />
              <input 
                type="password"
                placeholder="Palavra-passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20"
              />
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
              </button>
              <button 
                type="button"
                onClick={() => setIsEmailMode(false)}
                className="w-full py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-all"
              >
                Voltar às opções
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
