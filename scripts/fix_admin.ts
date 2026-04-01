import prisma from '../lib/prisma';
const authId = 'c49fbbe0-d742-48cb-9d3c-d2bf897aa491';

async function fix() {
  const existing = await prisma.user.findUnique({ where: { email: 'pete@entirefm.com' } });
  if (existing) {
    console.log('User found. Ensuring supabaseId and role are correct...');
    await prisma.user.update({
      where: { email: 'pete@entirefm.com' },
      data: { supabaseId: authId, role: 'ADMIN', isActive: true }
    });
  } else {
    console.log('User not found. Creating new admin user...');
    await prisma.user.create({
      data: {
        supabaseId: authId,
        email: 'pete@entirefm.com',
        name: 'Peter Currey',
        role: 'ADMIN',
        isActive: true
      }
    });
  }
}
fix().then(() => console.log('Successfully aligned database identities!')).catch(e => console.error(e));
