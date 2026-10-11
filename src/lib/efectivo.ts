import { formatearFecha } from './finanzas';
import type { GastoGuardado, Retiro } from './tipos';

// Efectivo: si sacaste $60.000 del cajero y anotaste $35.000 en gastos en efectivo,
// hay $25.000 que o los tenés en la billetera o te olvidaste de anotar.

export type BalanceEfectivo = {
  retirado: number;
  anotado: number;
  sinAnotar: number;
  /** Desde cuándo se cuenta: el primer retiro de la ventana, o null si no hubo retiros */
  desde: string | null;
};

export function balanceEfectivo(retiros: Retiro[], gastos: GastoGuardado[], hoy = new Date(), dias = 30): BalanceEfectivo {
  const limite = formatearFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dias));
  const recientes = retiros.filter((r) => r.fecha >= limite);
  if (recientes.length === 0) return { retirado: 0, anotado: 0, sinAnotar: 0, desde: null };

  const desde = recientes.reduce((min, r) => (r.fecha < min ? r.fecha : min), recientes[0].fecha);
  const retirado = recientes.reduce((suma, r) => suma + Number(r.monto), 0);
  const anotado = gastos
    .filter((g) => g.tarjeta_id === null && g.moneda === 'ARS' && g.fecha_compra >= desde)
    .reduce((suma, g) => suma + Number(g.monto_total), 0);
  return { retirado, anotado, sinAnotar: Math.max(retirado - anotado, 0), desde };
}
