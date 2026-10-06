export const colores = {
  fondo: '#0f172a',
  superficie: '#1e293b',
  borde: '#334155',
  texto: '#f8fafc',
  textoSecundario: '#94a3b8',
  textoTenue: '#64748b',
  textoChip: '#cbd5e1',
  primario: '#22c55e',
  sobrePrimario: '#0f172a',
  advertencia: '#facc15',
  peligro: '#ef4444',
  error: '#f87171',
};

export const radios = { chico: 12, medio: 14, grande: 18 };

export const tipografia = {
  titulo: { fontSize: 26, fontWeight: 'bold', color: colores.texto },
  seccion: { fontSize: 18, fontWeight: 'bold', color: colores.texto },
  cuerpo: { fontSize: 16, color: colores.texto },
  secundario: { fontSize: 15, color: colores.textoSecundario },
} as const;