import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import FormularioGasto from '../components/FormularioGasto';
import { useAviso } from '../components/Toast';
import { Boton, confirmar, Encabezado, Texto as Text } from '../components/ui';
import { estiloCategoria } from '../constants/categorias';
import { colores, colorSegunPorcentaje, degradados, radios, tipografia } from '../constants/tema';
import { useDatos } from '../lib/contextoDatos';
import type { GastoConMedio, Perfil } from '../lib/datos';
import { formatearFecha, formatearMonto, proyectarCuotas, type MesProyectado } from '../lib/finanzas';
import { montoATexto } from '../lib/formato';
import { fechaDesdeTexto, prepararGasto, type ValoresGasto } from '../lib/gastos';
import type { Categoria, MedioPago } from '../lib/tipos';

type Edicion = { gasto: GastoConMedio; valores: ValoresGasto };
type SeccionDia = { titulo: string; total: number; data: GastoConMedio[] };
type TotalCategoria = { categoria: string; total: number };

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function Inicio() {
  const datos = useDatos();
  const aviso = useAviso();
  const [perfil, setPerfil] = useState<Perfil>({ nombre: null, sueldo: null });
  const [gastos, setGastos] = useState<GastoConMedio[]>([]);
  const [meses, setMeses] = useState<MesProyectado[]>([]);
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [cargando, setCargando] = useState(false);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [nuevoPerfil, todos, listaMedios] = await Promise.all([datos.perfil(), datos.gastos(), datos.medios()]);
      setPerfil(nuevoPerfil);
      setGastos(todos);
      setMeses(proyectarCuotas(todos, new Date(), 2));
      setMedios(listaMedios);
    } catch (e) {
      aviso(`No se pudieron cargar tus datos: ${(e as Error).message}`, 'error');
    }
    setCargando(false);
  }, [datos, aviso]);

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
        montoTexto: montoATexto(Number(gasto.monto_total)),
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
    try {
      await datos.actualizarGasto(edicion.gasto.id, preparado.fila);
      setEdicion(null);
      aviso('Cambios guardados ✓');
      cargar();
    } catch (e) {
      setMensaje(`Error: ${(e as Error).message}`);
    }
    setGuardando(false);
  }

  function confirmarBorrado() {
    if (!edicion) return;
    const { gasto } = edicion;
    confirmar('Eliminar gasto', `¿Eliminar "${gasto.descripcion}"? También se quitan sus cuotas de la proyección.`, 'Eliminar', async () => {
      try {
        await datos.borrarGasto(gasto.id);
        setEdicion(null);
        aviso('Gasto eliminado');
        cargar();
      } catch (e) {
        setMensaje(`Error: ${(e as Error).message}`);
      }
    });
  }

  const { nombre, sueldo } = perfil;
  const primerNombre = nombre ? nombre.split(' ')[0] : null;
  const comprometido = meses[0]?.ars ?? 0;
  const proximoMes = meses[1]?.ars ?? 0;
  const porcentaje = sueldo ? (comprometido / sueldo) * 100 : null;
  const colorEstado = colorSegunPorcentaje(porcentaje);
  const categorias = totalesPorCategoria(gastos);
  const maximoCategoria = categorias[0]?.total ?? 1;
  const mesActual = MESES[new Date().getMonth()];

  return (
    <View style={styles.container}>
      <SectionList
        contentContainerStyle={styles.contenido}
        sections={agruparPorDia(gastos.slice(0, 30))}
        keyExtractor={(gasto) => gasto.id}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
        ListHeaderComponent={
          <View>
            <Encabezado titulo={`Hola${primerNombre ? `, ${primerNombre}` : ''} 👋`} subtitulo="Así vienen tus finanzas este mes" />

            {datos.esDemo && (
              <View style={styles.demo}>
                <Ionicons name="sparkles" size={16} color={colores.advertencia} />
                <Text style={styles.demoTexto}>Estás en el modo demo: los datos son de ejemplo y no se guardan.</Text>
              </View>
            )}

            <Animated.View entering={FadeInDown.springify()}>
              <LinearGradient colors={degradados.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                <Text style={styles.heroEtiqueta}>Comprometido en {mesActual}</Text>
                <Text style={styles.heroMonto}>{formatearMonto(Math.round(comprometido))}</Text>

                {porcentaje !== null ? (
                  <>
                    <View style={styles.barraFondo}>
                      <View style={[styles.barraRelleno, { width: `${Math.min(porcentaje, 100)}%`, backgroundColor: colorEstado }]} />
                    </View>
                    <View style={styles.heroFila}>
                      <Text style={styles.heroDato}>{porcentaje.toFixed(0)}% de tu sueldo</Text>
                      <Text style={styles.heroDato}>Te quedan {formatearMonto(Math.round(Math.max(sueldo! - comprometido, 0)))}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.heroPista}>Cargá tu sueldo en Ajustes para ver cuánto te queda.</Text>
                )}

                {proximoMes > 0 && (
                  <View style={styles.heroProximo}>
                    <Ionicons name="calendar-outline" size={16} color="#a7f3d0" />
                    <Text style={styles.heroProximoTexto}>
                      En {MESES[(new Date().getMonth() + 1) % 12]} ya tenés {formatearMonto(Math.round(proximoMes))} comprometidos
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>

            {categorias.length > 0 && (
              <Animated.View entering={FadeInDown.delay(100).springify()}>
                <Text style={[tipografia.seccion, styles.seccion]}>En qué gastaste en {mesActual}</Text>
                <View style={styles.tarjetaCategorias}>
                  {categorias.slice(0, 5).map(({ categoria, total }) => {
                    const { icono, color } = estiloCategoria(categoria);
                    return (
                      <View key={categoria} style={styles.filaCategoria}>
                        <View style={[styles.iconoChico, { backgroundColor: `${color}22` }]}>
                          <Ionicons name={icono} size={16} color={color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.filaCategoriaTexto}>
                            <Text style={styles.nombreCategoria}>{categoria}</Text>
                            <Text style={styles.montoCategoria}>{formatearMonto(Math.round(total))}</Text>
                          </View>
                          <View style={styles.barraCategoriaFondo}>
                            <View style={[styles.barraCategoria, { width: `${(total / maximoCategoria) * 100}%`, backgroundColor: color }]} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

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
          !cargando ? (
            <View style={styles.vacio}>
              <Ionicons name="receipt-outline" size={36} color={colores.textoTenue} />
              <Text style={styles.vacioTexto}>Todavía no cargaste gastos.{'\n'}Tocá el botón + para anotar el primero.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: gasto, index }) => {
          const { icono, color } = estiloCategoria(gasto.categoria);
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
              <Pressable style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]} onPress={() => abrirEdicion(gasto)}>
                <View style={[styles.icono, { backgroundColor: `${color}1f` }]}>
                  <Ionicons name={icono} size={22} color={color} />
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
          );
        }}
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

// Total en pesos de las compras de este mes, por categoría, de mayor a menor
function totalesPorCategoria(gastos: GastoConMedio[]): TotalCategoria[] {
  const prefijoMes = formatearFecha(new Date()).slice(0, 7);
  const totales = new Map<string, number>();
  for (const g of gastos) {
    if (g.moneda !== 'ARS' || !g.fecha_compra.startsWith(prefijoMes)) continue;
    const categoria = g.categoria ?? 'Otros';
    totales.set(categoria, (totales.get(categoria) ?? 0) + Number(g.monto_total));
  }
  return [...totales].map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
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
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  contenidoModal: { padding: 20, paddingTop: 28, paddingBottom: 60 },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderWidth: 1,
    borderRadius: radios.chico,
    padding: 12,
    marginBottom: 14,
  },
  demoTexto: { color: '#fde68a', fontSize: 13, flex: 1 },
  hero: { borderRadius: radios.enorme, padding: 22, overflow: 'hidden' },
  heroEtiqueta: { color: '#a7f3d0', fontSize: 14, fontWeight: '600' },
  heroMonto: { color: colores.texto, fontSize: 38, fontWeight: '800', marginTop: 6, letterSpacing: -1.5 },
  barraFondo: { height: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, marginTop: 18, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 4 },
  heroFila: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  heroDato: { color: '#d1fae5', fontSize: 13, fontWeight: '600' },
  heroPista: { color: '#a7f3d0', fontSize: 14, marginTop: 10 },
  heroProximo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 243, 208, 0.2)',
  },
  heroProximoTexto: { color: '#d1fae5', fontSize: 13, flex: 1 },
  seccion: { marginTop: 28, marginBottom: 12 },
  tarjetaCategorias: {
    backgroundColor: colores.superficie,
    borderRadius: radios.grande,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 16,
    gap: 14,
  },
  filaCategoria: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconoChico: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filaCategoriaTexto: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nombreCategoria: { color: colores.texto, fontSize: 14, fontWeight: '600' },
  montoCategoria: { color: colores.textoSecundario, fontSize: 14 },
  barraCategoriaFondo: { height: 6, backgroundColor: colores.fondo, borderRadius: 3, overflow: 'hidden' },
  barraCategoria: { height: '100%', borderRadius: 3 },
  dia: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  diaTitulo: { color: colores.textoSecundario, fontSize: 14, fontWeight: '600' },
  diaTotal: { color: colores.textoTenue, fontSize: 14 },
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  vacioTexto: { color: colores.textoTenue, fontSize: 15, textAlign: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.superficie,
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  icono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12, marginRight: 8 },
  descripcion: { color: colores.texto, fontSize: 16, fontWeight: '600' },
  detalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  monto: { color: colores.texto, fontSize: 16, fontWeight: '700' },
  mensaje: { color: colores.error, textAlign: 'center', marginTop: 14, fontSize: 15 },
});
