import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import FormularioGasto from '../components/FormularioGasto';
import { useAviso } from '../components/Toast';
import { Boton, Encabezado, Entrada as TextInput, Tarjeta } from '../components/ui';
import { colores, radios } from '../constants/tema';
import { montoATexto } from '../lib/formato';
import { prepararGasto, type ValoresGasto } from '../lib/gastos';
import { interpretarGasto } from '../lib/interpretarGasto';
import { supabase } from '../lib/supabase';
import type { MedioPago } from '../lib/tipos';

export default function Cargar() {
  const aviso = useAviso();
  const [texto, setTexto] = useState('');
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [valores, setValores] = useState<ValoresGasto | null>(null);
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      supabase.from('tarjetas').select('*').order('creado_en').then(({ data }) => setMedios(data ?? []));
    }, [])
  );

  function interpretar() {
    if (!texto.trim()) return aviso('Escribí tu gasto primero 🙂', 'info');
    const resultado = interpretarGasto(texto, medios);
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
    const { error } = await supabase.from('gastos').insert({ ...preparado.fila, texto_original: texto });
    setGuardando(false);

    if (error) return aviso(`No se pudo guardar: ${error.message}`, 'error');
    setValores(null);
    setTexto('');
    aviso('Listo, anotado 👌');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Encabezado titulo="¿En qué gastaste?" subtitulo='Escribilo como te salga: "pizza 18 lucas con mp"' />

      <TextInput
        style={styles.inputPrincipal}
        placeholder="Ej: zapas 120k en 6 cuotas"
        value={texto}
        onChangeText={setTexto}
        multiline
      />
      <Boton titulo="Interpretar" onPress={interpretar} estilo={{ marginTop: 12 }} />

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
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 40 },
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
});