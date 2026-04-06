import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const TERMS_AND_CONDITIONS = `
# Termos e Condições da KAZI

Bem-vindo à KAZI. Ao utilizar a nossa plataforma, concordas com os seguintes termos:

1. **Uso da Plataforma**: A KAZI é um mercado para conectar prestadores de serviços e clientes em Moçambique e África do Sul.
2. **Responsabilidade**: Não nos responsabilizamos pela qualidade dos serviços prestados ou pela conduta dos utilizadores.
3. **Pagamentos**: Todos os pagamentos e negociações são feitos diretamente entre o cliente e o prestador.
4. **Conduta**: É proibido publicar conteúdo ilegal, ofensivo ou fraudulento.
5. **Privacidade**: Respeitamos os teus dados. Consulta a nossa Política de Privacidade.
`;

const PRIVACY_POLICY = `
# Política de Privacidade da KAZI

A tua privacidade é importante para nós:

1. **Dados Recolhidos**: Recolhemos o teu nome, e-mail, número de telefone e localização para o funcionamento da plataforma.
2. **Uso de Dados**: Os teus dados são usados apenas para te conectar com outros utilizadores e melhorar a experiência na KAZI.
3. **Partilha**: Não vendemos os teus dados a terceiros.
4. **Segurança**: Implementamos medidas de segurança para proteger as tuas informações.
`;

const COMMUNITY_RULES = `
# Regras da Comunidade KAZI

Para manter um ambiente saudável e produtivo:

1. **Respeito Mútuo**: Trata todos os membros com respeito e cortesia.
2. **Sem Spam**: Não publiques anúncios repetitivos ou irrelevantes.
3. **Conteúdo Relevante**: Mantém as discussões focadas no propósito da comunidade.
4. **Segurança**: Não partilhes informações sensíveis ou perigosas.
5. **Moderação**: Os administradores têm o direito de remover conteúdo ou membros que violem estas regras.
`;

interface TermsModalProps {
  show: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy' | 'rules';
}

export const TermsModal: React.FC<TermsModalProps> = ({ show, onClose, type }) => {
  if (!show) return null;

  const content = {
    terms: TERMS_AND_CONDITIONS,
    privacy: PRIVACY_POLICY,
    rules: COMMUNITY_RULES
  }[type];

  const title = {
    terms: 'Termos e Condições',
    privacy: 'Política de Privacidade',
    rules: 'Regras da Comunidade'
  }[type];

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[40px] p-8 shadow-2xl max-h-[80vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap font-medium leading-relaxed">
          {content}
        </div>
        <button 
          onClick={onClose}
          className="w-full mt-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Entendi
        </button>
      </motion.div>
    </div>
  );
};


