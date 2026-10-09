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
  // Espacio que no se corta: el signo nunca queda separado del número al cambiar de línea
  return `${simbolo}\u00A0${valor.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
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
// ---------- Fechas de pago y tarjetas ----------

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Date → 'marzo 2027' (o 'marzo' si es este año)
export function formatearMes(fecha: Date, hoy = new Date()) {
  const mes = MESES[fecha.getMonth()];
  return fecha.getFullYear() === hoy.getFullYear() ? mes : `${mes} ${fecha.getFullYear()}`;
}

// Date → '2 de diciembre'
export function formatearDia(fecha: Date) {
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

// Días entre dos fechas, sin importar la hora
export function diasEntre(desde: Date, hasta: Date) {
  const a = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / 86_400_000);
}

// El día del mes, pero sin pasarse del último día (el 31 en febrero es el 28 o 29)
function diaDelMes(anio: number, mes: number, dia: number) {
  return new Date(anio, mes, Math.min(dia, new Date(anio, mes + 1, 0).getDate()));
}

function esCreditoCompleto(medio: MedioPago | null): medio is MedioPago & { dia_cierre: number; dia_vencimiento: number } {
  return medio?.tipo === 'credito' && !!medio.dia_cierre && !!medio.dia_vencimiento;
}

// Día en que se paga (la primera cuota de) una compra. Con débito o efectivo se paga en el momento.
export function fechaDePago(fechaCompra: Date, medio: MedioPago | null): Date {
  if (!esCreditoCompleto(medio)) return fechaCompra;
  const [anio, mes] = calcularPrimerMesCuota(fechaCompra, medio).split('-').map(Number);
  return diaDelMes(anio, mes - 1, medio.dia_vencimiento);
}

export type OpcionTarjeta = { medio: MedioPago; fechaPago: Date; dias: number };

// Tarjetas de crédito ordenadas de la que más tarde se paga a la que antes se paga, para una compra de hoy
export function tarjetasParaHoy(medios: MedioPago[], hoy = new Date()): OpcionTarjeta[] {
  return medios
    .filter(esCreditoCompleto)
    .map((medio) => {
      const fechaPago = fechaDePago(hoy, medio);
      return { medio, fechaPago, dias: diasEntre(hoy, fechaPago) };
    })
    .sort((a, b) => b.dias - a.dias);
}

// Próximo día de cierre de una tarjeta, contando hoy
export function proximoCierre(medio: MedioPago, hoy = new Date()): Date | null {
  if (!esCreditoCompleto(medio)) return null;
  const esteMes = diaDelMes(hoy.getFullYear(), hoy.getMonth(), medio.dia_cierre);
  return diasEntre(hoy, esteMes) >= 0 ? esteMes : diaDelMes(hoy.getFullYear(), hoy.getMonth() + 1, medio.dia_cierre);
}

// ---------- Cuotas pendientes ----------

// Primer día del mes en que se paga la última cuota de todo lo cargado, o null si no queda nada por pagar
export function diaDeLibertad(gastos: GastoGuardado[], desde = new Date()): Date | null {
  const inicio = desde.getFullYear() * 12 + desde.getMonth();
  let ultimo = -1;
  for (const gasto of gastos) {
    if (!gasto.primer_mes_cuota) continue;
    const fin = indiceMes(gasto.primer_mes_cuota) + gasto.cantidad_cuotas - 1;
    if (fin >= inicio && fin > ultimo) ultimo = fin;
  }
  return ultimo < 0 ? null : new Date(Math.floor(ultimo / 12), ultimo % 12, 1);
}

// Todo lo que queda por pagar desde este mes, y cuánto vale eso en plata de hoy con la inflación
export function deudaPendiente(gastos: GastoGuardado[], desde: Date, inflacionMensual: number, dolar: number | null) {
  const inicio = desde.getFullYear() * 12 + desde.getMonth();
  let pesos = 0;
  let dolares = 0;
  let valorHoy = 0;
  for (const gasto of gastos) {
    if (!gasto.primer_mes_cuota) continue;
    const primerMes = indiceMes(gasto.primer_mes_cuota);
    const cuota = Number(gasto.monto_total) / gasto.cantidad_cuotas;
    for (let n = 0; n < gasto.cantidad_cuotas; n++) {
      const posicion = primerMes + n - inicio;
      if (posicion < 0) continue;
      if (gasto.moneda === 'USD') dolares += cuota;
      else pesos += cuota;
      const enPesos = gasto.moneda === 'USD' ? cuota * (dolar ?? 0) : cuota;
      valorHoy += enPesos / Math.pow(1 + inflacionMensual, posicion);
    }
  }
  const total = pesos + dolares * (dolar ?? 0);
  return { pesos, dolares, total, valorHoy };
}

// Total de un mes en pesos, pasando los dólares al dólar tarjeta si lo tenemos
export function totalEnPesos(mes: { ars: number; usd: number }, dolar: number | null) {
  return mes.ars + (dolar ? mes.usd * dolar : 0);
}
