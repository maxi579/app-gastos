import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import FormularioGasto from '../components/FormularioGasto';
import { useAviso } from '../components/Toast';
import { Boton, Encabezado, Entrada as TextInput, Tarjeta, Texto as Text } from '../components/ui';
import { colores, radios } from '../constants/tema';
import { programarRecordatorios } from '../lib/avisos';
import { useDatos } from '../lib/contextoDatos';
import { montoATexto } from '../lib/formato';
import { prepararGasto, type ValoresGasto } from '../lib/gastos';
import { interpretarGasto } from '../lib/interpretarGasto';
import type { MedioPago } from '../lib/tipos';

const EJEMPLOS = ['pizza 18 lucas con mp', 'zapas 120k en 6 cuotas con visa', 'super 45.300 con master', 'uber 7500 efectivo'];

export default function Cargar() {
  const datos = useDatos();
  const aviso = useAviso();
  const [texto, setTexto] = useState('');
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [valores, setValores] = useState<ValoresGasto | null>(null);
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      datos.medios().then(setMedios).catch((e) => aviso(e.message, 'error'));
    }, [datos, aviso])
  );

  function interpretar(entrada = texto) {
    if (!entrada.trim()) return aviso('Escribí tu gasto primero 🙂', 'info');
    const resultado = interpretarGasto(entrada, medios);
    setValores({
      descripcion: resultado.descripcion,
      montoTexto: resultado.monto ? montoATexto(resultado.monto) : '',
      cuotasTexto: String(resultado.cuotas),
      moneda: resultado.moneda,
      medioId: resultado.medioId,
      categoria: resultado.categoria,
    });
  }

  async function guardar() {
    if (!valores) return;
    const preparado = prepararGasto(valores, medios, new Date());
    if (preparado.error) return aviso(preparado.error, 'error');

    setGuardando(true);
    try {
      const resultado = await datos.crearGasto({ ...preparado.fila, texto_original: texto });
      setValores(null);
      setTexto('');
      // Ya anotó algo hoy: esta noche no hace falta recordárselo
      if (!datos.esDemo) programarRecordatorios(true).catch(() => {});
      if (resultado === 'pendiente') aviso('Anotado en el celular. Se sube solo cuando haya internet 📶', 'info');
      else aviso('Listo, anotado 👌');
    } catch (e) {
      aviso(`No se pudo guardar: ${(e as Error).message}`, 'error');
    }
    setGuardando(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Encabezado titulo="¿En qué gastaste?" subtitulo="Escribilo como te salga y la app lo entiende." />

      <View style={styles.cajaEntrada}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colores.primario} style={{ marginTop: 2 }} />
        <TextInput
          style={styles.inputPrincipal}
          placeholder="Ej: zapas 120k en 6 cuotas"
          value={texto}
          onChangeText={setTexto}
          multiline
          onSubmitEditing={() => interpretar()}
        />
      </View>
      <Boton titulo="Siguiente" onPress={() => interpretar()} estilo={{ marginTop: 12 }} />

      {!valores && (
        <View style={{ marginTop: 24 }}>
          <Text style={styles.etiquetaEjemplos}>Probá con un ejemplo</Text>
          <View style={styles.ejemplos}>
            {EJEMPLOS.map((ejemplo) => (
              <Pressable
                key={ejemplo}
                style={({ pressed }) => [styles.ejemplo, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  setTexto(ejemplo);
                  interpretar(ejemplo);
                }}
              >
                <Text style={styles.textoEjemplo}>“{ejemplo}”</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {!valores && (
        <Pressable style={({ pressed }) => [styles.resumen, pressed && { opacity: 0.8 }]} onPress={() => router.push('/resumen')}>
          <View style={styles.resumenIcono}>
            <Ionicons name="document-text" size={22} color={colores.primario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resumenTitulo}>¿Te olvidaste de anotar algo?</Text>
            <Text style={styles.resumenTexto}>Subí el resumen de tu tarjeta y te digo qué gastos te faltan.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colores.textoTenue} />
        </Pressable>
      )}

      {valores && (
        <Animated.View entering={FadeInDown.springify()}>
          <Tarjeta estilo={{ marginTop: 20 }}>
            <View style={styles.encabezadoResultado}>
              <Ionicons name="sparkles" size={16} color={colores.primario} />
              <Text style={styles.tituloResultado}>Esto entendí. Revisalo y tocá Guardar.</Text>
            </View>
            <FormularioGasto
              valores={valores}
              onCambio={setValores}
              medios={medios}
              onGuardar={guardar}
              onCancelar={() => setValores(null)}
              guardando={guardando}
            />
          </Tarjeta>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  cajaEntrada: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colores.superficie,
    borderRadius: radios.grande,
    padding: 16,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  inputPrincipal: { flex: 1, color: colores.texto, fontSize: 17, minHeight: 64, textAlignVertical: 'top', padding: 0 },
  etiquetaEjemplos: { color: colores.textoTenue, fontSize: 13, marginBottom: 10 },
  ejemplos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ejemplo: {
    backgroundColor: colores.superficie,
    borderRadius: radios.chico,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  textoEjemplo: { color: colores.textoChip, fontSize: 14 },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colores.superficie,
    borderRadius: radios.grande,
    padding: 16,
    marginTop: 28,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  resumenIcono: { width: 44, height: 44, borderRadius: 14, backgroundColor: colores.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  resumenTitulo: { color: colores.texto, fontSize: 16, fontWeight: '700' },
  resumenTexto: { color: colores.textoSecundario, fontSize: 14, marginTop: 2, lineHeight: 20 },
  encabezadoResultado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tituloResultado: { color: colores.primario, fontSize: 14, fontWeight: '600' },
});
