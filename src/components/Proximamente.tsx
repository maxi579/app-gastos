import { StyleSheet, Text, View } from 'react-native';

type Props = { titulo: string; descripcion: string };

export default function Proximamente({ titulo, descripcion }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.descripcion}>{descripcion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0f172a' },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  descripcion: { fontSize: 16, color: '#94a3b8', textAlign: 'center' },
});