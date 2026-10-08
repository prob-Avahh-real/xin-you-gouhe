import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skatter.xinyougouhe',
  appName: '心有沟壑',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: [
      'localhost',
      'services.arcgisonline.com',
      'tile.openstreetmap.org',
      't{s}.tianditu.gov.cn',
      'api.mapbox.com',
    ],
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#050810',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050810',
      overlaysWebView: true,
    },
  },
};

export default config;
