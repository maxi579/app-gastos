export const colores = {
  fondo: '#0b1120',
  superficie: '#151d2e',
  superficieAlta: '#1c2639',
  borde: '#26324a',
  texto: '#f8fafc',
  textoSecundario: '#94a3b8',
  textoTenue: '#64748b',
  textoChip: '#cbd5e1',
  primario: '#34d399',
  primarioSuave: 'rgba(52, 211, 153, 0.14)',
  sobrePrimario: '#052e1c',
  advertencia: '#fbbf24',
  peligro: '#f87171',
  error: '#f87171',
};

// Degradés de las tarjetas destacadas
export const degradados = {
  hero: ['#065f46', '#0f766e', '#134e4a'] as const,
  login: ['#064e3b', '#0b1120'] as const,
};

export const radios = { chico: 12, medio: 14, grande: 20, enorme: 28 };

export const tipografia = {
  titulo: { fontSize: 26, fontWeight: 'bold', color: colores.texto },
  seccion: { fontSize: 18, fontWeight: 'bold', color: colores.texto },
  cuerpo: { fontSize: 16, color: colores.texto },
  secundario: { fontSize: 15, color: colores.textoSecundario },
} as const;

export const fuentes = {
  regular: 'PlusJakartaSans_400Regular',
  medio: 'PlusJakartaSans_500Medium',
  semi: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extra: 'PlusJakartaSans_800ExtraBold',
};

// Verde, amarillo o rojo según qué parte del sueldo está comprometida
export function colorSegunPorcentaje(porcentaje: number | null) {
  if (porcentaje === null || porcentaje < 50) return colores.primario;
  return porcentaje < 80 ? colores.advertencia : colores.peligro;
}
