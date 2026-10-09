import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { router, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, type ColorValue } from 'react-native';
import PantallaLogin from '../components/PantallaLogin';
import { ProveedorAvisos } from '../components/Toast';
import { colores, fuentes } from '../constants/tema';
import { escucharToques } from '../lib/avisos';
import { ProveedorDatos } from '../lib/contextoDatos';
import { fuenteSupabase } from '../lib/datos';
import { crearFuenteDemo } from '../lib/demo';
import { soloDemo, supabase } from '../lib/supabase';

export default function Layout() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(!soloDemo);
  const [modoDemo, setModoDemo] = useState(soloDemo);
  const [fuentesListas] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (soloDemo) return;
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => setSesion(nuevaSesion));
    return () => data.subscription.unsubscribe();
  }, []);

  // Tocar el recordatorio de la noche abre directo la pantalla para anotar
  const listo = !cargando && (sesion !== null || modoDemo);
  useEffect(() => {
    if (!listo) return;
    return escucharToques((url) => router.push(url as Parameters<typeof router.push>[0]));
  }, [listo]);

  // Cada vez que se entra al modo demo arranca con los datos de ejemplo desde cero.
  // En la versión solo demo, "salir" vuelve a empezar con los datos originales.
  const [reinicios, setReinicios] = useState(0);
  const fuente = useMemo(
    () => (modoDemo ? crearFuenteDemo(() => (soloDemo ? setReinicios((n) => n + 1) : setModoDemo(false))) : fuenteSupabase),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modoDemo, reinicios]
  );

  let contenido;
  if (cargando || !fuentesListas) {
    contenido = (
      <View style={{ flex: 1, backgroundColor: colores.fondo, justifyContent: 'center' }}>
        <ActivityIndicator color={colores.primario} size="large" />
      </View>
    );
  } else if (!sesion && !modoDemo) {
    contenido = <PantallaLogin onProbarDemo={() => setModoDemo(true)} />;
  } else {
    contenido = (
      <ProveedorDatos fuente={fuente}>
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colores.fondo },
            tabBarActiveTintColor: colores.primario,
            tabBarInactiveTintColor: colores.textoTenue,
            tabBarStyle: styles.barra,
            tabBarLabelStyle: { fontFamily: fuentes.semi, fontSize: 11, lineHeight: 14 },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icono('home') }} />
          <Tabs.Screen name="cuotas" options={{ title: 'Cuotas', tabBarIcon: icono('calendar') }} />
          <Tabs.Screen
            name="cargar"
            options={{
              title: 'Cargar',
              tabBarLabel: () => null,
              tabBarIcon: () => (
                <View style={styles.botonCargar}>
                  <Ionicons name="add" size={28} color={colores.sobrePrimario} />
                </View>
              ),
            }}
          />
          <Tabs.Screen name="comprar" options={{ title: 'Comprar', tabBarIcon: icono('bag-check') }} />
          <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: icono('settings') }} />
          {/* Pantalla sin pestaña: se abre desde Cargar */}
          <Tabs.Screen name="resumen" options={{ href: null, title: 'Revisar resumen' }} />
        </Tabs>
      </ProveedorDatos>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ProveedorAvisos>{contenido}</ProveedorAvisos>
    </SafeAreaProvider>
  );
}

// Ícono relleno en la pestaña activa y de contorno en las demás
function icono(nombre: 'home' | 'calendar' | 'bag-check' | 'settings') {
  function IconoPestana({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? nombre : `${nombre}-outline`} color={color} size={size - 1} />;
  }
  return IconoPestana;
}

const styles = StyleSheet.create({
  barra: {
    backgroundColor: colores.superficie,
    borderTopColor: colores.borde,
    borderTopWidth: StyleSheet.hairlineWidth,
    // En la web no hay área segura abajo: le damos un poco más de alto para que entren los textos
    ...(Platform.OS === 'web' && { height: 62, paddingBottom: 6 }),
  },
  botonCargar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginTop: 8,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colores.primario,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
