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
  /** Cuándo se anotó (lo pone la base; en el modo demo puede no estar) */
  creado_en?: string;
};
export type Tono = 'amable' | 'directo' | 'estricto';

// ---------- Gastos fijos y suscripciones ----------

export type TipoFijo = 'servicio' | 'suscripcion';

export type Fijo = {
  id: string;
  descripcion: string;
  categoria: string | null;
  tipo: TipoFijo;
  /** null = el monto cambia cada mes (luz, gas): se carga cuando llega la factura */
  monto: number | null;
  moneda: 'ARS' | 'USD';
  /** Día del mes en que vence o se debita */
  dia: number;
  tarjeta_id: string | null;
  /** Se debita solo (Netflix en la tarjeta): la app lo anota sola el día que vence */
  debito_automatico: boolean;
  activo: boolean;
};

/** Un fijo ya pagado en un mes. mes = 'AAAA-MM-01' */
export type PagoFijo = {
  id: string;
  fijo_id: string;
  mes: string;
  monto: number;
  gasto_id: string | null;
};

// ---------- Efectivo ----------

/** Plata que sacaste del cajero (o te dieron en mano) */
export type Retiro = { id: string; monto: number; fecha: string; nota: string | null; creado_en?: string };

/** Cuánta plata había en la billetera cuando la persona la contó */
export type Conteo = { id: string; monto: number; creado_en: string };

// ---------- Activos ----------

export type TipoActivo = 'dolares' | 'plazo_fijo' | 'remunerada' | 'fci' | 'acciones' | 'cripto' | 'bien' | 'otro';

export type Activo = {
  id: string;
  nombre: string;
  tipo: TipoActivo;
  /** Lo que pusiste o pagaste, en pesos */
  monto_inicial: number;
  fecha_inicio: string;
  /** Cuántos dólares compraste (solo dólares) */
  cantidad: number | null;
  /** Tasa nominal anual en % (plazo fijo y cuentas remuneradas) */
  tna: number | null;
  /** Días del plazo fijo */
  plazo_dias: number | null;
  /** Cuánto vale hoy, cargado a mano (fondos, acciones, cripto, otros) */
  valor_actual: number | null;
  /** Cuánto pierde de valor por año en % (bienes: auto, celular...) */
  depreciacion_anual: number | null;
};

// ---------- Pagos detectados para revisar ----------

export type OrigenSugerencia = 'mail' | 'notificacion';
export type EstadoSugerencia = 'pendiente' | 'aceptada' | 'descartada' | 'verificacion';

export type Sugerencia = {
  id: string;
  origen: OrigenSugerencia;
  descripcion: string;
  monto: number | null;
  moneda: 'ARS' | 'USD';
  fecha: string;
  /** De dónde vino: "Mercado Pago", "Galicia"... */
  fuente: string | null;
  texto_original: string | null;
  estado: EstadoSugerencia;
};
