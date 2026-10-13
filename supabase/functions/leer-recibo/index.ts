// Lee un recibo de sueldo (PDF o foto) con Claude y devuelve el período, el empleador, el bruto y el neto.
//
// Desplegar:   npx supabase functions deploy leer-recibo
// Clave de IA: la misma que leer-comprobante (ANTHROPIC_API_KEY en los secretos de Supabase)
//
// El archivo no se guarda en ningún lado: se lee, se manda a Claude y se descarta.

import { encodeBase64 } from 'jsr:@std/encoding/base64';
import { claude, CORS, errorDeClaude, MODELO, RESPALDO, responder, textoDe, usuarioDelPedido } from '../_compartido/comun.ts';

const TAMANIO_MAXIMO = 8 * 1024 * 1024;

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['es_recibo', 'empleador', 'periodo', 'bruto', 'neto', 'moneda', 'aguinaldo'],
  properties: {
    es_recibo: { type: 'boolean', description: 'false si no es un recibo de sueldo' },
    empleador: { type: 'string', description: 'Nombre corto de la empresa empleadora: "Techint", "Banco Nación"' },
    periodo: { type: 'string', description: 'Mes liquidado, AAAA-MM' },
    bruto: { type: 'number', description: 'Total de haberes (remuneración bruta), 0 si no figura' },
    neto: { type: 'number', description: 'Neto a cobrar' },
    moneda: { type: 'string', enum: ['ARS', 'USD'] },
    aguinaldo: { type: 'boolean', description: 'true si el recibo es solo del aguinaldo (SAC)' },
  },
};

const INSTRUCCIONES = `Este archivo es (probablemente) un recibo de sueldo argentino.

Extraé:
- empleador: la empresa, corto y como lo diría una persona (no la razón social completa con S.A.).
- periodo: el mes liquidado ("Período: 09/2026", "Septiembre 2026"), no la fecha de pago. Formato AAAA-MM.
- bruto: el total de haberes o remuneración bruta.
- neto: el neto a cobrar ("Neto a cobrar", "Total neto", "Son pesos..."). Los montos argentinos usan punto para miles y coma para decimales ("$ 1.234.567,89" es 1234567.89).
- aguinaldo: true solo si el recibo es únicamente del SAC / aguinaldo. Si es el sueldo del mes y además incluye SAC, false.

Si no es un recibo de sueldo, poné es_recibo en false y el resto vacío (montos 0, periodo "").`;

type Recibo = { es_recibo: boolean; empleador: string; periodo: string; bruto: number; neto: number; moneda: 'ARS' | 'USD'; aguinaldo: boolean };

// Tipo de archivo según sus primeros bytes (no confiamos en lo que dice el celular)
function tipoDeArchivo(b: Uint8Array) {
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  return null;
}

Deno.serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (pedido.method !== 'POST') return responder({ error: 'Método no permitido.' }, 405);
  if (!(await usuarioDelPedido(pedido))) return responder({ error: 'Tenés que iniciar sesión.' }, 401);

  let archivo: File;
  try {
    const campo = (await pedido.formData()).get('archivo');
    if (!(campo instanceof File)) throw new Error('falta el archivo');
    archivo = campo;
  } catch {
    return responder({ error: 'Mandá el recibo de sueldo.' }, 400);
  }
  if (archivo.size > TAMANIO_MAXIMO) return responder({ error: 'El archivo es muy grande (máximo 8 MB).' }, 413);

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const tipo = tipoDeArchivo(bytes);
  if (!tipo) return responder({ error: 'Mandá el recibo en PDF o una foto (JPG o PNG).' }, 400);

  const adjunto =
    tipo === 'application/pdf'
      ? ({ type: 'document', source: { type: 'base64', media_type: tipo, data: encodeBase64(bytes) } } as const)
      : ({ type: 'image', source: { type: 'base64', media_type: tipo, data: encodeBase64(bytes) } } as const);

  try {
    const respuesta = await claude.beta.messages.create({
      model: MODELO,
      max_tokens: 4000,
      ...RESPALDO,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
      messages: [{ role: 'user', content: [adjunto, { type: 'text', text: INSTRUCCIONES }] }],
    });

    if (respuesta.stop_reason === 'refusal' || respuesta.stop_reason === 'max_tokens') return responder({ error: 'No pude leer este recibo.' }, 422);
    const texto = textoDe(respuesta);
    if (!texto) return responder({ error: 'No pude leer el recibo.' }, 502);

    const r = JSON.parse(texto) as Recibo;
    const periodo = /^\d{4}-(0[1-9]|1[0-2])$/.test(r.periodo) ? `${r.periodo}-01` : null;
    if (!r.es_recibo) return responder({ error: 'No parece un recibo de sueldo.' }, 422);
    if (!periodo || !(r.neto > 0)) return responder({ error: 'No encontré el mes o el neto en el recibo.' }, 422);
    return responder({
      recibo: {
        periodo,
        empleador: r.empleador.trim(),
        bruto: Number.isFinite(r.bruto) && r.bruto > 0 ? r.bruto : null,
        neto: r.neto,
        moneda: r.moneda === 'USD' ? 'USD' : 'ARS',
        aguinaldo: r.aguinaldo === true,
      },
    });
  } catch (error) {
    return errorDeClaude(error, 'La lectura de recibos');
  }
});
