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