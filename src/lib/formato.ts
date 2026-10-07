// Mientras escribís: "600000" → "600.000" y "1234,5" → "1.234,5" (coma para decimales)
export function formatearEntradaMonto(texto: string) {
  const limpio = texto.replace(/[^\d,]/g, '');
  const [entero, ...decimales] = limpio.split(',');
  const sinCerosAdelante = entero.replace(/^0+(?=\d)/, '');
  const conPuntos = sinCerosAdelante.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimales.length > 0 ? `${conPuntos},${decimales.join('').slice(0, 2)}` : conPuntos;
}

// Para guardar: "600.000" → 600000 y "1.234,5" → 1234.5
export function leerMonto(texto: string) {
  return Number(texto.replace(/\./g, '').replace(',', '.'));
}

// Para mostrar un número guardado en un campo: 600000 → "600.000"
export function montoATexto(valor: number) {
  return formatearEntradaMonto(String(valor).replace('.', ','));
}