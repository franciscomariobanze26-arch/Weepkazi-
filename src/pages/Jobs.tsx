import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  ChevronRight, 
  Loader2, 
  Trash2 
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { MOZAMBIQUE_LOCATIONS } from '../constants';
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

export const Jobs: React.FC = () => {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProvince, setFilterProvince] = useState(profile?.location?.province || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const safeToDate = (timestamp: any) => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    return new Date(timestamp);
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      await deleteDoc(doc(db, 'jobs', jobToDelete));
      toast.success('Vaga apagada.');
    } catch (err) {
      console.error('Error deleting job:', err);
      toast.error('Erro ao apagar vaga.');
    } finally {
      setJobToDelete(null);
    }
  };

  useEffect(() => {
    let q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(50));
    
    if (filterProvince) {
      q = query(collection(db, 'jobs'), where('location.province', '==', filterProvince), orderBy('createdAt', 'desc'), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching jobs:', error);
      toast.error('Erro ao carregar oportunidades de emprego.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filterProvince]);

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Oportunidades de Emprego</h1>
          <p className="text-gray-500 font-medium">Encontra o teu próximo desafio ou contrata talentos jovens.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Filtros</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Província</label>
                <select 
                  value={filterProvince}
                  onChange={(e) => setFilterProvince(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Todas as Províncias</option>
                  {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pesquisar</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Título, empresa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Job List */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map(job => (
              <motion.div 
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      <Briefcase className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{job.title}</h3>
                      <p className="text-gray-600 font-bold mb-2">{job.company}</p>
                      <div className="flex flex-wrap gap-3 text-sm font-medium text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                          <MapPin className="w-3.5 h-3.5" /> {job.location?.province || 'N/A'}, {job.location?.district || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-bold">
                          {job.type}
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                            MT {job.salary}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                      {formatDistanceToNow(safeToDate(job.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                    <div className="flex items-center justify-end gap-3">
                      {profile?.uid === job.authorId && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setJobToDelete(job.id);
                          }}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                          title="Apagar vaga"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <Link 
                        to={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
                      >
                        Ver Detalhes <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-24 bg-white rounded-[48px] border-2 border-dashed border-gray-100">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Sem oportunidades encontradas</h3>
              <p className="text-gray-500 font-medium">Tenta ajustar os teus filtros ou pesquisa.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal 
        show={!!jobToDelete}
        title="Apagar Vaga?"
        message="Tens a certeza que queres apagar esta vaga de emprego? Esta ação não pode ser desfeita."
        onConfirm={handleDeleteJob}
        onCancel={() => setJobToDelete(null)}
      />
    </div>
  );
};


