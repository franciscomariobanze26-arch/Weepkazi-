import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Briefcase, User as UserIcon, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MOZAMBIQUE_LOCATIONS } from '../constants';
import { cn } from '../lib/utils';
import { ValidationService } from '../services/validationService';
import { handleFirestoreError } from '../services/firestoreService';
import { OperationType, UserProfile } from '../types';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { Logo } from './Logo';
import { ImageUpload } from './ImageUpload';

interface TermsModalProps {
  show: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy' | 'rules';
}

// I'll need to extract TermsModal too, but for now I'll define it here or import it if I create it.
// Let's assume I'll create src/components/TermsModal.tsx later.
import { TermsModal } from './TermsModal';

export const Onboarding: React.FC<{ onSkip?: () => void }> = ({ onSkip }) => {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState<null | 'terms' | 'privacy' | 'rules'>(null);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    handle: '',
    age: 18,
    bio: '',
    role: 'provider' as 'provider' | 'client',
    phoneNumber: '',
    photoURL: profile?.photoURL || '',
    lookingFor: '',
    location: { 
      province: profile?.location?.province || Object.keys(MOZAMBIQUE_LOCATIONS)[0], 
      district: profile?.location?.district || MOZAMBIQUE_LOCATIONS[Object.keys(MOZAMBIQUE_LOCATIONS)[0]][0] 
    },
    acceptedTerms: false
  });

  useEffect(() => {
    if (formData.displayName && !formData.handle) {
      const generatedHandle = formData.displayName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      
      if (generatedHandle) {
        setFormData(prev => ({ ...prev, handle: generatedHandle }));
      }
    }
  }, [formData.displayName]);

  const validateStep = () => {
    if (step === 1) {
      if (!formData.displayName || !formData.age || !formData.phoneNumber || !formData.handle) {
        toast.error('Por favor, preenche todos os campos obrigatórios (Nome, Handle, Idade e Telemóvel).');
        return false;
      }
      const nameVal = ValidationService.isValidData('name', formData.displayName);
      if (!nameVal.valid) {
        toast.error(nameVal.error);
        return false;
      }
      const handleVal = ValidationService.isValidData('handle', formData.handle);
      if (!handleVal.valid) {
        toast.error(handleVal.error);
        return false;
      }
      if (formData.age < 16) {
        toast.error('Deves ter pelo menos 16 anos para usar a KAZI.');
        return false;
      }
      const phoneVal = ValidationService.isValidData('phone', formData.phoneNumber);
      if (!phoneVal.valid) {
        toast.error(phoneVal.error);
        return false;
      }
    }
    if (step === 3) {
      if (formData.bio) {
        const bioVal = ValidationService.validateContent(formData.bio, 5);
        if (!bioVal.valid) {
          toast.error(`Bio: ${bioVal.error}`);
          return false;
        }
      }
    }
    if (step === 4) {
      if (!formData.acceptedTerms) {
        toast.error('Precisas de aceitar os Termos e Condições para continuar.');
        return false;
      }
    }
    return true;
  };

  const nextStep = async () => {
    if (validateStep()) {
      if (step === 1) {
        setLoading(true);
        try {
          const q = query(collection(db, 'users'), where('handle', '==', formData.handle));
          const snapshot = await getDocs(q);
          const isTaken = snapshot.docs.some(d => d.id !== profile?.uid);
          if (isTaken) {
            toast.error('Este @nome já está em uso. Escolha outro.');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error checking handle:', err);
        } finally {
          setLoading(false);
        }
      }
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!validateStep()) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const privateRef = doc(db, 'users_private', profile.uid);
      const { phoneNumber, ...publicData } = formData;
      
      await Promise.all([
        setDoc(userRef, {
          uid: profile.uid,
          ...publicData,
          isComplete: true,
          acceptedTermsAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true }),
        setDoc(privateRef, {
          email: (profile as any).email || '',
          phoneNumber,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      ]);
      
      await refreshProfile(profile.uid);
      toast.success('Perfil concluído com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-bg flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-8 md:p-12 my-8 relative"
      >
        {onSkip && (
          <button 
            onClick={onSkip}
            className="absolute top-8 right-8 p-2 text-brand-ink/20 hover:text-brand-ink transition-colors flex flex-col items-center group"
          >
            <X className="w-6 h-6" />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Explorar</span>
          </button>
        )}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo className="scale-150" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-brand-ink">Bem-vindo à KAZI</h2>
          <p className="text-brand-ink/60 font-medium">Configura o teu perfil para começar a transformar talento em oportunidade.</p>
        </div>

        <div className="flex justify-center space-x-2 mb-10">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all", step >= i ? "w-8 bg-primary" : "w-4 bg-brand-gray")} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center mb-8">
              <ImageUpload 
                onImageUploaded={(url) => setFormData({ ...formData, photoURL: url })}
                currentImage={formData.photoURL}
                label="Foto de Perfil"
                className="w-32 h-32 rounded-[32px]"
              />
              <div className="flex flex-col items-center mt-4 space-y-2">
                <p className="text-xs font-bold text-brand-ink/40 uppercase tracking-widest">Foto de Perfil Real</p>
                <p className="text-[10px] text-brand-ink/30 font-medium text-center max-w-[200px]">Usa uma foto clara do teu rosto para transmitir confiança aos clientes.</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Nome Completo</label>
              <input 
                type="text" 
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Nome de Utilizador (Handle)</label>
              <input 
                type="text" 
                value={formData.handle}
                onChange={e => {
                  let val = e.target.value;
                  if (val && !val.startsWith('@')) val = '@' + val;
                  setFormData({...formData, handle: val.toLowerCase().replace(/[^@a-z0-9_]/g, '')});
                }}
                placeholder="@teu_nome"
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
              />
              <p className="text-[10px] text-brand-ink/30 mt-1">Ex: @kazi (Mínimo 3 caracteres)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Idade</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={e => setFormData({...formData, age: Number(e.target.value)})}
                  className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Telemóvel</label>
                <input 
                  type="tel" 
                  placeholder="+258..."
                  value={formData.phoneNumber}
                  onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-center mb-6">O que pretendes fazer na KAZI?</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setFormData({...formData, role: 'provider'})}
                className={cn(
                  "p-8 rounded-[32px] border-2 transition-all flex flex-col items-center text-center",
                  formData.role === 'provider' ? "border-primary bg-primary/5" : "border-brand-gray hover:border-primary/20"
                )}
              >
                <Briefcase className={cn("w-10 h-10 mb-4", formData.role === 'provider' ? "text-primary" : "text-brand-ink/20")} />
                <span className="font-black text-lg">Prestar Serviços</span>
                <span className="text-xs text-brand-ink/40 mt-2">Quero oferecer o meu talento e ganhar renda.</span>
              </button>
              <button 
                onClick={() => setFormData({...formData, role: 'client'})}
                className={cn(
                  "p-8 rounded-[32px] border-2 transition-all flex flex-col items-center text-center",
                  formData.role === 'client' ? "border-primary bg-primary/5" : "border-brand-gray hover:border-primary/20"
                )}
              >
                <UserIcon className={cn("w-10 h-10 mb-4", formData.role === 'client' ? "text-primary" : "text-brand-ink/20")} />
                <span className="font-black text-lg">Contratar</span>
                <span className="text-xs text-brand-ink/40 mt-2">Procuro talentos para realizar serviços.</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-center mb-6">Onde estás localizado?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Província</label>
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
                  className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
                >
                  {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Distrito / Localidade</label>
                <select 
                  value={formData.location.district}
                  onChange={e => setFormData({
                    ...formData, 
                    location: { ...formData.location, district: e.target.value }
                  })}
                  className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-brand-ink"
                >
                  {(MOZAMBIQUE_LOCATIONS[formData.location.province] || []).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">Biografia Profissional</label>
              <textarea 
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                placeholder="Ex: Sou canalizador com 5 anos de experiência..."
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-40 resize-none font-medium text-brand-ink"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-2">O que procuras na KAZI?</label>
              <textarea 
                value={formData.lookingFor}
                onChange={e => setFormData({...formData, lookingFor: e.target.value})}
                placeholder="Ex: Procuro serviços de design gráfico ou aulas de matemática..."
                className="w-full p-4 bg-brand-bg rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-40 resize-none font-medium text-brand-ink"
              />
              <p className="text-[10px] font-bold text-brand-ink/40 mt-2 uppercase tracking-widest">Isto ajudará o nosso algoritmo inteligente a recomendar-te os melhores serviços.</p>
            </div>
            <div className="bg-secondary/10 p-6 rounded-3xl border border-secondary/20 mb-6">
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                <div>
                  <p className="font-bold text-brand-ink">Quase lá!</p>
                  <p className="text-sm text-brand-ink/60">Ao clicares em concluir, o teu perfil ficará visível para a comunidade KAZI.</p>
                </div>
              </div>
            </div>

            <div className="bg-brand-bg p-6 rounded-3xl border border-brand-gray space-y-4">
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="terms"
                  checked={formData.acceptedTerms}
                  onChange={e => setFormData({...formData, acceptedTerms: e.target.checked})}
                  className="w-5 h-5 rounded border-brand-gray text-primary focus:ring-primary"
                />
                <label htmlFor="terms" className="text-sm font-bold text-brand-ink cursor-pointer">
                  Eu aceito os <button onClick={() => setShowTerms('terms')} className="text-primary underline">Termos e Condições</button> e a <button onClick={() => setShowTerms('privacy')} className="text-primary underline">Política de Privacidade</button>
                </label>
              </div>
            </div>

            <TermsModal 
              show={!!showTerms} 
              onClose={() => setShowTerms(null)} 
              type={showTerms || 'terms'} 
            />
          </div>
        )}

        <div className="flex gap-4 mt-12">
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 border border-brand-gray rounded-2xl font-bold text-brand-ink/60 hover:bg-brand-gray transition-all"
            >
              Voltar
            </button>
          ) : onSkip && (
            <button 
              onClick={onSkip}
              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
            >
              <span>Explorar Primeiro</span>
            </button>
          )}
          <button 
            onClick={() => step < 4 ? nextStep() : handleSubmit()}
            disabled={loading || (step === 4 && !formData.acceptedTerms)}
            className={cn(
              "flex-[2] py-4 text-white rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center space-x-2",
              (loading || (step === 4 && !formData.acceptedTerms)) 
                ? "bg-brand-gray cursor-not-allowed shadow-none" 
                : "bg-primary hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>A processar...</span>
              </>
            ) : (
              <span>{step < 4 ? 'Continuar' : 'Concluir Perfil'}</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
