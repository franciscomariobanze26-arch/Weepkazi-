import React, { useState, useEffect } from 'react';
import { query, collection, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { BookOpen, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { db } from '../firebase';
import { handleFirestoreError } from '../lib/utils';
import { OperationType, Education } from '../types';

export const EducationList = () => {
  const [resources, setResources] = useState<Education[]>([]);
  const [selectedResource, setSelectedResource] = useState<Education | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'education'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Education)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'education'));
    return () => unsubscribe();
  }, []);

  // Default resources if empty
  const defaultResources = [
    { id: '1', title: 'Como negociar o teu preço', category: 'Negócios', content: 'Aprende a valorizar o teu trabalho e a chegar a um acordo justo com o cliente.\n\n### Dicas de Negociação\n1. Conhece os teus custos\n2. Pesquisa o mercado\n3. Sê flexível mas firme\n4. Oferece pacotes de serviços' },
    { id: '2', title: 'Marketing para pequenos serviços', category: 'Marketing', content: 'Dicas simples para seres visto na tua comunidade e atrair mais clientes.\n\n### Estratégias de Marketing\n- Usa as redes sociais (WhatsApp, Facebook)\n- Pede recomendações aos clientes satisfeitos\n- Mantém o teu perfil KAZI atualizado com boas fotos' },
    { id: '3', title: 'Atendimento ao cliente de excelência', category: 'Soft Skills', content: 'Como garantir que o cliente te volta a chamar e te recomenda a outros.\n\n### Pilares do Atendimento\n- Pontualidade\n- Comunicação clara\n- Organização e limpeza\n- Honestidade nos prazos' }
  ];

  const displayResources = resources.length > 0 ? resources : defaultResources;

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">Centro de Aprendizagem</h1>
        <p className="text-brand-ink/60 text-lg">Dicas práticas e mini-cursos para te tornares um profissional de sucesso.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {displayResources.map((res) => (
          <div key={res.id} className="bg-white p-8 rounded-[40px] border border-brand-gray hover:shadow-2xl transition-all group">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2 block">{res.category}</span>
            <h3 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors">{res.title}</h3>
            <div className="text-brand-ink/60 text-sm mb-6 leading-relaxed line-clamp-3">
              {res.content}
            </div>
            <button 
              onClick={() => setSelectedResource(res as Education)}
              className="text-sm font-bold text-primary flex items-center hover:translate-x-1 transition-transform"
            >
              Ler mais <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedResource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-8 md:p-12 relative"
            >
              <button 
                onClick={() => setSelectedResource(null)}
                className="absolute top-6 right-6 p-2 hover:bg-brand-bg rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="mb-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">{selectedResource.category}</span>
                <h2 className="text-3xl font-black tracking-tighter">{selectedResource.title}</h2>
              </div>

              <div className="prose prose-brand max-w-none text-brand-ink/70 leading-relaxed markdown-body">
                <Markdown>{selectedResource.content}</Markdown>
              </div>

              <div className="mt-12 pt-8 border-t border-brand-gray flex justify-end">
                <button 
                  onClick={() => setSelectedResource(null)}
                  className="px-8 py-3 bg-brand-ink text-white rounded-2xl font-bold hover:bg-brand-ink/90 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
