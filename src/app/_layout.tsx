import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import PantallaLogin from '../components/PantallaLogin';
import { ProveedorAvisos } from '../components/Toast';
import { colores, fuentes } from '../constants/tema';
import { supabase } from '../lib/supabase';

export default function Layout() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fuentesListas] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => setSesion(nuevaSesion));
    return () => data.subscription.unsubscribe();
  }, []);

  let contenido;
  if (cargando || !fuentesListas) {
    contenido = (
      <View style={{ flex: 1, backgroundColor: colores.fondo, justifyContent: 'center' }}>
        <ActivityIndicator color={colores.primario} size="large" />
      </View>
    );
  } else if (!sesion) {
    contenido = <PantallaLogin />;
  } else {
    contenido = (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colores.primario,
          tabBarInactiveTintColor: colores.textoTenue,
          tabBarStyle: { backgroundColor: colores.fondo, borderTopColor: colores.superficie },
          tabBarLabelStyle: { fontFamily: fuentes.semi, fontSize: 11 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="cargar" options={{ title: 'Cargar', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="cuotas" options={{ title: 'Cuotas', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="simular" options={{ title: 'Simular', tabBarIcon: ({ color, size }) => <Ionicons name="calculator-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
      </Tabs>
    );
  }
    return (
    <SafeAreaProvider>
      <ProveedorAvisos>{contenido}</ProveedorAvisos>
    </SafeAreaProvider>
  );
}