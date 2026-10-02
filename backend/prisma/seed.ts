import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─────────────────────────────────────────────
  // SUPER ADMIN
  // Password is hashed — never stored in plain text
  // WARNING: Change this password after first login
  // ─────────────────────────────────────────────
  const plainPassword = '1234';
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'kolashivapthi@gmail.com' },
    update: {},
    create: {
      email: 'kolashivapthi@gmail.com',
      passwordHash,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  console.log(`Super admin created: ${superAdmin.email}`);

  // ─────────────────────────────────────────────
  // DEFAULT MACHINES (2 for MVP)
  // ─────────────────────────────────────────────
  const machine1 = await prisma.machine.upsert({
    where: { id: 'machine-1-seed' },
    update: {},
    create: {
      id: 'machine-1-seed',
      name: 'Machine 1',
      description: 'Ground floor washing machine',
    },
  });

  const machine2 = await prisma.machine.upsert({
    where: { id: 'machine-2-seed' },
    update: {},
    create: {
      id: 'machine-2-seed',
      name: 'Machine 2',
      description: 'First floor washing machine',
    },
  });

  console.log(`Machines created: ${machine1.name}, ${machine2.name}`);

  // ─────────────────────────────────────────────
  // DEFAULT SLOT SCHEDULE
  // 6:00 AM to 10:00 PM, 30-min slots, 10-min buffer, all days
  // ─────────────────────────────────────────────
  await prisma.slotSchedule.upsert({
    where: { id: 'schedule-default-seed' },
    update: {},
    create: {
      id: 'schedule-default-seed',
      openTime: '06:00',
      closeTime: '22:00',
      slotDuration: 30,
      bufferDuration: 10,
      dayType: 'ALL',
      createdBy: superAdmin.id,
    },
  });

  console.log('Default slot schedule created: 06:00–22:00, 30min slots');

  // ─────────────────────────────────────────────
  // DEFAULT APP CONFIG
  // ─────────────────────────────────────────────
  await prisma.appConfig.upsert({
    where: { id: 'app-config-seed' },
    update: {},
    create: {
      id: 'app-config-seed',
      weeklyBookingLimit: 3,
      updatedBy: superAdmin.id,
    },
  });

  console.log('App config created: 3 bookings per rolling 7-day window');
  console.log('\n✅ Seed complete.');
  console.log('⚠️  IMPORTANT: Change the super admin password after first login!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
