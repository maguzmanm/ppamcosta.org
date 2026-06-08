const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    const s = await p.shift.findMany({
      include: {
        assignments: {
          include: { publisher: { select: { id: true, firstName: true } } }
        }
      }
    });
    console.log('Shifts:', s.length);
    for (const x of s) {
      console.log(x.id, x.date.toISOString().slice(0, 10), 'assignments:', x.assignments.length);
      for (const a of x.assignments) {
        console.log('   pubId:', a.publisherId, 'pub:', a.publisher ? a.publisher.firstName : 'NULL');
      }
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  await p.$disconnect();
}

main();
