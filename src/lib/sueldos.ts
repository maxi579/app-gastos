import { inflacionAcumulada, type MesInflacion } from './activos';
import type { ReciboSueldo } from './tipos';

// Recibos de sueldo: la IA los lee, la app actualiza el sueldo sola y compara cuánto subió contra la inflación.

export type ReciboLeido = Omit<ReciboSueldo, 'id'>;

/** Mismo recibo = mismo mes, misma empresa y mismo tipo (sueldo o aguinaldo) */
export const mismoRecibo = (a: ReciboLeido, b: ReciboLeido) =>
  a.periodo === b.periodo && a.empleador.toLowerCase() === b.empleador.toLowerCase() && a.aguinaldo === b.aguinaldo;

/** Neto de cada mes (sumando si hay más de un empleador), sin aguinaldos y solo en pesos. Del más viejo al más nuevo. */
export function sueldosPorMes(recibos: ReciboLeido[]) {
  const porMes = new Map<string, number>();
  for (const r of recibos) {
    if (r.aguinaldo || r.moneda !== 'ARS') continue;
    porMes.set(r.periodo, (porMes.get(r.periodo) ?? 0) + r.neto);
  }
  return [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([periodo, neto]) => ({ periodo, neto }));
}

/** El sueldo de hoy: el neto del último mes con recibo */
export function sueldoActual(recibos: ReciboLeido[]) {
  const meses = sueldosPorMes(recibos);
  return meses.length ? meses[meses.length - 1] : null;
}

const primeroDelMesSiguiente = (periodo: string) => {
  const [anio, mes] = periodo.split('-').map(Number);
  return new Date(anio, mes, 1);
};

/**
 * Cuánto subió el sueldo entre el primer y el último recibo, y cuánto subieron los precios en esos meses.
 * null si hay menos de dos meses para comparar.
 */
export function sueldoContraInflacion(recibos: ReciboLeido[], serie: MesInflacion[], inflacionPorDefecto: number) {
  const meses = sueldosPorMes(recibos);
  if (meses.length < 2) return null;
  const primero = meses[0];
  const ultimo = meses[meses.length - 1];
  const suba = ultimo.neto / primero.neto - 1;
  const inflacion = inflacionAcumulada(serie, primeroDelMesSiguiente(primero.periodo), primeroDelMesSiguiente(ultimo.periodo), inflacionPorDefecto);
  // Poder de compra: cuánto más (o menos) alcanza el sueldo de hoy comparado con el primero
  const real = (1 + suba) / (1 + inflacion) - 1;
  return { desde: primero.periodo, hasta: ultimo.periodo, suba, inflacion, real };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** '2026-09-01' → 'septiembre 2026' */
export function nombrePeriodo(periodo: string) {
  const [anio, mes] = periodo.split('-').map(Number);
  return `${MESES[mes - 1]} ${anio}`;
}
