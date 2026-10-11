import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// HTML base de la versión web. Sirve sobre todo para cuando se agrega a la pantalla de inicio del celular:
// ícono y nombre de la app, pantalla completa, barra de estado integrada y fondo oscuro (sin blanco al deslizar).
// Las rutas son relativas para que funcionen en cualquier carpeta (/sorted/, /sorted/app/...).
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es-AR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover: la app ocupa toda la pantalla y respeta el notch con env(safe-area-inset-*) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Sorted</title>
        <meta name="description" content="Tu plata, en orden: cuotas, fijos, efectivo y un asistente que te avisa lo importante." />
        <meta name="theme-color" content="#0b1120" />

        {/* Instalada en la pantalla de inicio */}
        <link rel="manifest" href="manifest.webmanifest" />
        <link rel="apple-touch-icon" href="apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Sorted" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: estilos }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const estilos = `
html, body { background-color: #0b1120; }
body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; }
`;
