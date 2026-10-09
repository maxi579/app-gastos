import type { Categoria, MedioPago } from './tipos';

export type GastoInterpretado = {
  descripcion: string;
  monto: number | null;
  moneda: 'ARS' | 'USD';
  cuotas: number;
  medioId: string | null;
  categoria: Categoria;
};

const MULTIPLICADORES: Record<string, number> = {
  k: 1_000, luca: 1_000, lucas: 1_000, mil: 1_000,
  palo: 1_000_000, palos: 1_000_000, millon: 1_000_000, millones: 1_000_000,
};

const PALABRAS_CATEGORIA: Record<Categoria, string[]> = {
  'Comida y salidas': ['pizza', 'burger', 'hamburguesa', 'restaurant', 'resto', 'bar', 'cafe', 'delivery', 'pedidosya', 'rappi', 'cena', 'almuerzo', 'birra', 'cerveza', 'helado', 'empanadas', 'sushi', 'asado', 'mcdonalds', 'mc'],
  Supermercado: ['super', 'supermercado', 'coto', 'carrefour', 'chango', 'almacen', 'verduleria', 'carniceria', 'chino', 'jumbo', 'disco', 'vea', 'walmart', 'changomas'],
  Transporte: ['uber', 'cabify', 'didi', 'nafta', 'combustible', 'sube', 'colectivo', 'taxi', 'remis', 'peaje', 'estacionamiento', 'ypf', 'shell', 'axion', 'puma'],
  Servicios: ['luz', 'gas', 'agua', 'internet', 'telefono', 'alquiler', 'expensas', 'wifi'],
  Compras: ['ropa', 'zapatillas', 'zapas', 'remera', 'campera', 'pantalon', 'mercadolibre', 'regalo', 'tele'],
  Salud: ['farmacia', 'farmacity', 'medico', 'remedios', 'dentista', 'gimnasio', 'gym', 'psicologo'],
  Entretenimiento: ['cine', 'cinemark', 'hoyts', 'netflix', 'spotify', 'juego', 'play', 'steam', 'recital', 'entrada', 'entradas', 'boliche', 'disney'],
  Educación: ['libro', 'curso', 'facultad', 'apuntes', 'fotocopias'],
  Otros: [],
};

export function normalizar(texto: string) {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Categoría por palabras clave ("pizza con amigos" → Comida y salidas)
export function categoriaDe(texto: string): Categoria {
  const palabras = normalizar(texto).split(/[^a-z0-9]+/);
  return (
    (Object.keys(PALABRAS_CATEGORIA) as Categoria[]).find((c) => PALABRAS_CATEGORIA[c].some((p) => palabras.includes(p))) ?? 'Otros'
  );
}

export function interpretarGasto(texto: string, medios: MedioPago[]): GastoInterpretado {
  let resto = ` ${normalizar(texto)} `;

  // Cuotas: "6 cuotas", "en 12 cuotas"
  let cuotas = 1;
  const matchCuotas = resto.match(/(?:en\s+)?(\d{1,2})\s*cuotas?/);
  if (matchCuotas) {
    cuotas = Math.max(1, Number(matchCuotas[1]));
    resto = resto.replace(matchCuotas[0], ' ');
  }

  // Moneda
  const regexDolares = /(usd|u\$s|us\$|dolares|dolar)/;
  const moneda = regexDolares.test(resto) ? 'USD' : 'ARS';
  resto = resto.replace(new RegExp(regexDolares, 'g'), ' ');

  // Monto: nos quedamos con el número más grande que aparezca
  let monto: number | null = null;
  let textoMonto: string | null = null;
  const regexMonto = /\$?\s*(\d+(?:[.,]\d+)*)\s*(k|lucas|luca|mil|palos|palo|millones|millon)?(?![a-z])/g;
  for (const m of resto.matchAll(regexMonto)) {
    const valor = parsearNumero(m[1]) * (m[2] ? MULTIPLICADORES[m[2]] : 1);
    if (monto === null || valor > monto) {
      monto = valor;
      textoMonto = m[0];
    }
  }
  if (textoMonto) resto = resto.replace(textoMonto, ' ');

  // Medio de pago
  let medioId: string | null = null;
  const esEfectivo = contienePalabra(resto, 'efectivo') || contienePalabra(resto, 'cash');
  if (esEfectivo) {
    resto = resto.replace(/\b(efectivo|cash)\b/g, ' ');
  } else {
    for (const medio of medios) {
      const alias = aliasDe(medio).find((a) => contienePalabra(resto, a));
      if (alias) {
        medioId = medio.id;
        resto = resto.replace(new RegExp(`\\b${escapar(alias)}\\b`), ' ');
        break;
      }
    }
    // Si no nombraste ninguno y tenés uno solo, es ese
    if (!medioId && medios.length === 1) medioId = medios[0].id;
    // Si hay cuotas y tenés una sola tarjeta de crédito, es esa
    const deCredito = medios.filter((m) => m.tipo === 'credito');
    if (!medioId && cuotas > 1 && deCredito.length === 1) medioId = deCredito[0].id;
  }

  const categoria = categoriaDe(texto);

  // Descripción: lo que sobra, sin conectores ni artículos sueltos al principio o al final
  let descripcion = resto.replace(/\$/g, ' ').replace(/\s+/g, ' ').trim();
  descripcion = descripcion
    .replace(/^((con|en|de|por|pague|gaste|compre|un|una|unos|unas)\s+)+/, '')
    .replace(/(\s+(con|en|de|por|la|el|los|las|y))+$/, '')
    .trim();
  descripcion = descripcion ? descripcion[0].toUpperCase() + descripcion.slice(1) : 'Gasto';

  return { descripcion, monto, moneda, cuotas, medioId, categoria };
}

// "18.500" y "1.250.000" usan punto de miles; "18,5" usa coma decimal
function parsearNumero(texto: string) {
  const sinMiles = texto.replace(/\.(?=\d{3}(\D|$))/g, '');
  return Number(sinMiles.replace(',', '.'));
}

// Formas de nombrar un medio: nombre completo, banco, red y primera palabra del nombre
function aliasDe(medio: MedioPago) {
  const nombre = normalizar(medio.nombre);
  const alias = [nombre];
  if (medio.banco) alias.push(normalizar(medio.banco));
  if (medio.red && medio.red !== 'otra') alias.push(medio.red);
  const primeraPalabra = nombre.split(' ')[0];
  if (primeraPalabra.length >= 3 && primeraPalabra !== nombre) alias.push(primeraPalabra);
  if (alias.some((a) => a.replace(/\s/g, '').includes('mercadopago'))) alias.push('mercadopago', 'mp');
  return alias;
}

function contienePalabra(texto: string, frase: string) {
  return new RegExp(`\\b${escapar(frase)}\\b`).test(texto);
}

function escapar(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}