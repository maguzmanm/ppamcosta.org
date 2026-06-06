const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Delete bad test data
  const deleted1 = await p.shiftAssignment.deleteMany({ where: { publisherId: '42e77a9f-6cf8-42c2-b02f-be30e7865896' } });
  console.log('Deleted assignments:', deleted1.count);
  const deleted2 = await p.shift.deleteMany({ where: { id: 'b26b80af-be7d-4d16-aab4-ff3149cecedf' } });
  console.log('Deleted shift:', deleted2.count);
  
  // Also delete other test shifts that have no valid assignments
  const badShifts = ['75201fb7-bbac-4d27-8933-ee2497573ef4', 'b089a7ff-6a94-4196-9dbd-3d4ade88b9c1', 'be9f4298-70ed-46d2-aff0-5bc5ba230c9a'];
  for (const id of badShifts) {
    await p.shiftAssignment.deleteMany({ where: { shiftId: id } });
    await p.shift.delete({ where: { id } }).catch(() => {});
  }
  console.log('Cleaned up test shifts');
  
  await p.$disconnect();
}

main().catch(e => { console.error(e.message); p.$disconnect(); });
