import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.weepkazi.app',
  appName: 'Weepkazi',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'weepkazi.app',
    cleartext: true
  }
};

export default config;
