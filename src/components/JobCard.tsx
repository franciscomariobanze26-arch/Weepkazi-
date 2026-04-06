import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, ChevronRight, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { safeToDate } from '../lib/utils';

interface JobCardProps {
  job: any;
  onDelete?: (id: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onDelete }) => {
  const { profile } = useAuth();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors shrink-0">
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
        <div className="text-right w-full sm:w-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            {job.createdAt ? formatDistanceToNow(safeToDate(job.createdAt), { addSuffix: true, locale: ptBR }) : ''}
          </p>
          <div className="flex items-center justify-end gap-3">
            {profile?.uid === job.authorId && onDelete && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(job.id);
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
  );
};
