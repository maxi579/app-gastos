import { nivelSegunPorcentaje, type Nivel } from './asistente';
import {
  calcularPrimerMesCuota,
  diaDeLibertad,
  fechaDePago,
  mesesHasta,
  proyectarCuotas,
  totalEnPesos,
  valorPresenteCuotas,
} from './finanzas';
import type { GastoGuardado, MedioPago } from './tipos';

export type PedidoCompra = {
  precio: number;
  cuotas: number;
  /** null = efectivo o débito: se paga hoy, en un pago */
  medio: MedioPago | null;
  /** Descuento por pagar contado, en % */
  descuentoContado: number;
  /** Total a pagar en cuotas si tiene recargo; null = mismo precio */
  totalEnCuotas: number | null;
  /** Fracción mensual (0.02 = 2%) */
  inflacionMensual: number;
  dolarTarjeta: number | null;
  sueldo: number | null;
  gastos: GastoGuardado[];
  hoy: Date;
};

export type MesComparado = { fecha: Date; antes: number; despues: number };

export type Respuesta = {
  nivel: Nivel;
  /** Mes más cargado si se hace la compra, y qué % del sueldo sería */
  peorMes: MesComparado;
  porcentajePeorMes: number | null;
  cuotas: number;
  montoCuota: number;
  totalAPagar: number;
  primerPago: Date;
  /** Solo si hay más de una cuota: qué conviene comparando en plata de hoy */
  comparacion: { convieneCuotas: boolean; contado: number; valorHoyCuotas: number; diferencia: number } | null;
  libertadAntes: Date | null;
  libertadDespues: Date | null;
  meses: MesComparado[];
};

export function evaluarCompra(p: PedidoCompra): Respuesta {
  const cuotas = p.medio ? Math.max(1, p.cuotas) : 1;
  const totalAPagar = cuotas > 1 && p.totalEnCuotas ? p.totalEnCuotas : p.precio;
  const contado = p.precio * (1 - p.descuentoContado / 100);
  const primerMes = calcularPrimerMesCuota(p.hoy, p.medio);
  const mesesHastaPrimera = mesesHasta(p.hoy, primerMes);

  const compra: GastoGuardado = {
    id: 'compra-evaluada',
    descripcion: 'Esta compra',
    categoria: null,
    monto_total: cuotas > 1 ? totalAPagar : contado,
    moneda: 'ARS',
    cantidad_cuotas: cuotas,
    primer_mes_cuota: primerMes,
    fecha_compra: '',
    tarjeta_id: p.medio?.id ?? null,
  };

  // Miramos al menos 6 meses, y todos los que dure la compra
  const cantidadMeses = Math.min(Math.max(6, mesesHastaPrimera + cuotas), 36);
  const antes = proyectarCuotas(p.gastos, p.hoy, cantidadMeses);
  const despues = proyectarCuotas([...p.gastos, compra], p.hoy, cantidadMeses);
  const meses: MesComparado[] = despues.map((mes, i) => ({
    fecha: new Date(p.hoy.getFullYear(), p.hoy.getMonth() + i, 1),
    antes: totalEnPesos(antes[i], p.dolarTarjeta),
    despues: totalEnPesos(mes, p.dolarTarjeta),
  }));
  // El mes más cargado entre los que la compra afecta (si un mes ya venía lleno pero la compra no cae ahí, no cuenta)
  const afectados = meses.filter((mes) => mes.despues - mes.antes > 0.5);
  const candidatos = afectados.length > 0 ? afectados : meses;
  const peorMes = candidatos.reduce((max, mes) => (mes.despues > max.despues ? mes : max), candidatos[0]);
  const porcentajePeorMes = p.sueldo ? (peorMes.despues / p.sueldo) * 100 : null;

  let comparacion: Respuesta['comparacion'] = null;
  if (cuotas > 1) {
    const valorHoyCuotas = valorPresenteCuotas(totalAPagar, cuotas, mesesHastaPrimera, p.inflacionMensual);
    comparacion = {
      convieneCuotas: valorHoyCuotas < contado,
      contado,
      valorHoyCuotas,
      diferencia: Math.abs(contado - valorHoyCuotas),
    };
  }

  return {
    nivel: nivelSegunPorcentaje(porcentajePeorMes),
    peorMes,
    porcentajePeorMes,
    cuotas,
    montoCuota: (cuotas > 1 ? totalAPagar : contado) / cuotas,
    totalAPagar: cuotas > 1 ? totalAPagar : contado,
    primerPago: fechaDePago(p.hoy, p.medio),
    comparacion,
    libertadAntes: diaDeLibertad(p.gastos, p.hoy),
    libertadDespues: diaDeLibertad([...p.gastos, compra], p.hoy),
    meses,
  };
}
