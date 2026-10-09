import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import FormularioMedioPago from '../components/FormularioMedioPago';
import { useAviso } from '../components/Toast';
import { confirmar, Encabezado, Entrada as TextInput, Texto as Text } from '../components/ui';
import { colores, radios } from '../constants/tema';
import { useDatos } from '../lib/contextoDatos';
import { soloDemo } from '../lib/supabase';
import { formatearEntradaMonto, leerMonto, montoATexto } from '../lib/formato';
import type { MedioPago } from '../lib/tipos';

export default function Ajustes() {
  const datos = useDatos();
  const aviso = useAviso();
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [sueldoTexto, setSueldoTexto] = useState('');

  useEffect(() => {
    datos.perfil().then((perfil) => {
      if (perfil.sueldo) setSueldoTexto(montoATexto(perfil.sueldo));
    });
  }, [datos]);

  async function guardarSueldo() {
    const sueldo = leerMonto(sueldoTexto);
    if (!(sueldo > 0)) return aviso('Ingresá un monto válido', 'error');
    try {
      await datos.guardarSueldo(sueldo);
      aviso('Sueldo guardado ✓');
    } catch (e) {
      aviso((e as Error).message, 'error');
    }
  }

  const cargarMedios = useCallback(async () => {
    try {
      setMedios(await datos.medios());
    } catch (e) {
      aviso((e as Error).message, 'error');
    }
  }, [datos, aviso]);

  // Recarga al volver a la pestaña, por si cambió algo en otra pantalla
  useFocusEffect(
    useCallback(() => {
      cargarMedios();
    }, [cargarMedios])
  );

  function confirmarBorrado(medio: MedioPago) {
    confirmar(
      'Eliminar medio de pago',
      `¿Eliminar "${medio.nombre}"? Los gastos que tenga asociados se conservan, pero sin medio de pago.`,
      'Eliminar',
      async () => {
        try {
          await datos.borrarMedio(medio.id);
          aviso('Medio de pago eliminado');
          cargarMedios();
        } catch (e) {
          aviso((e as Error).message, 'error');
        }
      }
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
            <View style={styles.iconoMedio}>
              <Ionicons name={medio.tipo === 'credito' ? 'card' : 'wallet'} size={20} color={colores.primario} />
            </View>
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
              <Ionicons name="trash-outline" size={20} color={colores.textoTenue} />
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
          <Ionicons name="add" size={20} color={colores.primario} />
          <Text style={styles.textoAgregar}>Agregar medio de pago</Text>
        </Pressable>
      )}

      <Pressable style={styles.botonSalir} onPress={() => datos.salir()}>
        <Text style={styles.textoSalir}>{soloDemo ? 'Reiniciar la demo' : datos.esDemo ? 'Salir del modo demo' : 'Cerrar sesión'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  seccion: { color: colores.texto, fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  pista: { color: colores.textoTenue, fontSize: 13, marginTop: -6, marginBottom: 12 },
  vacio: { color: colores.textoTenue, marginBottom: 12 },
  filaSueldo: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  inputSueldo: { flex: 1, backgroundColor: colores.superficie, color: colores.texto, borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, borderColor: colores.borde },
  botonSueldo: { backgroundColor: colores.primario, borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center' },
  textoBotonSueldo: { color: colores.sobrePrimario, fontWeight: 'bold', fontSize: 16 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colores.superficie, borderRadius: radios.grande, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colores.borde },
  iconoMedio: { width: 40, height: 40, borderRadius: 12, backgroundColor: colores.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12 },
  nombre: { color: colores.texto, fontSize: 16, fontWeight: '600' },
  detalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  botonAgregar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: colores.primario, borderRadius: 16, padding: 16, marginTop: 4 },
  textoAgregar: { color: colores.primario, fontWeight: '600', fontSize: 16 },
  botonSalir: { marginTop: 40, alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colores.peligro },
  textoSalir: { color: colores.peligro, fontWeight: 'bold', fontSize: 16 },
});