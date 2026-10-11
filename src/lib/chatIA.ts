import { supabase } from './supabase';

export type MensajeChat = { role: 'user' | 'assistant'; content: string };

const RESPUESTA_DEMO =
  'En el modo de prueba no me puedo conectar con la IA 🙂 Cuando entres con tu cuenta, voy a poder responderte cosas como cuánto gastaste en Uber este mes, en qué podés recortar o armarte el informe del mes con tus datos reales.';

// Manda la conversación a la función del servidor. Devuelve la respuesta y cuántos mensajes quedan hoy.
export async function preguntarIA(historial: MensajeChat[], esDemo: boolean): Promise<{ respuesta: string; restantes: number | null }> {
  if (esDemo) {
    await new Promise((r) => setTimeout(r, 800));
    return { respuesta: RESPUESTA_DEMO, restantes: null };
  }
  const { data, error } = await supabase.functions.invoke('asistente-ia', { body: { mensajes: historial } });
  if (error) {
    const estado = (error as { context?: { status?: number } }).context?.status;
    if (estado === 404) throw new Error('El asistente con IA todavía no está activado.');
    let detalle: string | undefined;
    try {
      detalle = (await (error as { context?: Response }).context?.json())?.error;
    } catch {
      detalle = undefined;
    }
    throw new Error(detalle ?? 'No me pude conectar. Probá de nuevo en un rato.');
  }
  return { respuesta: String(data.respuesta ?? ''), restantes: typeof data.restantes === 'number' ? data.restantes : null };
}
