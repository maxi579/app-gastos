import { calcularPrimerMesCuota, formatearFecha } from './finanzas';
import type { Categoria, MedioPago } from './tipos';

export type ValoresGasto = {
  descripcion: string;
  montoTexto: string;
  cuotasTexto: string;
  moneda: 'ARS' | 'USD';
  medioId: string | null;
  categoria: Categoria;
};

// Valida lo que hay en el formulario y arma la fila para guardar en Supabase
export function prepararGasto(valores: ValoresGasto, medios: MedioPago[], fechaCompra: Date) {
  const monto = Number(valores.montoTexto.replace(',', '.'));
  const cuotas = Number(valores.cuotasTexto);
  const medio = medios.find((m) => m.id === valores.medioId) ?? null;

  if (!(monto > 0)) return { error: 'Revisá el monto.' } as const;
  if (!Number.isInteger(cuotas) || cuotas < 1) return { error: 'Las cuotas tienen que ser un número entero, mínimo 1.' } as const;
  if (cuotas > 1 && medio?.tipo !== 'credito') return { error: 'Solo los medios de crédito tienen cuotas.' } as const;

  return {
    fila: {
      descripcion: valores.descripcion.trim() || 'Gasto',
      categoria: valores.categoria,
      monto_total: monto,
      moneda: valores.moneda,
      cantidad_cuotas: cuotas,
      tarjeta_id: medio?.id ?? null,
      fecha_compra: formatearFecha(fechaCompra),
      primer_mes_cuota: calcularPrimerMesCuota(fechaCompra, medio),
    },
  } as const;
}

// '2026-10-06' → Date local (sin problemas de zona horaria)
export function fechaDesdeTexto(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}