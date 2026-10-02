import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import PantallaLogin from '../components/PantallaLogin';
import { supabase } from '../lib/supabase';

export default function Layout() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => setSesion(nuevaSesion));
    return () => data.subscription.unsubscribe();
  }, []);

  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center' }}>
        <ActivityIndicator color="#22c55e" size="large" />
      </View>
    );
  }

  if (!sesion) return <PantallaLogin />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="cargar" options={{ title: 'Cargar', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="cuotas" options={{ title: 'Cuotas', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}