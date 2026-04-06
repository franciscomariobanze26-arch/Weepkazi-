import React from 'react';
import { Mail, Phone, Globe, MapPin, CheckCircle, HelpCircle } from 'lucide-react';

export const Terms = () => (
  <div className="max-w-3xl mx-auto py-20 px-4">
    <h1 className="text-4xl font-black tracking-tighter mb-8 text-brand-ink">Termos de Serviço</h1>
    <div className="prose prose-brand max-w-none text-brand-ink/70 leading-relaxed space-y-8 font-medium">
      <section>
        <p className="text-lg">Bem-vindo à KAZI, uma plataforma digital que conecta prestadores de serviços a clientes em Moçambique. Estes Termos constituem um acordo legal vinculativo.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">1. Aceitação dos Termos</h2>
        <p>Ao utilizar a KAZI, o utilizador concorda com todos os termos descritos, confirma capacidade legal para celebrar contratos e compromete-se a cumprir as leis aplicáveis.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">2. Natureza da Plataforma</h2>
        <p>A KAZI atua exclusivamente como intermediária digital e facilitadora de contacto. A KAZI não é empregadora, agência de recrutamento ou prestadora direta de serviços.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">3. Elegibilidade</h2>
        <p>Para utilizar a plataforma, o utilizador deve ter pelo menos 18 anos, possuir capacidade civil e não estar impedido por lei.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">4. Registo e Conta</h2>
        <p>O utilizador deve fornecer dados verdadeiros, não utilizar identidade falsa e é responsável pela segurança da sua senha.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">5. Perfil e Identidade</h2>
        <p>Perfis devem conter informações reais e fotografias autênticas. A KAZI pode remover perfis falsos ou solicitar verificação.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">6. Publicação de Serviços</h2>
        <p>Prestadores podem criar anúncios e definir preços. É proibido publicar serviços ilegais, enganar clientes ou usar imagens falsas.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">7. Contratação</h2>
        <p>O acordo é direto entre as partes. A KAZI não participa no contrato nem se responsabiliza pela execução ou qualidade do serviço.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">8. Pagamentos</h2>
        <p>Atualmente, os pagamentos são feitos fora da plataforma através de negociação direta. Futuramente poderemos implementar carteiras digitais.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">9. Taxas e Cobranças</h2>
        <p>A KAZI reserva-se o direito de introduzir planos pagos, taxas por destaque de serviços ou aplicar comissões, comunicando previamente.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">10. Moderação e Banimento</h2>
        <p>A KAZI pode monitorar atividades, remover conteúdos e suspender contas em caso de violação dos termos ou denúncias válidas, sem aviso prévio.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">11. Legislação Aplicável</h2>
        <p>Estes termos são regidos pelas leis de Moçambique.</p>
      </section>
    </div>
  </div>
);

export const Privacy = () => (
  <div className="max-w-3xl mx-auto py-20 px-4">
    <h1 className="text-4xl font-black tracking-tighter mb-8 text-brand-ink">Política de Privacidade</h1>
    <div className="prose prose-brand max-w-none text-brand-ink/70 leading-relaxed space-y-8 font-medium">
      <section>
        <p className="text-lg">Na KAZI, valorizamos a tua privacidade. Esta política explica como recolhemos e protegemos os teus dados ao utilizares a nossa plataforma.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">1. Dados que Recolhemos</h2>
        <p>Recolhemos dados fornecidos por ti (nome, telemóvel, email, foto, localização) e dados recolhidos automaticamente (IP, tipo de dispositivo, logs de acesso).</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">2. Finalidade do Uso</h2>
        <p>Utilizamos os teus dados para o funcionamento da plataforma, personalização da experiência, segurança (prevenir fraudes) e comunicação.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">3. Partilha de Dados</h2>
        <p>A KAZI não vende dados pessoais. Partilhamos informações entre utilizadores apenas quando há interação ou interesse em serviços.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">4. Armazenamento e Segurança</h2>
        <p>Adotamos medidas técnicas como criptografia e servidores seguros. No entanto, nenhum sistema é 100% invulnerável.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">5. Direitos do Utilizador</h2>
        <p>Tens direito a aceder, corrigir ou solicitar a eliminação dos teus dados através do nosso contacto oficial.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">6. Cookies</h2>
        <p>Utilizamos cookies para melhorar a experiência, analisar comportamento e personalizar conteúdo.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-brand-ink uppercase tracking-widest">7. Proteção de Menores</h2>
        <p>A KAZI não é destinada a menores de 18 anos. Não recolhemos intencionalmente dados de menores.</p>
      </section>
    </div>
  </div>
);

export const Contact = () => (
  <div className="max-w-4xl mx-auto py-20 px-4">
    <h1 className="text-4xl font-black tracking-tighter mb-4 text-brand-ink">Suporte & Ajuda</h1>
    <p className="text-brand-ink/40 font-bold mb-12 uppercase tracking-widest text-xs">Estamos aqui para te apoiar em cada passo</p>
    
    <div className="grid md:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-[40px] border border-brand-gray shadow-sm space-y-8">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Email de Suporte</p>
            <p className="font-black text-lg text-brand-ink">weepkazi@gmail.com</p>
            <p className="text-xs font-bold text-brand-ink/40">Resposta em 24-48h úteis</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Phone className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Atendimento Telefónico</p>
            <p className="font-black text-lg text-brand-ink">+258 84 104 2406</p>
            <p className="text-xs font-bold text-brand-ink/40">Seg-Sex, 08:00 às 17:00</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Website Oficial</p>
            <p className="font-black text-lg text-brand-ink">www.kazi.co.mz</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <MapPin className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Escritório</p>
            <p className="font-black text-lg text-brand-ink">Moçambique</p>
          </div>
        </div>
      </div>

      <div className="bg-brand-ink text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-6">Compromisso KAZI</h3>
          <ul className="space-y-4 text-white/70 font-bold text-sm">
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              Responder o mais rápido possível
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              Tratar todos com respeito
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              Garantir confidencialidade
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              Resolver problemas com transparência
            </li>
          </ul>
          
          <div className="mt-12 p-6 bg-white/10 rounded-3xl backdrop-blur">
            <p className="text-xs font-black uppercase tracking-widest mb-2 text-primary">Dica de Segurança</p>
            <p className="text-xs leading-relaxed">Nunca partilhes a tua senha e verifica sempre os perfis antes de negociar pagamentos.</p>
          </div>
        </div>
        <HelpCircle className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5" />
      </div>
    </div>
  </div>
);
