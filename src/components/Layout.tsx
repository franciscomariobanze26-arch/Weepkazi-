import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { 
  Home as HomeIcon, 
  Search, 
  Plus, 
  MessageSquare, 
  User as UserIcon, 
  Menu, 
  X, 
  Bell, 
  Briefcase, 
  Clock,
  BookOpen, 
  Settings as SettingsIcon, 
  ShieldAlert, 
  LogOut, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      where('read', '==', false)
    );

    const unsubscribeNotif = onSnapshot(notifQuery, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    const chatQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.unreadCount && data.unreadCount[profile.uid]) {
          count += data.unreadCount[profile.uid];
        }
      });
      setUnreadMessages(count);
    });

    return () => {
      unsubscribeNotif();
      unsubscribeChat();
    };
  }, [profile]);

  const navItems = [
    { icon: HomeIcon, label: 'Início', path: '/' },
    { icon: Search, label: 'Serviços', path: '/services' },
    { icon: Briefcase, label: 'Emprego', path: '/jobs' },
    { icon: MessageSquare, label: 'Mensagens', path: '/chats', badge: unreadMessages },
    { icon: Clock, label: 'Pedidos', path: '/orders' },
    { icon: UserIcon, label: 'Perfil', path: '/profile' },
  ];

  const sidebarItems = [
    { icon: HomeIcon, label: 'Início', path: '/' },
    { icon: Search, label: 'Explorar Serviços', path: '/services' },
    { icon: Briefcase, label: 'Vagas de Emprego', path: '/jobs' },
    { icon: MessageSquare, label: 'Conversas', path: '/chats', badge: unreadMessages },
    { icon: Clock, label: 'Meus Pedidos', path: '/orders' },
    { icon: Bell, label: 'Notificações', path: '/notifications', badge: unreadNotifications },
    { icon: BookOpen, label: 'Centro de Aprendizagem', path: '/education' },
    { icon: SettingsIcon, label: 'Definições', path: '/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-primary/10 selection:text-primary">
      {/* Desktop Header */}
      <header className="hidden lg:block sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <Logo className="scale-110" />
          
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-6 py-2.5 rounded-2xl text-sm font-black transition-all flex items-center gap-2 relative",
                  location.pathname === item.path 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              to="/notifications"
              className="p-3 text-gray-400 hover:bg-gray-50 rounded-2xl transition-all relative"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
            {profile?.role === 'admin' && (
              <Link 
                to="/admin"
                className="p-3 text-primary hover:bg-primary/5 rounded-2xl transition-all"
                title="Painel Admin"
              >
                <ShieldAlert className="w-5 h-5" />
              </Link>
            )}
            {profile ? (
              <Link to="/profile" className="flex items-center gap-3 p-1.5 pr-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all group">
                <img 
                  src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
                  className="w-10 h-10 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" 
                  referrerPolicy="no-referrer"
                />
                <div className="hidden xl:block">
                  <p className="text-sm font-black text-gray-900 leading-none">{profile.displayName}</p>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{profile.handle || '@utilizador'}</p>
                </div>
              </Link>
            ) : (
              <Link 
                to="/login"
                className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-black/10"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 h-16 flex items-center justify-between">
        <Logo className="scale-90 origin-left" />
        <div className="flex items-center gap-2">
          <Link to="/notifications" className="p-2.5 text-gray-400 relative">
            <Bell className="w-6 h-6" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2.5 text-gray-900 bg-gray-50 rounded-xl"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white z-[70] shadow-2xl lg:hidden flex flex-col"
            >
              <div className="p-8 flex items-center justify-between border-b border-gray-50">
                <Logo />
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {profile && (
                  <Link 
                    to="/profile" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 p-4 bg-primary/5 rounded-3xl border border-primary/10"
                  >
                    <img 
                      src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
                      className="w-16 h-16 rounded-2xl object-cover shadow-md" 
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-lg font-black text-gray-900">{profile.displayName}</p>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">{profile.handle || '@utilizador'}</p>
                    </div>
                  </Link>
                )}

                <nav className="space-y-2">
                  {sidebarItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl text-sm font-black transition-all",
                        location.pathname === item.path 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </div>
                      {item.badge > 0 && (
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                          location.pathname === item.path ? "bg-white text-primary" : "bg-red-500 text-white"
                        )}>
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </nav>

                {profile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 p-4 rounded-2xl text-sm font-black text-primary hover:bg-primary/5 transition-all"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    Painel Administrativo
                  </Link>
                )}
              </div>

              <div className="p-8 border-t border-gray-50 space-y-4">
                {profile ? (
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 p-5 bg-red-50 text-red-600 rounded-3xl font-black text-sm hover:bg-red-100 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair da Conta
                  </button>
                ) : (
                  <Link 
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center justify-center p-5 bg-primary text-white rounded-3xl font-black text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
                  >
                    Entrar no KAZI
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pb-32 lg:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-3 flex items-center justify-around pb-safe">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative",
              location.pathname === item.path ? "text-primary" : "text-gray-400"
            )}
          >
            <item.icon className={cn("w-6 h-6", location.pathname === item.path && "scale-110")} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
            {item.badge > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Global Modals */}
      <AnimatePresence>
        {profile && !profile.isComplete && location.pathname !== '/profile' && (
          <div className="fixed bottom-24 left-4 right-4 lg:bottom-8 lg:right-8 lg:left-auto z-50">
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="bg-gray-900 text-white p-6 rounded-[32px] shadow-2xl max-w-sm border border-white/10"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-lg tracking-tight mb-1">Perfil Incompleto</h4>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed mb-4">
                    Completa o teu perfil para seres encontrado por mais clientes e comunidades.
                  </p>
                  <Link 
                    to="/profile"
                    className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-primary/90 transition-all"
                  >
                    Completar Agora
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
export { Logo };
