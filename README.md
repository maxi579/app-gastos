# 💳 App de Gastos — tarjetas y cuotas bajo control

App móvil para llevar el control de gastos con tarjeta en Argentina: **cuánto tenés comprometido en cuotas cada mes, qué parte de tu sueldo se lleva y si te conviene pagar contado o en cuotas** con la inflación.

Hecha con **Expo (React Native) + TypeScript + Supabase**. Funciona en iOS, Android y web.

🔗 **Probala online (modo demo, sin cuenta):** [maxi579.github.io/app-gastos](https://maxi579.github.io/app-gastos/)

## Funcionalidades

**Para decidir antes de comprar**
- **¿Lo compro?** — ponés el precio y la app responde *sí / con cuidado / mejor no*, mirando tu sueldo y lo que ya tenés comprometido en los meses que toca la compra. Además te dice cuánto es cada cuota, cuándo pagás la primera, si conviene contado o cuotas (en plata de hoy, con la inflación) y cómo cambia tu día de libertad.
- **La mejor tarjeta para hoy** — según el cierre y vencimiento de cada tarjeta, cuál te da más días hasta pagar.
- **Día de libertad** — el mes en que terminás de pagar todas tus cuotas.

**Para entender tu mes**
- **Carga en lenguaje natural**: escribís *"zapas 120k en 6 cuotas con visa"* y la app detecta monto, cuotas, moneda, tarjeta y categoría.
- **Cuotas proyectadas** por resumen, % del sueldo con semáforo y total pendiente **en plata de hoy**.
- **Asistente con personalidad** (amable, directo o estricto) que da consejos con tus datos: cómo venís, cierres de tarjeta que se vienen, muchas salidas a comer… Funciona con reglas, sin IA: es instantáneo, gratis y nunca inventa números.
- **Avisos antes del cierre** de cada tarjeta (notificaciones locales, sin servidor).
- **Dólar tarjeta e inflación del INDEC automáticos** (DolarApi y ArgentinaDatos), guardados en el celular.

**Pensada para cualquiera**
- Lenguaje simple, primeros pasos guiados y explicaciones donde hacen falta (pensada para que la usen también personas mayores).
- **Funciona sin internet**: muestra lo último guardado y los gastos nuevos se suben solos cuando vuelve la conexión, sin duplicarse.
- **Modo demo** para probarla sin cuenta.

## Stack

| | |
|---|---|
| App | Expo SDK 57, React Native, Expo Router, TypeScript |
| UI | Reanimated, expo-linear-gradient, expo-haptics, expo-notifications |
| Datos externos | DolarApi, ArgentinaDatos (INDEC) |
| Tests | node:test |
| Backend | Supabase (Auth + PostgreSQL con Row Level Security) |

## Arquitectura

```
src/
├── app/            # Pantallas (Expo Router): inicio, cargar, cuotas, simular, ajustes
├── components/     # UI reutilizable, formularios, login, toasts
├── constants/      # Tema (colores, tipografía) y estilos por categoría
└── lib/
    ├── interpretarGasto.ts  # Parser de lenguaje natural → gasto
    ├── finanzas.ts          # Cuotas, fechas de pago, día de libertad, valor presente
    ├── decision.ts          # "¿Lo compro?": junta todo en una respuesta
    ├── asistente.ts         # Consejos según tus datos y el tono elegido
    ├── indicadores.ts       # Dólar tarjeta e inflación, con caché
    ├── avisos.ts            # Notificaciones antes del cierre
    ├── datos.ts             # Acceso a datos: Supabase + caché y cola sin conexión
    └── demo.ts              # Misma interfaz con datos en memoria (modo demo)
tests/                       # Tests de la lógica (npm test)
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

Escaneá el QR con **Expo Go** o abrí la versión web con `w`. Los tests de la lógica se corren con `npm test`.

### Publicar la demo web

```bash
EXPO_NO_DOTENV=1 EXPO_PUBLIC_SOLO_DEMO=true EXPO_BASE_URL=/app-gastos npx expo export --platform web
```

Genera `dist/` con la app en modo demo y sin datos de Supabase, lista para GitHub Pages. La base de datos se crea con [`supabase/schema.sql`](supabase/schema.sql).

---

Hecho por [maxi579](https://github.com/maxi579).
