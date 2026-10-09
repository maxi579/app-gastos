import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAviso } from '../components/Toast';
import { Chip, Encabezado, Entrada as TextInput, Texto as Text } from '../components/ui';
import { colores, colorSegunPorcentaje, radios } from '../constants/tema';
import { useDatos } from '../lib/contextoDatos';
import {
  calcularPrimerMesCuota,
  formatearMonto,
  inflacionDeEquilibrio,
  mesesHasta,
  proyectarCuotas,
  valorPresenteCuotas,
} from '../lib/finanzas';
import { formatearEntradaMonto, leerMonto } from '../lib/formato';
import type { GastoGuardado, MedioPago } from '../lib/tipos';

// Porcentajes: "2,5" → 2.5
const leerPorcentaje = (texto: string) => Number(texto.replace(',', '.'));

export default function Simular() {
  const datos = useDatos();
  const aviso = useAviso();
  const [precio, setPrecio] = useState('');
  const [descuento, setDescuento] = useState('0');
  const [cuotas, setCuotas] = useState('12');
  const [totalCuotas, setTotalCuotas] = useState('');
  const [inflacion, setInflacion] = useState('2');
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [medioId, setMedioId] = useState<string | null>(null);
  const [gastos, setGastos] = useState<GastoGuardado[]>([]);
  const [sueldo, setSueldo] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([datos.medios(), datos.gastos(), datos.perfil()])
        .then(([todos, guardados, perfil]) => {
          const lista = todos.filter((m) => m.tipo === 'credito');
          setMedios(lista);
          setMedioId((actual) => (lista.some((m) => m.id === actual) ? actual : (lista[0]?.id ?? null)));
          setGastos(guardados);
          setSueldo(perfil.sueldo);
        })
        .catch((e) => aviso(e.message, 'error'));
    }, [datos, aviso])
  );

  const resultado = useMemo(() => {
    const precioN = leerMonto(precio);
    const cuotasN = Number(cuotas);
    const totalN = totalCuotas ? leerMonto(totalCuotas) : precioN;
    const medio = medios.find((m) => m.id === medioId) ?? null;
    if (!(precioN > 0) || !(totalN > 0) || !Number.isInteger(cuotasN) || cuotasN < 1 || !medio) return null;

    const hoy = new Date();
    const contado = precioN * (1 - leerPorcentaje(descuento) / 100);
    const primerMes = calcularPrimerMesCuota(hoy, medio);
    const mesesHastaPrimera = mesesHasta(hoy, primerMes);
    const valorHoy = valorPresenteCuotas(totalN, cuotasN, mesesHastaPrimera, leerPorcentaje(inflacion) / 100);
    const equilibrio = inflacionDeEquilibrio(contado, totalN, cuotasN, mesesHastaPrimera);

    const compraSimulada: GastoGuardado = {
      id: 'simulada',
      descripcion: 'Compra simulada',
      categoria: null,
      monto_total: totalN,
      moneda: 'ARS',
      cantidad_cuotas: cuotasN,
      primer_mes_cuota: primerMes,
      fecha_compra: '',
      tarjeta_id: medio.id,
    };

    return {
      contado,
      totalN,
      cuotasN,
      valorHoy,
      equilibrio,
      antes: proyectarCuotas(gastos, hoy),
      despues: proyectarCuotas([...gastos, compraSimulada], hoy),
    };
  }, [precio, descuento, cuotas, totalCuotas, inflacion, medioId, medios, gastos]);

  const porcentajeSueldo = (valor: number) => (sueldo ? (valor / sueldo) * 100 : null);
  const colorPara = (p: number | null) => (p === null ? colores.texto : colorSegunPorcentaje(p));

  if (medios.length === 0) {
    return (
      <View style={[styles.container, styles.centrado]}>
        <Text style={styles.aviso}>Para simular compras en cuotas, agregá una tarjeta de crédito en Ajustes.</Text>
      </View>
    );
  }

  const convieneCuotas = resultado ? resultado.valorHoy < resultado.contado : false;
  const diferencia = resultado ? Math.abs(resultado.contado - resultado.valorHoy) : 0;
  const peorMes = resultado?.despues.reduce((max, mes) => (mes.ars > max.ars ? mes : max));
  const peorPorcentaje = peorMes ? porcentajeSueldo(peorMes.ars) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Encabezado titulo="¿Me conviene?" subtitulo="Compará contado contra cuotas, en plata de hoy." />

      <View style={styles.tarjeta}>
        <View style={styles.fila}>
          <Campo etiqueta="Precio de lista" valor={precio} onCambio={(v) => setPrecio(formatearEntradaMonto(v))} placeholder="1.200.000" flex={2} />
          <Campo etiqueta="Desc. contado %" valor={descuento} onCambio={setDescuento} placeholder="0" />
        </View>
        <View style={styles.fila}>
          <Campo etiqueta="Cuotas" valor={cuotas} onCambio={setCuotas} placeholder="12" />
          <Campo
            etiqueta="Total en cuotas (si tiene recargo)"
            valor={totalCuotas}
            onCambio={(v) => setTotalCuotas(formatearEntradaMonto(v))}
            placeholder="Igual al precio"
            flex={2}
          />
        </View>
        <Campo etiqueta="Inflación mensual estimada %" valor={inflacion} onCambio={setInflacion} placeholder="2" />

        <Text style={styles.etiqueta}>Tarjeta</Text>
        <View style={styles.chips}>
          {medios.map((m) => (
            <Chip key={m.id} etiqueta={m.nombre} activo={medioId === m.id} onPress={() => setMedioId(m.id)} />
          ))}
        </View>
      </View>

      {resultado && (
        <>
          <View style={[styles.veredicto, { borderColor: convieneCuotas ? colores.primario : colores.advertencia }]}>
            <Text style={[styles.veredictoTitulo, { color: convieneCuotas ? colores.primario : colores.advertencia }]}>
              {convieneCuotas ? 'Conviene en cuotas' : 'Conviene contado'}
            </Text>
            <Text style={styles.veredictoTexto}>Ahorrás {formatearMonto(Math.round(diferencia))} en plata de hoy.</Text>

            <View style={styles.comparacion}>
              <View style={{ flex: 1 }}>
                <Text style={styles.etiqueta}>Contado</Text>
                <Text style={styles.valor}>{formatearMonto(Math.round(resultado.contado))}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.etiqueta}>
                  {resultado.cuotasN} × {formatearMonto(Math.round(resultado.totalN / resultado.cuotasN))}
                </Text>
                <Text style={styles.valor}>{formatearMonto(Math.round(resultado.valorHoy))}</Text>
                <Text style={styles.nota}>en plata de hoy</Text>
              </View>
            </View>

            <Text style={styles.equilibrio}>
              {resultado.equilibrio === 0
                ? 'Las cuotas convienen con cualquier inflación: el contado no tiene descuento suficiente.'
                : resultado.equilibrio === null
                  ? 'Las cuotas no convienen ni con una inflación altísima.'
                  : `Las cuotas convienen si la inflación mensual promedio supera el ${(resultado.equilibrio * 100).toFixed(1)}%.`}
            </Text>
          </View>

          <Text style={styles.seccion}>Si la comprás en cuotas</Text>
          {resultado.despues.map((mes, i) => {
            const antes = resultado.antes[i].ars;
            const pAntes = porcentajeSueldo(antes);
            const pDespues = porcentajeSueldo(mes.ars);
            return (
              <View key={i} style={styles.filaMes}>
                <Text style={styles.mes}>{mes.etiqueta}</Text>
                <Text style={styles.antes}>{pAntes !== null ? `${pAntes.toFixed(0)}%` : formatearMonto(Math.round(antes))}</Text>
                <Text style={styles.flecha}>→</Text>
                <Text style={[styles.despues, { color: colorPara(pDespues) }]}>
                  {pDespues !== null ? `${pDespues.toFixed(0)}%` : formatearMonto(Math.round(mes.ars))}
                </Text>
              </View>
            );
          })}
          {sueldo === null && <Text style={styles.aviso}>Cargá tu sueldo en Ajustes para verlo como porcentaje.</Text>}
          {peorMes && peorPorcentaje !== null && peorPorcentaje >= 80 && (
            <Text style={styles.alerta}>
              ⚠️ Ojo: en {peorMes.etiqueta} pasarías a tener el {peorPorcentaje.toFixed(0)}% de tu sueldo comprometido.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

type PropsCampo = { etiqueta: string; valor: string; onCambio: (v: string) => void; placeholder: string; flex?: number };

function Campo({ etiqueta, valor, onCambio, placeholder, flex = 1 }: PropsCampo) {
  return (
    <View style={{ flex }}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput style={styles.input} value={valor} onChangeText={onCambio} placeholder={placeholder} keyboardType="decimal-pad" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  centrado: { justifyContent: 'center', padding: 24 },
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  tarjeta: { backgroundColor: colores.superficie, borderRadius: radios.grande, padding: 16, borderWidth: 1, borderColor: colores.borde },
  fila: { flexDirection: 'row', gap: 10 },
  etiqueta: { color: colores.textoSecundario, fontSize: 13, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colores.fondo, color: colores.texto, borderRadius: 12, padding: 13, fontSize: 16, borderWidth: 1, borderColor: colores.borde },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  veredicto: { backgroundColor: colores.superficie, borderRadius: radios.grande, padding: 18, marginTop: 20, borderWidth: 2 },
  veredictoTitulo: { fontSize: 22, fontWeight: '800' },
  veredictoTexto: { color: colores.texto, fontSize: 16, marginTop: 4 },
  comparacion: { flexDirection: 'row', gap: 12, marginTop: 8 },
  valor: { color: colores.texto, fontSize: 20, fontWeight: 'bold' },
  nota: { color: colores.textoTenue, fontSize: 12 },
  equilibrio: { color: colores.textoSecundario, fontSize: 14, marginTop: 14 },
  seccion: { color: colores.texto, fontSize: 18, fontWeight: 'bold', marginTop: 28, marginBottom: 10 },
  filaMes: { flexDirection: 'row', alignItems: 'center', backgroundColor: colores.superficie, borderRadius: 12, padding: 12, marginBottom: 6 },
  mes: { color: colores.texto, fontSize: 15, fontWeight: '600', width: 50 },
  antes: { color: colores.textoSecundario, fontSize: 15, flex: 1, textAlign: 'right' },
  flecha: { color: colores.textoTenue, fontSize: 15, marginHorizontal: 10 },
  despues: { fontSize: 15, fontWeight: 'bold', flex: 1 },
  aviso: { color: colores.textoTenue, fontSize: 14, marginTop: 10, textAlign: 'center' },
  alerta: { color: colores.peligro, fontSize: 15, fontWeight: '600', marginTop: 14 },
});