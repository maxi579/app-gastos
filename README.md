# 💳 App de Gastos — tarjetas y cuotas bajo control

App móvil para llevar el control de gastos con tarjeta en Argentina: **cuánto tenés comprometido en cuotas cada mes, qué parte de tu sueldo se lleva y si te conviene pagar contado o en cuotas** con la inflación.

Hecha con **Expo (React Native) + TypeScript + Supabase**. Funciona en iOS, Android y web.

🔗 **Probala online (modo demo, sin cuenta):** [maxi579.github.io/app-gastos](https://maxi579.github.io/app-gastos/)

## Funcionalidades

- **Carga en lenguaje natural**: escribís *"zapas 120k en 6 cuotas con visa"* y la app detecta monto, cuotas, moneda, tarjeta y categoría (entiende "lucas", "k", "palos", dólares, efectivo, Mercado Pago…).
- **Cuotas proyectadas**: calcula en qué resumen cae cada compra según el día de cierre y vencimiento de cada tarjeta, y muestra lo comprometido en los próximos 6 meses.
- **% del sueldo**: indicador verde/amarillo/rojo de cuánto del sueldo ya está comprometido.
- **Simulador contado vs. cuotas**: compara las dos opciones en *plata de hoy* (valor presente con inflación mensual) y calcula la inflación a partir de la cual conviene cada una.
- **Gastos del mes por categoría** e historial agrupado por día, con edición y borrado.
- **Medios de pago**: tarjetas de crédito y débito con cierre y vencimiento.
- **Modo demo**: se puede probar sin cuenta con datos de ejemplo.
- Detalles de UX: animaciones con Reanimated, vibración háptica, avisos tipo toast, tipografía Plus Jakarta Sans.

## Stack

| | |
|---|---|
| App | Expo SDK 57, React Native, Expo Router, TypeScript |
| UI | Reanimated, expo-linear-gradient, expo-haptics |
| Backend | Supabase (Auth + PostgreSQL con Row Level Security) |

## Arquitectura

```
src/
├── app/            # Pantallas (Expo Router): inicio, cargar, cuotas, simular, ajustes
├── components/     # UI reutilizable, formularios, login, toasts
├── constants/      # Tema (colores, tipografía) y estilos por categoría
└── lib/
    ├── interpretarGasto.ts  # Parser de lenguaje natural → gasto
    ├── finanzas.ts          # Cuotas, proyección mensual, valor presente
    ├── datos.ts             # Acceso a datos (interfaz + implementación Supabase)
    └── demo.ts              # Misma interfaz con datos en memoria (modo demo)
supabase/schema.sql          # Tablas, índices y políticas RLS
```

Las pantallas no hablan directo con Supabase: usan una `FuenteDatos`, así el modo demo y el modo real comparten todo el código de la interfaz.

## Correrlo

```bash
npm install
# crear .env.local con:
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_KEY=...
npx expo start
```

Escaneá el QR con **Expo Go** o abrí la versión web con `w`.

### Publicar la demo web

```bash
EXPO_NO_DOTENV=1 EXPO_PUBLIC_SOLO_DEMO=true EXPO_BASE_URL=/app-gastos npx expo export --platform web
```

Genera `dist/` con la app en modo demo y sin datos de Supabase, lista para GitHub Pages. La base de datos se crea con [`supabase/schema.sql`](supabase/schema.sql).

---

Hecho por [maxi579](https://github.com/maxi579).
