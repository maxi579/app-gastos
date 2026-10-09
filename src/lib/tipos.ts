export type TipoMedio = 'credito' | 'debito';
export type Red = 'visa' | 'mastercard' | 'amex' | 'otra';

export type MedioPago = {
  id: string;
  nombre: string;
  banco: string | null;
  tipo: TipoMedio;
  red: Red | null;
  dia_cierre: number | null;
  dia_vencimiento: number | null;
};

export const CATEGORIAS = [
  'Comida y salidas',
  'Supermercado',
  'Transporte',
  'Servicios',
  'Compras',
  'Salud',
  'Entretenimiento',
  'Educación',
  'Otros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];
export type GastoGuardado = {
  id: string;
  descripcion: string;
  categoria: string | null;
  monto_total: number;
  moneda: 'ARS' | 'USD';
  cantidad_cuotas: number;
  primer_mes_cuota: string | null;
  fecha_compra: string;
  tarjeta_id: string | null;
};
export type Tono = 'amable' | 'directo' | 'estricto';
