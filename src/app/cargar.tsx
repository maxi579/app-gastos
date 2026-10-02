import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { calcularPrimerMesCuota, formatearFecha, formatearMonto } from '../lib/finanzas';
import { interpretarGasto, type GastoInterpretado } from '../lib/interpretarGasto';
import { supabase } from '../lib/supabase';
import { CATEGORIAS, type MedioPago } from '../lib/tipos';

export default function Cargar() {
  const [texto, setTexto] = useState('');
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [propuesta, setPropuesta] = useState<GastoInterpretado | null>(null);
  const [montoTexto, setMontoTexto] = useState('');
  const [cuotasTexto, setCuotasTexto] = useState('1');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase.from('tarjetas').select('*').order('creado_en').then(({ data }) => setMedios(data ?? []));
    }, [])
  );

  const actualizar = (cambios: Partial<GastoInterpretado>) =>
    setPropuesta((actual) => (actual ? { ...actual, ...cambios } : actual));

  function interpretar() {
    if (!texto.trim()) return;
    const resultado = interpretarGasto(texto, medios);
    setPropuesta(resultado);
    setMontoTexto(resultado.monto ? String(resultado.monto) : '');
    setCuotasTexto(String(resultado.cuotas));
    setMensaje(null);
  }

  async function guardar() {
    if (!propuesta) return;
    const monto = Number(montoTexto.replace(',', '.'));
    const cuotas = Number(cuotasTexto);
    const medio = medios.find((m) => m.id === propuesta.medioId) ?? null;

    if (!(monto > 0)) return setMensaje('Revisá el monto.');
    if (!Number.isInteger(cuotas) || cuotas < 1) return setMensaje('Las cuotas tienen que ser un número entero, mínimo 1.');
    if (cuotas > 1 && medio?.tipo !== 'credito') return setMensaje('Solo los medios de crédito tienen cuotas.');

    const hoy = new Date();
    setGuardando(true);
    const { error } = await supabase.from('gastos').insert({
      descripcion: propuesta.descripcion.trim() || 'Gasto',
      categoria: propuesta.categoria,
      monto_total: monto,
      moneda: propuesta.moneda,
      cantidad_cuotas: cuotas,
      tarjeta_id: medio?.id ?? null,
      fecha_compra: formatearFecha(hoy),
      primer_mes_cuota: calcularPrimerMesCuota(hoy, medio),
      texto_original: texto,
    });
    setGuardando(false);

    if (error) return setMensaje(`Error: ${error.message}`);
    setPropuesta(null);
    setTexto('');
    setMensaje('✓ Gasto guardado');
  }

  const montoNumero = Number(montoTexto.replace(',', '.'));
  const cuotasNumero = Number(cuotasTexto);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>¿En qué gastaste?</Text>
      <Text style={styles.subtitulo}>Escribilo como te salga: "pizza 18 lucas con mp"</Text>

      <TextInput
        style={styles.inputPrincipal}
        placeholder="Ej: zapas 120k en 6 cuotas"
        placeholderTextColor="#64748b"
        value={texto}
        onChangeText={setTexto}
        multiline
      />
      <Pressable style={styles.boton} onPress={interpretar}>
        <Text style={styles.textoBoton}>Interpretar</Text>
      </Pressable>

      {mensaje && <Text style={[styles.mensaje, mensaje.startsWith('✓') && styles.mensajeOk]}>{mensaje}</Text>}

      {propuesta && (
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>Descripción</Text>
          <TextInput style={styles.input} value={propuesta.descripcion} onChangeText={(v) => actualizar({ descripcion: v })} />

          <View style={styles.fila}>
            <View style={{ flex: 2 }}>
              <Text style={styles.etiqueta}>Monto total</Text>
              <TextInput style={styles.input} value={montoTexto} onChangeText={setMontoTexto} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#64748b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.etiqueta}>Cuotas</Text>
              <TextInput style={styles.input} value={cuotasTexto} onChangeText={setCuotasTexto} keyboardType="number-pad" maxLength={2} />
            </View>
          </View>
          {montoNumero > 0 && cuotasNumero > 1 && (
            <Text style={styles.ayuda}>
              {cuotasNumero} cuotas de {formatearMonto(montoNumero / cuotasNumero, propuesta.moneda)}
            </Text>
          )}

          <Text style={styles.etiqueta}>Moneda</Text>
          <View style={styles.chips}>
            <Chip etiqueta="Pesos" activo={propuesta.moneda === 'ARS'} onPress={() => actualizar({ moneda: 'ARS' })} />
            <Chip etiqueta="Dólares" activo={propuesta.moneda === 'USD'} onPress={() => actualizar({ moneda: 'USD' })} />
          </View>

          <Text style={styles.etiqueta}>Medio de pago</Text>
          <View style={styles.chips}>
            {medios.map((m) => (
              <Chip key={m.id} etiqueta={m.nombre} activo={propuesta.medioId === m.id} onPress={() => actualizar({ medioId: m.id })} />
            ))}
            <Chip etiqueta="Efectivo" activo={propuesta.medioId === null} onPress={() => actualizar({ medioId: null })} />
          </View>

          <Text style={styles.etiqueta}>Categoría</Text>
          <View style={styles.chips}>
            {CATEGORIAS.map((c) => (
              <Chip key={c} etiqueta={c} activo={propuesta.categoria === c} onPress={() => actualizar({ categoria: c })} />
            ))}
          </View>

          <View style={styles.fila}>
            <Pressable style={[styles.boton, styles.botonSecundario, { flex: 1 }]} onPress={() => setPropuesta(null)}>
              <Text style={styles.textoSecundario}>Descartar</Text>
            </Pressable>
            <Pressable style={[styles.boton, { flex: 1 }]} onPress={guardar} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.textoBoton}>Guardar</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Chip({ etiqueta, activo, onPress }: { etiqueta: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, activo && styles.chipActivo]} onPress={onPress}>
      <Text style={[styles.textoChip, activo && styles.textoChipActivo]}>{etiqueta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  contenido: { padding: 20, paddingBottom: 40 },
  titulo: { color: '#f8fafc', fontSize: 26, fontWeight: 'bold' },
  subtitulo: { color: '#94a3b8', fontSize: 15, marginTop: 4, marginBottom: 16 },
  inputPrincipal: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 17, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#334155' },
  boton: { backgroundColor: '#22c55e', borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 12 },
  textoBoton: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  botonSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  textoSecundario: { color: '#cbd5e1', fontWeight: '600', fontSize: 16 },
  mensaje: { color: '#f87171', textAlign: 'center', marginTop: 14, fontSize: 15 },
  mensajeOk: { color: '#22c55e' },
  tarjeta: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, marginTop: 20 },
  etiqueta: { color: '#94a3b8', fontSize: 13, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 12, padding: 13, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  ayuda: { color: '#22c55e', fontSize: 13, marginTop: 6 },
  fila: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  chipActivo: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  textoChip: { color: '#cbd5e1', fontWeight: '600' },
  textoChipActivo: { color: '#0f172a' },
});