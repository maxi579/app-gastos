import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Encabezado, Entrada as TextInput, Texto as Text, confirmar } from '../components/ui';
import { colores, radios } from '../constants/tema';
import { preguntarIA, type MensajeChat } from '../lib/chatIA';
import { useDatos } from '../lib/contextoDatos';

const CLAVE = 'chat-ia';
const GUARDADOS = 30;

const SUGERENCIAS = [
  'Armame el informe del mes',
  '¿En qué gasté más este mes?',
  '¿Cuánto se me va en suscripciones?',
  '¿Cómo vengo comparado con el mes pasado?',
  '¿En qué puedo recortar?',
];

export default function Chat() {
  const datos = useDatos();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restantes, setRestantes] = useState<number | null>(null);
  const lista = useRef<ScrollView>(null);

  // La conversación se guarda en el celular para retomarla (se borra al cerrar sesión)
  useEffect(() => {
    if (datos.esDemo) return;
    AsyncStorage.getItem(CLAVE)
      .then((t) => t && setMensajes(JSON.parse(t)))
      .catch(() => {});
  }, [datos]);

  function guardar(nuevos: MensajeChat[]) {
    setMensajes(nuevos);
    if (!datos.esDemo) AsyncStorage.setItem(CLAVE, JSON.stringify(nuevos.slice(-GUARDADOS))).catch(() => {});
  }

  async function enviar(pregunta = texto) {
    const limpia = pregunta.trim();
    if (!limpia || pensando) return;
    const conPregunta: MensajeChat[] = [...mensajes, { role: 'user', content: limpia }];
    guardar(conPregunta);
    setTexto('');
    setError(null);
    setPensando(true);
    try {
      const { respuesta, restantes: quedan } = await preguntarIA(conPregunta, datos.esDemo);
      guardar([...conPregunta, { role: 'assistant', content: respuesta }]);
      setRestantes(quedan);
    } catch (e) {
      setError((e as Error).message);
    }
    setPensando(false);
  }

  function nuevaConversacion() {
    confirmar('Nueva conversación', '¿Borrar esta conversación y empezar de cero?', 'Borrar', () => {
      guardar([]);
      setError(null);
    });
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={lista}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
      >
        <Encabezado titulo="Asistente con IA" subtitulo="Preguntame lo que quieras sobre tu plata" />

        {mensajes.length === 0 && (
          <View>
            <View style={styles.bienvenida}>
              <Text style={styles.emoji}>🤖</Text>
              <Text style={styles.textoBienvenida}>
                Miro tus gastos, cuotas y fijos para responderte con tus números reales. Probá con alguna de estas:
              </Text>
            </View>
            <View style={styles.sugerencias}>
              {SUGERENCIAS.map((s) => (
                <Pressable key={s} style={({ pressed }) => [styles.sugerencia, pressed && { opacity: 0.7 }]} onPress={() => enviar(s)}>
                  <Text style={styles.textoSugerencia}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {mensajes.map((m, i) => (
          <Animated.View
            key={i}
            entering={FadeInUp.springify()}
            style={[styles.burbuja, m.role === 'user' ? styles.burbujaUsuario : styles.burbujaIA]}
          >
            <Text style={m.role === 'user' ? styles.textoUsuario : styles.textoIA}>{m.content}</Text>
          </Animated.View>
        ))}

        {pensando && (
          <View style={[styles.burbuja, styles.burbujaIA, styles.pensando]}>
            <ActivityIndicator color={colores.primario} size="small" />
            <Text style={styles.textoPensando}>Mirando tus números...</Text>
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        {mensajes.length > 0 && !pensando && (
          <View style={styles.pie}>
            {restantes !== null && <Text style={styles.restantes}>Te quedan {restantes} mensajes hoy</Text>}
            <Pressable onPress={nuevaConversacion} hitSlop={8}>
              <Text style={styles.nueva}>Nueva conversación</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={styles.barra}>
        <TextInput
          style={styles.input}
          placeholder="Escribí tu pregunta..."
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={({ pressed }) => [styles.enviar, (!texto.trim() || pensando) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
          onPress={() => enviar()}
          disabled={!texto.trim() || pensando}
          accessibilityLabel="Enviar"
        >
          <Ionicons name="arrow-up" size={22} color={colores.sobrePrimario} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 20 },
  bienvenida: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 },
  emoji: { fontSize: 34 },
  textoBienvenida: { color: colores.textoChip, fontSize: 15, lineHeight: 22, flex: 1 },
  sugerencias: { gap: 8 },
  sugerencia: { backgroundColor: colores.superficie, borderRadius: radios.medio, padding: 14, borderWidth: 1, borderColor: colores.borde },
  textoSugerencia: { color: colores.textoChip, fontSize: 15 },
  burbuja: { borderRadius: 18, padding: 14, marginBottom: 10, maxWidth: '88%' },
  burbujaUsuario: { backgroundColor: colores.primario, alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  burbujaIA: { backgroundColor: colores.superficie, alignSelf: 'flex-start', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colores.borde },
  textoUsuario: { color: colores.sobrePrimario, fontSize: 16, lineHeight: 22 },
  textoIA: { color: colores.texto, fontSize: 16, lineHeight: 23 },
  pensando: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textoPensando: { color: colores.textoSecundario, fontSize: 14 },
  error: { color: colores.error, fontSize: 14, textAlign: 'center', marginVertical: 8 },
  pie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  restantes: { color: colores.textoTenue, fontSize: 12 },
  nueva: { color: colores.textoSecundario, fontSize: 13, textDecorationLine: 'underline' },
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  input: {
    flex: 1,
    backgroundColor: colores.fondo,
    color: colores.texto,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  enviar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colores.primario, alignItems: 'center', justifyContent: 'center' },
});
