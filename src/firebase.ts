import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  browserLocalPersistence, 
  browserPopupRedirectResolver 
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Forçar o domínio real no objeto de configuração antes de inicializar
// Isso ajuda a evitar que o SDK use localhost por padrão em ambientes nativos
const finalConfig = {
  ...firebaseConfig,
  authDomain: firebaseConfig.authDomain || `${firebaseConfig.projectId}.firebaseapp.com`
};

// Initialize Firebase SDK
const app = initializeApp(finalConfig);

console.log('Initializing Firestore with Project ID:', finalConfig.projectId);
console.log('Using Database ID:', finalConfig.firestoreDatabaseId || '(default)');

// Use initializeFirestore with long polling to avoid WebSocket issues in some environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true, // Prevents errors when saving undefined fields
}, finalConfig.firestoreDatabaseId || '(default)');

// Use initializeAuth for better control in native environments
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

// Force the correct authDomain to override any internal defaults
if (finalConfig.authDomain) {
  (auth as any).config.authDomain = finalConfig.authDomain;
  (auth as any).config.redirectDomain = finalConfig.authDomain;
}

console.log('Firebase Auth initialized with authDomain:', (auth as any).config.authDomain);

export const storage = getStorage(app);
