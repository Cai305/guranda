import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

async function findUser(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error(`Required demo user "${username}" was not found.`);
  return user;
}

async function ensureShoppingStore(ownerId: string, name: string, category: string, products: Array<{ name: string; description: string; price: number; imageUrl: string }>) {
  let store = await prisma.shoppingStore.findFirst({ where: { ownerId, name } });
  if (!store) {
    store = await prisma.shoppingStore.create({
      data: { ownerId, name, category, description: `A local ${category.toLowerCase()} shop on MXIT.`, rating: 4.7 },
    });
  }
  for (const product of products) {
    const exists = await prisma.shoppingProduct.findFirst({ where: { storeId: store.id, name: product.name } });
    if (!exists) await prisma.shoppingProduct.create({ data: { ...product, storeId: store.id, category } });
  }
}

async function ensureEatStore(ownerId: string, name: string, category: string, address: string, products: Array<{ name: string; description: string; price: number; imageUrl: string }>) {
  let store = await prisma.eatStore.findFirst({ where: { ownerId, name } });
  if (!store) store = await prisma.eatStore.create({ data: { ownerId, name, category, address, description: `Fresh ${category.toLowerCase()} made to order.`, rating: 4.6 } });
  for (const product of products) {
    const exists = await prisma.eatProduct.findFirst({ where: { storeId: store.id, name: product.name } });
    if (!exists) await prisma.eatProduct.create({ data: { ...product, storeId: store.id, category } });
  }
}

async function ensureCarWash(ownerId: string, name: string, address: string, services: Array<{ name: string; description: string; price: number }>) {
  let wash = await prisma.carWash.findFirst({ where: { ownerId, name } });
  if (!wash) wash = await prisma.carWash.create({ data: { ownerId, name, address, description: 'Reliable local car care while you wait.', rating: 4.8 } });
  for (const service of services) {
    const exists = await prisma.carWashService.findFirst({ where: { carWashId: wash.id, name: service.name } });
    if (!exists) await prisma.carWashService.create({ data: { ...service, carWashId: wash.id } });
  }
}

async function ensurePharmacy(ownerId: string, name: string, address: string, products: Array<{ name: string; description: string; price: number; category: string }>) {
  let pharmacy = await prisma.healthPharmacy.findFirst({ where: { ownerId, name } });
  if (!pharmacy) pharmacy = await prisma.healthPharmacy.create({ data: { ownerId, name, address, description: 'Everyday wellness essentials from a trusted local pharmacy.', rating: 4.7 } });
  for (const product of products) {
    const exists = await prisma.healthPharmacyProduct.findFirst({ where: { pharmacyId: pharmacy.id, name: product.name } });
    if (!exists) await prisma.healthPharmacyProduct.create({ data: { ...product, pharmacyId: pharmacy.id, imageUrl: image('photo-1584308666744-24d5c474f2ae') } });
  }
}

async function main() {
  const [power, cai, admin, berry, activationOne, activationTwo] = await Promise.all(
    ['power', 'cai', 'admin', 'berry', 'activatetest1', 'activatetest2'].map(findUser),
  );

  await ensureShoppingStore(power.id, 'Power Connect', 'Electronics', [
    { name: 'Pocket Power Bank', description: '10 000 mAh fast-charge power bank.', price: 349, imageUrl: image('photo-1609592424824-1b3f2c3b8d1d') },
    { name: 'Wireless Earbuds', description: 'Clear sound with a charging case.', price: 599, imageUrl: image('photo-1505740420928-5e560c06d30e') },
    { name: 'USB-C Fast Charger', description: 'Compact 30W wall charger.', price: 219, imageUrl: image('photo-1583863788434-e58a36330cf0') },
  ]);
  await ensureShoppingStore(berry.id, 'Berry Beauty Market', 'Beauty', [
    { name: 'Glow Skincare Set', description: 'Cleanser, serum and daily moisturiser.', price: 420, imageUrl: image('photo-1556229010-6c3f2c9ca5f8') },
    { name: 'Satin Hair Wrap', description: 'Soft overnight protection for every hairstyle.', price: 129, imageUrl: image('photo-1522335789203-aabd1fc54bc9') },
    { name: 'Everyday Makeup Bag', description: 'A roomy, easy-clean cosmetics bag.', price: 180, imageUrl: image('photo-1596462502278-27bfdc403348') },
  ]);

  await ensureEatStore(cai.id, 'Cai\'s Kitchen', 'Home-style Food', '14 Vilakazi Street, Soweto', [
    { name: 'Chicken Kota', description: 'Fresh kota with chicken, chips and salad.', price: 65, imageUrl: image('photo-1565299507177-b0ac66763828') },
    { name: 'Beef Pap Bowl', description: 'Slow-cooked beef stew with pap and chakalaka.', price: 95, imageUrl: image('photo-1547592180-85f173990554') },
    { name: 'Ginger Lemonade', description: 'House-made, lightly sparkling lemonade.', price: 28, imageUrl: image('photo-1621263764928-df1444c5e859') },
  ]);
  await ensureEatStore(activationOne.id, 'Township Treats', 'Bakery', '8 Main Road, Tembisa', [
    { name: 'Vetkoek & Mince', description: 'Golden vetkoek filled with savoury mince.', price: 45, imageUrl: image('photo-1509440159596-0249088772ff') },
    { name: 'Scone Box', description: 'Six fresh scones with jam and cream.', price: 75, imageUrl: image('photo-1509365465985-25d11c17e83a') },
    { name: 'Iced Coffee', description: 'Smooth cold coffee with vanilla foam.', price: 38, imageUrl: image('photo-1517701604599-bb29b565090c') },
  ]);

  await ensureCarWash(power.id, 'Power Shine Car Wash', '22 Commissioner Street, Johannesburg CBD', [
    { name: 'Quick Exterior Wash', description: 'Hand wash, rinse and tyre shine.', price: 80 },
    { name: 'Full Valet', description: 'Interior vacuum, dashboard detail and exterior wash.', price: 220 },
    { name: 'Premium Detail', description: 'Deep clean, wax finish and interior treatment.', price: 450 },
  ]);
  await ensureCarWash(activationTwo.id, 'Fresh Ride Auto Spa', '6 Church Street, Pretoria', [
    { name: 'Express Wash', description: 'Fast exterior clean for busy days.', price: 70 },
    { name: 'Interior Refresh', description: 'Vacuum, windows and dashboard clean.', price: 140 },
    { name: 'SUV Full Wash', description: 'Complete inside-and-out SUV treatment.', price: 260 },
  ]);

  await ensurePharmacy(admin.id, 'AdminCare Pharmacy', '45 Bree Street, Johannesburg', [
    { name: 'Vitamin C 1000mg', description: 'Daily immune-support tablets.', price: 119, category: 'Vitamins' },
    { name: 'Pain Relief Tablets', description: 'Everyday non-prescription pain relief.', price: 49, category: 'Medicine' },
    { name: 'First Aid Kit', description: 'Compact home and travel first aid kit.', price: 189, category: 'First Aid' },
  ]);

  const hair = await prisma.hairdresserProfile.upsert({
    where: { userId: berry.id },
    update: {},
    create: { userId: berry.id, businessName: 'Berry Braids & Beauty', bio: 'Protective styles and natural hair care.', lat: -26.2041, lng: 28.0473, address: 'Maboneng, Johannesburg', rating: 4.9 },
  });
  for (const service of [
    { title: 'Knotless Braids', description: 'Neat medium knotless braids.', price: 650, duration: 240 },
    { title: 'Wash & Treatment', description: 'Clarifying wash and restorative treatment.', price: 220, duration: 60 },
    { title: 'Silk Press', description: 'Smooth, glossy finish for natural hair.', price: 380, duration: 120 },
  ]) {
    const exists = await prisma.hairService.findFirst({ where: { hairdresserId: hair.id, title: service.title } });
    if (!exists) await prisma.hairService.create({ data: { ...service, hairdresserId: hair.id, images: [] } });
  }

  const company = await prisma.workCompany.findFirst({ where: { ownerId: activationTwo.id, name: 'Activate Digital Studio' } })
    ?? await prisma.workCompany.create({ data: { ownerId: activationTwo.id, name: 'Activate Digital Studio', description: 'A small studio building useful digital products.', industry: 'Technology' } });
  for (const job of [
    { title: 'Junior Content Creator', description: 'Create short-form content for local brands.', employmentType: 'Part-time', locationType: 'Hybrid', location: 'Johannesburg', salaryMin: 8000, salaryMax: 14000 },
    { title: 'React Native Developer', description: 'Help improve mobile experiences for our clients.', employmentType: 'Contract', locationType: 'Remote', location: 'South Africa', salaryMin: 25000, salaryMax: 45000 },
  ]) {
    const exists = await prisma.workJob.findFirst({ where: { companyId: company.id, title: job.title } });
    if (!exists) await prisma.workJob.create({ data: { ...job, companyId: company.id, postedById: activationTwo.id } });
  }

  const stay = await prisma.travelStay.findFirst({ where: { hostId: cai.id, title: 'Cai\'s Cosy Soweto Cottage' } });
  if (!stay) await prisma.travelStay.create({ data: { hostId: cai.id, title: 'Cai\'s Cosy Soweto Cottage', description: 'A peaceful private cottage close to local food and culture.', location: 'Soweto, Johannesburg', pricePerNight: 780, maxGuests: 3, amenities: ['WiFi', 'Kitchen', 'Secure parking'], rating: 4.8, imageUrl: image('photo-1600585154340-be6161a56a0c') } });
  const car = await prisma.travelCar.findFirst({ where: { hostId: power.id, make: 'Toyota', model: 'Corolla Quest' } });
  if (!car) await prisma.travelCar.create({ data: { hostId: power.id, make: 'Toyota', model: 'Corolla Quest', category: 'Economy', location: 'OR Tambo International Airport', pricePerDay: 520, rating: 4.7, imageUrl: image('photo-1550355291-bbee04a92027') } });

  const listings = [
    { sellerId: power.id, title: 'Nintendo Switch Lite', description: 'Excellent condition, includes charger and carry case.', category: 'Gaming', condition: 'LIKE_NEW' as const, listingType: 'FIXED' as const, price: 2999, images: [image('photo-1578303512597-81e6cc155b3e')] },
    { sellerId: cai.id, title: 'Handwoven Picnic Basket', description: 'Beautiful locally woven basket for weekends out.', category: 'Home & Garden', condition: 'NEW' as const, listingType: 'FIXED' as const, price: 350, images: [image('photo-1513001900722-370f803f498d')] },
    { sellerId: berry.id, title: 'Ring Light Kit', description: 'Dimmable ring light with tripod and phone holder.', category: 'Electronics', condition: 'GOOD' as const, listingType: 'FIXED' as const, price: 480, images: [image('photo-1536240478700-b869070f9279')] },
  ];
  for (const listing of listings) {
    const exists = await prisma.marketplaceListing.findFirst({ where: { sellerId: listing.sellerId, title: listing.title } });
    if (!exists) await prisma.marketplaceListing.create({ data: listing });
  }

  console.log('Mini-app demo catalog is ready for 6 local users.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
