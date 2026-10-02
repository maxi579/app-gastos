import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Red, TipoMedio } from '../lib/tipos';

type Props = { onGuardado: () => void; onCancelar: () => void };

const REDES: { valor: Red; etiqueta: string }[] = [
  { valor: 'visa', etiqueta: 'Visa' },
  { valor: 'mastercard', etiqueta: 'Mastercard' },
  { valor: 'amex', etiqueta: 'Amex' },
  { valor: 'otra', etiqueta: 'Otra' },
];

export default function FormularioMedioPago({ onGuardado, onCancelar }: Props) {
  const [nombre, setNombre] = useState('');
  const [banco, setBanco] = useState('');
  const [tipo, setTipo] = useState<TipoMedio>('debito');
  const [red, setRed] = useState<Red | null>(null);
  const [cierre, setCierre] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esCredito = tipo === 'credito';

  async function guardar() {
    setError(null);
    if (!nombre.trim()) return setError('Poné un nombre, por ejemplo "Mercado Pago".');
    const diaCierre = Number(cierre);
    const diaVencimiento = Number(vencimiento);
    if (esCredito && !(esDiaValido(diaCierre) && esDiaValido(diaVencimiento))) {
      return setError('Los días de cierre y vencimiento tienen que ser números del 1 al 31.');
    }
    setGuardando(true);
    const { error } = await supabase.from('tarjetas').insert({
      nombre: nombre.trim(),
      banco: banco.trim() || null,
      tipo,
      red,
      dia_cierre: esCredito ? diaCierre : null,
      dia_vencimiento: esCredito ? diaVencimiento : null,
    });
    setGuardando(false);
    if (error) setError(error.message);
    else onGuardado();
  }

  return (
    <View style={styles.caja}>
      <Text style={styles.etiqueta}>Tipo</Text>
      <View style={styles.fila}>
        {(['debito', 'credito'] as TipoMedio[]).map((t) => (
          <Pressable key={t} style={[styles.opcion, tipo === t && styles.opcionActiva]} onPress={() => setTipo(t)}>
            <Text style={[styles.textoOpcion, tipo === t && styles.textoOpcionActiva]}>
              {t === 'debito' ? 'Débito' : 'Crédito'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.etiqueta}>Nombre</Text>
      <TextInput style={styles.input} placeholder='Ej: "Mercado Pago"' placeholderTextColor="#64748b"
        value={nombre} onChangeText={setNombre} />

      <Text style={styles.etiqueta}>Banco o billetera (opcional)</Text>
      <TextInput style={styles.input} placeholder="Ej: Mercado Pago, Galicia" placeholderTextColor="#64748b"
        value={banco} onChangeText={setBanco} />

      <Text style={styles.etiqueta}>Red (opcional)</Text>
      <View style={styles.filaChips}>
        {REDES.map((r) => (
          <Pressable key={r.valor} style={[styles.chip, red === r.valor && styles.opcionActiva]}
            onPress={() => setRed(red === r.valor ? null : r.valor)}>
            <Text style={[styles.textoOpcion, red === r.valor && styles.textoOpcionActiva]}>{r.etiqueta}</Text>
          </Pressable>
        ))}
      </View>

      {esCredito && (
        <View style={styles.fila}>
          <View style={{ flex: 1 }}>
            <Text style={styles.etiqueta}>Día de cierre</Text>
            <TextInput style={styles.input} placeholder="Ej: 5" placeholderTextColor="#64748b"
              value={cierre} onChangeText={setCierre} keyboardType="number-pad" maxLength={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.etiqueta}>Día de vencimiento</Text>
            <TextInput style={styles.input} placeholder="Ej: 15" placeholderTextColor="#64748b"
              value={vencimiento} onChangeText={setVencimiento} keyboardType="number-pad" maxLength={2} />
          </View>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.fila}>
        <Pressable style={[styles.boton, styles.botonSecundario]} onPress={onCancelar}>
          <Text style={styles.textoSecundario}>Cancelar</Text>
        </Pressable>
        <Pressable style={styles.boton} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.textoBoton}>Guardar</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function esDiaValido(dia: number) {
  return Number.isInteger(dia) && dia >= 1 && dia <= 31;
}

const styles = StyleSheet.create({
  caja: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 8 },
  etiqueta: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 10 },
  fila: { flexDirection: 'row', gap: 10 },
  filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  opcionActiva: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  textoOpcion: { color: '#cbd5e1', fontWeight: '600' },
  textoOpcionActiva: { color: '#0f172a' },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  error: { color: '#f87171', marginTop: 12 },
  boton: { flex: 1, backgroundColor: '#22c55e', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  botonSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  textoBoton: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  textoSecundario: { color: '#cbd5e1', fontWeight: '600', fontSize: 16 },
});