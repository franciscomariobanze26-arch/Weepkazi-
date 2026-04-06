import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, BookOpen } from 'lucide-react';
import Markdown from 'react-markdown';

interface CourseModalProps {
  course: string;
  onClose: () => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({ course, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        // AI features are disabled as per user request
        setContent('# 🚀 ' + course + '\n\n## 💡 Conteúdo em Breve\n\nEstamos a preparar este guia prático para ti. Volta em breve para aprenderes mais sobre como brilhar em Moçambique!\n\n## ✨ O que podes esperar\n- Passos práticos e acionáveis\n- Dicas de ouro para o teu sucesso\n- Erros comuns a evitar\n\n🏁 **KAZI: O teu sucesso começa aqui!**');
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course:', err);
        setContent('Erro ao carregar o curso. Tenta novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [course]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col relative"
      >
        {/* Header */}
        <div className="p-8 md:p-12 pb-4 border-b border-gray-50 shrink-0">
          <button onClick={onClose} className="absolute top-8 right-8 p-2 text-brand-ink/20 hover:text-brand-ink transition-colors z-10">
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Curso Rápido KAZI</p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-brand-ink leading-none">{course}</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 pt-4 custom-scrollbar">
          <div className="prose prose-brand max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-brand-ink/80 prose-li:text-brand-ink/80">
            {loading ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-full" />
              </div>
            ) : (
              <div className="markdown-body">
                <Markdown>{content}</Markdown>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 md:p-12 pt-4 border-t border-gray-50 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-brand-ink text-white rounded-2xl font-black hover:bg-brand-ink/90 transition-all shadow-xl shadow-brand-ink/10 active:scale-[0.98]"
          >
            Entendido, vamos a isso!
          </button>
        </div>
      </motion.div>
    </div>
  );
};
