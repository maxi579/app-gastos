import type { FilaGasto, FuenteDatos, GastoConMedio } from './datos';
import { calcularPrimerMesCuota, formatearFecha } from './finanzas';
import type { Categoria, MedioPago, Tono } from './tipos';

// Modo demo: los mismos datos que tendría un usuario real, pero en memoria.
// Sirve para probar la app sin cuenta (y para mostrarla en el portfolio).

type GastoEjemplo = { descripcion: string; categoria: Categoria; monto: number; cuotas?: number; medio: string | null; haceDias: number; moneda?: 'ARS' | 'USD' };

// Los cierres se calculan desde hoy para que la demo siempre muestre los avisos:
// la Visa cierra mañana y la Master a mitad de mes que viene.
function crearMedios(): MedioPago[] {
  const enDias = (dias: number) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return Math.min(fecha.getDate(), 28);
  };
  const cierreVisa = enDias(1);
  const cierreMaster = enDias(15);
  const vencimiento = (cierre: number) => ((cierre + 9) % 28) + 1;
  return [
    { id: 'visa', nombre: 'Visa Galicia', banco: 'Galicia', tipo: 'credito', red: 'visa', dia_cierre: cierreVisa, dia_vencimiento: vencimiento(cierreVisa) },
    { id: 'master', nombre: 'Master BBVA', banco: 'BBVA', tipo: 'credito', red: 'mastercard', dia_cierre: cierreMaster, dia_vencimiento: vencimiento(cierreMaster) },
    { id: 'mp', nombre: 'Mercado Pago', banco: 'Mercado Pago', tipo: 'debito', red: null, dia_cierre: null, dia_vencimiento: null },
  ];
}

const GASTOS: GastoEjemplo[] = [
  { descripcion: 'Super Coto', categoria: 'Supermercado', monto: 48_350, medio: 'visa', haceDias: 0 },
  { descripcion: 'Uber al centro', categoria: 'Transporte', monto: 7_800, medio: 'mp', haceDias: 0 },
  { descripcion: 'Pizza con amigos', categoria: 'Comida y salidas', monto: 18_500, medio: 'mp', haceDias: 1 },
  { descripcion: 'Zapatillas', categoria: 'Compras', monto: 189_000, cuotas: 6, medio: 'visa', haceDias: 2 },
  { descripcion: 'Café con medialunas', categoria: 'Comida y salidas', monto: 9_200, medio: 'mp', haceDias: 2 },
  { descripcion: 'Farmacia', categoria: 'Salud', monto: 23_400, medio: 'master', haceDias: 3 },
  { descripcion: 'Empanadas', categoria: 'Comida y salidas', monto: 14_000, medio: 'mp', haceDias: 4 },
  { descripcion: 'Netflix', categoria: 'Entretenimiento', monto: 11_999, medio: 'visa', haceDias: 5 },
  { descripcion: 'Luz', categoria: 'Servicios', monto: 32_700, medio: 'mp', haceDias: 6 },
  { descripcion: 'Curso de inglés', categoria: 'Educación', monto: 95_000, cuotas: 3, medio: 'master', haceDias: 9 },
  { descripcion: 'Nafta', categoria: 'Transporte', monto: 40_000, medio: 'visa', haceDias: 11 },
  { descripcion: 'Sushi', categoria: 'Comida y salidas', monto: 34_000, medio: 'master', haceDias: 14 },
  { descripcion: 'Spotify', categoria: 'Entretenimiento', monto: 5, medio: 'visa', haceDias: 18, moneda: 'USD' },
  { descripcion: 'Celular', categoria: 'Compras', monto: 960_000, cuotas: 12, medio: 'visa', haceDias: 40 },
  { descripcion: 'Heladera', categoria: 'Compras', monto: 720_000, cuotas: 9, medio: 'master', haceDias: 75 },
];

function crearGastosIniciales(medios: MedioPago[]): GastoConMedio[] {
  return GASTOS.map((g, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - g.haceDias);
    const medio = medios.find((m) => m.id === g.medio) ?? null;
    return {
      id: `demo-${i}`,
      descripcion: g.descripcion,
      categoria: g.categoria,
      monto_total: g.monto,
      moneda: g.moneda ?? 'ARS',
      cantidad_cuotas: g.cuotas ?? 1,
      fecha_compra: formatearFecha(fecha),
      primer_mes_cuota: calcularPrimerMesCuota(fecha, medio),
      tarjeta_id: medio?.id ?? null,
      tarjetas: medio ? { nombre: medio.nombre } : null,
    };
  });
}

export function crearFuenteDemo(alSalir: () => void): FuenteDatos {
  let medios = crearMedios();
  let gastos = crearGastosIniciales(medios);
  let sueldo: number | null = 1_500_000;
  let tono: Tono = 'amable';
  let siguienteId = 1;

  const conMedio = (id: string, fila: FilaGasto): GastoConMedio => {
    const medio = medios.find((m) => m.id === fila.tarjeta_id);
    return { ...fila, id, tarjetas: medio ? { nombre: medio.nombre } : null };
  };
  const ordenar = () => gastos.sort((a, b) => b.fecha_compra.localeCompare(a.fecha_compra));

  return {
    esDemo: true,
    async perfil() {
      return { nombre: 'Invitado', sueldo, tono };
    },
    async guardarSueldo(valor) {
      sueldo = valor;
    },
    async guardarTono(valor) {
      tono = valor;
    },
    async gastos() {
      return gastos.map((g) => ({ ...g }));
    },
    async crearGasto(fila) {
      gastos.unshift(conMedio(`nuevo-${siguienteId++}`, fila));
      ordenar();
      return 'guardado';
    },
    async actualizarGasto(id, fila) {
      gastos = gastos.map((g) => (g.id === id ? conMedio(id, fila) : g));
      ordenar();
    },
    async borrarGasto(id) {
      gastos = gastos.filter((g) => g.id !== id);
    },
    async medios() {
      return medios.map((m) => ({ ...m }));
    },
    async crearMedio(fila) {
      medios.push({ ...fila, id: `medio-${siguienteId++}` });
    },
    async actualizarMedio(id, fila) {
      medios = medios.map((m) => (m.id === id ? { ...fila, id } : m));
      gastos = gastos.map((g) => (g.tarjeta_id === id ? { ...g, tarjetas: { nombre: fila.nombre } } : g));
    },
    async borrarMedio(id) {
      medios = medios.filter((m) => m.id !== id);
      gastos = gastos.map((g) => (g.tarjeta_id === id ? { ...g, tarjeta_id: null, tarjetas: null } : g));
    },
    async salir() {
      alSalir();
    },
  };
}
