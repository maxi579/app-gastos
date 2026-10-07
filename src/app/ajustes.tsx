import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import FormularioMedioPago from '../components/FormularioMedioPago';
import { useAviso } from '../components/Toast';
import { Encabezado, Entrada as TextInput, Texto as Text } from '../components/ui';
import { formatearEntradaMonto, leerMonto, montoATexto } from '../lib/formato';
import { supabase } from '../lib/supabase';
import type { MedioPago } from '../lib/tipos';

export default function Ajustes() {
  const aviso = useAviso();
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [sueldoTexto, setSueldoTexto] = useState('');

  useEffect(() => {
    supabase.from('perfiles').select('sueldo').single().then(({ data }) => {
      if (data?.sueldo) setSueldoTexto(montoATexto(Number(data.sueldo)));
    });
  }, []);

  async function guardarSueldo() {
    const sueldo = leerMonto(sueldoTexto);
    if (!(sueldo > 0)) return aviso('Ingresá un monto válido', 'error');
    const { data: usuario } = await supabase.auth.getUser();
    const { error } = await supabase.from('perfiles').update({ sueldo }).eq('id', usuario.user!.id);
    if (error) aviso(error.message, 'error');
    else aviso('Sueldo guardado ✓');
  }

  const cargarMedios = useCallback(async () => {
    const { data, error } = await supabase.from('tarjetas').select('*').order('creado_en');
    if (error) aviso(error.message, 'error');
    else setMedios(data);
  }, [aviso]);

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
            if (error) return aviso(error.message, 'error');
            aviso('Medio de pago eliminado');
            cargarMedios();
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Encabezado titulo="Ajustes" />

      <Text style={styles.seccion}>Tu sueldo mensual</Text>
      <View style={styles.filaSueldo}>
        <TextInput
          style={styles.inputSueldo}
          value={sueldoTexto}
          onChangeText={(v) => setSueldoTexto(formatearEntradaMonto(v))}
          placeholder="Ej: 600.000"
          keyboardType="number-pad"
        />
        <Pressable style={styles.botonSueldo} onPress={guardarSueldo}>
          <Text style={styles.textoBotonSueldo}>Guardar</Text>
        </Pressable>
      </View>

      <Text style={styles.seccion}>Mis medios de pago</Text>
      {medios.length > 0 && <Text style={styles.pista}>Tocá un medio para editarlo.</Text>}
      {medios.length === 0 && !mostrarFormulario && <Text style={styles.vacio}>Todavía no cargaste ninguno.</Text>}

      {medios.map((medio) =>
        editandoId === medio.id ? (
          <FormularioMedioPago
            key={medio.id}
            medio={medio}
            onGuardado={() => {
              setEditandoId(null);
              aviso('Cambios guardados ✓');
              cargarMedios();
            }}
            onCancelar={() => setEditandoId(null)}
          />
        ) : (
          <Pressable
            key={medio.id}
            style={({ pressed }) => [styles.tarjeta, pressed && { opacity: 0.7 }]}
            onPress={() => {
              setMostrarFormulario(false);
              setEditandoId(medio.id);
            }}
          >
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
          </Pressable>
        )
      )}

      {mostrarFormulario ? (
        <FormularioMedioPago
          onGuardado={() => {
            setMostrarFormulario(false);
            aviso('Medio de pago agregado ✓');
            cargarMedios();
          }}
          onCancelar={() => setMostrarFormulario(false)}
        />
      ) : (
        <Pressable
          style={styles.botonAgregar}
          onPress={() => {
            setEditandoId(null);
            setMostrarFormulario(true);
          }}
        >
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
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  seccion: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  pista: { color: '#64748b', fontSize: 13, marginTop: -6, marginBottom: 12 },
  vacio: { color: '#64748b', marginBottom: 12 },
  filaSueldo: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  inputSueldo: { flex: 1, backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  botonSueldo: { backgroundColor: '#22c55e', borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center' },
  textoBotonSueldo: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 10 },
  info: { flex: 1, marginLeft: 12 },
  nombre: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  detalle: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  botonAgregar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#22c55e', borderRadius: 16, padding: 16, marginTop: 4 },
  textoAgregar: { color: '#22c55e', fontWeight: '600', fontSize: 16 },
  botonSalir: { marginTop: 40, alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#ef4444' },
  textoSalir: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
});