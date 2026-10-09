import type { Ionicons } from '@expo/vector-icons';
import type { Categoria } from '../lib/tipos';

type Estilo = { icono: keyof typeof Ionicons.glyphMap; color: string };

export const ESTILO_CATEGORIA: Record<Categoria, Estilo> = {
  'Comida y salidas': { icono: 'fast-food-outline', color: '#fb923c' },
  Supermercado: { icono: 'cart-outline', color: '#34d399' },
  Transporte: { icono: 'car-outline', color: '#60a5fa' },
  Servicios: { icono: 'flash-outline', color: '#facc15' },
  Compras: { icono: 'bag-handle-outline', color: '#f472b6' },
  Salud: { icono: 'medkit-outline', color: '#f87171' },
  Entretenimiento: { icono: 'game-controller-outline', color: '#a78bfa' },
  Educación: { icono: 'school-outline', color: '#2dd4bf' },
  Otros: { icono: 'ellipsis-horizontal-circle-outline', color: '#94a3b8' },
};

export function estiloCategoria(categoria: string | null): Estilo {
  return ESTILO_CATEGORIA[(categoria ?? 'Otros') as Categoria] ?? ESTILO_CATEGORIA.Otros;
}
