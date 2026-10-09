import type { Movimiento } from './conciliacion';
import { supabase } from './supabase';

export type ArchivoElegido = { uri: string; name: string; mimeType?: string; file?: File };

// Manda el PDF a la función del servidor, que lo lee con IA y devuelve los movimientos
export async function leerResumen(archivo: ArchivoElegido): Promise<Movimiento[]> {
  const formulario = new FormData();
  if (archivo.file) formulario.append('archivo', archivo.file);
  // En el celular, React Native sube el archivo a partir de su uri
  else formulario.append('archivo', { uri: archivo.uri, name: archivo.name, type: archivo.mimeType ?? 'application/pdf' } as unknown as Blob);

  const { data, error } = await supabase.functions.invoke('leer-resumen', { body: formulario });
  if (error) {
    const estado = (error as { context?: { status?: number } }).context?.status;
    if (estado === 404) throw new Error('La lectura de resúmenes todavía no está activada.');
    let detalle: string | undefined;
    try {
      detalle = (await (error as { context?: Response }).context?.json())?.error;
    } catch {
      detalle = undefined;
    }
    throw new Error(detalle ?? 'No pude leer el resumen. Probá de nuevo en un rato.');
  }
  return (data?.movimientos ?? []) as Movimiento[];
}
