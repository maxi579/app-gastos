// Lee el PDF del resumen de una tarjeta con Claude y devuelve las compras en JSON.
//
// Desplegar:   npx supabase functions deploy leer-resumen
// Clave de IA: npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Solo la pueden usar usuarios logueados: la clave pública de la app no alcanza (ver usuarioDelPedido).
// El PDF no se guarda en ningún lado: se lee, se manda a Claude y se descarta.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding/base64';

const client = new Anthropic(); // toma ANTHROPIC_API_KEY de los secretos de Supabase

// SUPABASE_URL y SUPABASE_ANON_KEY los define Supabase automáticamente en cada función
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');

// La pasarela de Supabase deja pasar cualquier pedido con la clave pública de la app,
// que viene dentro de la app y cualquiera puede sacar. Para no gastar la clave de IA en
// pedidos anónimos, exigimos la sesión de un usuario real.
async function usuarioDelPedido(pedido: Request) {
  const token = pedido.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

const TAMANIO_MAXIMO = 10 * 1024 * 1024;

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['movimientos'],
  properties: {
    movimientos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fecha', 'descripcion', 'monto', 'moneda', 'cuota_actual', 'cuotas_totales'],
        properties: {
          fecha: { type: 'string', description: 'Fecha de la compra original, formato AAAA-MM-DD' },
          descripcion: { type: 'string', description: 'Comercio tal como figura en el resumen' },
          monto: { type: 'number', description: 'Importe de este renglón en este resumen (la cuota del mes o el pago único), positivo' },
          moneda: { type: 'string', enum: ['ARS', 'USD'] },
          cuota_actual: { type: 'integer', description: '1 si es un pago único' },
          cuotas_totales: { type: 'integer', description: '1 si es un pago único' },
        },
      },
    },
  },
};

const INSTRUCCIONES = `Este es el resumen de una tarjeta de crédito argentina. Extraé las compras (consumos) que figuran, incluidas las cuotas de compras hechas en meses anteriores.

No incluyas: pagos que hizo el titular, saldo anterior, intereses, impuestos, percepciones, comisiones, cargos de la tarjeta, bonificaciones ni devoluciones.

Para cada compra:
- fecha: la de la compra original, en formato AAAA-MM-DD. Si el año figura con dos dígitos, completalo (26 → 2026).
- descripcion: el comercio tal como aparece.
- monto: el importe de ese renglón en este resumen (si es una cuota, el valor de la cuota), siempre positivo, como número sin separadores de miles.
- moneda: USD si el importe está en la columna de dólares; si no, ARS.
- cuota_actual y cuotas_totales: para "C.03/06" o "Cuota 3 de 6" son 3 y 6. Para pagos únicos, 1 y 1.

Si el documento no es un resumen de tarjeta, devolvé la lista vacía.`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

type Movimiento = {
  fecha: string;
  descripcion: string;
  monto: number;
  moneda: 'ARS' | 'USD';
  cuota_actual: number;
  cuotas_totales: number;
};

// Descarta renglones con datos que no tienen sentido
function esValido(m: Movimiento) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(m.fecha) &&
    typeof m.descripcion === 'string' &&
    m.descripcion.trim() !== '' &&
    Number.isFinite(m.monto) &&
    m.monto > 0 &&
    (m.moneda === 'ARS' || m.moneda === 'USD') &&
    Number.isInteger(m.cuotas_totales) &&
    m.cuotas_totales >= 1 &&
    m.cuotas_totales <= 72 &&
    Number.isInteger(m.cuota_actual) &&
    m.cuota_actual >= 1 &&
    m.cuota_actual <= m.cuotas_totales
  );
}

Deno.serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (pedido.method !== 'POST') return responder({ error: 'Método no permitido.' }, 405);
  if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_ANON_KEY')) {
    console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el entorno de la función');
    return responder({ error: 'La lectura de resúmenes no está bien configurada.' }, 500);
  }
  if (!(await usuarioDelPedido(pedido))) return responder({ error: 'Tenés que iniciar sesión.' }, 401);

  let archivo: File;
  try {
    const campo = (await pedido.formData()).get('archivo');
    if (!(campo instanceof File)) throw new Error('falta el archivo');
    archivo = campo;
  } catch {
    return responder({ error: 'Mandá el PDF del resumen.' }, 400);
  }
  if (archivo.size > TAMANIO_MAXIMO) return responder({ error: 'El PDF es muy grande (máximo 10 MB).' }, 413);

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const esPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // "%PDF"
  if (!esPdf) return responder({ error: 'El archivo no es un PDF.' }, 400);

  try {
    const respuesta = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // Si el modelo rechaza el pedido, la API lo reintenta sola con el modelo de respaldo recomendado
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: encodeBase64(bytes) } },
            { type: 'text', text: INSTRUCCIONES },
          ],
        },
      ],
    });

    if (respuesta.stop_reason === 'refusal') return responder({ error: 'No pude leer este resumen.' }, 422);
    if (respuesta.stop_reason === 'max_tokens') {
      return responder({ error: 'El resumen tiene demasiados movimientos para leerlo de una vez.' }, 422);
    }

    const texto = respuesta.content.find((bloque) => bloque.type === 'text');
    if (!texto || texto.type !== 'text') return responder({ error: 'No pude leer el resumen.' }, 502);
    const { movimientos } = JSON.parse(texto.text) as { movimientos: Movimiento[] };
    return responder({ movimientos: movimientos.filter(esValido) });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return responder({ error: 'Hay mucha gente usando esto ahora. Probá en unos minutos.' }, 429);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('ANTHROPIC_API_KEY inválida o sin configurar');
      return responder({ error: 'La lectura de resúmenes no está bien configurada.' }, 500);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Error de la API de Claude (${error.status}):`, error.message);
      return responder({ error: 'No pude leer el resumen. Probá de nuevo en un rato.' }, 502);
    }
    console.error(error);
    return responder({ error: 'No pude leer el resumen. Probá de nuevo en un rato.' }, 500);
  }
});
