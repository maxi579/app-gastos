import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FormularioMedioPago from '../components/FormularioMedioPago';
import { supabase } from '../lib/supabase';
import type { MedioPago } from '../lib/tipos';

export default function Ajustes() {
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const cargarMedios = useCallback(async () => {
    const { data, error } = await supabase.from('tarjetas').select('*').order('creado_en');
    if (error) Alert.alert('Error', error.message);
    else setMedios(data);
  }, []);

  useEffect(() => {
    cargarMedios();
  }, [cargarMedios]);

  function confirmarBorrado(medio: MedioPago) {
    Alert.alert(
      'Eliminar medio de pago',
      `¿Eliminar "${medio.nombre}"? Los gastos que tenga asociados se conservan, pero sin medio de pago.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('tarjetas').delete().eq('id', medio.id);
            if (error) Alert.alert('Error', error.message);
            else cargarMedios();
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Text style={styles.seccion}>Mis medios de pago</Text>

      {medios.length === 0 && !mostrarFormulario && (
        <Text style={styles.vacio}>Todavía no cargaste ninguno.</Text>
      )}

      {medios.map((medio) => (
        <View key={medio.id} style={styles.tarjeta}>
          <Ionicons name={medio.tipo === 'credito' ? 'card' : 'wallet'} size={24} color="#22c55e" />
          <View style={styles.info}>
            <Text style={styles.nombre}>{medio.nombre}</Text>
            <Text style={styles.detalle}>
              {medio.tipo === 'credito'
                ? `Crédito · cierra el ${medio.dia_cierre} · vence el ${medio.dia_vencimiento}`
                : 'Débito'}
              {medio.banco ? ` · ${medio.banco}` : ''}
            </Text>
          </View>
          <Pressable onPress={() => confirmarBorrado(medio)} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color="#64748b" />
          </Pressable>
        </View>
      ))}

      {mostrarFormulario ? (
        <FormularioMedioPago
          onGuardado={() => {
            setMostrarFormulario(false);
            cargarMedios();
          }}
          onCancelar={() => setMostrarFormulario(false)}
        />
      ) : (
        <Pressable style={styles.botonAgregar} onPress={() => setMostrarFormulario(true)}>
          <Ionicons name="add" size={20} color="#22c55e" />
          <Text style={styles.textoAgregar}>Agregar medio de pago</Text>
        </Pressable>
      )}

      <Pressable style={styles.botonSalir} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.textoSalir}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  contenido: { padding: 20, paddingBottom: 40 },
  seccion: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  vacio: { color: '#64748b', marginBottom: 12 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 10 },
  info: { flex: 1, marginLeft: 12 },
  nombre: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  detalle: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  botonAgregar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#22c55e', borderRadius: 16, padding: 16, marginTop: 4 },
  textoAgregar: { color: '#22c55e', fontWeight: '600', fontSize: 16 },
  botonSalir: { marginTop: 40, alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#ef4444' },
  textoSalir: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
});