import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { GastoGuardado, MedioPago, Tono } from './tipos';

// Todo el acceso a datos pasa por acá. Las pantallas no saben si los datos
// vienen de Supabase o del modo demo: solo usan una FuenteDatos.

export type Perfil = { nombre: string | null; sueldo: number | null; tono: Tono };
export type GastoConMedio = GastoGuardado & { tarjetas: { nombre: string } | null; pendiente?: boolean };
export type FilaGasto = Omit<GastoGuardado, 'id'> & { id?: string; texto_original?: string };
export type FilaMedio = Omit<MedioPago, 'id'>;
/** 'pendiente' = no había internet: quedó guardado en el celular y se sube solo después */
export type ResultadoGuardado = 'guardado' | 'pendiente';

export interface FuenteDatos {
  esDemo: boolean;
  perfil(): Promise<Perfil>;
  guardarSueldo(sueldo: number): Promise<void>;
  guardarTono(tono: Tono): Promise<void>;
  /** Todos los gastos, del más nuevo al más viejo */
  gastos(): Promise<GastoConMedio[]>;
  crearGasto(fila: FilaGasto): Promise<ResultadoGuardado>;
  actualizarGasto(id: string, fila: FilaGasto): Promise<void>;
  borrarGasto(id: string): Promise<void>;
  medios(): Promise<MedioPago[]>;
  crearMedio(fila: FilaMedio): Promise<void>;
  actualizarMedio(id: string, fila: FilaMedio): Promise<void>;
  borrarMedio(id: string): Promise<void>;
  salir(): Promise<void>;
}

// Supabase devuelve { data, error }: lo convertimos en "devuelve data o lanza un error"
function revisar<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

const fuenteRemota: FuenteDatos = {
  esDemo: false,

  async perfil() {
    const fila = revisar(await supabase.from('perfiles').select('nombre, sueldo, tono_asistente').single());
    return {
      nombre: fila?.nombre ?? null,
      sueldo: fila?.sueldo ? Number(fila.sueldo) : null,
      tono: (fila?.tono_asistente as Tono) ?? 'directo',
    };
  },

  async guardarSueldo(sueldo) {
    const { data } = await supabase.auth.getUser();
    revisar(await supabase.from('perfiles').update({ sueldo }).eq('id', data.user!.id));
  },

  async guardarTono(tono) {
    const { data } = await supabase.auth.getUser();
    revisar(await supabase.from('perfiles').update({ tono_asistente: tono }).eq('id', data.user!.id));
  },

  async gastos() {
    const filas = revisar(
      await supabase
        .from('gastos')
        .select('*, tarjetas(nombre)')
        .order('fecha_compra', { ascending: false })
        .order('creado_en', { ascending: false })
    );
    return (filas ?? []) as GastoConMedio[];
  },

  async crearGasto(fila) {
    revisar(await supabase.from('gastos').insert(fila));
    return 'guardado';
  },

  async actualizarGasto(id, fila) {
    revisar(await supabase.from('gastos').update(fila).eq('id', id));
  },

  async borrarGasto(id) {
    revisar(await supabase.from('gastos').delete().eq('id', id));
  },

  async medios() {
    return (revisar(await supabase.from('tarjetas').select('*').order('creado_en')) ?? []) as MedioPago[];
  },

  async crearMedio(fila) {
    revisar(await supabase.from('tarjetas').insert(fila));
  },

  async actualizarMedio(id, fila) {
    revisar(await supabase.from('tarjetas').update(fila).eq('id', id));
  },

  async borrarMedio(id) {
    revisar(await supabase.from('tarjetas').delete().eq('id', id));
  },

  async salir() {
    await supabase.auth.signOut();
  },
};

// ---------- Funcionar sin conexión ----------

const CLAVES = { perfil: 'cache-perfil', gastos: 'cache-gastos', medios: 'cache-medios', cola: 'gastos-sin-subir' };
const SIN_CONEXION = 'No hay internet. Probá de nuevo cuando tengas conexión.';

function esErrorDeConexion(e: unknown) {
  return /network|fetch|timeout|abort|conexi/i.test(String((e as Error)?.message ?? e));
}

function conTiempoLimite<T>(promesa: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([promesa, new Promise<T>((_, rechazar) => setTimeout(() => rechazar(new Error('timeout')), ms))]);
}

async function leer<T>(clave: string): Promise<T | null> {
  try {
    const texto = await AsyncStorage.getItem(clave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

function guardar(clave: string, valor: unknown) {
  return AsyncStorage.setItem(clave, JSON.stringify(valor)).catch(() => {});
}

// Pide al servidor; si no hay internet, devuelve lo último que se guardó en el celular
async function conRespaldo<T>(clave: string, pedido: () => Promise<T>): Promise<T> {
  try {
    const valor = await conTiempoLimite(pedido());
    guardar(clave, valor);
    return valor;
  } catch (e) {
    if (!esErrorDeConexion(e)) throw e;
    const guardado = await leer<T>(clave);
    if (guardado !== null) return guardado;
    throw new Error(SIN_CONEXION);
  }
}

// Para escribir: si no hay internet, el mensaje de error es claro
async function escribir<T>(pedido: () => Promise<T>): Promise<T> {
  try {
    return await conTiempoLimite(pedido());
  } catch (e) {
    throw esErrorDeConexion(e) ? new Error(SIN_CONEXION) : e;
  }
}

// UUID v4: el id del gasto se crea en el celular, así si se reintenta subir no se duplica
function nuevoId() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

type GastoEnCola = GastoConMedio & { texto_original?: string };

function aFila({ tarjetas: _t, pendiente: _p, ...fila }: GastoEnCola): FilaGasto {
  return fila;
}

function esDuplicado(e: unknown) {
  return /duplicate key|23505/i.test(String((e as Error)?.message ?? e));
}

function crearFuenteSupabase(base: FuenteDatos): FuenteDatos {
  let subiendo: Promise<void> | null = null;

  // Intenta subir los gastos que se cargaron sin internet
  function subirPendientes() {
    subiendo ??= (async () => {
      const cola = (await leer<GastoEnCola[]>(CLAVES.cola)) ?? [];
      const listos = new Set<string>();
      for (const gasto of cola) {
        try {
          await conTiempoLimite(base.crearGasto(aFila(gasto)));
        } catch (e) {
          if (esErrorDeConexion(e)) break;
          // Duplicado = ya se había subido. Cualquier otro error: el servidor no lo acepta, no tiene sentido reintentar
          if (!esDuplicado(e)) console.warn('Se descartó un gasto que el servidor rechazó:', (e as Error).message);
        }
        listos.add(gasto.id);
      }
      // Volvemos a leer la cola: mientras subíamos se pudo haber agregado otro gasto
      if (listos.size > 0) await cambiarCola((actual) => actual.filter((g) => !listos.has(g.id)));
    })().finally(() => {
      subiendo = null;
    });
    return subiendo;
  }

  async function cambiarCola(cambio: (cola: GastoEnCola[]) => GastoEnCola[]) {
    const cola = (await leer<GastoEnCola[]>(CLAVES.cola)) ?? [];
    await guardar(CLAVES.cola, cambio(cola));
  }

  async function nombreDelMedio(id: string | null) {
    if (!id) return null;
    const medios = (await leer<MedioPago[]>(CLAVES.medios)) ?? [];
    const medio = medios.find((m) => m.id === id);
    return medio ? { nombre: medio.nombre } : null;
  }

  async function estaEnCola(id: string) {
    return ((await leer<GastoEnCola[]>(CLAVES.cola)) ?? []).some((g) => g.id === id);
  }

  return {
    ...base,

    perfil: () => conRespaldo(CLAVES.perfil, base.perfil),
    medios: () => conRespaldo(CLAVES.medios, base.medios),

    async gastos() {
      await subirPendientes().catch(() => {});
      const [lista, cola] = await Promise.all([
        conRespaldo(CLAVES.gastos, base.gastos),
        leer<GastoEnCola[]>(CLAVES.cola),
      ]);
      const pendientes = (cola ?? []).map((g) => ({ ...g, pendiente: true }));
      return [...pendientes, ...lista].sort((a, b) => b.fecha_compra.localeCompare(a.fecha_compra));
    },

    async crearGasto(fila) {
      const conId = { ...fila, id: fila.id ?? nuevoId() };
      try {
        await conTiempoLimite(base.crearGasto(conId));
        return 'guardado';
      } catch (e) {
        if (!esErrorDeConexion(e)) throw e;
        const tarjetas = await nombreDelMedio(conId.tarjeta_id);
        await cambiarCola((cola) => [...cola, { ...(conId as GastoGuardado), tarjetas, texto_original: fila.texto_original }]);
        return 'pendiente';
      }
    },

    async actualizarGasto(id, fila) {
      if (await estaEnCola(id)) {
        const tarjetas = await nombreDelMedio(fila.tarjeta_id);
        return cambiarCola((cola) => cola.map((g) => (g.id === id ? { ...g, ...fila, id, tarjetas } : g)));
      }
      return escribir(() => base.actualizarGasto(id, fila));
    },

    async borrarGasto(id) {
      if (await estaEnCola(id)) return cambiarCola((cola) => cola.filter((g) => g.id !== id));
      return escribir(() => base.borrarGasto(id));
    },

    guardarSueldo: (sueldo) => escribir(() => base.guardarSueldo(sueldo)),
    guardarTono: (tono) => escribir(() => base.guardarTono(tono)),
    crearMedio: (fila) => escribir(() => base.crearMedio(fila)),
    actualizarMedio: (id, fila) => escribir(() => base.actualizarMedio(id, fila)),
    borrarMedio: (id) => escribir(() => base.borrarMedio(id)),

    // Al salir se borra todo lo guardado en el celular: si lo usa otra persona, no ve tus datos
    async salir() {
      await AsyncStorage.multiRemove(Object.values(CLAVES)).catch(() => {});
      await base.salir();
    },
  };
}

export const fuenteSupabase = crearFuenteSupabase(fuenteRemota);
