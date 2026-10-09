# 💳 Gastos — credit cards and installments under control

🇪🇸 [Leer en español](README.es.md)

A mobile app for managing credit card spending in Argentina, where buying in installments (*cuotas*) and high inflation are part of everyday life. It answers three questions: **how much of each month's salary is already committed to installments, which card to pay with today, and whether it's better to pay upfront or in installments** once inflation is taken into account.

Built with **Expo (React Native) + TypeScript + Supabase**. Runs on iOS, Android and the web. The UI is in Spanish.

🔗 **Try it online (demo mode, no account needed):** [maxi579.github.io/app-gastos](https://maxi579.github.io/app-gastos/)

## Features

**Decide before you buy**
- **"Should I buy it?"** (*¿Lo compro?*) — enter a price and the app answers *yes / careful / better not*, looking at your salary and what you already owe in the months the purchase would land on. It also tells you the installment amount, when the first payment is due, whether paying upfront or in installments is cheaper in today's money, and how your "freedom day" changes.
- **Best card for today** — based on each card's closing and due dates, which one gives you the most days before you pay.
- **Freedom day** — the month you'll finish paying off every installment.

**Understand your month**
- **Natural-language input:** type *"zapas 120k en 6 cuotas con visa"* ("sneakers 120k in 6 installments with visa") and the app extracts amount, installments, currency, card and category.
- **Installments projected** per statement, % of salary with a traffic-light indicator, and total remaining debt **in today's money**.
- **Assistant with a personality** (friendly, direct or strict) that gives tips from your own data: how the month is going, card closing dates coming up, too many takeout meals… Rule-based, no AI: instant, free, and it never makes up numbers.
- **Alerts before each card's closing date** (local notifications, no server).
- **Card exchange rate and official inflation (INDEC) fetched automatically** (DolarApi and ArgentinaDatos) and cached on the device.

**Never miss an expense**
- **Nightly reminder:** at 9 PM, only on days you haven't logged anything. Tapping it opens the input screen.
- **Review your card statement:** upload the PDF, an AI (Claude) reads the purchases and the app compares them with what you already logged — it shows only what's missing so you can add it in one tap. It understands installment purchases and never duplicates what's already there.

**Built for everyone**
- Plain language, guided first steps and explanations where needed (designed so older relatives can use it too).
- **Works offline:** shows the last saved data, and new expenses sync automatically when the connection comes back, without duplicates.
- **Demo mode** to try it without an account.

## Stack

| | |
|---|---|
| App | Expo SDK 57, React Native, Expo Router, TypeScript |
| UI | Reanimated, expo-linear-gradient, expo-haptics, expo-notifications |
| External data | DolarApi, ArgentinaDatos (INDEC) |
| AI | Claude (Anthropic) via a Supabase Edge Function |
| Tests | node:test |
| Backend | Supabase (Auth + PostgreSQL with Row Level Security) |

## Architecture

The codebase is in Spanish: *gasto* = expense, *cuota* = installment, *tarjeta* = card, *resumen* = statement.

```
src/
├── app/            # Screens (Expo Router): home, add expense, installments, "should I buy it?", settings, statement review
├── components/     # Reusable UI, forms, login, toasts
├── constants/      # Theme (colors, typography) and per-category styles
└── lib/
    ├── interpretarGasto.ts  # Natural language → expense parser
    ├── finanzas.ts          # Installments, payment dates, freedom day, present value
    ├── decision.ts          # "Should I buy it?": combines everything into one answer
    ├── asistente.ts         # Tips based on your data and the chosen tone
    ├── indicadores.ts       # Card exchange rate and inflation, cached
    ├── avisos.ts            # Closing-date alerts and the nightly reminder
    ├── conciliacion.ts      # Matches the card statement against logged expenses
    ├── resumen.ts           # Sends the PDF to the function that reads it
    ├── datos.ts             # Data access: Supabase + offline cache and upload queue
    └── demo.ts              # Same interface backed by in-memory data (demo mode)
tests/                       # Logic tests (npm test)
supabase/schema.sql          # Tables, indexes and RLS policies
supabase/functions/leer-resumen/  # Edge Function: reads the statement PDF with Claude
```

Screens never talk to Supabase directly: they use a `FuenteDatos` (data source) interface, so demo mode and real mode share all of the UI code.

## Running it

```bash
npm install
# create .env.local with:
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_KEY=...
npx expo start
```

Scan the QR code with **Expo Go** or press `w` for the web version. Logic tests run with `npm test`.

### Enabling statement reading (optional)

PDF reading runs in a Supabase Edge Function that calls the Claude API (Claude Opus 5.5 with structured JSON output). Only signed-in users can call it — the function verifies the user's session, not just the app's public key — and the PDF is never stored.

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase functions deploy leer-resumen
```

Each statement uses Anthropic API credits (a few cents per statement). Demo mode uses a sample statement and never calls the API.

### Building the web demo

```bash
EXPO_NO_DOTENV=1 EXPO_PUBLIC_SOLO_DEMO=true EXPO_BASE_URL=/app-gastos npx expo export --platform web
```

Generates `dist/` with the app in demo mode and no Supabase data, ready for static hosting. The database schema is in [`supabase/schema.sql`](supabase/schema.sql).

---

Built by [Máximo Nuñez](https://maxi579.github.io).
