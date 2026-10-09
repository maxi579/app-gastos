import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colores, radios } from '../constants/tema';
import { useDatos } from '../lib/contextoDatos';
import type { MedioPago, Red, TipoMedio } from '../lib/tipos';
import { Boton, Campo, Chip, Etiqueta, Texto as Text } from './ui';

type Props = { medio?: MedioPago; onGuardado: () => void; onCancelar: () => void };

const REDES: { valor: Red; etiqueta: string }[] = [
  { valor: 'visa', etiqueta: 'Visa' },
  { valor: 'mastercard', etiqueta: 'Mastercard' },
  { valor: 'amex', etiqueta: 'Amex' },
  { valor: 'otra', etiqueta: 'Otra' },
];

export default function FormularioMedioPago({ medio, onGuardado, onCancelar }: Props) {
  const fuente = useDatos();
  const editando = medio !== undefined;
  const [nombre, setNombre] = useState(medio?.nombre ?? '');
  const [banco, setBanco] = useState(medio?.banco ?? '');
  const [tipo, setTipo] = useState<TipoMedio>(medio?.tipo ?? 'debito');
  const [red, setRed] = useState<Red | null>(medio?.red ?? null);
  const [cierre, setCierre] = useState(medio?.dia_cierre ? String(medio.dia_cierre) : '');
  const [vencimiento, setVencimiento] = useState(medio?.dia_vencimiento ? String(medio.dia_vencimiento) : '');
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

    const datos = {
      nombre: nombre.trim(),
      banco: banco.trim() || null,
      tipo,
      red,
      dia_cierre: esCredito ? diaCierre : null,
      dia_vencimiento: esCredito ? diaVencimiento : null,
    };

    setGuardando(true);
    try {
      if (editando) await fuente.actualizarMedio(medio.id, datos);
      else await fuente.crearMedio(datos);
      setGuardando(false);
      onGuardado();
    } catch (e) {
      setGuardando(false);
      setError((e as Error).message);
    }
  }

  return (
    <View style={styles.caja}>
      {editando && <Text style={styles.titulo}>Editar {medio.nombre}</Text>}

      <Etiqueta>Tipo</Etiqueta>
      <View style={styles.chips}>
        <Chip etiqueta="Débito" activo={tipo === 'debito'} onPress={() => setTipo('debito')} />
        <Chip etiqueta="Crédito" activo={tipo === 'credito'} onPress={() => setTipo('credito')} />
      </View>

      <Campo etiqueta="Nombre" placeholder='Ej: "Mercado Pago"' value={nombre} onChangeText={setNombre} />
      <Campo etiqueta="Banco o billetera (opcional)" placeholder="Ej: Mercado Pago, Galicia" value={banco} onChangeText={setBanco} />

      <Etiqueta>Red (opcional)</Etiqueta>
      <View style={styles.chips}>
        {REDES.map((r) => (
          <Chip key={r.valor} etiqueta={r.etiqueta} activo={red === r.valor} onPress={() => setRed(red === r.valor ? null : r.valor)} />
        ))}
      </View>

      {esCredito && (
        <>
          <View style={styles.fila}>
            <Campo
              etiqueta="Día de cierre"
              contenedor={{ flex: 1 }}
              placeholder="Ej: 5"
              value={cierre}
              onChangeText={setCierre}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Campo
              etiqueta="Día de vencimiento"
              contenedor={{ flex: 1 }}
              placeholder="Ej: 15"
              value={vencimiento}
              onChangeText={setVencimiento}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          {editando && (
            <Text style={styles.nota}>
              Si cambiás el cierre, se aplica a los gastos que cargues desde ahora. Los anteriores quedan como estaban.
            </Text>
          )}
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.fila}>
        <Boton titulo="Cancelar" variante="secundario" onPress={onCancelar} estilo={styles.botonFila} />
        <Boton titulo={editando ? 'Guardar cambios' : 'Guardar'} onPress={guardar} cargando={guardando} estilo={styles.botonFila} />
      </View>
    </View>
  );
}

function esDiaValido(dia: number) {
  return Number.isInteger(dia) && dia >= 1 && dia <= 31;
}

const styles = StyleSheet.create({
  caja: { backgroundColor: colores.superficie, borderRadius: radios.grande, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colores.borde },
  titulo: { color: colores.texto, fontSize: 17, fontWeight: '700' },
  fila: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nota: { color: colores.textoTenue, fontSize: 13, marginTop: 10 },
  error: { color: colores.error, marginTop: 12 },
  botonFila: { flex: 1, marginTop: 16 },
});