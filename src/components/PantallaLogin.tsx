import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colores, degradados, radios } from '../constants/tema';
import { supabase } from '../lib/supabase';
import { Boton, Entrada, Texto as Text } from './ui';

const BENEFICIOS = [
  { icono: 'chatbubble-ellipses-outline', texto: 'Cargá gastos escribiendo como hablás' },
  { icono: 'calendar-outline', texto: 'Mirá tus cuotas de los próximos meses' },
  { icono: 'calculator-outline', texto: 'Sabé si te conviene contado o en cuotas' },
] as const;

export default function PantallaLogin({ onProbarDemo }: { onProbarDemo: () => void }) {
  const [modo, setModo] = useState<'ingresar' | 'registrarse'>('ingresar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esRegistro = modo === 'registrarse';

  async function enviar() {
    setError(null);
    if (!email || !password || (esRegistro && !nombre)) {
      setError('Completá todos los campos.');
      return;
    }
    setCargando(true);
    const { error } = esRegistro
      ? await supabase.auth.signUp({ email, password, options: { data: { nombre } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) setError(traducirError(error.message));
  }

  return (
    <LinearGradient colors={degradados.login} locations={[0, 0.55]} style={styles.fondo}>
      <KeyboardAvoidingView style={styles.fondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.springify()} style={styles.logo}>
            <Ionicons name="wallet" size={34} color={colores.sobrePrimario} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Text style={styles.titulo}>{esRegistro ? 'Creá tu cuenta' : 'Tu plata, clara.'}</Text>
            <Text style={styles.subtitulo}>Tarjetas, cuotas y gastos bajo control.</Text>
          </Animated.View>

          {!esRegistro && (
            <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.beneficios}>
              {BENEFICIOS.map((b) => (
                <View key={b.texto} style={styles.beneficio}>
                  <View style={styles.beneficioIcono}>
                    <Ionicons name={b.icono} size={18} color={colores.primario} />
                  </View>
                  <Text style={styles.beneficioTexto}>{b.texto}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.formulario}>
            {esRegistro && <Entrada style={styles.input} placeholder="Tu nombre" value={nombre} onChangeText={setNombre} />}
            <Entrada
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Entrada style={styles.input} placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />

            {error && <Text style={styles.error}>{error}</Text>}

            <Boton titulo={esRegistro ? 'Crear cuenta' : 'Ingresar'} onPress={enviar} cargando={cargando} estilo={{ marginTop: 4 }} />

            <Pressable
              onPress={() => {
                setModo(esRegistro ? 'ingresar' : 'registrarse');
                setError(null);
              }}
            >
              <Text style={styles.cambiarModo}>{esRegistro ? '¿Ya tenés cuenta? Ingresá' : '¿No tenés cuenta? Registrate'}</Text>
            </Pressable>

            <View style={styles.separador}>
              <View style={styles.linea} />
              <Text style={styles.separadorTexto}>o</Text>
              <View style={styles.linea} />
            </View>

            <Boton titulo="Probar con datos de ejemplo" variante="secundario" onPress={onProbarDemo} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function traducirError(mensaje: string) {
  if (mensaje.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (mensaje.includes('already registered')) return 'Ya existe una cuenta con ese email.';
  if (mensaje.includes('Password should be')) return 'La contraseña tiene que tener al menos 6 caracteres.';
  if (mensaje.includes('valid email') || mensaje.includes('invalid')) return 'Revisá que el email esté bien escrito.';
  return mensaje;
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 60, maxWidth: 480, width: '100%', alignSelf: 'center' },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colores.primario,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  titulo: { fontSize: 36, fontWeight: '800', color: colores.texto, letterSpacing: -1.2 },
  subtitulo: { fontSize: 16, color: colores.textoSecundario, marginTop: 6 },
  beneficios: { gap: 12, marginTop: 28 },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  beneficioIcono: {
    width: 36,
    height: 36,
    borderRadius: radios.chico,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beneficioTexto: { color: colores.textoChip, fontSize: 15, flex: 1 },
  formulario: { marginTop: 32 },
  input: {
    backgroundColor: 'rgba(21, 29, 46, 0.85)',
    color: colores.texto,
    borderRadius: radios.medio,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  error: { color: colores.error, textAlign: 'center', marginBottom: 12 },
  cambiarModo: { color: colores.primario, textAlign: 'center', marginTop: 18, fontSize: 15, fontWeight: '600' },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  linea: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colores.borde },
  separadorTexto: { color: colores.textoTenue, fontSize: 13 },
});
