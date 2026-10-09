import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import FormularioGasto from '../components/FormularioGasto';
import { useAviso } from '../components/Toast';
import { Boton, confirmar, Encabezado, Texto as Text } from '../components/ui';
import { estiloCategoria } from '../constants/categorias';
import { colores, colorSegunPorcentaje, degradados, radios, tipografia } from '../constants/tema';
import { consejos, emojiDe, TONOS } from '../lib/asistente';
import { avisosDisponibles, programarAvisosCierre, programarRecordatorios, recordatorioActivado } from '../lib/avisos';
import { useDatos } from '../lib/contextoDatos';
import type { GastoConMedio, Perfil } from '../lib/datos';
import {
  diaDeLibertad,
  formatearDia,
  formatearFecha,
  formatearMes,
  formatearMonto,
  MESES,
  proyectarCuotas,
  tarjetasParaHoy,
  totalEnPesos,
  type MesProyectado,
} from '../lib/finanzas';
import { montoATexto } from '../lib/formato';
import { fechaDesdeTexto, prepararGasto, type ValoresGasto } from '../lib/gastos';
import { useIndicadores } from '../lib/indicadores';
import type { Categoria, MedioPago } from '../lib/tipos';

type Edicion = { gasto: GastoConMedio; valores: ValoresGasto };
type SeccionDia = { titulo: string; total: number; data: GastoConMedio[] };
type TotalCategoria = { categoria: string; total: number };

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function Inicio() {
  const datos = useDatos();
  const aviso = useAviso();
  const { dolarTarjeta } = useIndicadores();
  const [perfil, setPerfil] = useState<Perfil>({ nombre: null, sueldo: null, tono: 'directo' });
  const [gastos, setGastos] = useState<GastoConMedio[]>([]);
  const [meses, setMeses] = useState<MesProyectado[]>([]);
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [conRecordatorio, setConRecordatorio] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [nuevoPerfil, todos, listaMedios] = await Promise.all([datos.perfil(), datos.gastos(), datos.medios()]);
      setPerfil(nuevoPerfil);
      setGastos(todos);
      setMeses(proyectarCuotas(todos, new Date(), 2));
      setMedios(listaMedios);
      setCargado(true);
      if (!datos.esDemo) {
        programarAvisosCierre(listaMedios).catch(() => {});
        const hoyTexto = formatearFecha(new Date());
        programarRecordatorios(todos.some((g) => g.fecha_compra === hoyTexto)).catch(() => {});
        recordatorioActivado().then(setConRecordatorio);
      }
    } catch (e) {
      aviso(`No se pudieron cargar tus datos. ${(e as Error).message}`, 'error');
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
      setMensaje((e as Error).message);
    }
    setGuardando(false);
  }

  function confirmarBorrado() {
    if (!edicion) return;
    const { gasto } = edicion;
    confirmar('Borrar gasto', `¿Borrar "${gasto.descripcion}"? También se borran sus cuotas.`, 'Borrar', async () => {
      try {
        await datos.borrarGasto(gasto.id);
        setEdicion(null);
        aviso('Gasto borrado');
        cargar();
      } catch (e) {
        setMensaje((e as Error).message);
      }
    });
  }

  const hoy = new Date();
  const { nombre, sueldo, tono } = perfil;
  const primerNombre = nombre ? nombre.split(' ')[0] : null;
  const esteMes = meses[0] ?? { ars: 0, usd: 0 };
  const totalEsteMes = totalEnPesos(esteMes, dolarTarjeta);
  const proximoMes = meses[1] ? totalEnPesos(meses[1], dolarTarjeta) : 0;
  const porcentaje = sueldo ? (totalEsteMes / sueldo) * 100 : null;
  const colorEstado = colorSegunPorcentaje(porcentaje);
  const categorias = totalesPorCategoria(gastos, hoy);
  const maximoCategoria = categorias[0]?.total ?? 1;
  const mejorTarjeta = tarjetasParaHoy(medios, hoy)[0] ?? null;
  const libertad = diaDeLibertad(gastos, hoy);
  const tips = cargado ? consejos({ tono, hoy, porcentaje, medios, gastos }) : [];
  const pasos = [
    { hecho: sueldo !== null, texto: 'Contame cuánto cobrás por mes', destino: '/ajustes' as Href },
    { hecho: medios.length > 0, texto: 'Agregá tu tarjeta o billetera', destino: '/ajustes' as Href },
    { hecho: gastos.length > 0, texto: 'Anotá tu primer gasto', destino: '/cargar' as Href },
    ...(avisosDisponibles && !datos.esDemo
      ? [{ hecho: conRecordatorio, texto: 'Activá el recordatorio de la noche', destino: '/ajustes' as Href }]
      : []),
  ];
  const faltanPasos = cargado && pasos.some((p) => !p.hecho);

  return (
    <View style={styles.container}>
      <SectionList
        contentContainerStyle={styles.contenido}
        sections={agruparPorDia(gastos.slice(0, 30), hoy)}
        keyExtractor={(gasto) => gasto.id}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
        ListHeaderComponent={
          <View>
            <Encabezado titulo={`Hola${primerNombre ? `, ${primerNombre}` : ''} 👋`} subtitulo="Así venís este mes" />

            {datos.esDemo && (
              <View style={styles.demo}>
                <Ionicons name="sparkles" size={16} color={colores.advertencia} />
                <Text style={styles.demoTexto}>Estás probando la app con datos de ejemplo. Nada de lo que hagas se guarda.</Text>
              </View>
            )}

            {faltanPasos && (
              <View style={styles.pasos}>
                <Text style={styles.pasosTitulo}>Primeros pasos</Text>
                {pasos.map((paso) => (
                  <Pressable
                    key={paso.texto}
                    style={({ pressed }) => [styles.paso, pressed && { opacity: 0.7 }]}
                    onPress={() => !paso.hecho && router.push(paso.destino)}
                    disabled={paso.hecho}
                  >
                    <Ionicons
                      name={paso.hecho ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={paso.hecho ? colores.primario : colores.textoTenue}
                    />
                    <Text style={[styles.pasoTexto, paso.hecho && styles.pasoHecho]}>{paso.texto}</Text>
                    {!paso.hecho && <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />}
                  </Pressable>
                ))}
              </View>
            )}

            <Animated.View entering={FadeInDown.springify()}>
              <LinearGradient colors={degradados.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                <Text style={styles.heroEtiqueta}>Este mes tenés que pagar</Text>
                <Text style={styles.heroMonto}>{formatearMonto(Math.round(esteMes.ars))}</Text>
                {esteMes.usd > 0 && (
                  <Text style={styles.heroDolares}>
                    y {formatearMonto(esteMes.usd, 'USD')}
                    {dolarTarjeta ? ` (unos ${formatearMonto(Math.round(esteMes.usd * dolarTarjeta))})` : ''}
                  </Text>
                )}

                {porcentaje !== null ? (
                  <>
                    <View style={styles.barraFondo}>
                      <View style={[styles.barraRelleno, { width: `${Math.min(porcentaje, 100)}%`, backgroundColor: colorEstado }]} />
                    </View>
                    <View style={styles.heroFila}>
                      <Text style={styles.heroDato}>Es el {porcentaje.toFixed(0)}% de tu sueldo</Text>
                      <Text style={styles.heroDato}>Te quedan {formatearMonto(Math.round(Math.max(sueldo! - totalEsteMes, 0)))}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.heroPista}>Cargá tu sueldo en Ajustes para ver cuánto te queda.</Text>
                )}

                {proximoMes > 0 && (
                  <View style={styles.heroProximo}>
                    <Ionicons name="calendar-outline" size={16} color="#a7f3d0" />
                    <Text style={styles.heroProximoTexto}>
                      En {MESES[(hoy.getMonth() + 1) % 12]} ya tenés {formatearMonto(Math.round(proximoMes))} para pagar
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>

            {tips.length > 0 && (
              <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.asistente}>
                <View style={styles.asistenteEncabezado}>
                  <Text style={styles.asistenteEmoji}>{emojiDe(tono)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.asistenteTitulo}>Tu asistente</Text>
                    <Text style={styles.asistenteTono}>{TONOS.find((t) => t.valor === tono)?.nombre}</Text>
                  </View>
                </View>
                {tips.map((tip) => (
                  <View key={tip.texto} style={styles.tip}>
                    <Ionicons name={tip.icono} size={18} color={colores.primario} style={{ marginTop: 2 }} />
                    <Text style={styles.tipTexto}>{tip.texto}</Text>
                  </View>
                ))}
              </Animated.View>
            )}

            {(mejorTarjeta || libertad) && (
              <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.utiles}>
                {mejorTarjeta && (
                  <Pressable style={({ pressed }) => [styles.util, pressed && { opacity: 0.7 }]} onPress={() => router.push('/comprar')}>
                    <View style={styles.utilIcono}>
                      <Ionicons name="card" size={20} color={colores.primario} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.utilEtiqueta}>Si comprás algo hoy, usá la</Text>
                      <Text style={styles.utilValor}>{mejorTarjeta.medio.nombre}</Text>
                      <Text style={styles.utilDetalle}>
                        La pagás el {formatearDia(mejorTarjeta.fechaPago)} (dentro de {mejorTarjeta.dias} días)
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
                  </Pressable>
                )}
                {mejorTarjeta && libertad && <View style={styles.separador} />}
                {libertad && (
                  <Pressable style={({ pressed }) => [styles.util, pressed && { opacity: 0.7 }]} onPress={() => router.push('/cuotas')}>
                    <View style={styles.utilIcono}>
                      <Ionicons name="flag" size={20} color={colores.primario} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.utilEtiqueta}>Terminás de pagar tus cuotas en</Text>
                      <Text style={styles.utilValor}>{capitalizar(formatearMes(libertad, hoy))}</Text>
                      <Text style={styles.utilDetalle}>Tu día de libertad 🏁</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
                  </Pressable>
                )}
              </Animated.View>
            )}

            {categorias.length > 0 && (
              <Animated.View entering={FadeInDown.delay(200).springify()}>
                <Text style={[tipografia.seccion, styles.seccion]}>En qué gastaste en {MESES[hoy.getMonth()]}</Text>
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
            {gastos.length > 0 && <Text style={styles.pista}>Tocá un gasto para cambiarlo o borrarlo.</Text>}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.dia}>
            <Text style={styles.diaTitulo}>{section.titulo}</Text>
            <Text style={styles.diaTotal}>{formatearMonto(Math.round(section.total))}</Text>
          </View>
        )}
        ListEmptyComponent={
          cargado ? (
            <View style={styles.vacio}>
              <Ionicons name="receipt-outline" size={36} color={colores.textoTenue} />
              <Text style={styles.vacioTexto}>Todavía no anotaste gastos.{'\n'}Tocá el botón verde + para anotar el primero.</Text>
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
                  {gasto.pendiente && <Text style={styles.pendiente}>⏳ Se sube cuando haya internet</Text>}
                </View>
                <Text style={styles.monto}>{formatearMonto(Number(gasto.monto_total), gasto.moneda)}</Text>
              </Pressable>
            </Animated.View>
          );
        }}
      />

      <Modal visible={edicion !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEdicion(null)}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contenidoModal} keyboardShouldPersistTaps="handled">
          <Text style={tipografia.titulo}>Cambiar gasto</Text>
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
          <Boton titulo="Borrar este gasto" variante="peligro" onPress={confirmarBorrado} estilo={{ marginTop: 28 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

function capitalizar(texto: string) {
  return texto[0].toUpperCase() + texto.slice(1);
}

// Total en pesos de las compras de este mes, por categoría, de mayor a menor
function totalesPorCategoria(gastos: GastoConMedio[], hoy: Date): TotalCategoria[] {
  const prefijoMes = formatearFecha(hoy).slice(0, 7);
  const totales = new Map<string, number>();
  for (const g of gastos) {
    if (g.moneda !== 'ARS' || !g.fecha_compra.startsWith(prefijoMes)) continue;
    const categoria = g.categoria ?? 'Otros';
    totales.set(categoria, (totales.get(categoria) ?? 0) + Number(g.monto_total));
  }
  return [...totales].map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
}

// Agrupa los gastos (ya ordenados del más nuevo al más viejo) por día
function agruparPorDia(gastos: GastoConMedio[], hoy: Date): SeccionDia[] {
  const textoHoy = formatearFecha(hoy);
  const ayerFecha = new Date(hoy);
  ayerFecha.setDate(ayerFecha.getDate() - 1);
  const ayer = formatearFecha(ayerFecha);

  const secciones: SeccionDia[] = [];
  for (const gasto of gastos) {
    const titulo = gasto.fecha_compra === textoHoy ? 'Hoy' : gasto.fecha_compra === ayer ? 'Ayer' : tituloDia(gasto.fecha_compra);
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
  demoTexto: { color: '#fde68a', fontSize: 14, flex: 1 },
  pasos: {
    backgroundColor: colores.superficie,
    borderRadius: radios.grande,
    borderWidth: 1,
    borderColor: colores.primario,
    padding: 16,
    marginBottom: 14,
    gap: 4,
  },
  pasosTitulo: { color: colores.texto, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  pasoTexto: { color: colores.texto, fontSize: 16, flex: 1 },
  pasoHecho: { color: colores.textoTenue, textDecorationLine: 'line-through' },
  hero: { borderRadius: radios.enorme, padding: 22, overflow: 'hidden' },
  heroEtiqueta: { color: '#a7f3d0', fontSize: 15, fontWeight: '600' },
  heroMonto: { color: colores.texto, fontSize: 40, fontWeight: '800', marginTop: 6, letterSpacing: -1.5 },
  heroDolares: { color: '#d1fae5', fontSize: 15, marginTop: 2 },
  barraFondo: { height: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 5, marginTop: 18, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 5 },
  heroFila: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  heroDato: { color: '#d1fae5', fontSize: 14, fontWeight: '600' },
  heroPista: { color: '#a7f3d0', fontSize: 15, marginTop: 10 },
  heroProximo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 243, 208, 0.2)',
  },
  heroProximoTexto: { color: '#d1fae5', fontSize: 14, flex: 1 },
  asistente: {
    backgroundColor: colores.superficie,
    borderRadius: radios.grande,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 16,
    marginTop: 14,
    gap: 12,
  },
  asistenteEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  asistenteEmoji: { fontSize: 30 },
  asistenteTitulo: { color: colores.texto, fontSize: 17, fontWeight: '700' },
  asistenteTono: { color: colores.textoTenue, fontSize: 13 },
  tip: { flexDirection: 'row', gap: 10 },
  tipTexto: { color: colores.textoChip, fontSize: 15, lineHeight: 22, flex: 1 },
  utiles: {
    backgroundColor: colores.superficie,
    borderRadius: radios.grande,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 14,
  },
  util: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  utilIcono: { width: 40, height: 40, borderRadius: 12, backgroundColor: colores.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  utilEtiqueta: { color: colores.textoSecundario, fontSize: 13 },
  utilValor: { color: colores.texto, fontSize: 17, fontWeight: '700', marginTop: 1 },
  utilDetalle: { color: colores.primario, fontSize: 13, marginTop: 2 },
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: colores.borde },
  seccion: { marginTop: 28, marginBottom: 12 },
  pista: { color: colores.textoTenue, fontSize: 13, marginTop: -6 },
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
  nombreCategoria: { color: colores.texto, fontSize: 15, fontWeight: '600' },
  montoCategoria: { color: colores.textoSecundario, fontSize: 15 },
  barraCategoriaFondo: { height: 6, backgroundColor: colores.fondo, borderRadius: 3, overflow: 'hidden' },
  barraCategoria: { height: '100%', borderRadius: 3 },
  dia: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  diaTitulo: { color: colores.textoSecundario, fontSize: 14, fontWeight: '600' },
  diaTotal: { color: colores.textoTenue, fontSize: 14 },
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  vacioTexto: { color: colores.textoTenue, fontSize: 15, textAlign: 'center', lineHeight: 22 },
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
  pendiente: { color: colores.advertencia, fontSize: 12, marginTop: 2 },
  monto: { color: colores.texto, fontSize: 16, fontWeight: '700' },
  mensaje: { color: colores.error, textAlign: 'center', marginTop: 14, fontSize: 15 },
});
