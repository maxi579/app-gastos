import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

// La versión publicada como demo se compila sin datos de Supabase: usamos valores
// de relleno para que el cliente se pueda crear, aunque nunca se use.
export const soloDemo = process.env.EXPO_PUBLIC_SOLO_DEMO === 'true';
const supabaseUrl = soloDemo ? 'https://demo.invalid' : process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = soloDemo ? 'demo' : process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// En la web, Expo arma primero la página en el servidor, donde no hay window ni almacenamiento:
// ahí el cliente arranca sin sesión y el navegador la recupera al cargar.
const enServidor = typeof window === 'undefined' || soloDemo;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: enServidor ? undefined : AsyncStorage,
    autoRefreshToken: !enServidor,
    persistSession: !enServidor,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (estado) => {
  if (estado === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});