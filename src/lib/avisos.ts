import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { proximoCierre } from './finanzas';
import type { MedioPago } from './tipos';

// Aviso un día antes del cierre de cada tarjeta, a las 10 de la mañana.
// Son notificaciones locales (las programa el mismo celular): no necesitan servidor y funcionan en Expo Go.

const CLAVE = 'avisos-cierre-activados';
const CANAL = 'cierres';
const MESES_A_PROGRAMAR = 3;

export const avisosDisponibles = Platform.OS !== 'web';

let configurado = false;
function configurar() {
  if (configurado || !avisosDisponibles) return;
  configurado = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function avisosActivados() {
  if (!avisosDisponibles) return false;
  return (await AsyncStorage.getItem(CLAVE)) === 'si';
}

// Pide permiso y programa los avisos. Devuelve false si el usuario no dio permiso.
export async function activarAvisos(medios: MedioPago[]) {
  if (!avisosDisponibles) return false;
  configurar();
  if (Platform.OS === 'android') {
    // En Android 13+ el pedido de permiso no aparece hasta que exista un canal
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Cierre de tarjetas',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const actual = await Notifications.getPermissionsAsync();
  const permiso = actual.granted ? actual : await Notifications.requestPermissionsAsync();
  if (!permiso.granted) return false;

  await AsyncStorage.setItem(CLAVE, 'si');
  await programarAvisosCierre(medios);
  return true;
}

export async function desactivarAvisos() {
  if (!avisosDisponibles) return;
  await AsyncStorage.setItem(CLAVE, 'no');
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Borra los avisos anteriores y programa los de los próximos meses. Se llama cada vez que cambian las tarjetas.
export async function programarAvisosCierre(medios: MedioPago[]) {
  if (!(await avisosActivados())) return;
  configurar();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const ahora = new Date();
  for (const medio of medios) {
    let referencia = new Date();
    for (let i = 0; i < MESES_A_PROGRAMAR; i++) {
      const cierre = proximoCierre(medio, referencia);
      if (!cierre) break;
      const aviso = new Date(cierre.getFullYear(), cierre.getMonth(), cierre.getDate() - 1, 10, 0);
      if (aviso > ahora) {
        await Notifications.scheduleNotificationAsync({
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
