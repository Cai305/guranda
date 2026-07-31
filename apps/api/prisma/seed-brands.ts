import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BRANDS = [
  { name: 'apple', price: 3000000000 },
  { name: 'microsoft', price: 2900000000 },
  { name: 'google', price: 2000000000 },
  { name: 'amazon', price: 1800000000 },
  { name: 'nvidia', price: 2200000000 },
  { name: 'meta', price: 1200000000 },
  { name: 'tesla', price: 700000000 },
  { name: 'samsung', price: 400000000 },
  { name: 'nike', price: 150000000 },
  { name: 'coca_cola', price: 250000000 },
  { name: 'disney', price: 200000000 },
  { name: 'netflix', price: 250000000 },
  { name: 'mcdonalds', price: 200000000 },
  { name: 'toyota', price: 250000000 },
  { name: 'ibm', price: 150000000 },
  { name: 'intel', price: 100000000 },
  { name: 'oracle', price: 300000000 },
  { name: 'visa', price: 500000000 },
  { name: 'walmart', price: 400000000 },
  { name: 'louis_vuitton', price: 450000000 }
];

async function main() {
  console.log('Seeding expensive brand usernames...');
  
  // Find Guranda to own these
  const guranda = await prisma.user.findUnique({ where: { username: 'Guranda' } });
  if (!guranda) {
    console.log('User Guranda not found. Please run seed-guranda.ts first.');
    return;
  }

  for (const brand of BRANDS) {
    // Check if it already exists
    const existing = await prisma.username.findUnique({ where: { label: brand.name } });
    if (!existing) {
      await prisma.username.create({
        data: {
          label: brand.name,
          ownerId: guranda.id,
          acquiredVia: 'ADMIN_SEED',
          saleStatus: 'FIXED',
          price: brand.price
        }
      });
      console.log(`Seeded brand username: ${brand.name} for ${brand.price} MSH`);
    } else {
      console.log(`Username ${brand.name} already exists.`);
    }
  }
  
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
