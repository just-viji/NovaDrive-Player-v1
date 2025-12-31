import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.novadrive.player',
  appName: 'NovaDrive Player',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '740773563373-luo03qlgkd3i3iafpefanjg6jod0d0ml.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;