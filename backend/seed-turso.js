const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function seed() {
  console.log('🌱 Sembrando datos en Turso...');

  const hash = await bcrypt.hash('123456', 10);
  const now = new Date().toISOString();

  // Limpiar
  await client.execute('DELETE FROM shift_assignments');
  await client.execute('DELETE FROM shifts');
  await client.execute('DELETE FROM availability');
  await client.execute('DELETE FROM location_assignments');
  await client.execute('DELETE FROM notification_preferences');
  await client.execute('DELETE FROM notifications');
  await client.execute('DELETE FROM device_tokens');
  await client.execute('DELETE FROM experiences');
  await client.execute('DELETE FROM announcements');
  await client.execute('DELETE FROM news');
  await client.execute('DELETE FROM publishers');
  await client.execute('DELETE FROM users');
  await client.execute('DELETE FROM time_slots');
  await client.execute('DELETE FROM congregations');
  await client.execute('DELETE FROM circuits');

  // Circuito
  await client.execute({
    sql: 'INSERT INTO circuits (id, name, created_at) VALUES (?, ?, ?)',
    args: ['circ-1', 'Circuito 1', now],
  });

  // Congregaciones
  for (const [id, name] of [['cong-1', 'Central'], ['cong-2', 'Norte'], ['cong-3', 'Sur']]) {
    await client.execute({
      sql: 'INSERT INTO congregations (id, name, circuit_id, created_at) VALUES (?, ?, ?, ?)',
      args: [id, name, 'circ-1', now],
    });
  }

  // Time slots
  const slots = [
    ['slot-1', 'Mañana 9-11', '09:00', '11:00', 1],
    ['slot-2', 'Mañana 11-13', '11:00', '13:00', 2],
    ['slot-3', 'Tarde 13-15', '13:00', '15:00', 3],
    ['slot-4', 'Tarde 15-17', '15:00', '17:00', 4],
    ['slot-5', 'Tarde 17-19', '17:00', '19:00', 5],
    ['slot-6', 'Noche 19-21', '19:00', '21:00', 6],
  ];
  for (const s of slots) {
    await client.execute({
      sql: 'INSERT INTO time_slots (id, name, start_time, end_time, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [...s, now],
    });
  }

  // Publicadores + Usuarios
  const publishers = [
    { pid: 'pub-1', fn: 'Juan', ln: 'Pérez', mln: '', g: 'M', cid: 'cong-1', email: 'juan@ppam.org', role: 'COORDINADOR', uid: 'user-1' },
    { pid: 'pub-2', fn: 'María', ln: 'González', mln: 'Rodríguez', g: 'F', cid: 'cong-1', email: 'maria@ppam.org', role: 'AUXILIAR', uid: 'user-2' },
    { pid: 'pub-3', fn: 'Pedro', ln: 'Soto', mln: '', g: 'M', cid: 'cong-2', email: 'pedro@ppam.org', role: 'ENCARGADO_EXPERIENCIAS', uid: 'user-3' },
    { pid: 'pub-4', fn: 'Ana', ln: 'Martínez', mln: '', g: 'F', cid: 'cong-2', email: 'ana@ppam.org', role: 'PUBLICADOR', uid: 'user-4' },
    { pid: 'pub-5', fn: 'Carlos', ln: 'Díaz', mln: '', g: 'M', cid: 'cong-3', email: 'carlos@ppam.org', role: 'ENCARGADO_PUNTO', uid: 'user-5' },
    { pid: 'pub-6', fn: 'Elena', ln: 'Rojas', mln: '', g: 'F', cid: 'cong-3', email: 'elena@ppam.org', role: 'AUXILIAR_PUNTO', uid: 'user-6' },
  ];

  for (const p of publishers) {
    await client.execute({
      sql: `INSERT INTO publishers (id, first_name, last_name, married_last_name, gender, congregation_id, email, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [p.pid, p.fn, p.ln, p.mln || null, p.g, p.cid, p.email, now, now],
    });
    await client.execute({
      sql: 'INSERT INTO users (id, email, password_hash, role, publisher_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [p.uid, p.email, hash, p.role, p.pid, now],
    });
    await client.execute({
      sql: 'INSERT INTO notification_preferences (id, user_id, push_enabled, email_enabled, created_at, updated_at) VALUES (?, ?, 1, 1, ?, ?)',
      args: [`np-${p.uid}`, p.uid, now, now],
    });
  }

  // Locations
  const locations = [
    ['loc-1', 'Plaza de Armas', 'Plaza de Armas, Santiago', -33.4378, -70.6504, 'Centro de Santiago'],
    ['loc-2', 'Metro Baquedano', 'Av. Providencia, Santiago', -33.4361, -70.6344, 'Alto tránsito'],
    ['loc-3', 'Parque Araucano', 'Av. Las Condes, Santiago', -33.4011, -70.5742, 'Zona residencial'],
  ];
  for (const l of locations) {
    await client.execute({
      sql: 'INSERT INTO locations (id, name, address, latitude, longitude, notes, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      args: [...l, now],
    });
  }

  // Location assignments (Maria as ENCARGADO_PUNTO of loc-1)
  await client.execute({
    sql: "INSERT INTO location_assignments (id, user_id, location_id, role_at_location, created_at) VALUES (?, ?, ?, 'ENCARGADO_PUNTO', ?)",
    args: ['la-1', 'user-2', 'loc-1', now],
  });

  // Shifts
  const today = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    await client.execute({
      sql: "INSERT INTO shifts (id, location_id, date, time_slot_id, max_publishers, status, created_by_id, created_at) VALUES (?, ?, ?, ?, 2, 'ABIERTO', 'user-1', ?)",
      args: [`shift-${i + 1}`, ['loc-1', 'loc-2', 'loc-3', 'loc-1'][i], dateStr, ['slot-1', 'slot-3', 'slot-2', 'slot-4'][i], now],
    });
  }

  // Experiences
  const exps = [
    ['exp-1', 'pub-4', 'Buena experiencia en Plaza', 'Tuvimos una conversación muy animada.', 'APROBADO', 'user-1'],
    ['exp-2', 'pub-4', 'Día lluvioso', 'Poca gente pero se colocaron 2 revistas.', 'RECHAZADO', 'user-1', 'Falta más detalle'],
    ['exp-3', 'pub-6', 'Predicación en parque', 'Excelente acogida de la comunidad.', 'PENDIENTE', null],
  ];
  for (const e of exps) {
    await client.execute({
      sql: 'INSERT INTO experiences (id, publisher_id, title, content, status, reviewed_by, review_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [e[0], e[1], e[2], e[3], e[4], e[5] || null, e[6] || null, now, now],
    });
  }

  // News
  await client.execute({
    sql: 'INSERT INTO news (id, title, content, author_id, published_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: ['news-1', 'Bienvenidos a PPAM', 'Gracias por usar la plataforma de Predicación Pública. Que Jehová bendiga su ministerio.', 'user-1', now, now],
  });

  console.log('✅ Seed completado en Turso!');
}

seed().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
