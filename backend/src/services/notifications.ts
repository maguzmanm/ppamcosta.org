import prisma from '../prisma';
import { Expo } from 'expo-server-sdk';
import { sendEmail, buildTurnoEmailTemplate, buildExperienciaPendienteEmail } from './email';

const expo = new Expo();

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sendPush?: boolean;
  sendEmailNotification?: boolean;
  emailSubject?: string;
  emailHtml?: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  // Guardar en historial in-app
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ? JSON.stringify(params.data) : null,
    },
  });

  // Obtener preferencias del usuario
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: params.userId },
  });

  const pushEnabled = prefs?.pushEnabled ?? true;
  const emailEnabled = prefs?.emailEnabled ?? true;

  // Enviar push si está habilitado
  if (params.sendPush !== false && pushEnabled) {
    await sendPushNotification(params.userId, params.title, params.body, params.data);
  }

  // Enviar email si está habilitado
  if (params.sendEmailNotification && emailEnabled && params.emailHtml) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true },
    });
    if (user?.email) {
      await sendEmail(user.email, params.emailSubject || params.title, params.emailHtml);
    }
  }
}

async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const deviceToken = await prisma.deviceToken.findUnique({
      where: { userId },
    });

    if (!deviceToken) {
      console.log(`[PUSH] No hay device token para usuario ${userId}`);
      return;
    }

    if (!Expo.isExpoPushToken(deviceToken.token)) {
      console.log(`[PUSH] Token inválido para usuario ${userId}: ${deviceToken.token}`);
      return;
    }

    const messages = [{
      to: deviceToken.token,
      sound: 'default' as const,
      title,
      body,
      data: data ? Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ) : {},
    }];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        console.log(`[PUSH] Enviado a usuario ${userId}: ${title}`);
        // Si el token es inválido, eliminarlo
        for (const ticket of tickets) {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            await prisma.deviceToken.delete({ where: { userId } }).catch(() => {});
          }
        }
      } catch (err) {
        console.error(`[PUSH] Error chunk:`, err);
      }
    }
  } catch (error) {
    console.error(`[PUSH] Error enviando a usuario ${userId}:`, error);
  }
}

// ─── Notificaciones específicas del dominio ───

export async function notifyTurnoAsignado(
  userId: string,
  publisherName: string,
  locationName: string,
  date: string,
  timeSlot: string,
  shiftId: string
): Promise<void> {
  const title = 'Nuevo turno asignado';
  const body = `Se te ha asignado un turno en ${locationName} el ${date} (${timeSlot})`;

  await createNotification({
    userId,
    type: 'turno_asignado',
    title,
    body,
    data: { shiftId },
    sendEmailNotification: true,
    emailSubject: title,
    emailHtml: buildTurnoEmailTemplate({
      publisherName,
      locationName,
      date,
      timeSlot,
      action: 'asignado',
    }),
  });
}

export async function notifyTurnoRecordatorio(
  userId: string,
  publisherName: string,
  locationName: string,
  date: string,
  timeSlot: string,
  shiftId: string
): Promise<void> {
  const title = '⏰ Recordatorio de turno';
  const body = `Tu turno en ${locationName} es el ${date} (${timeSlot})`;

  await createNotification({
    userId,
    type: 'recordatorio',
    title,
    body,
    data: { shiftId },
    sendEmailNotification: true,
    emailSubject: title,
    emailHtml: buildTurnoEmailTemplate({
      publisherName,
      locationName,
      date,
      timeSlot,
      action: 'recordatorio',
    }),
  });
}

export async function notifyTurnoCancelado(
  userId: string,
  publisherName: string,
  locationName: string,
  date: string,
  timeSlot: string
): Promise<void> {
  const title = 'Turno cancelado';
  const body = `Tu turno en ${locationName} del ${date} (${timeSlot}) ha sido cancelado`;

  await createNotification({
    userId,
    type: 'cambio_turno',
    title,
    body,
    sendEmailNotification: true,
    emailSubject: title,
    emailHtml: buildTurnoEmailTemplate({
      publisherName,
      locationName,
      date,
      timeSlot,
      action: 'cancelado',
    }),
  });
}

export async function notifyTurnoRespuesta(
  userId: string,
  publisherName: string,
  locationName: string,
  date: string,
  timeSlot: string,
  accepted: boolean
): Promise<void> {
  const title = accepted ? '✅ Turno aceptado' : '❌ Turno rechazado';
  const body = `${publisherName} ha ${accepted ? 'aceptado' : 'rechazado'} el turno en ${locationName} del ${date} (${timeSlot})`;

  await createNotification({
    userId,
    type: 'turno_respuesta',
    title,
    body,
    sendEmailNotification: true,
    emailSubject: title,
    emailHtml: `<p>${body}</p>`,
  });
}

export async function notifyExperienciaPendiente(
  userId: string,
  encargadoName: string,
  publisherName: string,
  experienceTitle: string
): Promise<void> {
  const title = 'Nueva experiencia pendiente';
  const body = `${publisherName} ha enviado una experiencia: "${experienceTitle}"`;

  await createNotification({
    userId,
    type: 'experiencia_pendiente',
    title,
    body,
    sendEmailNotification: true,
    emailSubject: title,
    emailHtml: buildExperienciaPendienteEmail({
      encargadoName,
      publisherName,
      title: experienceTitle,
    }),
  });
}

export async function notifyNuevoAnuncio(userIds: string[], title: string, body: string): Promise<void> {
  for (const userId of userIds) {
    await createNotification({
      userId,
      type: 'anuncio',
      title: `📢 ${title}`,
      body,
      sendPush: true,
      sendEmailNotification: false, // Los anuncios solo push
    });
  }
}
