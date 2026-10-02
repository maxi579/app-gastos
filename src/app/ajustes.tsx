import { Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Ajustes() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Ajustes</Text>
      <Pressable style={styles.boton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.textoBoton}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0f172a' },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 24 },
  boton: { backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, borderWidth: 1, borderColor: '#ef4444' },
  textoBoton: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
});