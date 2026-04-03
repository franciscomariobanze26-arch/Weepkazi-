import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.weepkazi.app',
  appName: 'Weepkazi',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'ais-dev-box33i26sle24cbdhc4qxf-29231449824.us-east5.run.app',
      '*.firebaseapp.com',
      '*.googleapis.com',
      'accounts.google.com'
    ]
  },
  plugins: {
    GoogleSignIn: {
      clientId: '1073082140315-m283rloq4fa627et3pqvk32eet4hsne1.apps.googleusercontent.com'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#0066FF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0066FF',
      overlaysWebView: false
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true
    }
  }
};

export default config;
