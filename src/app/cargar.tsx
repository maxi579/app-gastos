import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import FormularioGasto from '../components/FormularioGasto';
import { Boton, Tarjeta } from '../components/ui';
import { colores, radios, tipografia } from '../constants/tema';
import { prepararGasto, type ValoresGasto } from '../lib/gastos';
import { interpretarGasto } from '../lib/interpretarGasto';
import { supabase } from '../lib/supabase';
import type { MedioPago } from '../lib/tipos';

export default function Cargar() {
  const [texto, setTexto] = useState('');
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [valores, setValores] = useState<ValoresGasto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase.from('tarjetas').select('*').order('creado_en').then(({ data }) => setMedios(data ?? []));
    }, [])
  );

  function interpretar() {
    if (!texto.trim()) return;
    const resultado = interpretarGasto(texto, medios);
    setValores({
      descripcion: resultado.descripcion,
      montoTexto: resultado.monto ? String(resultado.monto) : '',
      cuotasTexto: String(resultado.cuotas),
      moneda: resultado.moneda,
      medioId: resultado.medioId,
      categoria: resultado.categoria,
    });
    setMensaje(null);
  }

  async function guardar() {
    if (!valores) return;
    const preparado = prepararGasto(valores, medios, new Date());
        if (preparado.error) return setMensaje(preparado.error);

    setGuardando(true);
    const { error } = await supabase.from('gastos').insert({ ...preparado.fila, texto_original: texto });
    setGuardando(false);

    if (error) return setMensaje(`Error: ${error.message}`);
    setValores(null);
    setTexto('');
    setMensaje('✓ Gasto guardado');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Text style={tipografia.titulo}>¿En qué gastaste?</Text>
      <Text style={[tipografia.secundario, styles.subtitulo]}>Escribilo como te salga: "pizza 18 lucas con mp"</Text>

      <TextInput
        style={styles.inputPrincipal}
        placeholder="Ej: zapas 120k en 6 cuotas"
        placeholderTextColor={colores.textoTenue}
        value={texto}
        onChangeText={setTexto}
        multiline
      />
      <Boton titulo="Interpretar" onPress={interpretar} estilo={{ marginTop: 12 }} />

      {mensaje && <Text style={[styles.mensaje, mensaje.startsWith('✓') && styles.mensajeOk]}>{mensaje}</Text>}

      {valores && (
        <Tarjeta estilo={{ marginTop: 20 }}>
          <FormularioGasto
            valores={valores}
            onCambio={setValores}
            medios={medios}
            onGuardar={guardar}
            onCancelar={() => setValores(null)}
            guardando={guardando}
          />
        </Tarjeta>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 20, paddingBottom: 40 },
  subtitulo: { marginTop: 4, marginBottom: 16 },
  inputPrincipal: {
    backgroundColor: colores.superficie,
    color: colores.texto,
    borderRadius: radios.grande,
    padding: 16,
    fontSize: 17,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colores.borde,
  },
  mensaje: { color: colores.error, textAlign: 'center', marginTop: 14, fontSize: 15 },
  mensajeOk: { color: colores.primario },
});