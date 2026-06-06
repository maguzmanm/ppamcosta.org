import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  // Si hay SMTP configurado, usar esas credenciales
  if (process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[EMAIL] Usando SMTP configurado:', process.env.SMTP_HOST);
    return transporter;
  }

  // Si no, usar Ethereal (fake SMTP para testing)
  console.log('[EMAIL] Creando cuenta Ethereal para testing...');
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log('[EMAIL] Cuenta Ethereal creada:', testAccount.user);
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@ppam.org',
      to,
      subject,
      html,
    });

    console.log(`[EMAIL] Enviado a ${to}: ${subject}`);

    // Si es Ethereal, mostrar URL para ver el email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL] 📧 Ver email: ${previewUrl}`);
    }
  } catch (error) {
    console.error(`[EMAIL] Error enviando a ${to}:`, error);
  }
}

export function buildTurnoEmailTemplate(data: {
  publisherName: string;
  locationName: string;
  date: string;
  timeSlot: string;
  action: 'asignado' | 'recordatorio' | 'cancelado';
}): string {
  const actionText = {
    asignado: 'has sido asignado a un turno',
    recordatorio: 'recuerda tu turno',
    cancelado: 'tu turno ha sido cancelado',
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
      <h2 style="color: #4a5568;">Predicación Pública Metropolitana</h2>
      <p>Hola <strong>${data.publisherName}</strong>, ${actionText[data.action]}:</p>
      <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <p><strong>📍 Punto:</strong> ${data.locationName}</p>
        <p><strong>📅 Fecha:</strong> ${data.date}</p>
        <p><strong>🕐 Horario:</strong> ${data.timeSlot}</p>
      </div>
      <p style="color: #718096; font-size: 12px;">Este es un mensaje automático, por favor no respondas.</p>
    </div>
  `;
}

export function buildExperienciaPendienteEmail(data: {
  encargadoName: string;
  publisherName: string;
  title: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
      <h2 style="color: #4a5568;">Predicación Pública Metropolitana</h2>
      <p>Hola <strong>${data.encargadoName}</strong>,</p>
      <p>Hay una nueva experiencia pendiente de revisión:</p>
      <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <p><strong>✍️ Enviada por:</strong> ${data.publisherName}</p>
        <p><strong>📝 Título:</strong> ${data.title}</p>
      </div>
    </div>
  `;
}
