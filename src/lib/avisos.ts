import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatearFecha, proximoCierre } from './finanzas';
import type { MedioPago } from './tipos';

// Dos tipos de avisos, los dos son notificaciones locales (las programa el mismo celular):
// no necesitan servidor y funcionan en Expo Go.
// - Cierre: un día antes del cierre de cada tarjeta, a las 10.
// - Recordatorio: a la noche, solo los días en que no anotaste ningún gasto.

const CLAVES = { cierres: 'avisos-cierre-activados', recordatorio: 'recordatorio-activado' };
const CANAL = 'avisos';
const MESES_DE_CIERRES = 3;
const DIAS_DE_RECORDATORIOS = 14;
const HORA_RECORDATORIO = 21;

export const avisosDisponibles = Platform.OS !== 'web';

let configurado = false;
function configurar() {
  if (configurado || !avisosDisponibles) return;
  configurado = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

// Pide permiso una sola vez. En Android 13+ el pedido no aparece hasta que exista un canal.
async function pedirPermiso() {
  configurar();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, { name: 'Avisos', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function estaActivado(clave: string) {
  if (!avisosDisponibles) return false;
  return (await AsyncStorage.getItem(clave)) === 'si';
}

// Borra solo los avisos de un tipo (cada aviso tiene un id que empieza con su tipo)
async function cancelarTipo(prefijo: string) {
  const programados = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    programados.filter((n) => n.identifier.startsWith(prefijo)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// ---------- Cierre de tarjetas ----------

export const avisosActivados = () => estaActivado(CLAVES.cierres);

// Devuelve false si el usuario no dio permiso
export async function activarAvisos(medios: MedioPago[]) {
  if (!avisosDisponibles || !(await pedirPermiso())) return false;
  await AsyncStorage.setItem(CLAVES.cierres, 'si');
  await programarAvisosCierre(medios);
  return true;
}

export async function desactivarAvisos() {
  if (!avisosDisponibles) return;
  await AsyncStorage.setItem(CLAVES.cierres, 'no');
  await cancelarTipo('cierre-');
}

// Reprograma los avisos de los próximos meses. Se llama cada vez que cambian las tarjetas.
export async function programarAvisosCierre(medios: MedioPago[]) {
  if (!(await avisosActivados())) return;
  configurar();
  await cancelarTipo('cierre-');

  const ahora = new Date();
  for (const medio of medios) {
    let referencia = new Date();
    for (let i = 0; i < MESES_DE_CIERRES; i++) {
      const cierre = proximoCierre(medio, referencia);
      if (!cierre) break;
      const aviso = new Date(cierre.getFullYear(), cierre.getMonth(), cierre.getDate() - 1, 10, 0);
      if (aviso > ahora) {
        await Notifications.scheduleNotificationAsync({
          identifier: `cierre-${medio.id}-${formatearFecha(cierre)}`,
          content: {
            title: `Mañana cierra tu ${medio.nombre} 💳`,
            body: 'Si podés esperar a pasado mañana para comprar con esta tarjeta, la pagás un mes más tarde.',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: aviso, channelId: CANAL },
        });
      }
      referencia = new Date(cierre.getFullYear(), cierre.getMonth(), cierre.getDate() + 1);
    }
  }
}

// ---------- Recordatorio de la noche ----------

export const recordatorioActivado = () => estaActivado(CLAVES.recordatorio);

export async function activarRecordatorio(anotoHoy: boolean) {
  if (!avisosDisponibles || !(await pedirPermiso())) return false;
  await AsyncStorage.setItem(CLAVES.recordatorio, 'si');
  await programarRecordatorios(anotoHoy);
  return true;
}

export async function desactivarRecordatorio() {
  if (!avisosDisponibles) return;
  await AsyncStorage.setItem(CLAVES.recordatorio, 'no');
  await cancelarTipo('recordatorio-');
}

// Programa un recordatorio por noche para las próximas dos semanas, salteando hoy si ya anotó algo.
// Se llama al abrir la app y cada vez que se anota un gasto.
export async function programarRecordatorios(anotoHoy: boolean) {
  if (!(await recordatorioActivado())) return;
  configurar();
  await cancelarTipo('recordatorio-');

  const ahora = new Date();
  for (let dia = 0; dia < DIAS_DE_RECORDATORIOS; dia++) {
    if (dia === 0 && anotoHoy) continue;
    const cuando = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dia, HORA_RECORDATORIO, 0);
    if (cuando <= ahora) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `recordatorio-${formatearFecha(cuando)}`,
      content: {
        title: '¿Gastaste algo hoy? 📝',
        body: 'Anotalo en 10 segundos así no se te escapa nada.',
        data: { url: '/cargar' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL },
    });
  }
}

let toqueInicialAtendido = false;

// Al tocar una notificación que trae una pantalla (data.url), abre esa pantalla.
// Devuelve una función para dejar de escuchar.
export function escucharToques(abrir: (url: string) => void) {
  if (!avisosDisponibles) return () => {};
  // La notificación que abrió la app se atiende una sola vez
  if (!toqueInicialAtendido) {
    toqueInicialAtendido = true;
    const url = Notifications.getLastNotificationResponse()?.notification.request.content.data?.url;
    if (typeof url === 'string') abrir(url);
  }
  const suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) => {
    const destino = respuesta.notification.request.content.data?.url;
    if (typeof destino === 'string') abrir(destino);
  });
  return () => suscripcion.remove();
}
