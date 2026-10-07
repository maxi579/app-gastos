import { StyleSheet, View } from 'react-native';
import { colores } from '../constants/tema';
import { formatearMonto } from '../lib/finanzas';
import { formatearEntradaMonto, leerMonto } from '../lib/formato';
import type { ValoresGasto } from '../lib/gastos';
import { CATEGORIAS, type MedioPago } from '../lib/tipos';
import { Boton, Campo, Chip, Etiqueta, Texto as Text } from './ui';

type Props = {
  valores: ValoresGasto;
  onCambio: (valores: ValoresGasto) => void;
  medios: MedioPago[];
  onGuardar: () => void;
  onCancelar: () => void;
  textoGuardar?: string;
  textoCancelar?: string;
  guardando?: boolean;
};

export default function FormularioGasto({
  valores,
  onCambio,
  medios,
  onGuardar,
  onCancelar,
  textoGuardar = 'Guardar',
  textoCancelar = 'Descartar',
  guardando = false,
}: Props) {
  const cambiar = (cambios: Partial<ValoresGasto>) => onCambio({ ...valores, ...cambios });
  const monto = leerMonto(valores.montoTexto);
  const cuotas = Number(valores.cuotasTexto);

  return (
    <View>
      <Campo etiqueta="Descripción" value={valores.descripcion} onChangeText={(v) => cambiar({ descripcion: v })} />

      <View style={styles.fila}>
        <Campo
          etiqueta="Monto total"
          contenedor={{ flex: 2 }}
          value={valores.montoTexto}
          onChangeText={(v) => cambiar({ montoTexto: formatearEntradaMonto(v) })}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Campo
          etiqueta="Cuotas"
          contenedor={{ flex: 1 }}
          value={valores.cuotasTexto}
          onChangeText={(v) => cambiar({ cuotasTexto: v })}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>
      {monto > 0 && cuotas > 1 && (
        <Text style={styles.ayuda}>
          {cuotas} cuotas de {formatearMonto(monto / cuotas, valores.moneda)}
        </Text>
      )}

      <Etiqueta>Moneda</Etiqueta>
      <View style={styles.chips}>
        <Chip etiqueta="Pesos" activo={valores.moneda === 'ARS'} onPress={() => cambiar({ moneda: 'ARS' })} />
        <Chip etiqueta="Dólares" activo={valores.moneda === 'USD'} onPress={() => cambiar({ moneda: 'USD' })} />
      </View>

      <Etiqueta>Medio de pago</Etiqueta>
      <View style={styles.chips}>
        {medios.map((m) => (
          <Chip key={m.id} etiqueta={m.nombre} activo={valores.medioId === m.id} onPress={() => cambiar({ medioId: m.id })} />
        ))}
        <Chip etiqueta="Efectivo" activo={valores.medioId === null} onPress={() => cambiar({ medioId: null })} />
      </View>

      <Etiqueta>Categoría</Etiqueta>
      <View style={styles.chips}>
        {CATEGORIAS.map((c) => (
          <Chip key={c} etiqueta={c} activo={valores.categoria === c} onPress={() => cambiar({ categoria: c })} />
        ))}
      </View>

      <View style={styles.fila}>
        <Boton titulo={textoCancelar} variante="secundario" onPress={onCancelar} estilo={styles.botonFila} />
        <Boton titulo={textoGuardar} onPress={onGuardar} cargando={guardando} estilo={styles.botonFila} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ayuda: { color: colores.primario, fontSize: 13, marginTop: 6 },
  botonFila: { flex: 1, marginTop: 20 },
});