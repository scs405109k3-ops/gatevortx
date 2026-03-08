import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bb326c1c351846fb97fcce404222bcda',
  appName: 'GateVortx',
  webDir: 'dist',
  server: {
    url: 'https://bb326c1c-3518-46fb-97fc-ce404222bcda.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
