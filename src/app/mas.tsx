import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Encabezado, Texto as Text } from '../components/ui';
import { colores, radios } from '../constants/tema';

type Opcion = { icono: keyof typeof Ionicons.glyphMap; titulo: string; detalle: string; destino: Href };

// Lo que no entra en la barra de abajo, agrupado para que se encuentre fácil
const GRUPOS: { titulo: string; opciones: Opcion[] }[] = [
  {
    titulo: 'Tu plata',
    opciones: [
      { icono: 'calendar', titulo: 'Cuotas', detalle: 'Lo que tenés que pagar, mes por mes', destino: '/cuotas' },
      { icono: 'cash', titulo: 'Efectivo', detalle: 'Tu billetera y lo que pagás en mano', destino: '/efectivo' },
      { icono: 'trending-up', titulo: 'Activos', detalle: 'Lo que tenés y cuánto te puede rendir', destino: '/activos' },
      { icono: 'bag-check', titulo: '¿Lo compro?', detalle: 'Te digo si te conviene antes de comprar', destino: '/comprar' },
    ],
  },
  {
    titulo: 'Anotar más rápido',
    opciones: [
      { icono: 'flash', titulo: 'Anotar sin esfuerzo', detalle: 'Siri, mails de pagos y notificaciones', destino: '/automatico' },
      { icono: 'mail-unread', titulo: 'Pagos para revisar', detalle: 'Los que encontré solos', destino: '/revisar' },
      { icono: 'document-text', titulo: 'Revisar el resumen', detalle: 'Subí el PDF de la tarjeta', destino: '/resumen' },
    ],
  },
  {
    titulo: 'Configuración',
    opciones: [{ icono: 'settings', titulo: 'Ajustes', detalle: 'Sueldo, tarjetas, avisos y tu cuenta', destino: '/ajustes' }],
  },
];

export default function Mas() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido}>
      <Encabezado titulo="Más" />
      {GRUPOS.map((grupo) => (
        <View key={grupo.titulo} style={styles.grupo}>
          <Text style={styles.tituloGrupo}>{grupo.titulo}</Text>
          <View style={styles.caja}>
            {grupo.opciones.map((opcion, i) => (
              <Pressable
                key={opcion.titulo}
                style={({ pressed }) => [styles.opcion, i > 0 && styles.conBorde, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(opcion.destino)}
              >
                <View style={styles.icono}>
                  <Ionicons name={opcion.icono} size={20} color={colores.primario} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.titulo}>{opcion.titulo}</Text>
                  <Text style={styles.detalle}>{opcion.detalle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  grupo: { marginBottom: 22 },
  tituloGrupo: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  caja: { backgroundColor: colores.superficie, borderRadius: radios.grande, borderWidth: 1, borderColor: colores.borde, paddingHorizontal: 14 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  conBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colores.borde },
  icono: { width: 40, height: 40, borderRadius: 12, backgroundColor: colores.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: colores.texto, fontSize: 16, fontWeight: '600' },
  detalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
});
