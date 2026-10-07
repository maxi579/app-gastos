import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Encabezado, Texto as Text } from '../components/ui';
import { formatearMonto, proyectarCuotas, type MesProyectado } from '../lib/finanzas';
import { supabase } from '../lib/supabase';
import type { GastoGuardado } from '../lib/tipos';

export default function Cuotas() {
  const [meses, setMeses] = useState<MesProyectado[]>([]);
  const [sueldo, setSueldo] = useState<number | null>(null);
  const [seleccionado, setSeleccionado] = useState(0);

  useFocusEffect(
    useCallback(() => {
      async function cargar() {
        const [{ data: perfil }, { data: gastos }] = await Promise.all([
          supabase.from('perfiles').select('sueldo').single(),
          supabase.from('gastos').select('*'),
        ]);
        setSueldo(perfil?.sueldo ? Number(perfil.sueldo) : null);
        setMeses(proyectarCuotas((gastos ?? []) as GastoGuardado[], new Date()));
      }
      cargar();
    }, [])
  );

  if (meses.length === 0) return <View style={styles.container} />;

  const mesActual = meses[0];
  const mesElegido = meses[seleccionado];
  const porcentaje = sueldo ? (mesActual.ars / sueldo) * 100 : null;
  const colorEstado = porcentaje === null ? '#64748b' : porcentaje < 50 ? '#22c55e' : porcentaje < 80 ? '#facc15' : '#ef4444';
  const maximo = Math.max(sueldo ?? 0, ...meses.map((m) => m.ars), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido}>
      <Encabezado titulo="Cuotas" subtitulo="Lo que ya tenés comprometido" />

      <View style={styles.resumen}>
        <Text style={styles.etiqueta}>Comprometido este mes</Text>
        <Text style={styles.montoGrande}>{formatearMonto(Math.round(mesActual.ars))}</Text>
        {mesActual.usd > 0 && <Text style={styles.dolares}>+ {formatearMonto(mesActual.usd, 'USD')}</Text>}

        {porcentaje !== null ? (
          <>
            <View style={styles.barraFondo}>
              <View style={[styles.barraRelleno, { width: `${Math.min(porcentaje, 100)}%`, backgroundColor: colorEstado }]} />
            </View>
            <Text style={[styles.porcentaje, { color: colorEstado }]}>
              {porcentaje.toFixed(0)}% de tu sueldo · te quedan {formatearMonto(Math.round(Math.max(sueldo! - mesActual.ars, 0)))}
            </Text>
          </>
        ) : (
          <Text style={styles.aviso}>Cargá tu sueldo en Ajustes para ver qué porcentaje representa.</Text>
        )}
      </View>

      <Text style={styles.seccion}>Próximos meses</Text>
      <View style={styles.grafico}>
        {meses.map((mes, i) => (
          <Pressable key={i} style={styles.columna} onPress={() => setSeleccionado(i)}>
            <View style={styles.zonaBarra}>
              <View
                style={[
                  styles.barra,
                  { height: `${(mes.ars / maximo) * 100}%` },
                  i === seleccionado && styles.barraSeleccionada,
                ]}
              />
            </View>
            <Text style={[styles.mes, i === seleccionado && styles.mesSeleccionado]}>{mes.etiqueta}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.seccion}>
        {mesElegido.etiqueta}: {formatearMonto(Math.round(mesElegido.ars))}
        {mesElegido.usd > 0 ? ` + ${formatearMonto(mesElegido.usd, 'USD')}` : ''}
      </Text>
      {mesElegido.cuotas.length === 0 && <Text style={styles.aviso}>Nada comprometido este mes. 🎉</Text>}
      {mesElegido.cuotas.map((c, i) => (
        <View key={`${c.gastoId}-${i}`} style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemNombre}>{c.descripcion}</Text>
            <Text style={styles.itemDetalle}>{c.total > 1 ? `Cuota ${c.numero} de ${c.total}` : 'Pago único'}</Text>
          </View>
          <Text style={styles.itemMonto}>{formatearMonto(Math.round(c.monto), c.moneda)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  resumen: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20 },
  etiqueta: { color: '#94a3b8', fontSize: 14 },
  montoGrande: { color: '#f8fafc', fontSize: 34, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  dolares: { color: '#94a3b8', fontSize: 15, marginTop: 2 },
  barraFondo: { height: 10, backgroundColor: '#0f172a', borderRadius: 5, marginTop: 16, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 5 },
  porcentaje: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  aviso: { color: '#64748b', fontSize: 14, marginTop: 10 },
  seccion: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginTop: 28, marginBottom: 12 },
  grafico: { flexDirection: 'row', gap: 8, height: 160 },
  columna: { flex: 1, alignItems: 'center' },
  zonaBarra: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barra: { backgroundColor: '#334155', borderRadius: 8, minHeight: 4 },
  barraSeleccionada: { backgroundColor: '#22c55e' },
  mes: { color: '#64748b', fontSize: 13, marginTop: 6 },
  mesSeleccionado: { color: '#22c55e', fontWeight: 'bold' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 8 },
  itemNombre: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  itemDetalle: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  itemMonto: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
});