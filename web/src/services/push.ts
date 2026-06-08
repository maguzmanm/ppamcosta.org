import api from './api';

// Convierte la clave pública VAPID de base64 a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Clave pública VAPID (debe coincidir con la del backend)
const VAPID_PUBLIC_KEY = 'BPK8EhomUlXsVYAtZqIMgkrSlbPLoYIKunNw_rvbypDrsARO0b3O1fLHaq7juTmrLH5Rcqq3Aoh_BrWHdDlMmuQ';

// Verificar si el navegador soporta push
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Verificar estado actual del permiso
export function getPermissionState(): NotificationPermission {
  return Notification.permission;
}

// Solicitar permiso y suscribirse a push
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    console.log('[PUSH] No soportado en este navegador');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('[PUSH] Permiso denegado:', permission);
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Enviar suscripción al backend
    await api.post('/push/subscribe', subscription.toJSON());
    console.log('[PUSH] Suscrito correctamente');
    return true;
  } catch (err) {
    console.error('[PUSH] Error al suscribir:', err);
    return false;
  }
}

// Cancelar suscripción
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error('[PUSH] Error al desuscribir:', err);
    return false;
  }
}
