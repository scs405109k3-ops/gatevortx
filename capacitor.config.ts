import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bb326c1c351846fb97fcce404222bcda',
  appName: 'GateVortx',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#1a1f3c',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
