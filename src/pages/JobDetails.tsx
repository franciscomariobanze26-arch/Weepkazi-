import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  ChevronLeft, 
  Loader2, 
  MapPin 
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  getDoc, 
  setDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { ConfirmModal } from '../components/ConfirmModal';

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  type: string;
  location: {
    province: string;
    district: string;
  };
  salary?: string;
  authorId: string;
  createdAt: any;
  status: 'open' | 'closed';
}

const LoadingScreen = () => (
  <div className="min-h-screen bg-brand-bg flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-4 animate-bounce">
        <Briefcase className="w-8 h-8 text-primary" />
      </div>
      <p className="text-brand-ink/40 font-black text-xs uppercase tracking-widest animate-pulse">A carregar vaga...</p>
    </div>
  </div>
);

export const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, setShowLoginPrompt } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const navigate = useNavigate();

  const safeToDate = (timestamp: any) => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    return new Date(timestamp);
  };

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'jobs', id), (d) => {
      if (d.exists()) {
        setJob({ id: d.id, ...d.data() } as Job);
      } else {
        toast.error('Vaga não encontrada.');
        navigate('/jobs');
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching job details:', error);
      toast.error('Erro ao carregar detalhes da vaga.');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id, navigate]);

  const contactRecruiter = async () => {
    if (!profile) {
      setShowLoginPrompt(true);
      return;
    }
    if (!job) return;
    if (profile.uid === job.authorId) {
      toast.error('Não podes contactar-te a ti mesmo.');
      return;
    }

    try {
      const chatId = [profile.uid, job.authorId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [profile.uid, job.authorId],
          lastMessage: `Olá, vi a tua vaga de "${job.title}" e estou interessado.`,
          lastMessageAt: serverTimestamp(),
          unreadCount: { [job.authorId]: 1, [profile.uid]: 0 },
          status: 'active',
          initiatorId: profile.uid,
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          content: `Olá, vi a tua vaga de "${job.title}" e estou interessado.`,
          senderId: profile.uid,
          createdAt: serverTimestamp(),
          read: false,
          type: 'text'
        });
      }

      navigate(`/chats/${chatId}`);
    } catch (err) {
      console.error('Error contacting recruiter:', err);
      toast.error('Erro ao iniciar conversa.');
    }
  };

  const handleCloseJob = async () => {
    if (!job) return;
    setIsClosing(true);
    try {
      await updateDoc(doc(db, 'jobs', job.id), { status: 'closed' });
      toast.success('Vaga fechada com sucesso!');
      setShowConfirmClose(false);
    } catch (err) {
      console.error('Error closing job:', err);
      toast.error('Erro ao fechar vaga.');
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!job) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 font-bold hover:text-primary transition-colors mb-8"
      >
        <ChevronLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center text-primary">
                <Briefcase className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">{job.title}</h1>
                <p className="text-xl font-bold text-gray-600">{job.company}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                {job.type}
              </span>
              <p className="text-sm font-bold text-gray-400 mt-2">
                Publicado {formatDistanceToNow(safeToDate(job.createdAt), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Província</p>
              <p className="font-bold text-gray-900">{job.location?.province || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Distrito</p>
              <p className="font-bold text-gray-900">{job.location?.district || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Salário</p>
              <p className="font-bold text-gray-900">{job.salary || 'A combinar'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estado</p>
              <p className={cn("font-bold uppercase tracking-wider text-xs", job.status === 'open' ? "text-green-600" : "text-red-600")}>
                {job.status === 'open' ? 'Aberta' : 'Fechada'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Descrição da Vaga</h3>
          <div className="prose prose-gray max-w-none mb-12">
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">{job.description}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={contactRecruiter}
              className="flex-1 bg-primary text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
            >
              Contactar Recrutador
            </button>
            {profile?.uid === job.authorId && job.status === 'open' && (
              <button 
                onClick={() => setShowConfirmClose(true)}
                className="flex-1 bg-gray-100 text-gray-900 py-5 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Fechar Vaga
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal 
        show={showConfirmClose}
        title="Fechar Vaga?"
        message="Tens a certeza que queres fechar esta vaga? Ninguém mais poderá candidatar-se."
        onConfirm={handleCloseJob}
        onCancel={() => setShowConfirmClose(false)}
        loading={isClosing}
      />
    </div>
  );
};


