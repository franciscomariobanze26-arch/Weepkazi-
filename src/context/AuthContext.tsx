import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  getDocFromServer, 
  deleteField,
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, AuthContextType, OperationType } from '../types';
import { ADMIN_EMAIL } from '../constants';
import { isInIframe } from '../lib/utils';
import { handleFirestoreError } from '../services/firestoreService';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const refreshProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const privateDocRef = doc(db, 'users_private', uid);
      
      let docSnap, privateSnap;
      try {
        [docSnap, privateSnap] = await Promise.all([
          getDocFromServer(docRef),
          getDocFromServer(privateDocRef).catch(() => null)
        ]);
      } catch (serverError) {
        console.warn('Server fetch failed, falling back to cache:', serverError);
        [docSnap, privateSnap] = await Promise.all([
          getDoc(docRef),
          getDoc(privateDocRef).catch(() => null)
        ]);
      }

      if (docSnap.exists()) {
        let data = docSnap.data() as UserProfile;
        if (privateSnap && privateSnap.exists()) {
          data = { ...data, ...privateSnap.data() };
        }
        setProfile(data);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      } catch (error: any) {
        if (error.code === 'unavailable' || error.message?.includes('offline')) {
          console.error("CRITICAL: Firestore connection failed. Check configuration.");
        }
      }
    };
    testConnection();

    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timed out. Forcing loading state to false.');
        setLoading(false);
      }
    }, 10000);

    if (Capacitor.isNativePlatform()) {
      import('@codetrix-studio/capacitor-google-auth').then(({ GoogleAuth }) => {
        GoogleAuth.initialize();
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const privateDocRef = doc(db, 'users_private', firebaseUser.uid);
          const [docSnap, privateSnap] = await Promise.all([
            getDoc(docRef),
            getDoc(privateDocRef).catch(() => null)
          ]);

          if (docSnap.exists()) {
            let data = docSnap.data() as UserProfile;
            if (data.email || data.phoneNumber) {
              const privateInfo = {
                email: data.email || firebaseUser.email || '',
                phoneNumber: data.phoneNumber || ''
              };
              await Promise.all([
                setDoc(privateDocRef, privateInfo, { merge: true }),
                updateDoc(docRef, {
                  email: deleteField(),
                  phoneNumber: deleteField()
                })
              ]);
              delete data.email;
              delete data.phoneNumber;
              data = { ...data, ...privateInfo };
            } else if (privateSnap && privateSnap.exists()) {
              data = { ...data, ...privateSnap.data() };
            }
            setProfile(data);
          } else {
            const displayName = firebaseUser.displayName || 'Utilizador';
            const handle = '@' + displayName.toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 15) + '_' + Math.floor(Math.random() * 1000);
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: displayName,
              handle: handle,
              photoURL: firebaseUser.photoURL || null,
              role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'client',
              isComplete: false,
              createdAt: serverTimestamp(),
            };
            const privateInfo = {
              email: firebaseUser.email || '',
            };
            await Promise.all([
              setDoc(docRef, newProfile),
              setDoc(privateDocRef, privateInfo)
            ]);
            setProfile({ ...newProfile, ...privateInfo });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      clearTimeout(timeoutId);
    });

    getRedirectResult(auth).then((result) => {
      if (result) {
        console.log('Successfully signed in via redirect:', result.user.uid);
      }
    }).catch((error) => {
      console.error('Error handling redirect result:', error);
      if (error.message && (error.message.includes('missing initial state') || error.message.includes('sessionStorage'))) {
        toast.error('Erro de sessão detetado. Tente fazer login novamente abrindo em uma nova aba.', {
          duration: 6000,
          action: {
            label: 'Abrir Agora',
            onClick: () => window.open(window.location.href, '_blank')
          }
        });
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    const updateStatus = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Error updating status:', err);
      }
    };
    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, [user?.uid, profile?.uid]);

  const signIn = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        const nativeUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(nativeUser.authentication.idToken);
        await signInWithCredential(auth, credential);
        return;
      } catch (err) {
        console.error('Login nativo falhou, tentando via web:', err);
      }
    }

    const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isInIframe() && isMobileBrowser) {
      toast.info('Para fazer login com segurança no telemóvel, abra o aplicativo em uma nova aba.', {
        duration: 10000,
        action: {
          label: 'Abrir Nova Aba',
          onClick: () => window.open(window.location.href, '_blank')
        }
      });
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ 'prompt': 'select_account' });
    
    try {
      if (isMobileBrowser && !isInIframe()) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      let message = 'Erro ao fazer login. Tente novamente.';
      if (error.code === 'auth/unauthorized-domain') {
        message = 'Domínio não autorizado no Firebase Console. Adicione este domínio aos "Authorized Domains".';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'O login com Google não está ativado no Firebase Console.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'O popup de login foi bloqueado pelo navegador.';
      } else if (error.message && (error.message.includes('missing initial state') || error.message.includes('sessionStorage'))) {
        message = 'Erro de sessão detetado. Vamos abrir o app numa nova aba para corrigir.';
        toast.error(message, {
          duration: 6000,
          action: {
            label: 'Abrir Agora',
            onClick: () => window.open(window.location.href, '_blank')
          }
        });
        return;
      }
      toast.error(message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error('Email sign in error:', error);
      let message = 'Erro ao entrar. Verifique os seus dados.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'E-mail ou palavra-passe incorretos.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'E-mail inválido.';
      }
      toast.error(message);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
    } catch (error: any) {
      console.error('Email sign up error:', error);
      let message = 'Erro ao criar conta. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está registado. Tente iniciar sessão.';
      } else if (error.code === 'auth/weak-password') {
        message = 'A palavra-passe deve ter pelo menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'E-mail inválido.';
      }
      toast.error(message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('E-mail de recuperação enviado! Verifique a sua caixa de entrada (e a pasta de spam).');
    } catch (error: any) {
      console.error('Erro detalhado na recuperação de palavra-passe:', error);
      let message = 'Erro ao enviar e-mail de recuperação.';
      if (error.code === 'auth/user-not-found') {
        message = 'Não existe nenhuma conta associada a este e-mail.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'O formato do e-mail é inválido.';
      }
      toast.error(message);
      throw error;
    }
  };

  const toggleFavorite = async (id: string, type: 'services' | 'providers') => {
    if (!user || !profile) {
      setShowLoginPrompt(true);
      return;
    }
    const currentFavorites = profile.favorites || { services: [], providers: [] };
    const list = currentFavorites[type] || [];
    const isFav = list.includes(id);
    const newList = isFav ? list.filter(item => item !== id) : [...list, id];
    const updatedFavorites = { ...currentFavorites, [type]: newList };
    try {
      await updateDoc(doc(db, 'users', user.uid), { favorites: updatedFavorites });
      setProfile({ ...profile, favorites: updatedFavorites });
      toast.success(isFav ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Erro ao atualizar favoritos');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, signIn, signInWithEmail, signUpWithEmail, 
      resetPassword, logout, refreshProfile, showLoginPrompt, 
      setShowLoginPrompt, toggleFavorite 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
