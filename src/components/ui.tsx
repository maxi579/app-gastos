import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, fuentes, radios } from '../constants/tema';

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

// Cada grosor de letra es un archivo de fuente distinto: elegimos el que corresponde
const FAMILIA_POR_PESO: Record<string, string> = {
  normal: fuentes.regular,
  '400': fuentes.regular,
  '500': fuentes.medio,
  '600': fuentes.semi,
  bold: fuentes.bold,
  '700': fuentes.bold,
  '800': fuentes.extra,
  '900': fuentes.extra,
};

// Igual que Text, pero con nuestra fuente según el fontWeight del estilo
export function Texto({ style, ...props }: TextProps) {
  const { fontWeight, ...resto } = StyleSheet.flatten(style) ?? {};
  const familia = FAMILIA_POR_PESO[String(fontWeight ?? '400')] ?? fuentes.regular;
  return <RNText {...props} style={[{ fontFamily: familia }, resto]} />;
}

// Igual que TextInput, pero con nuestra fuente y el color de placeholder del tema
export function Entrada({ style, ...props }: TextInputProps) {
  return <RNTextInput placeholderTextColor={colores.textoTenue} {...props} style={[{ fontFamily: fuentes.regular }, style]} />;
}

type Variante = 'primario' | 'secundario' | 'peligro';

type PropsBoton = { titulo: string; onPress: () => void; variante?: Variante; cargando?: boolean; estilo?: ViewStyle };

export function Boton({ titulo, onPress, variante = 'primario', cargando = false, estilo }: PropsBoton) {
  const escala = useSharedValue(1);
  const estiloAnimado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const colorTexto =
    variante === 'primario' ? colores.sobrePrimario : variante === 'peligro' ? colores.peligro : colores.textoChip;

  return (
    <PressableAnimado
      onPressIn={() => escala.set(withSpring(0.96))}
      onPressOut={() => escala.set(withSpring(1))}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={cargando}
      style={[styles.boton, styles[variante], estiloAnimado, estilo]}
    >
      {cargando ? <ActivityIndicator color={colorTexto} /> : <Texto style={[styles.textoBoton, { color: colorTexto }]}>{titulo}</Texto>}
    </PressableAnimado>
  );
}

type PropsChip = { etiqueta: string; activo: boolean; onPress: () => void };

export function Chip({ etiqueta, activo, onPress }: PropsChip) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, activo && styles.chipActivo, pressed && styles.presionado]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
    >
      <Texto style={[styles.textoChip, activo && styles.textoChipActivo]}>{etiqueta}</Texto>
    </Pressable>
  );
}

type PropsCampo = TextInputProps & { etiqueta: string; contenedor?: ViewStyle };

export function Campo({ etiqueta, contenedor, style, ...props }: PropsCampo) {
  return (
    <View style={contenedor}>
      <Etiqueta>{etiqueta}</Etiqueta>
      <Entrada style={[styles.input, style]} {...props} />
    </View>
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return <Texto style={styles.etiqueta}>{children}</Texto>;
}

export function Tarjeta({ children, estilo }: { children: ReactNode; estilo?: ViewStyle }) {
  return <View style={[styles.tarjeta, estilo]}>{children}</View>;
}

// Título grande de cada pantalla, con espacio para el notch del celular
export function Encabezado({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 12, marginBottom: 18 }}>
      <Texto style={styles.tituloGrande}>{titulo}</Texto>
      {subtitulo && <Texto style={styles.subtituloGrande}>{subtitulo}</Texto>}
    </View>
  );
}

// Pregunta antes de una acción destructiva. En la web Alert no muestra botones, así que usamos confirm().
export function confirmar(titulo: string, mensaje: string, textoAccion: string, accion: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensaje}`)) accion();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoAccion, style: 'destructive', onPress: accion },
  ]);
}

const styles = StyleSheet.create({
  boton: { borderRadius: radios.medio, padding: 15, alignItems: 'center', justifyContent: 'center' },
  primario: { backgroundColor: colores.primario },
  secundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.borde },
  peligro: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.peligro },
  presionado: { opacity: 0.75 },
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
  tarjeta: { backgroundColor: colores.superficie, borderRadius: radios.grande, padding: 16, borderWidth: 1, borderColor: colores.borde },
  tituloGrande: { color: colores.texto, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtituloGrande: { color: colores.textoSecundario, fontSize: 15, marginTop: 4 },
});