const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.upsert({
      where: { email: 'pete@entirefm.com' },
      update: { role: 'ADMIN' },
      create: {
        id: 'd58eab5f-fc40-45db-8ceb-8017894d1743',
        email: 'pete@entirefm.com',
        name: 'Peter Currey',
        role: 'ADMIN'
      }
    });
    console.log('Successfully upserted admin user:', user.email);
  } catch (err) {
    console.error('Error during upsert:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
