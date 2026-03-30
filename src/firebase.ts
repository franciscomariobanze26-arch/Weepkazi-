import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserPopupRedirectResolver 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Forçar o domínio real no objeto de configuração antes de inicializar
// Isso ajuda a evitar que o SDK use localhost por padrão em ambientes nativos
const finalConfig = {
  ...firebaseConfig,
  authDomain: "gen-lang-client-0802512270.firebaseapp.com"
};

// Initialize Firebase SDK
const app = initializeApp(finalConfig);
export const db = getFirestore(app, finalConfig.firestoreDatabaseId);

// Use initializeAuth for better control in native environments
export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

// Force the correct authDomain to override any internal defaults
(auth as any).config.authDomain = "gen-lang-client-0802512270.firebaseapp.com";
(auth as any).config.redirectDomain = "gen-lang-client-0802512270.firebaseapp.com";

console.log('Firebase Auth initialized with authDomain:', auth.config.authDomain);

export const storage = getStorage(app);
