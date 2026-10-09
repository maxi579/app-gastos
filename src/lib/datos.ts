import { supabase } from './supabase';
import type { GastoGuardado, MedioPago } from './tipos';

// Todo el acceso a datos pasa por acá. Las pantallas no saben si los datos
// vienen de Supabase o del modo demo: solo usan una FuenteDatos.

export type Perfil = { nombre: string | null; sueldo: number | null };
export type GastoConMedio = GastoGuardado & { tarjetas: { nombre: string } | null };
export type FilaGasto = Omit<GastoGuardado, 'id'> & { texto_original?: string };
export type FilaMedio = Omit<MedioPago, 'id'>;

export interface FuenteDatos {
  esDemo: boolean;
  perfil(): Promise<Perfil>;
  guardarSueldo(sueldo: number): Promise<void>;
  /** Todos los gastos, del más nuevo al más viejo */
  gastos(): Promise<GastoConMedio[]>;
  crearGasto(fila: FilaGasto): Promise<void>;
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

export const fuenteSupabase: FuenteDatos = {
  esDemo: false,

  async perfil() {
    const fila = revisar(await supabase.from('perfiles').select('nombre, sueldo').single());
    return { nombre: fila?.nombre ?? null, sueldo: fila?.sueldo ? Number(fila.sueldo) : null };
  },

  async guardarSueldo(sueldo) {
    const { data } = await supabase.auth.getUser();
    revisar(await supabase.from('perfiles').update({ sueldo }).eq('id', data.user!.id));
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
