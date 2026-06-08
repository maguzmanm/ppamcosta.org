import { Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../prisma';

// Helper: convierte datos a buffer Excel y lo envía
function sendExcel(res: Response, data: any[], sheetName: string, fileName: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
  res.send(buf);
}

// ─── Publicadores ───
export async function publishersReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { congregationId, locationId, role, isActive, gender } = req.query;
    const where: any = {};
    if (congregationId) where.congregationId = String(congregationId);
    if (locationId) where.locationId = String(locationId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (gender) where.gender = String(gender);
    if (role) where.user = { role: String(role) };

    const publishers = await prisma.publisher.findMany({
      where,
      include: {
        congregation: { select: { name: true } },
        location: { select: { name: true } },
        user: { select: { role: true, email: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const data = publishers.map((p) => ({
      Nombre: p.marriedLastName ? `${p.firstName} de ${p.marriedLastName}` : `${p.firstName} ${p.lastName}`,
      Email: p.email || '',
      Teléfono: p.phone || '',
      Género: p.gender === 'M' ? 'Masculino' : p.gender === 'F' ? 'Femenino' : '',
      Congregación: p.congregation?.name || '',
      'Punto asignado': p.location?.name || '',
      Rol: p.user?.role?.replace(/_/g, ' ') || '',
      Designaciones: p.designations ? JSON.parse(p.designations).join(', ') : '',
      Activo: p.isActive ? 'Sí' : 'No',
    }));

    sendExcel(res, data, 'Publicadores', 'publicadores');
  } catch (err) { next(err); }
}

// ─── Turnos ───
export async function shiftsReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { locationId, date, status, timeSlotId } = req.query;
    const where: any = {};
    if (locationId) where.locationId = String(locationId);
    if (date) where.date = new Date(String(date));
    if (status) where.status = String(status);
    if (timeSlotId) where.timeSlotId = String(timeSlotId);
    if (date) where.date = new Date(String(date));
    if (status) where.status = String(status);

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        location: { select: { name: true } },
        timeSlot: { select: { name: true, startTime: true, endTime: true } },
        assignments: {
          include: { publisher: { select: { firstName: true, lastName: true, marriedLastName: true } } },
        },
      },
      orderBy: { date: 'asc' },
    });

    const data = shifts.map((s) => ({
      Fecha: new Date(s.date).toLocaleDateString('es-CL'),
      Punto: s.location?.name || '',
      Horario: s.timeSlot?.name || '',
      Estado: s.status,
      'Máx. publicadores': s.maxPublishers,
      Asignados: s.assignments
        .map((a) => a.publisher.marriedLastName
          ? `${a.publisher.firstName} de ${a.publisher.marriedLastName}`
          : `${a.publisher.firstName} ${a.publisher.lastName}`)
        .join('; '),
      Notas: s.notes || '',
    }));

    sendExcel(res, data, 'Turnos', 'turnos');
  } catch (err) { next(err); }
}

// ─── Experiencias ───
export async function experiencesReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, publisherId, congregationId } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (publisherId) where.publisherId = String(publisherId);
    if (congregationId) {
      where.publisher = { congregationId: String(congregationId) };
    }

    const experiences = await prisma.experience.findMany({
      where,
      include: {
        publisher: {
          select: {
            firstName: true, lastName: true, marriedLastName: true,
            congregation: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = experiences.map((e) => ({
      Fecha: new Date(e.createdAt).toLocaleDateString('es-CL'),
      Publicador: e.publisher.marriedLastName
        ? `${e.publisher.firstName} de ${e.publisher.marriedLastName}`
        : `${e.publisher.firstName} ${e.publisher.lastName}`,
      Congregación: e.publisher.congregation?.name || '',
      Estado: e.status,
      Contenido: e.content,
      'Notas del revisor': e.reviewNotes || '',
    }));

    sendExcel(res, data, 'Experiencias', 'experiencias');
  } catch (err) { next(err); }
}

// ─── Puntos ───
export async function locationsReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive, locationId } = req.query;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (locationId) where.id = String(locationId);

    const locations = await prisma.location.findMany({
      where,
      include: {
        locationAssignments: {
          include: { user: { include: { publisher: { select: { firstName: true, lastName: true } } } } },
        },
        publishers: {
          where: { isActive: true },
          select: { firstName: true, lastName: true, marriedLastName: true },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    const data: any[] = [];
    for (const l of locations) {
      const encargado = l.locationAssignments.find((a: any) => a.roleAtLocation === 'ENCARGADO');
      const auxiliar = l.locationAssignments.find((a: any) => a.roleAtLocation === 'AUXILIAR');
      const pubList = l.publishers.length > 0 ? l.publishers : [null];
      for (const p of pubList) {
        data.push({
          Punto: l.name,
          Dirección: l.address,
          Latitud: l.latitude || '',
          Longitud: l.longitude || '',
          Encargado: encargado?.user?.publisher
            ? `${encargado.user.publisher.firstName} ${encargado.user.publisher.lastName}`
            : '',
          Auxiliar: auxiliar?.user?.publisher
            ? `${auxiliar.user.publisher.firstName} ${auxiliar.user.publisher.lastName}`
            : '',
          Publicador: p
            ? (p.marriedLastName ? `${p.firstName} de ${p.marriedLastName}` : `${p.firstName} ${p.lastName}`)
            : '',
          Activo: l.isActive ? 'Sí' : 'No',
          Notas: l.notes || '',
        });
      }
    }

    sendExcel(res, data, 'Puntos', 'puntos');
  } catch (err) { next(err); }
}
