const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tablas:', tables.rows.map(r => r[0]).join(', '));
  
  try {
    const users = await client.execute('SELECT COUNT(*) as cnt FROM users');
    console.log('Usuarios:', users.rows[0][0]);
  } catch(e) {
    console.log('Tabla users no existe aún');
  }
})();
