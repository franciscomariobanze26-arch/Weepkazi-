import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronRight, 
  MapPin, 
  Globe, 
  Clock, 
  MessageCircle, 
  Star, 
  Lock, 
  ImageIcon, 
  X
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  addDoc, 
  collection, 
  setDoc 
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ReviewList } from '../components/ReviewList';
import { ReportButton } from '../components/ReportButton';
import { Logo } from '../components/Logo';
import { cn, handleFirestoreError, safeToDate } from '../lib/utils';
import { compressImage } from '../lib/imageUtils';
import { OperationType, Service, UserProfile } from '../types';
import { ValidationService } from '../services/validationService';
import { toast } from 'sonner';

export const ServiceDetail = () => {
  const { id } = useParams();
  const [service, setService] = useState<Service | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [orderMessage, setOrderMessage] = useState('');
  const [orderImage, setOrderImage] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const { profile, setShowLoginPrompt } = useAuth();
  const navigate = useNavigate();
  const hasUpdatedHistory = useRef(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file, 1200, 1200, 0.7);
      setOrderImage(compressedBase64);
    } catch (err) {
      console.error('Error processing image:', err);
      toast.error('Erro ao processar a imagem.');
    } finally {
      e.target.value = '';
    }
  };

  const handleStartChat = async () => {
    if (!profile) {
      setShowLoginPrompt(true);
      return;
    }
    if (!service) return;
    if (profile.uid === service.authorId) return;

    const chatId = [profile.uid, service.authorId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    
    try {
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [profile.uid, service.authorId],
          status: 'pending',
          initiatorId: profile.uid,
          lastMessage: `Interesse no serviço: ${service.title}`,
          lastMessageAt: serverTimestamp(),
          unreadCount: { [service.authorId]: 1, [profile.uid]: 0 },
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          content: `Interesse no serviço: ${service.title}`,
          senderId: profile.uid,
          createdAt: serverTimestamp(),
          read: false,
          type: 'text'
        });
      }

      navigate(`/chats/${chatId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'services', id), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Service;
        setService({ id: docSnap.id, ...data });
        
        try {
          const authorSnap = await getDoc(doc(db, 'users', data.authorId));
          if (authorSnap.exists()) {
            setAuthor(authorSnap.data() as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${data.authorId}`);
        }

        // Add to view history (only once per mount/id change)
        if (profile && !hasUpdatedHistory.current) {
          hasUpdatedHistory.current = true;
          const historyItem = { id: docSnap.id, type: 'service' as const, timestamp: Date.now() };
          const currentHistory = profile.viewHistory || [];
          const filteredHistory = currentHistory.filter(h => h.id !== docSnap.id).slice(0, 19);
          await updateDoc(doc(db, 'users', profile.uid), {
            viewHistory: [historyItem, ...filteredHistory]
          });
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `services/${id}`));
    return () => unsubscribe();
  }, [id, profile?.uid]);

  const handleOrder = async () => {
    if (!profile) {
      setShowLoginPrompt(true);
      return;
    }
    if (!service) return;

    if (!orderMessage.trim()) {
      toast.error('Por favor, descreve o que precisas.');
      return;
    }

    const msgVal = ValidationService.validateContent(orderMessage, 10);
    if (!msgVal.valid) {
      toast.error(`Mensagem: ${msgVal.error}`);
      return;
    }

    setIsOrdering(true);
    try {
      const orderData = {
        serviceId: service.id,
        serviceTitle: service.title,
        clientId: profile.uid,
        clientName: profile.displayName,
        providerId: service.authorId,
        providerName: service.authorName,
        status: 'pending',
        message: orderMessage.trim(),
        imageURL: orderImage || null,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'orders'), orderData);
      toast.success('Pedido enviado com sucesso!');
      navigate('/orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsOrdering(false);
    }
  };

  if (!service) return <div className="animate-pulse space-y-8 max-w-7xl mx-auto px-4 py-12">
    <div className="h-96 bg-gray-200 rounded-[40px]" />
    <div className="h-8 bg-gray-200 w-1/2 rounded" />
    <div className="h-24 bg-gray-200 rounded" />
  </div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-8">
          <div className="h-96 rounded-[40px] overflow-hidden shadow-2xl">
            <img src={service.photoURL || `https://picsum.photos/seed/${service.id}/1200/800`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="flex items-center space-x-2 text-primary font-bold uppercase tracking-widest text-xs mb-2">
              <span>{service.category}</span>
              <ChevronRight className="w-3 h-3" />
              <span>{service.location?.district}, {service.location?.province}</span>
            </div>
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-4xl font-bold">{service.title}</h1>
              {profile?.uid !== service.authorId && (
                <ReportButton reportedId={service.id} reportedType="service" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-brand-ink/60">
              <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {service.location?.district}, {service.location?.province}</div>
              <button 
                onClick={() => {
                  const query = encodeURIComponent(`${service.location?.district}, ${service.location?.province}, Moçambique`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                }}
                className="flex items-center text-primary hover:underline font-bold"
              >
                <Globe className="w-4 h-4 mr-1" /> Ver no Mapa
              </button>
              <div className="flex items-center"><Clock className="w-4 h-4 mr-1" /> Postado {formatDistanceToNow(safeToDate(service.createdAt), { addSuffix: true, locale: ptBR })}</div>
            </div>
          </div>
          <div className="prose prose-stone max-w-none">
            <h3 className="text-xl font-bold mb-4">Sobre este serviço</h3>
            <p className="text-lg text-brand-ink/80 leading-relaxed">{service.description}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-brand-gray shadow-xl sticky top-24">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-medium text-brand-ink/60">Preço sugerido</span>
              <span className="text-3xl font-bold text-brand-ink">MT {service.price}</span>
            </div>
            
            <div className="space-y-4 mb-8">
              {profile?.uid === service.authorId ? (
                <div className="p-4 bg-brand-bg rounded-2xl border border-brand-gray text-center">
                  <p className="text-xs font-bold text-brand-ink/40 uppercase tracking-widest">Este é o teu próprio serviço</p>
                  <p className="text-[10px] text-brand-ink/30 mt-1">Não podes fazer pedidos a ti mesmo.</p>
                </div>
              ) : !profile ? (
                <div className="p-8 bg-brand-bg rounded-3xl border border-brand-gray text-center space-y-6">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary mx-auto shadow-sm">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black tracking-tight mb-2">Login necessário</h4>
                    <p className="text-xs text-brand-ink/40 font-medium leading-relaxed">
                      Inicie sessão para fazer pedidos, enviar mensagens e ver detalhes de contacto.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowLoginPrompt(true)}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    Entrar para pedir/contatar
                  </button>
                </div>
              ) : (
                <>
                  <textarea 
                    placeholder="Olá! Gostaria de saber mais sobre este serviço..."
                    value={orderMessage}
                    onChange={(e) => setOrderMessage(e.target.value)}
                    className="w-full p-4 bg-brand-bg rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none h-32 resize-none text-sm"
                  />
                  
                  <div className="flex flex-col gap-3">
                    {orderImage && (
                      <div className="relative w-full h-32 rounded-2xl overflow-hidden group">
                        <img src={orderImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => setOrderImage(null)}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-brand-gray rounded-2xl cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all text-brand-ink/40 hover:text-primary">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {orderImage ? 'Alterar Imagem' : 'Anexar Imagem/Documento'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleOrder}
                      disabled={isOrdering}
                      className="py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                      {isOrdering ? 'A processar...' : 'Fazer Pedido'}
                    </button>
                    <button 
                      onClick={handleStartChat}
                      className="py-4 bg-brand-ink text-white rounded-2xl font-bold hover:bg-brand-ink/90 transition-all shadow-lg shadow-brand-ink/20 flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Mensagem</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="pt-6 border-t border-brand-gray">
              <Link to={`/profile/${service.authorId}`} className="flex items-center group">
                <img src={service.authorPhoto || `https://ui-avatars.com/api/?name=${service.authorName}`} className="w-12 h-12 rounded-full mr-4 object-cover" />
                <div>
                  <p className="font-bold group-hover:text-primary transition-colors">{service.authorName}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-xs font-bold text-brand-ink ml-1">{author?.rating || '0.0'}</span>
                    </div>
                    <span className="text-xs text-brand-ink/40 font-bold">({author?.reviewCount || 0} avaliações)</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Reviews Section */}
            <div className="pt-8 border-t border-brand-gray">
              <h3 className="text-lg font-black tracking-tight mb-6">Avaliações dos Clientes</h3>
              <ReviewList serviceId={service.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
