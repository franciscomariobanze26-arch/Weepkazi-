import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Camera, Loader2, Users, Shield, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { query, collection, orderBy, limit, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { cn, handleFirestoreError } from '../lib/utils';
import { OperationType, Community } from '../types';
import { toast } from 'sonner';
import { compressImage } from '../lib/imageUtils';
import { ValidationService } from '../services/validationService';
import { TermsModal } from '../components/TermsModal';
import { ConfirmModal } from '../components/ConfirmModal';

export const CommunityList: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newComm, setNewComm] = useState({ name: '', description: '', category: 'Geral', requiresApproval: false, acceptedRules: false });
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showTerms, setShowTerms] = useState<null | 'rules'>(null);
  const [commToDelete, setCommToDelete] = useState<string | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleDeleteComm = async () => {
    if (!commToDelete) return;
    try {
      await deleteDoc(doc(db, 'communities', commToDelete));
      toast.success('Comunidade eliminada.');
    } catch (err) {
      console.error('Error deleting community:', err);
      toast.error('Erro ao eliminar comunidade.');
    } finally {
      setCommToDelete(null);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'communities'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCommunities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Community)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching communities:', error);
      handleFirestoreError(error, OperationType.LIST, 'communities');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file, 800, 800, 0.7);
      setPendingPhoto(compressedBase64);
    } catch (err) {
      console.error('Error processing image:', err);
      toast.error('Erro ao processar a imagem.');
    }
  };

  const handleCreate = async () => {
    if (!newComm.name || !newComm.description || !profile) return;

    if (!newComm.acceptedRules) {
      toast.error('Precisas de aceitar as Regras da Comunidade.');
      return;
    }

    const nameVal = ValidationService.validateContent(newComm.name, 3);
    if (!nameVal.valid) {
      toast.error(`Nome: ${nameVal.error}`);
      return;
    }

    const descVal = ValidationService.validateContent(newComm.description, 10);
    if (!descVal.valid) {
      toast.error(`Descrição: ${descVal.error}`);
      return;
    }

    setIsCreating(true);
    try {
      let photoURL = pendingPhoto || null;

      const docRef = await addDoc(collection(db, 'communities'), {
        ...newComm,
        photoURL,
        memberCount: 1,
        creatorId: profile.uid,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'communities', docRef.id, 'members', profile.uid), {
        uid: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL || null,
        status: 'approved',
        role: 'admin',
        joinedAt: serverTimestamp()
      });

      setShowCreate(false);
      setPendingPhoto(null);
      setNewComm({ name: '', description: '', category: 'Geral', requiresApproval: false, acceptedRules: false });
      navigate(`/communities/${docRef.id}`);
    } catch (err) {
      console.error('Error creating community:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className={cn("max-w-4xl mx-auto", !hideHeader && "p-6 pb-24")}>
      {!hideHeader && (
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Comunidades</h1>
            <p className="text-gray-500 font-medium mt-1">Conecta-te com outros profissionais e clientes.</p>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-end mb-4 px-2">
           <button 
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Comunidade
          </button>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[40px] max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6">Criar Comunidade</h2>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="flex justify-center mb-6">
                  <label className="relative cursor-pointer group">
                    <div className="w-24 h-24 rounded-3xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 group-hover:border-primary/50 transition-all">
                      {pendingPhoto ? (
                        <img src={pendingPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Community preview" />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg">
                      <Plus className="w-4 h-4" />
                    </div>
                  </label>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Nome</label>
                  <input 
                    type="text"
                    value={newComm.name}
                    onChange={(e) => setNewComm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-medium"
                    placeholder="Ex: Designers locais"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Categoria</label>
                  <select 
                    value={newComm.category}
                    onChange={(e) => setNewComm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-medium"
                  >
                    <option value="Geral">Geral</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Artes">Artes</option>
                    <option value="Negócios">Negócios</option>
                    <option value="Educação">Educação</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Descrição</label>
                  <textarea 
                    value={newComm.description}
                    onChange={(e) => setNewComm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 text-sm font-medium h-24 resize-none"
                    placeholder="Sobre o que é esta comunidade?"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-black text-gray-900">Requer Aprovação</p>
                    <p className="text-[10px] text-gray-400 font-bold">Administrador aprova novos membros</p>
                  </div>
                  <button 
                    onClick={() => setNewComm(prev => ({ ...prev, requiresApproval: !prev.requiresApproval }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      newComm.requiresApproval ? "bg-primary" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      newComm.requiresApproval ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="comm-rules"
                    checked={newComm.acceptedRules}
                    onChange={(e) => setNewComm(prev => ({ ...prev, acceptedRules: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="comm-rules" className="text-xs font-bold text-gray-600 cursor-pointer">
                    Eu aceito as <button onClick={() => setShowTerms('rules')} className="text-primary underline">Regras da Comunidade</button>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreate}
                    disabled={isCreating || !newComm.acceptedRules}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Criar'}
                  </button>
                </div>
              </div>
            </motion.div>

            <TermsModal 
              show={!!showTerms} 
              onClose={() => setShowTerms(null)} 
              type={showTerms || 'rules'} 
            />
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {communities.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Ainda não existem comunidades.</p>
            <button className="mt-4 text-primary font-black text-sm">Sê o primeiro a criar uma!</button>
          </div>
        ) : (
          communities.map((community) => (
            <Link 
              key={community.id} 
              to={`/communities/${community.id}`}
              className="bg-white p-6 rounded-[32px] border border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  {community.photoURL ? (
                    <img src={community.photoURL} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" alt={community.name} />
                  ) : (
                    <Users className="w-8 h-8" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-900 text-lg truncate">{community.name}</h3>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mt-0.5">{community.category}</p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2 font-medium leading-relaxed">
                    {community.description}
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-bold">{community.memberCount} membros</span>
                    </div>
                    {community.creatorId === profile?.uid && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                          <Shield className="w-3 h-3" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">Admin</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCommToDelete(community.id);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar comunidade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
      <ConfirmModal 
        show={!!commToDelete}
        title="Eliminar Comunidade?"
        message="Tens a certeza que queres eliminar esta comunidade? Esta ação é irreversível e todos os dados serão perdidos."
        onConfirm={handleDeleteComm}
        onCancel={() => setCommToDelete(null)}
      />
    </div>
  );
};
