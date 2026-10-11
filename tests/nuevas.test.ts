import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inflacionAcumulada, valuarActivo } from '../src/lib/activos';
import { balanceEfectivo } from '../src/lib/efectivo';
import { anotarDebitos, debitosParaAnotar, detectarRecurrentes, fijosDelMes, gastoDeFijo, pendienteDeFijos, totalMensualFijos, vencimientoDelMes } from '../src/lib/fijos';
import { leerFecha } from '../src/lib/formato';
import { interpretarNotificacion, leerImporte } from '../src/lib/interpretarNotificacion';
import type { Activo, Fijo, GastoGuardado, MedioPago, PagoFijo, Retiro } from '../src/lib/tipos';

const hoy = new Date(2026, 9, 10); // 10 de octubre de 2026
const visa: MedioPago = { id: 'v', nombre: 'Visa', banco: null, tipo: 'credito', red: 'visa', dia_cierre: 24, dia_vencimiento: 5 };

function fijo(extra: Partial<Fijo>): Fijo {
  return {
    id: 'f',
    descripcion: 'Luz',
    categoria: 'Servicios',
    tipo: 'servicio',
    monto: 30_000,
    moneda: 'ARS',
    dia: 15,
    tarjeta_id: null,
    debito_automatico: false,
    activo: true,
    ...extra,
  };
}

function gasto(descripcion: string, fecha: string, monto = 10_000, extra: Partial<GastoGuardado> = {}): GastoGuardado {
  return {
    id: String(Math.random()),
    descripcion,
    categoria: 'Entretenimiento',
    monto_total: monto,
    moneda: 'ARS',
    cantidad_cuotas: 1,
    primer_mes_cuota: `${fecha.slice(0, 7)}-01`,
    fecha_compra: fecha,
    tarjeta_id: null,
    ...extra,
  };
}

describe('gastos fijos', () => {
  it('el día 31 en un mes de 30 días vence el 30', () => {
    assert.equal(vencimientoDelMes(31, new Date(2026, 10, 3)).getDate(), 30);
    assert.equal(vencimientoDelMes(31, new Date(2027, 1, 3)).getDate(), 28);
  });

  it('marca el estado de cada fijo del mes', () => {
    const fijos = [
      fijo({ id: 'pagado', dia: 1 }),
      fijo({ id: 'vencido', dia: 5 }),
      fijo({ id: 'hoy', dia: 10 }),
      fijo({ id: 'pronto', dia: 13 }),
      fijo({ id: 'lejos', dia: 28 }),
      fijo({ id: 'apagado', activo: false }),
    ];
    const pagos: PagoFijo[] = [{ id: 'p', fijo_id: 'pagado', mes: '2026-10-01', monto: 30_000, gasto_id: null }];
    const estados = fijosDelMes(fijos, pagos, hoy).map((f) => `${f.fijo.id}:${f.estado}`);
    assert.deepEqual(estados, ['pagado:pagado', 'vencido:vencido', 'hoy:hoy', 'pronto:proximo', 'lejos:pendiente']);
  });

  it('un pago del mes pasado no cuenta para este mes', () => {
    const pagos: PagoFijo[] = [{ id: 'p', fijo_id: 'f', mes: '2026-09-01', monto: 30_000, gasto_id: null }];
    assert.equal(fijosDelMes([fijo({ dia: 28 })], pagos, hoy)[0].estado, 'pendiente');
  });

  it('suma lo pendiente, pasa dólares a pesos y cuenta las facturas sin monto', () => {
    const delMes = fijosDelMes([fijo({ id: 'a' }), fijo({ id: 'b', monto: 10, moneda: 'USD' }), fijo({ id: 'c', monto: null })], [], hoy);
    assert.deepEqual(pendienteDeFijos(delMes, 1_500), { total: 45_000, sinMonto: 1 });
  });

  it('separa lo que se va en suscripciones', () => {
    const total = totalMensualFijos([fijo({}), fijo({ id: 'n', tipo: 'suscripcion', monto: 12_000 }), fijo({ id: 'x', monto: null })], null);
    assert.deepEqual(total, { total: 42_000, suscripciones: 12_000, cantidadSuscripciones: 1 });
  });

  it('anota solos solo los débitos automáticos con monto que ya vencieron y no se pagaron', () => {
    const fijos = [
      fijo({ id: 'netflix', debito_automatico: true, dia: 5 }),
      fijo({ id: 'futuro', debito_automatico: true, dia: 20 }),
      fijo({ id: 'manual', dia: 5 }),
      fijo({ id: 'yaPagado', debito_automatico: true, dia: 2 }),
    ];
    const pagos: PagoFijo[] = [{ id: 'p', fijo_id: 'yaPagado', mes: '2026-10-01', monto: 1, gasto_id: null }];
    assert.deepEqual(
      debitosParaAnotar(fijos, pagos, hoy).map((d) => d.fijo.id),
      ['netflix']
    );
  });

  it('no duplica un débito automático que ya se anotó a mano ese mes', async () => {
    const creados: string[] = [];
    const pagosCreados: { gasto_id: string | null }[] = [];
    const datos = {
      crearGasto: async (fila: { descripcion: string }) => {
        creados.push(fila.descripcion);
        return 'guardado';
      },
      pagosFijos: { crear: async (fila: { gasto_id: string | null }) => void pagosCreados.push(fila) },
    } as unknown as Parameters<typeof anotarDebitos>[0];
    const fijos = [fijo({ id: 'n', descripcion: 'Netflix', debito_automatico: true, dia: 5 }), fijo({ id: 's', descripcion: 'Spotify', debito_automatico: true, dia: 3 })];
    const gastos = [gasto('netflix', '2026-10-05', 12_000, { id: 'manual' }), gasto('Spotify', '2026-09-03')];
    const anotados = await anotarDebitos(datos, fijos, [], [], gastos, hoy);
    assert.deepEqual(anotados, ['Spotify']); // el de septiembre no cuenta para octubre
    assert.deepEqual(creados, ['Spotify']);
    assert.equal(pagosCreados.length, 2);
    assert.ok(pagosCreados.some((p) => p.gasto_id === 'manual')); // Netflix se marca pagado con el gasto que ya existía
  });

  it('el gasto de un fijo con tarjeta cae en el resumen que corresponde', () => {
    const g = gastoDeFijo(fijo({ tarjeta_id: 'v', tipo: 'suscripcion', categoria: null }), 12_000, new Date(2026, 9, 25), [visa]);
    assert.equal(g.primer_mes_cuota, '2026-12-01'); // compra después del cierre del 24 → resumen de noviembre que vence en diciembre
    assert.equal(g.categoria, 'Entretenimiento');
    assert.equal(g.tarjeta_id, 'v');
  });

  it('detecta gastos que se repiten en distintos meses y que todavía no son fijos', () => {
    const gastos = [
      gasto('Netflix', '2026-10-05', 12_000),
      gasto('NETFLIX ', '2026-09-05', 11_000),
      gasto('Spotify 10/26', '2026-10-02'),
      gasto('Spotify 09/26', '2026-09-02'),
      gasto('Luz', '2026-10-01'),
      gasto('Luz', '2026-09-01'),
      gasto('Heladera', '2026-10-03', 500_000, { cantidad_cuotas: 6 }),
      gasto('Heladera', '2026-09-03', 500_000, { cantidad_cuotas: 6 }),
      gasto('Cine', '2026-10-04'),
      gasto('Gimnasio', '2026-05-01'),
      gasto('Gimnasio', '2026-04-01'),
    ];
    const recurrentes = detectarRecurrentes(gastos, [fijo({ descripcion: 'Luz' })], hoy);
    assert.deepEqual(
      recurrentes.map((r) => r.descripcion).sort(),
      ['Netflix', 'Spotify 10/26']
    );
    assert.equal(recurrentes.find((r) => r.descripcion === 'Netflix')?.monto, 12_000); // usa el último monto
    assert.equal(recurrentes.find((r) => r.descripcion === 'Netflix')?.dia, 5);
  });
});

describe('efectivo', () => {
  const retiro = (monto: number, fecha: string): Retiro => ({ id: fecha, monto, fecha, nota: null });

  it('compara lo que sacaste con lo que anotaste en efectivo desde el primer retiro', () => {
    const gastos = [
      gasto('Verdulería', '2026-10-08', 12_000),
      gasto('Kiosco', '2026-10-09', 3_000),
      gasto('Antes del retiro', '2026-10-01', 50_000),
      gasto('Con tarjeta', '2026-10-09', 99_000, { tarjeta_id: 'v' }),
    ];
    assert.deepEqual(balanceEfectivo([retiro(40_000, '2026-10-07'), retiro(5_000, '2026-08-01')], gastos, hoy), {
      retirado: 40_000,
      anotado: 15_000,
      sinAnotar: 25_000,
      desde: '2026-10-07',
    });
  });

  it('sin retiros recientes no hay nada que reclamar', () => {
    assert.equal(balanceEfectivo([], [gasto('x', '2026-10-09')], hoy).sinAnotar, 0);
  });
});

describe('activos', () => {
  const ctx = { hoy, dolar: 1_200, serieInflacion: [], inflacionMensual: 0 };
  const activo = (extra: Partial<Activo>): Activo => ({
    id: 'a',
    nombre: 'x',
    tipo: 'otro',
    monto_inicial: 1_000_000,
    fecha_inicio: '2026-09-10',
    cantidad: null,
    tna: null,
    plazo_dias: null,
    valor_actual: null,
    depreciacion_anual: null,
    ...extra,
  });

  it('acumula la inflación de cada mes, proporcional a los días', () => {
    const serie = [
      { fecha: '2026-08-31', valor: 2 },
      { fecha: '2026-09-30', valor: 3 },
    ];
    const meses = inflacionAcumulada(serie, new Date(2026, 7, 1), new Date(2026, 9, 1), 0.05);
    assert.ok(Math.abs(meses - (1.02 * 1.03 - 1)) < 1e-9);
    // Medio octubre sin dato publicado: usa la estimada
    const medio = inflacionAcumulada(serie, new Date(2026, 9, 1), new Date(2026, 9, 16), 0.031);
    assert.ok(Math.abs(medio - (Math.pow(1.031, 15 / 31) - 1)) < 1e-9);
  });

  it('valúa los dólares con la cotización', () => {
    const v = valuarActivo(activo({ tipo: 'dolares', cantidad: 1_000 }), ctx);
    assert.equal(v.valorHoy, 1_200_000);
    assert.ok(Math.abs(v.rendimiento! - 0.2) < 1e-9);
  });

  it('calcula lo ganado del plazo fijo hasta hoy y lo que cobra al vencer', () => {
    const v = valuarActivo(activo({ tipo: 'plazo_fijo', tna: 36.5, plazo_dias: 60 }), ctx);
    assert.ok(Math.abs(v.valorHoy - 1_030_000) < 1e-6); // 30 días al 36,5% anual = 3%
    assert.ok(Math.abs(v.vencimiento!.valor - 1_060_000) < 1e-6);
    assert.equal(v.vencimiento!.vencido, false);
    assert.equal(v.vencimiento!.fecha.toDateString(), new Date(2026, 10, 9).toDateString());
  });

  it('descuenta la inflación para el rendimiento real', () => {
    const v = valuarActivo(activo({ valor_actual: 1_100_000 }), { ...ctx, inflacionMensual: 0.1 });
    assert.ok(Math.abs(v.rendimientoReal! - (1.1 / 1.1 - 1)) < 0.001); // un mes al 10%: ganó lo mismo que la inflación
    assert.equal(v.manual, true);
  });

  it('un bien pierde valor con los años', () => {
    const v = valuarActivo(activo({ tipo: 'bien', depreciacion_anual: 20, fecha_inicio: '2025-10-10' }), ctx);
    assert.ok(Math.abs(v.valorHoy - 800_000) < 1);
  });
});

describe('fechas escritas a mano', () => {
  it('entiende día/mes/año y rechaza fechas que no existen', () => {
    assert.equal(leerFecha('5/10/2026'), '2026-10-05');
    assert.equal(leerFecha('05-10-26'), '2026-10-05');
    assert.equal(leerFecha('31/02/2026'), null);
    assert.equal(leerFecha('hola'), null);
  });
});

describe('notificaciones de billeteras', () => {
  const cuando = new Date(2026, 9, 10, 12).getTime();
  const notif = (titulo: string, texto: string, paquete = 'com.mercadopago.wallet') => ({ paquete, titulo, texto, cuando });

  it('lee montos con formato argentino', () => {
    assert.equal(leerImporte('8.500'), 8500);
    assert.equal(leerImporte('1.234.567,89'), 1234567.89);
    assert.equal(leerImporte('8500'), 8500);
    assert.equal(leerImporte('99,90'), 99.9);
  });

  it('detecta un pago con el comercio, el monto y la billetera', () => {
    assert.deepEqual(interpretarNotificacion(notif('Pagaste $ 8.500', 'Pagaste $ 8.500 en Café Martínez.')), {
      tipo: 'gasto',
      descripcion: 'Café Martínez',
      monto: 8500,
      moneda: 'ARS',
      fecha: '2026-10-10',
      fuente: 'Mercado Pago',
      original: 'Pagaste $ 8.500 · Pagaste $ 8.500 en Café Martínez.',
    });
  });

  it('entiende consumos con tarjeta en dólares de apps que no conoce', () => {
    const pago = interpretarNotificacion(notif('Consumo aprobado', 'Compraste en NETFLIX por US$ 9,99 con tu tarjeta Galicia', 'com.otro.banco'));
    assert.equal(pago?.tipo, 'gasto');
    assert.equal(pago?.tipo === 'gasto' && pago.moneda, 'USD');
    assert.equal(pago?.tipo === 'gasto' && pago.descripcion, 'NETFLIX');
    assert.equal(pago?.fuente, 'Galicia');
  });

  it('ignora la plata que entra y las notificaciones sin monto', () => {
    assert.equal(interpretarNotificacion(notif('Recibiste dinero', 'Juan te transfirió $ 20.000')), null);
    assert.equal(interpretarNotificacion(notif('Tus rendimientos', 'Ganaste $ 1.200 en tu cuenta')), null);
    assert.equal(interpretarNotificacion(notif('Pagaste', 'Tu pago fue aprobado')), null);
    assert.equal(interpretarNotificacion(notif('Promo', 'Hasta $ 5.000 de descuento en el súper')), null);
  });

  it('una extracción del cajero es un retiro de efectivo', () => {
    assert.equal(interpretarNotificacion(notif('Extracción', 'Extrajiste $ 50.000 en un cajero', 'com.otro'))?.tipo, 'retiro');
  });
});
