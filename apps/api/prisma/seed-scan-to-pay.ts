import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findUser(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error(`Required demo user "${username}" was not found.`);
  return user;
}

async function ensureMerchant(
  ownerUsername: string,
  name: string,
  category: string,
  address: string,
  storeName: string,
  storeAddress: string,
) {
  const owner = await findUser(ownerUsername);

  const existing = await prisma.merchant.findFirst({ where: { ownerId: owner.id, name } });
  if (!existing) {
    await prisma.merchant.create({
      data: {
        ownerId: owner.id,
        name,
        category,
        address,
        status: 'APPROVED',
        approvedAt: new Date(),
        stores: { create: { name: storeName, address: storeAddress } },
      },
    });
  } else if (existing.status !== 'APPROVED') {
    await prisma.merchant.update({
      where: { id: existing.id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  const merchant = await prisma.merchant.findFirstOrThrow({
    where: { ownerId: owner.id, name },
    include: { stores: true },
  });
  const store = merchant.stores[0];
  const existingStaff = await prisma.merchantStaff.findFirst({
    where: { merchantId: merchant.id, userId: owner.id },
  });
  if (!existingStaff) {
    await prisma.merchantStaff.create({
      data: { merchantId: merchant.id, storeId: store.id, userId: owner.id, role: 'OWNER' },
    });
  }

  return { merchant, store };
}

async function main() {
  // Owned by verifyuser01 so it's immediately testable in this dev
  // environment: an OWNER staff row is what unlocks the merchant checkout
  // QR and security screens in the mobile app.
  await ensureMerchant(
    'verifyuser01',
    'Kumalo Engine',
    'Convenience Store',
    '142 Voortrekker Rd, Bellville',
    'Store 1',
    '142 Voortrekker Rd, Bellville',
  );

  // More demo merchants so store discovery shows a real cross-category
  // list (brief §16: universal, not one retailer) — owned by whichever
  // real accounts exist in this environment, falling back to verifyuser01
  // so seeding never depends on a specific set of demo users existing.
  const preferredOwners = ['carol', 'sipho', 'thandi'];
  const others: [string, string, string, string, string][] = [
    ['FreshMart Superette', 'Grocery', '9 Church St, Bellville', 'Store 1', '9 Church St, Bellville'],
    ['UrbanKicks ZA', 'Fashion & Sneakers', '21 Kloof St, Cape Town', 'Store 1', '21 Kloof St, Cape Town'],
    ['GreenLeaf Pharmacy', 'Pharmacy', '5 Main Rd, Claremont', 'Store 1', '5 Main Rd, Claremont'],
  ];

  for (let i = 0; i < others.length; i++) {
    const [name, category, address, storeName, storeAddress] = others[i];
    const preferred = preferredOwners[i % preferredOwners.length];
    const ownerExists = await prisma.user.findUnique({ where: { username: preferred } });
    const owner = ownerExists ? preferred : 'verifyuser01';
    await ensureMerchant(owner, name, category, address, storeName, storeAddress);
  }

  console.log('Scan to Pay demo merchants ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
