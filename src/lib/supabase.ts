import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// En la web, Expo arma primero la página en el servidor, donde no hay window ni almacenamiento:
// ahí el cliente arranca sin sesión y el navegador la recupera al cargar.
const enServidor = typeof window === 'undefined';

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