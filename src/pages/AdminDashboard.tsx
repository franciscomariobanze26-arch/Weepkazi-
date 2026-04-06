import React, { useState, useEffect } from 'react';
import { query, collection, orderBy, onSnapshot, getDocs, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { Users, Briefcase, AlertTriangle, Sparkles, TrendingUp, CheckCircle } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { cn, handleFirestoreError, safeToDate } from '../lib/utils';
import { OperationType, Report } from '../types';
import { toast } from 'sonner';

export const AdminDashboard = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({
    users: 0,
    services: 0,
    reports: 0,
    revenue: 0
  });
  const [analytics, setAnalytics] = useState({
    dailyActiveUsers: 0,
    newUsersToday: 0,
    newServicesToday: 0,
    resolvedReports: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reports'));

    // Fetch basic stats
    const fetchStats = async () => {
      try {
        const [usersSnap, servicesSnap, reportsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'services')),
          getDocs(collection(db, 'reports'))
        ]);
        
        const currentStats = {
          users: usersSnap.size,
          services: servicesSnap.size,
          reports: reportsSnap.size,
          revenue: 0 // Placeholder
        };
        setStats(currentStats);

        // Detailed analytics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        const [newUsersSnap, newServicesSnap, resolvedReportsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('createdAt', '>=', todayTimestamp))),
          getDocs(query(collection(db, 'services'), where('createdAt', '>=', todayTimestamp))),
          getDocs(query(collection(db, 'reports'), where('status', '==', 'resolved')))
        ]);

        setAnalytics({
          dailyActiveUsers: currentStats.users, // Simplified
          newUsersToday: newUsersSnap.size,
          newServicesToday: newServicesSnap.size,
          resolvedReports: resolvedReportsSnap.size
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    fetchStats();
    
    return () => unsubscribe();
  }, [profile]);

  const handleUpdateStatus = async (reportId: string, status: Report['status']) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
      toast.success('Estado da denúncia atualizado');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const handleModerateUser = async (userId: string, action: 'ban' | 'suspend' | 'unban') => {
    try {
      const userRef = doc(db, 'users', userId);
      if (action === 'ban') {
        await updateDoc(userRef, { isBanned: true });
        toast.success('Utilizador banido com sucesso');
      } else if (action === 'suspend') {
        await updateDoc(userRef, { 
          isSuspended: true, 
          suspensionUntil: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        toast.success('Utilizador suspenso por 7 dias');
      } else if (action === 'unban') {
        await updateDoc(userRef, { isBanned: false, isSuspended: false });
        toast.success('Restrições removidas');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  if (profile?.role !== 'admin') {
    return <div className="p-20 text-center">Acesso negado. Apenas administradores podem ver esta página.</div>;
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-tighter">Painel Administrativo</h1>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
          {reports.length} Denúncias Pendentes
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Utilizadores', value: stats.users, icon: Users, color: 'bg-blue-500' },
          { label: 'Serviços Ativos', value: stats.services, icon: Briefcase, color: 'bg-green-500' },
          { label: 'Denúncias', value: stats.reports, icon: AlertTriangle, color: 'bg-red-500' },
          { label: 'Receita (MT)', value: stats.revenue, icon: Sparkles, color: 'bg-yellow-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-brand-gray shadow-sm">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-4", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/30 mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-brand-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-brand-gray shadow-sm">
          <h3 className="text-lg font-black mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Crescimento Hoje
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <span className="font-bold text-gray-500">Novos Utilizadores</span>
              <span className="font-black text-primary">+{analytics.newUsersToday}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <span className="font-bold text-gray-500">Novos Serviços</span>
              <span className="font-black text-secondary">+{analytics.newServicesToday}</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-brand-gray shadow-sm">
          <h3 className="text-lg font-black mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" /> Eficiência de Moderação
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <span className="font-bold text-gray-500">Denúncias Resolvidas</span>
              <span className="font-black text-green-600">{analytics.resolvedReports}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <span className="font-bold text-gray-500">Taxa de Resolução</span>
              <span className="font-black text-brand-ink">
                {stats.reports > 0 ? ((analytics.resolvedReports / stats.reports) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <h2 className="text-xl font-black tracking-tight mt-8 mb-4">Denúncias Recentes</h2>
        {reports.map((report) => (
          <div key={report.id} className="bg-white p-6 rounded-[32px] border border-brand-gray shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    report.priority === 'high' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  )}>
                    Prioridade {report.priority}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {report.reportedType} • {report.type}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">ID Denunciado: {report.reportedId}</h3>
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdateStatus(report.id, 'in_review')}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                      Em Revisão
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(report.id, 'resolved')}
                      className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors"
                    >
                      Resolver
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(report.id, 'rejected')}
                      className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                    >
                      Rejeitar
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleModerateUser(report.reportedId, 'ban')}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      Banir Utilizador
                    </button>
                    <button 
                      onClick={() => handleModerateUser(report.reportedId, 'suspend')}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
                    >
                      Suspender
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {report.description && (
              <div className="bg-gray-50 p-4 rounded-2xl mb-4 text-sm text-gray-600 italic">
                "{report.description}"
              </div>
            )}

            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Denunciado por: {report.reporterId}</span>
              <span>{safeToDate(report.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-brand-gray">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma denúncia pendente. Bom trabalho!</p>
          </div>
        )}
      </div>
    </div>
  );
};
