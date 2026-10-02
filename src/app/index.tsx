import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { formatearMonto } from '../lib/finanzas';
import { supabase } from '../lib/supabase';
import type { GastoGuardado } from '../lib/tipos';

type GastoConMedio = GastoGuardado & { tarjetas: { nombre: string } | null };

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

export default function Inicio() {
  const [nombre, setNombre] = useState<string | null>(null);
  const [gastos, setGastos] = useState<GastoConMedio[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [{ data: perfil }, { data }] = await Promise.all([
      supabase.from('perfiles').select('nombre').single(),
      supabase
        .from('gastos')
        .select('*, tarjetas(nombre)')
        .order('fecha_compra', { ascending: false })
        .order('creado_en', { ascending: false })
        .limit(30),
    ]);
    setNombre(perfil?.nombre ?? null);
    setGastos((data ?? []) as GastoConMedio[]);
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  function confirmarBorrado(gasto: GastoConMedio) {
    const cuotas = gasto.cantidad_cuotas > 1 ? ` en ${gasto.cantidad_cuotas} cuotas` : '';
    Alert.alert(
      'Eliminar gasto',
      `¿Eliminar "${gasto.descripcion}" (${formatearMonto(Number(gasto.monto_total), gasto.moneda)}${cuotas})? También se quitan sus cuotas de la proyección.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('gastos').delete().eq('id', gasto.id);
            if (error) Alert.alert('Error', error.message);
            else setGastos((actuales) => actuales.filter((g) => g.id !== gasto.id));
          },
        },
      ]
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.contenido}
      data={gastos}
      keyExtractor={(gasto) => gasto.id}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor="#22c55e" />}
      ListHeaderComponent={
        <View>
          <Text style={styles.saludo}>Hola{nombre ? `, ${nombre}` : ''} 👋</Text>
          <Text style={styles.seccion}>Últimos gastos</Text>
        </View>
      }
      ListEmptyComponent={
        !cargando ? <Text style={styles.vacio}>Todavía no cargaste gastos. Arrancá desde la pestaña Cargar.</Text> : null
      }
      renderItem={({ item: gasto }) => (
        <Pressable style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]} onPress={() => confirmarBorrado(gasto)}>
          <View style={styles.icono}>
            <Ionicons name={ICONOS[gasto.categoria ?? 'Otros'] ?? ICONOS.Otros} size={22} color="#22c55e" />
          </View>
          <View style={styles.info}>
            <Text style={styles.descripcion} numberOfLines={1}>{gasto.descripcion}</Text>
            <Text style={styles.detalle} numberOfLines={1}>
              {formatearDia(gasto.fecha_compra)} · {gasto.tarjetas?.nombre ?? 'Efectivo'}
              {gasto.cantidad_cuotas > 1 ? ` · ${gasto.cantidad_cuotas} cuotas` : ''}
            </Text>
          </View>
          <Text style={styles.monto}>{formatearMonto(Number(gasto.monto_total), gasto.moneda)}</Text>
        </Pressable>
      )}
    />
  );
}

// '2026-10-02' → '02/10'
function formatearDia(fecha: string) {
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  contenido: { padding: 20, paddingBottom: 40 },
  saludo: { color: '#f8fafc', fontSize: 28, fontWeight: 'bold' },
  seccion: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 12 },
  vacio: { color: '#64748b', fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, marginBottom: 8 },
  icono: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12, marginRight: 8 },
  descripcion: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  detalle: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  monto: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
});