import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extiende app.json. EXPO_BASE_URL permite publicar la versión web en una subcarpeta
// (por ejemplo GitHub Pages: https://usuario.github.io/app-gastos/).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || undefined,
  },
});
