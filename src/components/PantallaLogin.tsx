import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';

export default function PantallaLogin() {
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.logo}>💳</Text>
      <Text style={styles.titulo}>{esRegistro ? 'Creá tu cuenta' : 'Bienvenido'}</Text>
      <Text style={styles.subtitulo}>Tus tarjetas y cuotas, bajo control.</Text>

      {esRegistro && (
        <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor="#64748b"
          value={nombre} onChangeText={setNombre} />
      )}
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#64748b"
        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor="#64748b"
        value={password} onChangeText={setPassword} secureTextEntry />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={({ pressed }) => [styles.boton, pressed && { opacity: 0.8 }]} onPress={enviar} disabled={cargando}>
        {cargando ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.textoBoton}>{esRegistro ? 'Crear cuenta' : 'Ingresar'}</Text>}
      </Pressable>

      <Pressable onPress={() => { setModo(esRegistro ? 'ingresar' : 'registrarse'); setError(null); }}>
        <Text style={styles.cambiarModo}>
          {esRegistro ? '¿Ya tenés cuenta? Ingresá' : '¿No tenés cuenta? Registrate'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
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
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0f172a' },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  titulo: { fontSize: 30, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center' },
  subtitulo: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginTop: 6, marginBottom: 32 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 14, padding: 16, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  error: { color: '#f87171', textAlign: 'center', marginBottom: 12 },
  boton: { backgroundColor: '#22c55e', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  textoBoton: { color: '#0f172a', fontSize: 17, fontWeight: 'bold' },
  cambiarModo: { color: '#22c55e', textAlign: 'center', marginTop: 20, fontSize: 15 },
});