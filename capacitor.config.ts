import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.relomeet.app',
  appName: 'Relomeet',
  webDir: 'dist/chat-client/browser',
  server: {
    url: "https://relomeet.ru/",
    cleartext: false,
    androidScheme: "https"
  }
};

export default config;
