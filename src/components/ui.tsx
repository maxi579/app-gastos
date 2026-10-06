import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { colores, radios } from '../constants/tema';

type Variante = 'primario' | 'secundario' | 'peligro';

type PropsBoton = { titulo: string; onPress: () => void; variante?: Variante; cargando?: boolean; estilo?: ViewStyle };

export function Boton({ titulo, onPress, variante = 'primario', cargando = false, estilo }: PropsBoton) {
  const colorTexto =
    variante === 'primario' ? colores.sobrePrimario : variante === 'peligro' ? colores.peligro : colores.textoChip;
  return (
    <Pressable
      onPress={onPress}
      disabled={cargando}
      style={({ pressed }) => [styles.boton, styles[variante], pressed && styles.presionado, estilo]}
    >
      {cargando ? <ActivityIndicator color={colorTexto} /> : <Text style={[styles.textoBoton, { color: colorTexto }]}>{titulo}</Text>}
    </Pressable>
  );
}

type PropsChip = { etiqueta: string; activo: boolean; onPress: () => void };

export function Chip({ etiqueta, activo, onPress }: PropsChip) {
  return (
    <Pressable style={[styles.chip, activo && styles.chipActivo]} onPress={onPress}>
      <Text style={[styles.textoChip, activo && styles.textoChipActivo]}>{etiqueta}</Text>
    </Pressable>
  );
}

type PropsCampo = TextInputProps & { etiqueta: string; contenedor?: ViewStyle };

export function Campo({ etiqueta, contenedor, style, ...props }: PropsCampo) {
  return (
    <View style={contenedor}>
      <Etiqueta>{etiqueta}</Etiqueta>
      <TextInput placeholderTextColor={colores.textoTenue} style={[styles.input, style]} {...props} />
    </View>
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return <Text style={styles.etiqueta}>{children}</Text>;
}

export function Tarjeta({ children, estilo }: { children: ReactNode; estilo?: ViewStyle }) {
  return <View style={[styles.tarjeta, estilo]}>{children}</View>;
}

const styles = StyleSheet.create({
  boton: { borderRadius: radios.medio, padding: 15, alignItems: 'center', justifyContent: 'center' },
  primario: { backgroundColor: colores.primario },
  secundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.borde },
  peligro: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.peligro },
  presionado: { opacity: 0.8 },
  textoBoton: { fontWeight: 'bold', fontSize: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colores.borde },
  chipActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  textoChip: { color: colores.textoChip, fontWeight: '600' },
  textoChipActivo: { color: colores.sobrePrimario },
  etiqueta: { color: colores.textoSecundario, fontSize: 13, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colores.fondo,
    color: colores.texto,
    borderRadius: radios.chico,
    padding: 13,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  tarjeta: { backgroundColor: colores.superficie, borderRadius: radios.grande, padding: 16 },
});