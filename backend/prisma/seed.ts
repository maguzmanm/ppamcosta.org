import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos iniciales...');

  // Limpiar datos existentes
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.locationAssignment.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.news.deleteMany();
  await prisma.user.deleteMany();
  await prisma.publisher.deleteMany();
  await prisma.congregation.deleteMany();
  await prisma.circuit.deleteMany();
  await prisma.location.deleteMany();
  await prisma.timeSlot.deleteMany();
  console.log('🧹 Datos anteriores limpiados');

  // ─── Franjas horarias (bloques de 2 horas) ───
  const timeSlots = await Promise.all([
    prisma.timeSlot.create({ data: { name: '9:00 - 11:00', startTime: '09:00', endTime: '11:00', sortOrder: 1 } }),
    prisma.timeSlot.create({ data: { name: '11:00 - 13:00', startTime: '11:00', endTime: '13:00', sortOrder: 2 } }),
    prisma.timeSlot.create({ data: { name: '13:00 - 15:00', startTime: '13:00', endTime: '15:00', sortOrder: 3 } }),
    prisma.timeSlot.create({ data: { name: '15:00 - 17:00', startTime: '15:00', endTime: '17:00', sortOrder: 4 } }),
    prisma.timeSlot.create({ data: { name: '17:00 - 19:00', startTime: '17:00', endTime: '19:00', sortOrder: 5 } }),
    prisma.timeSlot.create({ data: { name: '19:00 - 21:00', startTime: '19:00', endTime: '21:00', sortOrder: 6 } }),
  ]);
  console.log(`✅ ${timeSlots.length} franjas horarias creadas`);

  // ─── Circuito ───
  const circuit = await prisma.circuit.create({
    data: { name: 'Circuito 1' },
  });
  console.log(`✅ Circuito: ${circuit.name}`);

  // ─── Congregaciones ───
  const congNames = ['Congregación Central', 'Congregación Norte', 'Congregación Sur'];
  const congregations = [];
  for (const name of congNames) {
    const c = await prisma.congregation.create({
      data: { name, circuitId: circuit.id },
    });
    congregations.push(c);
  }
  console.log(`✅ ${congregations.length} congregaciones creadas`);

  // ─── Publicadores ───
  const publisherData = [
    { firstName: 'Juan', lastName: 'González', email: 'juan@ppam.org', congregationId: congregations[0].id, phone: '56911111111' },
    { firstName: 'María', lastName: 'Rodríguez', marriedLastName: 'González', email: 'maria@ppam.org', congregationId: congregations[0].id, phone: '56922222222' },
    { firstName: 'Pedro', lastName: 'López', email: 'pedro@ppam.org', congregationId: congregations[1].id, phone: '56933333333' },
    { firstName: 'Ana', lastName: 'Martínez', email: 'ana@ppam.org', congregationId: congregations[1].id, phone: '56944444444' },
    { firstName: 'Carlos', lastName: 'Díaz', email: 'carlos@ppam.org', congregationId: congregations[2].id, phone: '56955555555' },
    { firstName: 'Elena', lastName: 'Pérez', marriedLastName: 'Soto', email: 'elena@ppam.org', congregationId: congregations[2].id, phone: '56966666666' },
  ];

  const publishers = [];
  for (const p of publisherData) {
    const pub = await prisma.publisher.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
        marriedLastName: (p as any).marriedLastName || null,
        congregationId: p.congregationId,
        phone: p.phone,
        email: (p as any).email || null,
      },
    });
    publishers.push(pub);
  }
  console.log(`✅ ${publishers.length} publicadores creados`);

  // ─── Usuarios ───
  const passwordHash = await bcrypt.hash('123456', 10);

  const roles = ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'];
  const users = [];

  for (let i = 0; i < publishers.length; i++) {
    const pub = publishers[i];
    const user = await prisma.user.create({
      data: { email: publisherData[i].email, passwordHash, role: roles[i], publisherId: pub.id },
    });
    await prisma.notificationPreference.create({ data: { userId: user.id } });
    users.push(user);
  }

  console.log('✅ Usuarios creados (password: 123456)');
  for (let i = 0; i < publishers.length; i++) {
    console.log(`   ${publisherData[i].email} (${roles[i]})`);
  }

  // ─── Puntos ───
  const locations = await Promise.all([
    prisma.location.create({ data: { name: 'Plaza de Armas', address: 'Plaza de Armas, Santiago', latitude: -33.4372, longitude: -70.6506 } }),
    prisma.location.create({ data: { name: 'Metro Baquedano', address: 'Av. Providencia, Santiago', latitude: -33.4368, longitude: -70.6346 } }),
    prisma.location.create({ data: { name: 'Parque Araucano', address: 'Av. Pdte. Riesco, Las Condes', latitude: -33.4011, longitude: -70.5717 } }),
  ]);
  console.log(`✅ ${locations.length} puntos creados`);

  // Asignar encargado al primer punto (María - Auxiliar)
  await prisma.locationAssignment.create({
    data: { userId: users[1].id, locationId: locations[0].id, roleAtLocation: 'ENCARGADO_PUNTO' },
  });

  // ─── Disponibilidad de ejemplo ───
  // Juan (coordinador): disponible lun-vie 9-11 y 11-13
  for (let day = 1; day <= 5; day++) {
    await prisma.availability.create({ data: { publisherId: publishers[0].id, timeSlotId: timeSlots[0].id, dayOfWeek: day } });
    await prisma.availability.create({ data: { publisherId: publishers[0].id, timeSlotId: timeSlots[1].id, dayOfWeek: day } });
  }
  // María: disponible sábados todo el día (6 bloques)
  for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
    await prisma.availability.create({ data: { publisherId: publishers[1].id, timeSlotId: timeSlots[slotIdx].id, dayOfWeek: 6 } });
  }
  // Pedro: disponible fines de semana 15-17 y 17-19
  for (const day of [0, 6]) {
    await prisma.availability.create({ data: { publisherId: publishers[2].id, timeSlotId: timeSlots[3].id, dayOfWeek: day } });
    await prisma.availability.create({ data: { publisherId: publishers[2].id, timeSlotId: timeSlots[4].id, dayOfWeek: day } });
  }
  // Ana: disponible lun-mié 9-11
  for (let day = 1; day <= 3; day++) {
    await prisma.availability.create({ data: { publisherId: publishers[3].id, timeSlotId: timeSlots[0].id, dayOfWeek: day } });
  }
  console.log('✅ Disponibilidades de ejemplo creadas');

  // ─── Noticia de ejemplo ───
  await prisma.news.create({
    data: {
      title: '¡Bienvenidos al sistema PPAM!',
      content: 'Este sistema te permite gestionar la predicación pública especial en áreas metropolitanas. Coordina turnos, comparte experiencias y mantente al tanto de los anuncios.',
      authorId: users[0].id,
    },
  });
  console.log('✅ Noticia de ejemplo creada');

  // ─── Experiencias de ejemplo ───
  // Aprobada
  await prisma.experience.create({
    data: {
      title: 'Una mañana en la Plaza de Armas',
      content: 'Hoy tuvimos una excelente mañana de predicación en la Plaza de Armas. Varias personas mostraron interés y colocamos 3 publicaciones. El clima nos acompañó y el ambiente fue muy positivo.',
      status: 'APROBADO',
      publisherId: publishers[1].id, // María
      reviewedBy: users[2].id, // Pedro (Enc. Experiencias)
    },
  });
  // Rechazada
  await prisma.experience.create({
    data: {
      title: 'Predicación en el metro',
      content: 'Intenté predicar dentro de la estación de metro pero no estaba permitido. Necesitamos revisar los permisos para este punto.',
      status: 'RECHAZADO',
      publisherId: publishers[3].id, // Ana
      reviewedBy: users[2].id, // Pedro
    },
  });
  // Pendiente
  await prisma.experience.create({
    data: {
      title: 'Tarde en Parque Araucano',
      content: 'Buena experiencia en el parque. Conversamos con varias familias jóvenes que se mostraron receptivas al mensaje.',
      status: 'PENDIENTE',
      publisherId: publishers[4].id, // Carlos
    },
  });
  console.log('✅ Experiencias de ejemplo creadas (aprobada, rechazada, pendiente)');

  console.log('\n🎉 ¡Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
