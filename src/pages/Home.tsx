import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Star, 
  ChevronRight, 
  CheckCircle, 
  BookOpen, 
  Sparkles, 
  Trash2 
} from 'lucide-react';
import { 
  query, 
  collection, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ServiceCard } from '../components/ServiceCard';
import { CourseModal } from '../components/CourseModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReportButton } from '../components/ReportButton';
import { safeToDate } from '../lib/utils';
import { Service, Announcement, UserProfile } from '../types';
import { toast } from 'sonner';

export const Home = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [rankedServices, setRankedServices] = useState<Service[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [activeProfiles, setActiveProfiles] = useState<UserProfile[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  const categories = [
    { id: 'domestico', name: 'Doméstico' },
    { id: 'design', name: 'Design' },
    { id: 'aulas', name: 'Aulas' },
    { id: 'reparos', name: 'Reparos' }
  ];

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      setRecentServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('rating', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      setRankedServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(5));
    return onSnapshot(q, (snapshot) => {
      setRecentAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('updatedAt', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      setActiveProfiles(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
  }, []);

  const favoriteServices = recentServices.filter(s => profile?.favorites?.services?.includes(s.id));
  const localServices = recentServices.filter(s => s.location?.province === profile?.location?.province);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (searchQuery.trim().startsWith('@')) {
        navigate(`/services?u=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        navigate(`/services?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
      toast.success('Anúncio apagado com sucesso.');
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast.error('Erro ao apagar o anúncio.');
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-12">
      {/* Header Greeting */}
      <section className="pt-4">
        <h1 className="text-3xl font-black tracking-tight text-brand-ink mb-1">
          Olá, {profile?.displayName.split(' ')[0] || 'Visitante'}!
          {profile?.handle && <span className="text-xs font-bold text-primary ml-2">{profile.handle}</span>}
        </h1>
        <p className="text-lg font-bold text-brand-ink/60 leading-tight">
          Encontre Trabalhos & Serviços<br />Perto de Si.
        </p>
      </section>

      {/* Search Bar */}
      <section>
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            placeholder="O que procura?" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full p-5 pr-14 bg-white text-brand-ink rounded-2xl outline-none border border-brand-gray/50 shadow-sm font-bold text-lg placeholder:text-brand-ink/30"
          />
          <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
            <Search className="w-6 h-6" />
          </button>
        </form>
      </section>

      {/* Categories Pills */}
      <section className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => (
          <Link 
            key={cat.id} 
            to={`/services?category=${cat.id}`}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm whitespace-nowrap shadow-lg shadow-primary/20"
          >
            {cat.name}
          </Link>
        ))}
        <Link to="/services" className="px-6 py-3 bg-brand-ink/5 text-brand-ink/60 rounded-xl font-bold text-sm whitespace-nowrap">
          Vendas
        </Link>
      </section>

      {/* Featured / Top Rated Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tracking-tight text-brand-ink">
            Melhores Prestadores
          </h2>
          <Link to="/services" className="text-primary text-sm font-bold">Ver Ranking</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {rankedServices.slice(0, 5).map(service => (
            <div key={service.id} className="min-w-[280px] max-w-[280px]">
              <ServiceCard service={service} />
            </div>
          ))}
        </div>
      </section>

      {/* Favorites Section */}
      {favoriteServices.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black tracking-tight text-brand-ink">
              Os Teus Favoritos
            </h2>
            <Star className="w-5 h-5 text-primary fill-current" />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {favoriteServices.map(service => (
              <div key={service.id} className="min-w-[280px] max-w-[280px]">
                <ServiceCard service={service} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Opportunities Section */}
      <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black tracking-tight text-brand-ink">
              Oportunidades em {profile?.location?.province || 'Moçambique'}
            </h2>
            <ChevronRight className="w-6 h-6 text-brand-ink/20" />
          </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {localServices.length > 0 ? localServices.map((service) => (
            <Link 
              key={service.id} 
              to={`/service/${service.id}`}
              className="min-w-[280px] bg-white rounded-[32px] overflow-hidden border border-brand-gray/50 shadow-sm"
            >
              <div className="h-40 relative">
                <img src={service.photoURL || `https://picsum.photos/seed/${service.id}/400/300`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-black text-lg leading-tight mb-1">{service.title}</h3>
                  <div className="flex justify-between items-center text-[10px] font-bold opacity-80 uppercase tracking-widest">
                    <span>{service.price} MT / Dia</span>
                    <span>• {service.location?.province || 'Moçambique'}</span>
                  </div>
                </div>
              </div>
            </Link>
          )) : (
            <div className="min-w-[280px] h-40 bg-brand-ink/5 rounded-[32px] flex items-center justify-center border border-dashed border-brand-gray">
              <p className="text-xs font-bold text-brand-ink/30 uppercase tracking-widest">Sem oportunidades locais</p>
            </div>
          )}
        </div>
      </section>

      {/* Announcements Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tracking-tight text-brand-ink">Anúncios da Comunidade</h2>
          <ChevronRight className="w-6 h-6 text-brand-ink/20" />
        </div>
        <div className="space-y-4">
          {recentAnnouncements.map((ann) => (
            <div key={ann.id} className="bg-white p-6 rounded-[32px] border border-brand-gray/50 shadow-sm relative group">
              <div className="flex items-center gap-3 mb-4">
                <img src={ann.authorPhoto || `https://ui-avatars.com/api/?name=${ann.authorName}`} className="w-10 h-10 rounded-full" />
                <div>
                  <h4 className="font-black text-sm text-brand-ink">{ann.authorName}</h4>
                  <p className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">
                    {formatDistanceToNow(safeToDate(ann.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-brand-ink/80 leading-relaxed">{ann.content}</p>
              {ann.photoURL && (
                <img src={ann.photoURL} className="mt-4 rounded-2xl w-full h-48 object-cover" referrerPolicy="no-referrer" />
              )}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                {profile?.uid === ann.authorId && (
                  <button 
                    onClick={() => setAnnouncementToDelete(ann.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                    title="Apagar anúncio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <ReportButton reportedId={ann.id} reportedType="announcement" />
              </div>
            </div>
          ))}
          {recentAnnouncements.length === 0 && (
            <div className="p-12 text-center bg-brand-ink/5 rounded-[32px] border border-dashed border-brand-gray">
              <p className="text-xs font-bold text-brand-ink/30 uppercase tracking-widest">Nenhum anúncio recente</p>
            </div>
          )}
        </div>
      </section>

      {/* Quick Courses Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tracking-tight text-brand-ink">Cursos Rápidos</h2>
          <ChevronRight className="w-6 h-6 text-brand-ink/20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setSelectedCourse('Como Fazer um CV de Sucesso')}
            className="bg-white p-4 rounded-[24px] border border-brand-gray/50 shadow-sm flex items-center gap-3 text-left group hover:border-primary/30 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-brand-ink leading-tight">Como Fazer<br />CV</p>
            </div>
          </button>
          <button 
            onClick={() => setSelectedCourse('Dicas de Negócio para Jovens')}
            className="bg-white p-4 rounded-[24px] border border-brand-gray/50 shadow-sm flex items-center gap-3 text-left group hover:border-primary/30 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-brand-ink leading-tight">Dicas de<br />Negócio</p>
            </div>
          </button>
        </div>
      </section>

      {selectedCourse && (
        <CourseModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)} 
        />
      )}

      {/* Active Profiles Section */}
      {activeProfiles.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black tracking-tight text-brand-ink">Talentos em Destaque</h2>
            <ChevronRight className="w-6 h-6 text-brand-ink/20" />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {activeProfiles.map((p) => (
              <Link 
                key={p.uid} 
                to={`/profile/${p.uid}`}
                className="min-w-[140px] flex flex-col items-center p-6 bg-white rounded-[32px] border border-brand-gray/50 shadow-sm hover:border-primary transition-all"
              >
                <div className="relative mb-3">
                  <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}`} className="w-16 h-16 rounded-2xl object-cover" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <p className="text-xs font-black text-brand-ink text-center truncate w-full">{p.displayName.split(' ')[0]}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{p.handle || '@utilizador'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Profile Bar */}
      {profile && (
        <section className="bg-white p-4 rounded-[24px] border border-brand-gray/50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                <CheckCircle className="w-2 h-2 text-white" />
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-brand-ink">
                Perfil de {profile.displayName.split(' ')[0]} 
                {profile.handle && <span className="text-primary ml-1">{profile.handle}</span>}
                : <span className="text-secondary">Prestador</span>
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  <span className="text-[10px] font-bold text-brand-ink ml-1">{profile.rating || '0.0'}</span>
                </div>
                <span className="text-[10px] text-brand-ink/30 font-bold">({profile.reviewCount || 0})</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Slogan */}
      <div className="py-8 text-center">
        <p className="text-lg font-black italic text-brand-ink/80">
          Aprenda. Trabalhe. Cresça com <span className="text-primary">Kazi</span>
        </p>
      </div>

      <ConfirmModal
        show={!!announcementToDelete}
        title="Apagar Anúncio"
        message="Tens a certeza que queres apagar este anúncio? Esta ação não pode ser desfeita."
        onConfirm={() => {
          if (announcementToDelete) {
            deleteAnnouncement(announcementToDelete);
            setAnnouncementToDelete(null);
          }
        }}
        onCancel={() => setAnnouncementToDelete(null)}
      />
    </div>
  );
};
