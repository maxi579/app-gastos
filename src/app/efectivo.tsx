import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useAviso } from '../components/Toast';
import { Boton, Campo, confirmar, Encabezado, Texto as Text } from '../components/ui';
import { estiloCategoria } from '../constants/categorias';
import { colores, radios, tipografia } from '../constants/tema';
import { activarRecordatorioEfectivo, avisosDisponibles, desactivarRecordatorioEfectivo, recordatorioEfectivoActivado } from '../lib/avisos';
import { useDatos } from '../lib/contextoDatos';
import { balanceEfectivo } from '../lib/efectivo';
import { formatearFecha, formatearMonto } from '../lib/finanzas';
import { formatearEntradaMonto, leerMonto } from '../lib/formato';
import { fechaDesdeTexto } from '../lib/gastos';
import type { Categoria, GastoGuardado, Retiro } from '../lib/tipos';

// Botones rápidos: un toque, el monto y listo
const RAPIDOS: { nombre: string; categoria: Categoria }[] = [
  { nombre: 'Kiosco', categoria: 'Comida y salidas' },
  { nombre: 'Verdulería', categoria: 'Supermercado' },
  { nombre: 'Colectivo / taxi', categoria: 'Transporte' },
  { nombre: 'Comida', categoria: 'Comida y salidas' },
  { nombre: 'Farmacia', categoria: 'Salud' },
  { nombre: 'Otro', categoria: 'Otros' },
];

type Carga = { tipo: 'retiro' } | { tipo: 'gasto'; nombre: string; categoria: Categoria };

export default function Efectivo() {
  const datos = useDatos();
  const aviso = useAviso();
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [gastos, setGastos] = useState<GastoGuardado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [carga, setCarga] = useState<Carga | null>(null);
  const [montoTexto, setMontoTexto] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [recordatorio, setRecordatorio] = useState(false);

  useEffect(() => {
    recordatorioEfectivoActivado().then(setRecordatorio);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaRetiros, listaGastos] = await Promise.all([datos.retiros.listar(), datos.gastos()]);
      setRetiros(listaRetiros);
      setGastos(listaGastos);
    } catch (e) {
      aviso((e as Error).message, 'error');
    }
    setCargando(false);
  }, [datos, aviso]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const balance = balanceEfectivo(retiros, gastos);
  const gastosEfectivo = gastos.filter((g) => g.tarjeta_id === null && balance.desde && g.fecha_compra >= balance.desde).slice(0, 10);

  function abrir(nueva: Carga) {
    setMontoTexto('');
    setNota(nueva.tipo === 'gasto' && nueva.nombre !== 'Otro' ? nueva.nombre : '');
    setCarga(nueva);
  }

  async function guardar() {
    if (!carga) return;
    const monto = leerMonto(montoTexto);
    if (!(monto > 0)) return aviso('Escribí el monto', 'error');
    setGuardando(true);
    try {
      const hoy = formatearFecha(new Date());
      if (carga.tipo === 'retiro') {
        await datos.retiros.crear({ monto, fecha: hoy, nota: nota.trim() || null });
        aviso('Anotado. Te voy recordando qué falta anotar 💵');
      } else {
        await datos.crearGasto({
          descripcion: nota.trim() || carga.nombre,
          categoria: carga.categoria,
          monto_total: monto,
          moneda: 'ARS',
          cantidad_cuotas: 1,
          tarjeta_id: null,
          fecha_compra: hoy,
          primer_mes_cuota: `${hoy.slice(0, 7)}-01`,
        });
        aviso('Gasto en efectivo anotado 👌');
      }
      setCarga(null);
      cargar();
    } catch (e) {
      aviso((e as Error).message, 'error');
    }
    setGuardando(false);
  }

  function borrarRetiro(retiro: Retiro) {
    confirmar('Borrar retiro', `¿Borrar el retiro de ${formatearMonto(retiro.monto)}?`, 'Borrar', async () => {
      try {
        await datos.retiros.borrar(retiro.id);
        cargar();
      } catch (e) {
        aviso((e as Error).message, 'error');
      }
    });
  }

  async function cambiarRecordatorio(activar: boolean) {
    if (!activar) {
      await desactivarRecordatorioEfectivo();
      setRecordatorio(false);
      return aviso('Listo, no te lo voy a recordar', 'info');
    }
    const ok = await activarRecordatorioEfectivo();
    setRecordatorio(ok);
    if (ok) aviso('Te lo recuerdo los domingos a las 20 h 💵');
    else aviso('No tengo permiso para avisarte. Activalo en la configuración del celular.', 'error');
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colores.primario} />}
      >
        <Encabezado titulo="Efectivo" subtitulo="Que no se te escape lo que pagás en mano" volver />

        <View style={styles.balance}>
          {balance.desde ? (
            <>
              <Text style={styles.balanceEtiqueta}>Sin anotar</Text>
              <Text style={[styles.balanceMonto, balance.sinAnotar > 0 && { color: colores.advertencia }]}>
                {formatearMonto(Math.round(balance.sinAnotar))}
              </Text>
              <Text style={styles.balanceDetalle}>
                Sacaste {formatearMonto(Math.round(balance.retirado))} y anotaste {formatearMonto(Math.round(balance.anotado))} en efectivo en los últimos
                30 días.
              </Text>
              {balance.sinAnotar > 0 && (
                <Text style={styles.balancePregunta}>¿Lo tenés en la billetera o te olvidaste de anotar algo? 🤔</Text>
              )}
            </>
          ) : (
            <Text style={styles.balanceDetalle}>
              Cuando saques plata del cajero, anotalo acá. Así te digo cuánto de esa plata todavía no anotaste en qué la gastaste.
            </Text>
          )}
          <Boton titulo="💵 Saqué plata del cajero" variante="secundario" onPress={() => abrir({ tipo: 'retiro' })} estilo={{ marginTop: 14 }} />
        </View>

        <Text style={[tipografia.seccion, styles.seccion]}>Anotar un gasto en efectivo</Text>
        <View style={styles.rapidos}>
          {RAPIDOS.map((r) => {
            const { icono, color } = estiloCategoria(r.categoria);
            return (
              <Pressable
                key={r.nombre}
                style={({ pressed }) => [styles.rapido, pressed && { opacity: 0.7 }]}
                onPress={() => abrir({ tipo: 'gasto', nombre: r.nombre, categoria: r.categoria })}
              >
                <Ionicons name={icono} size={22} color={color} />
                <Text style={styles.textoRapido}>{r.nombre}</Text>
              </Pressable>
            );
          })}
        </View>

        {avisosDisponibles && (
          <View style={styles.tarjeta}>
            <Ionicons name="alarm-outline" size={22} color={colores.primario} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>Recordarme los domingos</Text>
              <Text style={styles.detalle}>
                {datos.esDemo ? 'No disponible en el modo de prueba.' : 'A las 20 h, para anotar lo que pagaste en efectivo en la semana.'}
              </Text>
            </View>
            <Switch
              value={recordatorio}
              onValueChange={cambiarRecordatorio}
              disabled={datos.esDemo}
              trackColor={{ true: colores.primario, false: colores.borde }}
              thumbColor={colores.texto}
            />
          </View>
        )}

        {retiros.length > 0 && (
          <>
            <Text style={[tipografia.seccion, styles.seccion]}>Retiros</Text>
            {retiros.slice(0, 10).map((r) => (
              <View key={r.id} style={styles.tarjeta}>
                <Ionicons name="cash-outline" size={22} color={colores.primario} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre}>{formatearMonto(r.monto)}</Text>
                  <Text style={styles.detalle}>
                    {fechaCorta(r.fecha)}
                    {r.nota ? ` · ${r.nota}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => borrarRetiro(r)} hitSlop={12} accessibilityLabel="Borrar retiro">
                  <Ionicons name="trash-outline" size={20} color={colores.textoTenue} />
                </Pressable>
              </View>
            ))}
          </>
        )}

        {gastosEfectivo.length > 0 && (
          <>
            <Text style={[tipografia.seccion, styles.seccion]}>Lo que anotaste en efectivo</Text>
            {gastosEfectivo.map((g) => (
              <View key={g.id} style={styles.filaGasto}>
                <Text style={styles.detalle}>
                  {fechaCorta(g.fecha_compra)} · {g.descripcion}
                </Text>
                <Text style={styles.nombre}>{formatearMonto(Number(g.monto_total))}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={carga !== null} animationType="fade" transparent onRequestClose={() => setCarga(null)}>
        <View style={styles.fondoModal}>
          <View style={styles.cajaModal}>
            <Text style={styles.tituloModal}>{carga?.tipo === 'retiro' ? '¿Cuánto sacaste?' : `¿Cuánto gastaste${carga?.nombre !== 'Otro' ? ` en ${carga?.nombre.toLowerCase()}` : ''}?`}</Text>
            <Campo
              etiqueta="Monto"
              value={montoTexto}
              onChangeText={(t) => setMontoTexto(formatearEntradaMonto(t))}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus
            />
            <Campo
              etiqueta={carga?.tipo === 'retiro' ? 'Nota (opcional)' : '¿Qué fue?'}
              value={nota}
              onChangeText={setNota}
              placeholder={carga?.tipo === 'retiro' ? 'Ej: cajero Galicia' : 'Ej: verdulería'}
            />
            <View style={styles.filaBotones}>
              <Boton titulo="Cancelar" variante="secundario" onPress={() => setCarga(null)} estilo={{ flex: 1 }} />
              <Boton titulo="Guardar" onPress={guardar} cargando={guardando} estilo={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCorta(fecha: string) {
  const d = fechaDesdeTexto(fecha);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  balance: { backgroundColor: colores.superficie, borderRadius: radios.grande, padding: 18, borderWidth: 1, borderColor: colores.borde },
  balanceEtiqueta: { color: colores.textoSecundario, fontSize: 15, fontWeight: '600' },
  balanceMonto: { color: colores.texto, fontSize: 36, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  balanceDetalle: { color: colores.textoChip, fontSize: 15, lineHeight: 21, marginTop: 6 },
  balancePregunta: { color: colores.advertencia, fontSize: 14, marginTop: 8 },
  seccion: { marginTop: 28, marginBottom: 12 },
  rapidos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rapido: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colores.superficie,
    borderRadius: radios.medio,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  textoRapido: { color: colores.textoChip, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colores.superficie,
    borderRadius: radios.grande,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  nombre: { color: colores.texto, fontSize: 15, fontWeight: '600' },
  detalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  filaGasto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 8 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  cajaModal: { backgroundColor: colores.superficie, borderRadius: radios.grande, padding: 20, borderWidth: 1, borderColor: colores.borde },
  tituloModal: { color: colores.texto, fontSize: 20, fontWeight: '700' },
  filaBotones: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
