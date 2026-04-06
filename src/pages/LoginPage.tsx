import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  ChevronRight, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { toast } from 'sonner';

export const LoginPage = ({ message = "Precisa entrar para continuar" }: { message?: string }) => {
  const { profile, signIn, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      navigate('/');
    }
  }, [profile, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!showResetForm && !password)) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      if (showResetForm) {
        await resetPassword(email);
        setResetSent(true);
      } else if (isSignUp) {
        if (!name.trim()) {
          toast.error('Por favor, introduza o seu nome.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side: Branding & Info */}
      <div className="lg:w-1/2 bg-brand-bg p-12 lg:p-24 flex flex-col justify-between relative overflow-hidden border-r border-brand-gray">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        
        <div className="relative z-10">
          <Logo className="scale-150 origin-left mb-16" />
          <h1 className="text-5xl lg:text-7xl font-black text-brand-ink tracking-tighter leading-[0.9] mb-8">
            A maior rede de <span className="text-primary">serviços</span> de Moçambique.
          </h1>
          <p className="text-xl text-brand-ink/60 font-medium max-w-md leading-relaxed">
            Conectamos profissionais talentosos a clientes que precisam de resultados reais.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6 mt-12">
          <div className="bg-white p-6 rounded-[32px] border border-brand-gray shadow-sm">
            <Sparkles className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-brand-ink font-black text-lg mb-1">Talento Local</h3>
            <p className="text-brand-ink/40 text-xs font-medium">Milhares de profissionais moçambicanos prontos para ajudar.</p>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-brand-gray shadow-sm">
            <ShieldCheck className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-brand-ink font-black text-lg mb-1">Segurança</h3>
            <p className="text-brand-ink/40 text-xs font-medium">Pagamentos e comunicações protegidas em cada etapa.</p>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Forms */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-black tracking-tighter text-brand-ink mb-2">Bem-vindo de volta</h2>
            <p className="text-brand-ink/40 font-medium">{message}</p>
          </div>

          <AnimatePresence mode="wait">
            {!showEmailForm ? (
              <motion.div 
                key="social"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <button 
                  onClick={() => signIn()}
                  className="w-full flex items-center justify-center gap-4 bg-white border-2 border-brand-gray p-5 rounded-[24px] font-black text-brand-ink hover:bg-brand-bg transition-all group shadow-sm"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span>Continuar com Google</span>
                </button>
                
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-gray"></div></div>
                  <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-brand-ink/20"><span className="bg-brand-bg px-4">ou usar email</span></div>
                </div>

                <button 
                  onClick={() => setShowEmailForm(true)}
                  className="w-full flex items-center justify-center gap-4 bg-brand-ink text-white p-5 rounded-[24px] font-black hover:bg-brand-ink/90 transition-all shadow-xl shadow-brand-ink/20"
                >
                  <Mail className="w-6 h-6" />
                  <span>Entrar com Email</span>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-8 rounded-[40px] border border-brand-gray shadow-xl space-y-6"
              >
                <button 
                  onClick={() => {
                    setShowEmailForm(false);
                    setShowResetForm(false);
                    setResetSent(false);
                  }}
                  className="flex items-center gap-2 text-xs font-black text-brand-ink/40 hover:text-primary transition-colors uppercase tracking-widest"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight">
                    {showResetForm ? 'Recuperar Senha' : (isSignUp ? 'Criar Conta' : 'Entrar com Email')}
                  </h3>
                  <p className="text-sm text-brand-ink/40 font-medium">
                    {showResetForm 
                      ? 'Enviaremos um link para redefinir a sua senha.' 
                      : (isSignUp ? 'Junte-se à maior rede de serviços de Moçambique.' : 'Introduza as suas credenciais para continuar.')}
                  </p>
                </div>

                {resetSent ? (
                  <div className="bg-green-50 p-6 rounded-3xl border border-green-100 text-center space-y-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-500 mx-auto shadow-sm">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-green-800 leading-relaxed">
                      Link enviado! Verifica a tua caixa de entrada para redefinir a senha.
                    </p>
                    <button 
                      onClick={() => {
                        setShowResetForm(false);
                        setResetSent(false);
                      }}
                      className="text-xs font-black text-green-600 uppercase tracking-widest hover:underline"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    {isSignUp && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40 ml-4">Nome Completo</label>
                        <div className="relative">
                          <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ink/20" />
                          <input 
                            type="text" 
                            placeholder="Teu Nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-brand-bg rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold"
                            required={isSignUp}
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40 ml-4">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ink/20" />
                        <input 
                          type="email" 
                          placeholder="exemplo@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-brand-bg rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold"
                          required
                        />
                      </div>
                    </div>

                    {!showResetForm && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40 ml-4">Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ink/20" />
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-brand-bg rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold"
                            required
                          />
                        </div>
                        {!isSignUp && (
                          <button 
                            type="button"
                            onClick={() => setShowResetForm(true)}
                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline ml-4"
                          >
                            Esqueci-me da senha
                          </button>
                        )}
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          {showResetForm ? 'Enviar Link' : (isSignUp ? 'Criar Conta' : 'Entrar')}
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </button>

                    {!showResetForm && (
                      <button 
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="w-full text-center text-xs font-bold text-brand-ink/40 hover:text-primary transition-colors"
                      >
                        {isSignUp ? 'Já tens conta? Entra aqui' : 'Não tens conta? Regista-te agora'}
                      </button>
                    )}
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-8 text-center">
            <p className="text-[10px] font-black text-brand-ink/20 uppercase tracking-[0.2em] mb-4">Segurança & Confiança</p>
            <div className="flex justify-center items-center gap-8 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
              <ShieldCheck className="w-6 h-6" />
              <Lock className="w-6 h-6" />
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
