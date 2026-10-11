import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colores, radios } from '../constants/tema';
import { Boton, Texto as Text } from './ui';

// Recorrido guiado: oscurece la pantalla, ilumina un solo lugar y solo deja tocar ahí.
//
// - Cada lugar que se puede iluminar se envuelve en <Objetivo id="...">.
// - Los pasos "info" explican algo y se avanza con "Siguiente" (lo iluminado no se puede tocar).
// - Los pasos "tocar" piden tocar lo iluminado de verdad; avanzan cuando la app llega a la pantalla esperada.

type Paso = {
  /** Lo que se ilumina; sin objetivo, el mensaje aparece en el centro */
  objetivo?: string;
  titulo: string;
  texto: string;
  /** Si está, hay que tocar lo iluminado y el paso avanza al llegar a esta pantalla */
  avanzaEn?: string;
};

const PASOS: Paso[] = [
  { titulo: '¡Hola! 👋', texto: 'Te muestro cómo usar Sorted en un minuto. Vas a ir tocando donde te indique.' },
  {
    objetivo: 'resumen-mes',
    titulo: 'Tu mes, de un vistazo',
    texto: 'Acá ves cuánto tenés que pagar este mes: cuotas, gastos y fijos. La barra te dice qué parte del sueldo ya está ocupada.',
  },
  { objetivo: 'pestana-cargar', titulo: 'Anotar un gasto', texto: 'Tocá el botón verde + para anotar un gasto.', avanzaEn: '/cargar' },
  {
    objetivo: 'caja-gasto',
    titulo: 'Escribilo como te salga',
    texto: 'Por ejemplo "café 3500 con mercado pago" o "zapas 120k en 6 cuotas con visa". La app entiende el monto, las cuotas y la tarjeta.',
  },
  {
    objetivo: 'escaner',
    titulo: '¿Tenés el ticket?',
    texto: 'Sacale una foto o elegí la captura del comprobante, y el gasto se arma solo.',
  },
  { objetivo: 'pestana-fijos', titulo: 'Lo de todos los meses', texto: 'Tocá Fijos.', avanzaEn: '/fijos' },
  {
    titulo: 'Fijos y suscripciones',
    texto: 'Cargá una vez la luz, el gas, el alquiler o Netflix. Te aviso antes de que venzan y los que se debitan solos se anotan sin que hagas nada.',
  },
  { objetivo: 'pestana-asistente', titulo: 'Tu asistente', texto: 'Tocá Asistente.', avanzaEn: '/chat' },
  {
    titulo: 'Preguntale lo que quieras',
    texto: 'Por ejemplo "¿cuánto gasté en el súper este mes?" o "armame el informe del mes". Responde con tus números.',
  },
  { objetivo: 'pestana-mas', titulo: 'Todo lo demás', texto: 'Tocá Más.', avanzaEn: '/mas' },
  {
    titulo: 'Más herramientas',
    texto: 'Acá están tus cuotas, el efectivo, ¿Cuánto me rinde?, las formas de anotar sin esfuerzo y los ajustes.',
  },
  { titulo: '¡Listo! 🎉', texto: 'Ya sabés lo principal. Si querés ver este recorrido de nuevo, está en Más.' },
];

const CLAVE_VISTO = 'tutorial-visto-v1';
const MARGEN = 8;

type Rect = { x: number; y: number; ancho: number; alto: number };

type ContextoTutorial = {
  activo: boolean;
  /** Cambia en cada paso: los objetivos se vuelven a medir */
  version: number;
  objetivoActual: string | null;
  registrar: (id: string, rect: Rect) => void;
  empezar: () => void;
};

const Contexto = createContext<ContextoTutorial>({
  activo: false,
  version: 0,
  objetivoActual: null,
  registrar: () => {},
  empezar: () => {},
});

export const useTutorial = () => useContext(Contexto);

// Envuelve algo que el recorrido puede iluminar. Se mide solo cuando le toca.
export function Objetivo({ id, children, estilo }: { id: string; children: ReactNode; estilo?: ViewStyle }) {
  const { objetivoActual, version, registrar } = useTutorial();
  const vista = useRef<View>(null);
  const esElActual = objetivoActual === id;

  const medir = useCallback(() => {
    vista.current?.measureInWindow((x, y, ancho, alto) => {
      if (ancho > 0 && alto > 0) registrar(id, { x, y, ancho, alto });
    });
  }, [id, registrar]);

  useEffect(() => {
    if (!esElActual) return;
    // Esperamos a que terminen las animaciones de entrada de la pantalla
    const temporizadores = [100, 450, 900].map((ms) => setTimeout(medir, ms));
    return () => temporizadores.forEach(clearTimeout);
  }, [esElActual, version, medir]);

  return (
    <View ref={vista} collapsable={false} style={estilo} onLayout={esElActual ? medir : undefined}>
      {children}
    </View>
  );
}

export function ProveedorTutorial({ children, listo }: { children: ReactNode; listo: boolean }) {
  const ruta = usePathname();
  const [paso, setPaso] = useState<number | null>(null);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [version, setVersion] = useState(0);

  // La primera vez que la persona llega a Inicio, arranca solo
  useEffect(() => {
    if (!listo || ruta !== '/') return;
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      const visto = await AsyncStorage.getItem(CLAVE_VISTO).catch(() => 'si');
      if (!visto && !cancelado) setPaso(0);
    }, 1200);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [listo, ruta]);

  const terminar = useCallback(() => {
    setPaso(null);
    AsyncStorage.setItem(CLAVE_VISTO, 'si').catch(() => {});
  }, []);

  const avanzar = useCallback(() => {
    setPaso((actual) => {
      if (actual === null) return null;
      if (actual + 1 >= PASOS.length) {
        AsyncStorage.setItem(CLAVE_VISTO, 'si').catch(() => {});
        return null;
      }
      return actual + 1;
    });
    setVersion((v) => v + 1);
  }, []);

  // Los pasos "tocar" avanzan cuando la persona llega a la pantalla que se le pidió
  // (se actualiza mientras se dibuja, como recomienda React para estado que depende de otro)
  if (paso !== null && PASOS[paso].avanzaEn && ruta === PASOS[paso].avanzaEn) {
    setPaso(paso + 1 >= PASOS.length ? null : paso + 1);
    setVersion((v) => v + 1);
  }
  const actual = paso === null ? null : PASOS[paso];

  const registrar = useCallback((id: string, rect: Rect) => {
    setRects((previos) => {
      const viejo = previos[id];
      if (viejo && viejo.x === rect.x && viejo.y === rect.y && viejo.ancho === rect.ancho && viejo.alto === rect.alto) return previos;
      return { ...previos, [id]: rect };
    });
  }, []);

  const empezar = useCallback(() => {
    setPaso(0);
    setVersion((v) => v + 1);
  }, []);

  const valor = useMemo(
    () => ({ activo: paso !== null, version, objetivoActual: actual?.objetivo ?? null, registrar, empezar }),
    [paso, version, actual, registrar, empezar]
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      {actual && paso !== null && (
        <Capa
          paso={actual}
          numero={paso}
          rect={actual.objetivo ? (rects[actual.objetivo] ?? null) : null}
          onSiguiente={avanzar}
          onSaltar={terminar}
        />
      )}
    </Contexto.Provider>
  );
}

// Un pedazo de la sombra oscura: no deja tocar lo que hay abajo
function Bloque({ estilo }: { estilo: ViewStyle }) {
  return <Pressable style={[styles.sombra, estilo]} onPress={() => {}} accessible={false} />;
}

type PropsCapa = { paso: Paso; numero: number; rect: Rect | null; onSiguiente: () => void; onSaltar: () => void };

function Capa({ paso, numero, rect, onSiguiente, onSaltar }: PropsCapa) {
  const { width, height } = useWindowDimensions();
  const esperandoObjetivo = !!paso.objetivo && !rect;
  const hueco = rect && {
    x: Math.max(rect.x - MARGEN, 0),
    y: Math.max(rect.y - MARGEN, 0),
    ancho: Math.min(rect.ancho + MARGEN * 2, width),
    alto: rect.alto + MARGEN * 2,
  };
  const ultimo = numero === PASOS.length - 1;

  // El mensaje va abajo de lo iluminado si está en la mitad de arriba, y arriba si no
  const globoAbajo = !hueco || hueco.y + hueco.alto / 2 < height / 2;
  const posicionGlobo: ViewStyle = !hueco
    ? { top: height * 0.3 }
    : globoAbajo
      ? { top: Math.min(hueco.y + hueco.alto + 12, height - 260) }
      : { bottom: Math.max(height - hueco.y + 12, 24) };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {!hueco ? (
        <Bloque estilo={{ top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : (
        <>
          <Bloque estilo={{ left: 0, right: 0, top: 0, height: hueco.y }} />
          <Bloque estilo={{ left: 0, right: 0, top: hueco.y + hueco.alto, bottom: 0 }} />
          <Bloque estilo={{ left: 0, width: hueco.x, top: hueco.y, height: hueco.alto }} />
          <Bloque estilo={{ left: hueco.x + hueco.ancho, right: 0, top: hueco.y, height: hueco.alto }} />
          {/* En los pasos que solo explican, lo iluminado tampoco se puede tocar */}
          {!paso.avanzaEn && (
            <Pressable
              style={{ position: 'absolute', left: hueco.x, top: hueco.y, width: hueco.ancho, height: hueco.alto }}
              onPress={() => {}}
              accessible={false}
            />
          )}
          <View
            pointerEvents="none"
            style={[styles.marco, { left: hueco.x, top: hueco.y, width: hueco.ancho, height: hueco.alto }]}
          />
        </>
      )}

      {!esperandoObjetivo && (
        <Animated.View key={numero} entering={globoAbajo ? FadeInDown.springify() : FadeIn} style={[styles.globo, posicionGlobo]}>
          <Text style={styles.contador}>
            {numero + 1} de {PASOS.length}
          </Text>
          <Text style={styles.titulo}>{paso.titulo}</Text>
          <Text style={styles.texto}>{paso.texto}</Text>
          <View style={styles.acciones}>
            {!ultimo ? (
              <Pressable onPress={onSaltar} hitSlop={10}>
                <Text style={styles.saltar}>Saltar recorrido</Text>
              </Pressable>
            ) : (
              <View />
            )}
            {paso.avanzaEn ? (
              <Text style={styles.indicacion}>👆 Tocá lo iluminado</Text>
            ) : (
              <Boton titulo={ultimo ? 'Terminar' : numero === 0 ? 'Empezar' : 'Siguiente'} onPress={onSiguiente} estilo={styles.botonSiguiente} />
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sombra: { position: 'absolute', backgroundColor: 'rgba(3, 7, 18, 0.78)' },
  marco: { position: 'absolute', borderRadius: radios.grande, borderWidth: 2, borderColor: colores.primario },
  globo: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colores.superficieAlta,
    borderRadius: radios.grande,
    borderWidth: 1,
    borderColor: colores.primario,
    padding: 18,
    maxWidth: 480,
    alignSelf: 'center',
  },
  contador: { color: colores.primario, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  titulo: { color: colores.texto, fontSize: 19, fontWeight: '800' },
  texto: { color: colores.textoChip, fontSize: 16, lineHeight: 23, marginTop: 6 },
  acciones: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  saltar: { color: colores.textoSecundario, fontSize: 14, textDecorationLine: 'underline' },
  indicacion: { color: colores.primario, fontSize: 15, fontWeight: '700' },
  botonSiguiente: { paddingHorizontal: 22, paddingVertical: 11 },
});
