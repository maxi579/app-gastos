import type { GastoGuardado, MedioPago } from './tipos';

// Primer día del mes en que se paga la primera cuota, en formato 'AAAA-MM-01'
export function calcularPrimerMesCuota(fechaCompra: Date, medio: MedioPago | null): string {
  let mes = fechaCompra.getMonth();

  if (medio?.tipo === 'credito' && medio.dia_cierre && medio.dia_vencimiento) {
    if (fechaCompra.getDate() > medio.dia_cierre) mes += 1; // entra en el próximo resumen
    if (medio.dia_vencimiento <= medio.dia_cierre) mes += 1; // el resumen vence el mes siguiente al cierre
  }

  const primerMes = new Date(fechaCompra.getFullYear(), mes, 1);
  return formatearFecha(primerMes);
}

// Fecha local en formato 'AAAA-MM-DD' (evita que de noche se guarde el día siguiente por la zona horaria)
export function formatearFecha(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function formatearMonto(valor: number, moneda: 'ARS' | 'USD' = 'ARS'): string {
  const simbolo = moneda === 'USD' ? 'US$' : '$';
  return `${simbolo} ${valor.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

const NOMBRES_MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export type CuotaDelMes = {
  gastoId: string;
  descripcion: string;
  numero: number;
  total: number;
  monto: number;
  moneda: 'ARS' | 'USD';
};

export type MesProyectado = {
  etiqueta: string;
  ars: number;
  usd: number;
  cuotas: CuotaDelMes[];
};

// Convierte 'AAAA-MM-DD' en un número de mes absoluto, para poder restar meses fácil
function indiceMes(fecha: string) {
  const [anio, mes] = fecha.split('-').map(Number);
  return anio * 12 + (mes - 1);
}

// Reparte cada gasto en los meses en que se paga, desde el mes de "desde"
export function proyectarCuotas(gastos: GastoGuardado[], desde: Date, cantidadMeses = 6): MesProyectado[] {
  const inicio = desde.getFullYear() * 12 + desde.getMonth();

  const meses: MesProyectado[] = Array.from({ length: cantidadMeses }, (_, i) => {
    const fecha = new Date(desde.getFullYear(), desde.getMonth() + i, 1);
    return { etiqueta: NOMBRES_MES[fecha.getMonth()], ars: 0, usd: 0, cuotas: [] };
  });

  for (const gasto of gastos) {
    if (!gasto.primer_mes_cuota) continue;
    const primerMes = indiceMes(gasto.primer_mes_cuota);
    const montoCuota = Number(gasto.monto_total) / gasto.cantidad_cuotas;

    for (let n = 0; n < gasto.cantidad_cuotas; n++) {
      const posicion = primerMes + n - inicio;
      if (posicion < 0 || posicion >= cantidadMeses) continue;

      const mes = meses[posicion];
      if (gasto.moneda === 'USD') mes.usd += montoCuota;
      else mes.ars += montoCuota;

      mes.cuotas.push({
        gastoId: gasto.id,
        descripcion: gasto.descripcion,
        numero: n + 1,
        total: gasto.cantidad_cuotas,
        monto: montoCuota,
        moneda: gasto.moneda,
      });
    }
  }

  return meses;
}
// Meses desde el mes de "desde" hasta el mes de una fecha 'AAAA-MM-DD'
export function mesesHasta(desde: Date, fecha: string) {
  return indiceMes(fecha) - (desde.getFullYear() * 12 + desde.getMonth());
}

// Cuánto valen hoy unas cuotas iguales, descontando la inflación de cada mes
export function valorPresenteCuotas(montoTotal: number, cuotas: number, mesesHastaPrimera: number, inflacionMensual: number) {
  const cuota = montoTotal / cuotas;
  let total = 0;
  for (let k = 0; k < cuotas; k++) {
    total += cuota / Math.pow(1 + inflacionMensual, mesesHastaPrimera + k);
  }
  return total;
}

// Inflación mensual a partir de la cual las cuotas convienen más que el contado.
// Devuelve 0 si las cuotas convienen siempre, o null si no convienen ni con inflación altísima.
export function inflacionDeEquilibrio(contado: number, montoTotal: number, cuotas: number, mesesHastaPrimera: number) {
  const vp = (inflacion: number) => valorPresenteCuotas(montoTotal, cuotas, mesesHastaPrimera, inflacion);
  if (vp(0) <= contado) return 0;
  let bajo = 0;
  let alto = 0.5;
  if (vp(alto) > contado) return null;
  for (let i = 0; i < 50; i++) {
    const medio = (bajo + alto) / 2;
    if (vp(medio) > contado) bajo = medio;
    else alto = medio;
  }
  return alto;
}