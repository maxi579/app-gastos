import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import FormularioGasto from '../components/FormularioGasto';
import { Boton } from '../components/ui';
import { colores, radios, tipografia } from '../constants/tema';
import { formatearFecha, formatearMonto, proyectarCuotas, type MesProyectado } from '../lib/finanzas';
import { fechaDesdeTexto, prepararGasto, type ValoresGasto } from '../lib/gastos';
import { supabase } from '../lib/supabase';
import type { Categoria, GastoGuardado, MedioPago } from '../lib/tipos';

type GastoConMedio = GastoGuardado & { tarjetas: { nombre: string } | null };
type Edicion = { gasto: GastoConMedio; valores: ValoresGasto };
type SeccionDia = { titulo: string; total: number; data: GastoConMedio[] };

const ICONOS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Comida y salidas': 'fast-food-outline',
  Supermercado: 'cart-outline',
  Transporte: 'car-outline',
  Servicios: 'flash-outline',
  Compras: 'bag-handle-outline',
  Salud: 'medkit-outline',
  Entretenimiento: 'game-controller-outline',
  Educación: 'school-outline',
  Otros: 'ellipsis-horizontal-circle-outline',
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function Inicio() {
  const [nombre, setNombre] = useState<string | null>(null);
  const [sueldo, setSueldo] = useState<number | null>(null);
  const [gastos, setGastos] = useState<GastoConMedio[]>([]);
  const [meses, setMeses] = useState<MesProyectado[]>([]);
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [cargando, setCargando] = useState(false);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [{ data: perfil }, { data: recientes }, { data: todos }, { data: listaMedios }] = await Promise.all([
      supabase.from('perfiles').select('nombre, sueldo').single(),
      supabase
        .from('gastos')
        .select('*, tarjetas(nombre)')
        .order('fecha_compra', { ascending: false })
        .order('creado_en', { ascending: false })
        .limit(30),
      supabase.from('gastos').select('*'),
      supabase.from('tarjetas').select('*').order('creado_en'),
    ]);
    setNombre(perfil?.nombre ?? null);
    setSueldo(perfil?.sueldo ? Number(perfil.sueldo) : null);
    setGastos((recientes ?? []) as GastoConMedio[]);
    setMeses(proyectarCuotas((todos ?? []) as GastoGuardado[], new Date(), 2));
    setMedios((listaMedios ?? []) as MedioPago[]);
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  function abrirEdicion(gasto: GastoConMedio) {
    setMensaje(null);
    setEdicion({
      gasto,
      valores: {
        descripcion: gasto.descripcion,
        montoTexto: String(Number(gasto.monto_total)),
        cuotasTexto: String(gasto.cantidad_cuotas),
        moneda: gasto.moneda,
        medioId: gasto.tarjeta_id,
        categoria: (gasto.categoria ?? 'Otros') as Categoria,
      },
    });
  }

  async function guardarEdicion() {
    if (!edicion) return;
    const preparado = prepararGasto(edicion.valores, medios, fechaDesdeTexto(edicion.gasto.fecha_compra));
    if (preparado.error) return setMensaje(preparado.error);

    setGuardando(true);
    const { error } = await supabase.from('gastos').update(preparado.fila).eq('id', edicion.gasto.id);
    setGuardando(false);

    if (error) return setMensaje(`Error: ${error.message}`);
    setEdicion(null);
    cargar();
  }

  function confirmarBorrado() {
    if (!edicion) return;
    const { gasto } = edicion;
    Alert.alert('Eliminar gasto', `¿Eliminar "${gasto.descripcion}"? También se quitan sus cuotas de la proyección.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('gastos').delete().eq('id', gasto.id);
          if (error) return setMensaje(`Error: ${error.message}`);
          setEdicion(null);
          cargar();
        },
      },
    ]);
  }

  const comprometido = meses[0]?.ars ?? 0;
  const proximoMes = meses[1]?.ars ?? 0;
  const porcentaje = sueldo ? (comprometido / sueldo) * 100 : null;
  const colorEstado =
    porcentaje === null ? colores.primario : porcentaje < 50 ? colores.primario : porcentaje < 80 ? colores.advertencia : colores.peligro;

  return (
    <View style={styles.container}>
      <SectionList
        contentContainerStyle={styles.contenido}
        sections={agruparPorDia(gastos)}
        keyExtractor={(gasto) => gasto.id}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
        ListHeaderComponent={
          <View>
            <Text style={tipografia.titulo}>Hola{nombre ? `, ${nombre}` : ''} 👋</Text>

            <View style={styles.hero}>
              <Text style={styles.heroEtiqueta}>Comprometido en {MESES[new Date().getMonth()]}</Text>
              <Text style={styles.heroMonto}>{formatearMonto(Math.round(comprometido))}</Text>

              {porcentaje !== null ? (
                <>
                  <View style={styles.barraFondo}>
                    <View style={[styles.barraRelleno, { width: `${Math.min(porcentaje, 100)}%`, backgroundColor: colorEstado }]} />
                  </View>
                  <View style={styles.heroFila}>
                    <Text style={[styles.heroDato, { color: colorEstado }]}>{porcentaje.toFixed(0)}% de tu sueldo</Text>
                    <Text style={styles.heroDato}>Te quedan {formatearMonto(Math.round(Math.max(sueldo! - comprometido, 0)))}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.heroPista}>Cargá tu sueldo en Ajustes para ver cuánto te queda.</Text>
              )}

              {proximoMes > 0 && (
                <View style={styles.heroProximo}>
                  <Ionicons name="calendar-outline" size={16} color={colores.textoSecundario} />
                  <Text style={styles.heroProximoTexto}>
                    En {MESES[(new Date().getMonth() + 1) % 12]} ya tenés {formatearMonto(Math.round(proximoMes))} comprometidos
                  </Text>
                </View>
              )}
            </View>

            <Text style={[tipografia.seccion, styles.seccion]}>Últimos gastos</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.dia}>
            <Text style={styles.diaTitulo}>{section.titulo}</Text>
            <Text style={styles.diaTotal}>{formatearMonto(Math.round(section.total))}</Text>
          </View>
        )}
        ListEmptyComponent={
          !cargando ? <Text style={styles.vacio}>Todavía no cargaste gastos. Arrancá desde la pestaña Cargar.</Text> : null
        }
        renderItem={({ item: gasto, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
            <Pressable style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]} onPress={() => abrirEdicion(gasto)}>
              <View style={styles.icono}>
                <Ionicons name={ICONOS[gasto.categoria ?? 'Otros'] ?? ICONOS.Otros} size={22} color={colores.primario} />
              </View>
              <View style={styles.info}>
                <Text style={styles.descripcion} numberOfLines={1}>{gasto.descripcion}</Text>
                <Text style={styles.detalle} numberOfLines={1}>
                  {gasto.tarjetas?.nombre ?? 'Efectivo'}
                  {gasto.cantidad_cuotas > 1 ? ` · ${gasto.cantidad_cuotas} cuotas` : ''}
                </Text>
              </View>
              <Text style={styles.monto}>{formatearMonto(Number(gasto.monto_total), gasto.moneda)}</Text>
            </Pressable>
          </Animated.View>
        )}
      />

      <Modal visible={edicion !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEdicion(null)}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contenidoModal} keyboardShouldPersistTaps="handled">
          <Text style={tipografia.titulo}>Editar gasto</Text>
          {edicion && (
            <FormularioGasto
              valores={edicion.valores}
              onCambio={(valores) => setEdicion({ ...edicion, valores })}
              medios={medios}
              onGuardar={guardarEdicion}
              onCancelar={() => setEdicion(null)}
              textoGuardar="Guardar cambios"
              textoCancelar="Cancelar"
              guardando={guardando}
            />
          )}
          {mensaje && <Text style={styles.mensaje}>{mensaje}</Text>}
          <Boton titulo="Eliminar gasto" variante="peligro" onPress={confirmarBorrado} estilo={{ marginTop: 28 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

// Agrupa los gastos (ya ordenados del más nuevo al más viejo) por día
function agruparPorDia(gastos: GastoConMedio[]): SeccionDia[] {
  const hoy = formatearFecha(new Date());
  const ayerFecha = new Date();
  ayerFecha.setDate(ayerFecha.getDate() - 1);
  const ayer = formatearFecha(ayerFecha);

  const secciones: SeccionDia[] = [];
  for (const gasto of gastos) {
    const titulo = gasto.fecha_compra === hoy ? 'Hoy' : gasto.fecha_compra === ayer ? 'Ayer' : tituloDia(gasto.fecha_compra);
    const monto = gasto.moneda === 'ARS' ? Number(gasto.monto_total) : 0;
    const ultima = secciones[secciones.length - 1];
    if (ultima && ultima.titulo === titulo) {
      ultima.data.push(gasto);
      ultima.total += monto;
    } else {
      secciones.push({ titulo, total: monto, data: [gasto] });
    }
  }
  return secciones;
}

// '2026-10-05' → 'Lunes 5 oct'
function tituloDia(fecha: string) {
  const d = fechaDesdeTexto(fecha);
  const dia = DIAS[d.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 20, paddingBottom: 40 },
  contenidoModal: { padding: 20, paddingTop: 28, paddingBottom: 60 },
  hero: {
    backgroundColor: '#052e16',
    borderColor: '#166534',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginTop: 18,
  },
  heroEtiqueta: { color: '#86efac', fontSize: 14, fontWeight: '600' },
  heroMonto: { color: colores.texto, fontSize: 38, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  barraFondo: { height: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 5, marginTop: 16, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 5 },
  heroFila: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  heroDato: { color: colores.textoChip, fontSize: 14, fontWeight: '600' },
  heroPista: { color: colores.textoSecundario, fontSize: 14, marginTop: 10 },
  heroProximo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#166534' },
  heroProximoTexto: { color: colores.textoSecundario, fontSize: 13, flex: 1 },
  seccion: { marginTop: 28 },
  dia: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  diaTitulo: { color: colores.textoSecundario, fontSize: 14, fontWeight: '600' },
  diaTotal: { color: colores.textoTenue, fontSize: 14 },
  vacio: { color: colores.textoTenue, fontSize: 15, marginTop: 8 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colores.superficie, borderRadius: 16, padding: 14, marginBottom: 8 },
  icono: { width: 42, height: 42, borderRadius: radios.chico, backgroundColor: colores.fondo, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12, marginRight: 8 },
  descripcion: { color: colores.texto, fontSize: 16, fontWeight: '600' },
  detalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  monto: { color: colores.texto, fontSize: 16, fontWeight: '600' },
  mensaje: { color: colores.error, textAlign: 'center', marginTop: 14, fontSize: 15 },
});