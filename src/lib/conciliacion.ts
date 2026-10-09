import type { FilaGasto, GastoConMedio } from './datos';
import { calcularPrimerMesCuota, diasEntre } from './finanzas';
import { categoriaDe } from './interpretarGasto';
import type { MedioPago } from './tipos';

// "Revisar el resumen": la IA lee el PDF de la tarjeta (en el servidor, ver supabase/functions/leer-resumen)
// y acá comparamos esos movimientos con lo que ya está cargado para mostrar solo lo que falta.
// La lectura en sí (que llama al servidor) está en resumen.ts.

export type Movimiento = {
  /** Fecha de la compra original, 'AAAA-MM-DD' */
  fecha: string;
  descripcion: string;
  /** Lo que figura en el resumen: la cuota de este mes, o el total si es un pago */
  monto: number;
  moneda: 'ARS' | 'USD';
  cuota_actual: number;
  cuotas_totales: number;
};

export type MovimientoRevisado = {
  movimiento: Movimiento;
  /** El gasto ya cargado que coincide, si hay uno */
  cargado: GastoConMedio | null;
  /** El gasto listo para guardar si falta */
  fila: FilaGasto;
};

const TOLERANCIA_DIAS = 4;

function parecidos(a: number, b: number) {
  return Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.01);
}

function aFecha(texto: string) {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
}

// Compara cada movimiento del resumen con los gastos cargados (mismo monto total o misma cuota, misma moneda, fechas cercanas)
export function revisarMovimientos(movimientos: Movimiento[], gastos: GastoConMedio[], medio: MedioPago | null): MovimientoRevisado[] {
  const usados = new Set<string>();
  return movimientos.map((movimiento) => {
    const cuotas = Math.max(1, movimiento.cuotas_totales || 1);
    const total = movimiento.monto * cuotas;
    const fecha = aFecha(movimiento.fecha);

    const cargado =
      gastos.find((g) => {
        if (usados.has(g.id) || g.moneda !== movimiento.moneda) return false;
        if (Math.abs(diasEntre(aFecha(g.fecha_compra), fecha)) > TOLERANCIA_DIAS) return false;
        const cuota = Number(g.monto_total) / g.cantidad_cuotas;
        return parecidos(Number(g.monto_total), total) || parecidos(cuota, movimiento.monto);
      }) ?? null;
    if (cargado) usados.add(cargado.id);

    return {
      movimiento,
      cargado,
      fila: {
        descripcion: limpiarDescripcion(movimiento.descripcion),
        categoria: categoriaDe(movimiento.descripcion),
        monto_total: Math.round(total * 100) / 100,
        moneda: movimiento.moneda,
        cantidad_cuotas: cuotas,
        fecha_compra: movimiento.fecha,
        primer_mes_cuota: calcularPrimerMesCuota(fecha, medio),
        tarjeta_id: medio?.id ?? null,
        texto_original: `Resumen: ${movimiento.descripcion}`,
      },
    };
  });
}

// "MERPAGO*PIZZERIA LA OLLA" → "Pizzeria La Olla" (las siglas sin vocales, como YPF, quedan en mayúsculas)
export function limpiarDescripcion(texto: string) {
  const sinPrefijo = texto.replace(/^(merpago|mercadopago|mp|dlo|payu|pagosonline)\s*\*\s*/i, '');
  const palabras = sinPrefijo.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const limpio = palabras
    .map((p) => (/^[^aeiouáéíóú]+$/i.test(p) && /[a-z]/i.test(p) ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1).toLowerCase()))
    .join(' ');
  return limpio || 'Gasto del resumen';
}

// Movimientos de ejemplo para el modo demo: algunos ya están cargados y otros no
export function movimientosDeEjemplo(hoy = new Date()): Movimiento[] {
  const haceDias = (n: number) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - n);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  };
  return [
    { fecha: haceDias(0), descripcion: 'COTO SUC 45', monto: 48_350, moneda: 'ARS', cuota_actual: 1, cuotas_totales: 1 },
    { fecha: haceDias(2), descripcion: 'MERPAGO*ZAPATERIA', monto: 31_500, moneda: 'ARS', cuota_actual: 1, cuotas_totales: 6 },
    { fecha: haceDias(5), descripcion: 'NETFLIX.COM', monto: 11_999, moneda: 'ARS', cuota_actual: 1, cuotas_totales: 1 },
    { fecha: haceDias(6), descripcion: 'YPF SERVICENTRO', monto: 35_000, moneda: 'ARS', cuota_actual: 1, cuotas_totales: 1 },
    { fecha: haceDias(8), descripcion: 'MERPAGO*FARMACITY', monto: 12_800, moneda: 'ARS', cuota_actual: 1, cuotas_totales: 1 },
    { fecha: haceDias(12), descripcion: 'CINEMARK PALERMO', monto: 18_000, moneda: 'ARS', cuota_actual: 1, cuotas_totales: 1 },
  ];
}
