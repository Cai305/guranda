const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GURANDA = '1aa51ecc-d8e5-4650-a2cb-0d9af5d1b743';
const BOB = '0d05e9df-5848-49b6-b141-3f1b8db8cf5c';

const EAT_MAMA = '9cd62618-96f8-4522-8837-d8f182b6dee1';
const EAT_GURANDA = 'c5b8e2bd-dc36-449d-80e7-b79b7699b7ff';
const SHOP_STORE = 'de3739b8-264f-4ff7-82c6-b07f0038d9bb';
const PHARMACY = '858e5a2b-cdaa-4242-9a47-fe020cc57497';

async function main() {
  const log = (label, n) => console.log(`  + ${label}: ${n}`);

  // ── Ride ────────────────────────────────────────────────────────────
  const rides = await prisma.ride.createMany({
    data: [
      { riderId: BOB, driverId: GURANDA, pickupLat: -26.2041, pickupLng: 28.0473, pickupAddress: 'Sandton City, Johannesburg', dropoffLat: -26.1076, dropoffLng: 28.0567, dropoffAddress: 'OR Tambo Airport', status: 'COMPLETED', fare: 185 },
      { riderId: BOB, driverId: GURANDA, pickupLat: -33.9249, pickupLng: 18.4241, pickupAddress: 'V&A Waterfront, Cape Town', dropoffLat: -33.9575, dropoffLng: 18.4610, dropoffAddress: 'Cape Town CBD', status: 'COMPLETED', fare: 65 },
      { riderId: GURANDA, driverId: BOB, pickupLat: -29.8587, pickupLng: 31.0218, pickupAddress: 'Durban Beachfront', dropoffLat: -29.7935, dropoffLng: 30.8790, dropoffAddress: 'Gateway Mall, Umhlanga', status: 'COMPLETED', fare: 92 },
      { riderId: BOB, driverId: null, pickupLat: -26.2041, pickupLng: 28.0473, pickupAddress: 'Rosebank, Johannesburg', dropoffLat: -26.1952, dropoffLng: 28.0342, dropoffAddress: 'Melrose Arch', status: 'REQUESTED', fare: null },
      { riderId: GURANDA, driverId: BOB, pickupLat: -25.7479, pickupLng: 28.2293, pickupAddress: 'Menlyn Park, Pretoria', dropoffLat: -25.7863, dropoffLng: 28.2779, dropoffAddress: 'Centurion Mall', status: 'CANCELLED', fare: null },
    ],
  }).catch(e => { console.error('rides failed', e.message); return { count: 0 }; });
  log('Ride', rides.count);

  // ── Stokvel (Finance) ──────────────────────────────────────────────
  const stokvel1 = await prisma.stokvel.create({
    data: {
      name: 'Guranda Building Fund', category: 'Building Material', description: 'Group savings for members building or renovating homes.',
      creatorId: GURANDA, contributionAmount: 500, contributionFrequency: 'MONTHLY', joiningFee: 100,
      votingThresholdPct: 75, minMembers: 3, signerQuorum: 2,
      withdrawalRules: 'Withdrawals require committee majority vote.', loanRules: 'Members may borrow up to 2x their total contributions.',
    },
  }).catch(() => null);
  const stokvel2 = await prisma.stokvel.create({
    data: {
      name: 'Ubuntu Grocery Club', category: 'Grocery', description: 'Monthly bulk grocery buying club — save together, shop together.',
      creatorId: BOB, contributionAmount: 250, contributionFrequency: 'MONTHLY', joiningFee: 0,
      votingThresholdPct: 60, minMembers: 3, signerQuorum: 2,
    },
  }).catch(() => null);
  let stokvelCount = 0;
  if (stokvel1) { stokvelCount++;
    const m1 = await prisma.stokvelMember.create({ data: { stokvelId: stokvel1.id, userId: GURANDA, role: 'ADMIN' } });
    const m2 = await prisma.stokvelMember.create({ data: { stokvelId: stokvel1.id, userId: BOB, role: 'MEMBER' } });
    await prisma.stokvelContribution.createMany({ data: [
      { stokvelId: stokvel1.id, memberId: m1.id, amountXrp: 500, status: 'SUCCESS' },
      { stokvelId: stokvel1.id, memberId: m2.id, amountXrp: 500, status: 'SUCCESS' },
    ] });
  }
  if (stokvel2) { stokvelCount++;
    await prisma.stokvelMember.create({ data: { stokvelId: stokvel2.id, userId: BOB, role: 'ADMIN' } });
    await prisma.stokvelMember.create({ data: { stokvelId: stokvel2.id, userId: GURANDA, role: 'MEMBER' } });
  }
  log('Stokvel', stokvelCount);

  // ── Learning ────────────────────────────────────────────────────────
  const courses = await prisma.learningCourse.createMany({
    data: [
      { creatorId: GURANDA, title: 'Intro to XRPL Development', description: 'Build your first app on the XRP Ledger — wallets, payments, and multisig.', category: 'Blockchain', level: 'Beginner', price: 0 },
      { creatorId: GURANDA, title: 'Small Business Bookkeeping', description: 'Practical bookkeeping for South African small businesses.', category: 'Business', level: 'Beginner', price: 150 },
      { creatorId: BOB, title: 'React Native for Everyone', description: 'From zero to a shipped mobile app, using this very stack.', category: 'Tech', level: 'Intermediate', price: 300 },
      { creatorId: GURANDA, title: 'Spoken isiZulu Basics', description: 'Everyday conversational isiZulu for beginners.', category: 'Languages', level: 'Beginner', price: 0 },
      { creatorId: BOB, title: 'Personal Finance & Stokvels', description: 'How group savings and stokvels actually work, and how to run one well.', category: 'Finance', level: 'Beginner', price: 100 },
    ],
  }).catch(e => { console.error('courses failed', e.message); return { count: 0 }; });
  log('LearningCourse', courses.count);

  const tutor = await prisma.learningTutor.create({
    data: { ownerId: GURANDA, name: 'Guranda Tutoring', bio: 'Helping learners master tech and business skills, one session at a time.', subjects: 'Programming, Business, Finance', hourlyRate: 120 },
  }).catch(() => null);
  log('LearningTutor', tutor ? 1 : 0);

  const community = await prisma.learningCommunity.create({
    data: { name: 'Guranda Study Circle', description: 'A community of learners supporting each other through courses on Guranda.', creatorId: GURANDA },
  }).catch((e) => { console.error('community failed', e.message); return null; });
  log('LearningCommunity', community ? 1 : 0);

  // ── Hair ────────────────────────────────────────────────────────────
  const hairdresser = await prisma.hairdresserProfile.create({
    data: { userId: GURANDA, businessName: "Thandi's Hair Studio", bio: 'Braids, weaves, natural hair care — 10 years of experience.', lat: -26.2041, lng: 28.0473, address: 'Rosebank, Johannesburg', rating: 4.8 },
  }).catch(e => { console.error('hairdresser failed', e.message); return null; });
  if (hairdresser) {
    await prisma.hairService.createMany({ data: [
      { hairdresserId: hairdresser.id, title: 'Box Braids', description: 'Classic box braids, medium size.', price: 450, duration: 240, images: [] },
      { hairdresserId: hairdresser.id, title: 'Silk Press', description: 'Smooth, shiny silk press blowout.', price: 250, duration: 90, images: [] },
      { hairdresserId: hairdresser.id, title: 'Full Weave Install', description: 'Sew-in weave with styling included.', price: 600, duration: 180, images: [] },
    ] });
    await prisma.hairProduct.createMany({ data: [
      { hairdresserId: hairdresser.id, name: 'Argan Oil Hair Serum', description: 'Nourishing serum for shine and frizz control.', price: 120, inStock: true },
      { hairdresserId: hairdresser.id, name: 'Braid Spray', description: 'Keeps braids fresh and moisturized.', price: 65, inStock: true },
    ] });
  }
  log('HairdresserProfile', hairdresser ? 1 : 0);

  // ── Carwash ─────────────────────────────────────────────────────────
  const carwash = await prisma.carWash.create({
    data: { ownerId: BOB, name: 'Sparkle Wash & Detail', description: 'Full-service car wash and detailing, quick turnaround.', address: 'Melville, Johannesburg', isOpen: true, rating: 4.6 },
  }).catch(e => { console.error('carwash failed', e.message); return null; });
  if (carwash) {
    await prisma.carWashService.createMany({ data: [
      { carWashId: carwash.id, name: 'Basic Wash', description: 'Exterior wash and dry.', price: 60 },
      { carWashId: carwash.id, name: 'Full Valet', description: 'Interior + exterior deep clean.', price: 220 },
      { carWashId: carwash.id, name: 'Wax & Polish', description: 'Hand wax and polish finish.', price: 150 },
    ] });
  }
  log('CarWash', carwash ? 1 : 0);

  // ── Marketplace (pad) ───────────────────────────────────────────────
  const listings = await prisma.marketplaceListing.createMany({
    data: [
      { sellerId: GURANDA, title: 'iPhone 13 Pro — 256GB', description: 'Excellent condition, no scratches, comes with box and charger.', category: 'Electronics', condition: 'LIKE_NEW', listingType: 'FIXED', price: 12500, images: [] },
      { sellerId: BOB, title: 'Mountain Bike — 26"', description: 'Great for trails, recently serviced.', category: 'Sports', condition: 'GOOD', listingType: 'FIXED', price: 3200, images: [] },
      { sellerId: GURANDA, title: 'Leather Corner Couch', description: 'Comfortable 5-seater, minor wear.', category: 'Furniture', condition: 'GOOD', listingType: 'FIXED', price: 4800, images: [] },
      { sellerId: BOB, title: 'PS5 Console + 2 Controllers', description: 'Barely used, all cables included.', category: 'Electronics', condition: 'LIKE_NEW', listingType: 'AUCTION', price: 6000, currentBid: 6500, images: [] },
    ],
  }).catch(e => { console.error('listings failed', e.message); return { count: 0 }; });
  log('MarketplaceListing (added)', listings.count);

  // ── Eat products (pad) ──────────────────────────────────────────────
  const eatProducts = await prisma.eatProduct.createMany({
    data: [
      { storeId: EAT_MAMA, name: 'Bunny Chow', description: 'Durban-style curry in a bread loaf.', price: 85, category: 'Mains' },
      { storeId: EAT_MAMA, name: 'Chakalaka & Pap', description: 'Traditional pap with spicy chakalaka relish.', price: 55, category: 'Mains' },
      { storeId: EAT_GURANDA, name: 'Boerewors Roll', description: 'Grilled boerewors on a fresh roll.', price: 45, category: 'Fast Food' },
      { storeId: EAT_GURANDA, name: 'Malva Pudding', description: 'Warm malva pudding with custard.', price: 40, category: 'Dessert' },
    ],
  }).catch(e => { console.error('eatProducts failed', e.message); return { count: 0 }; });
  log('EatProduct (added)', eatProducts.count);

  // ── Shopping products (pad) ──────────────────────────────────────────
  const shopProducts = await prisma.shoppingProduct.createMany({
    data: [
      { storeId: SHOP_STORE, name: 'Bluetooth Speaker', description: 'Portable speaker, 12-hour battery.', price: 750, category: 'Audio' },
      { storeId: SHOP_STORE, name: '65" 4K Smart TV', description: 'Crisp 4K display with smart apps built in.', price: 9500, category: 'TVs' },
      { storeId: SHOP_STORE, name: 'Laptop Backpack', description: 'Water-resistant, fits up to 15" laptops.', price: 350, category: 'Accessories' },
      { storeId: SHOP_STORE, name: 'Wireless Mouse', description: 'Ergonomic wireless mouse.', price: 180, category: 'Accessories' },
    ],
  }).catch(e => { console.error('shopProducts failed', e.message); return { count: 0 }; });
  log('ShoppingProduct (added)', shopProducts.count);

  // ── Property (pad) ────────────────────────────────────────────────────
  const properties = await prisma.property.createMany({
    data: [
      { agentId: GURANDA, title: '2-Bed Apartment, Sandton', kind: 'APARTMENT', listingType: 'RENT', price: 12000, address: 'Sandton, Johannesburg', bedrooms: 2, bathrooms: 1, images: [] },
      { agentId: GURANDA, title: 'Family Home with Garden', kind: 'HOUSE', listingType: 'SALE', price: 1850000, address: 'Constantia, Cape Town', bedrooms: 4, bathrooms: 3, images: [] },
      { agentId: BOB, title: 'Studio Loft, City Centre', kind: 'APARTMENT', listingType: 'RENT', price: 6500, address: 'CBD, Durban', bedrooms: 1, bathrooms: 1, images: [] },
      { agentId: GURANDA, title: 'Retail Space, Main Road', kind: 'COMMERCIAL', listingType: 'RENT', price: 18000, address: 'Main Road, Pretoria', bedrooms: 0, bathrooms: 1, images: [] },
    ],
  }).catch(e => { console.error('properties failed', e.message); return { count: 0 }; });
  log('Property (added)', properties.count);

  // ── Health (pad) ──────────────────────────────────────────────────────
  const practitioners = await prisma.healthPractitioner.createMany({
    data: [
      { ownerId: GURANDA, name: 'Dr. Naledi Mokoena', specialty: 'General Practitioner', bio: 'Family medicine with 15 years of experience.', consultationFee: 450 },
      { ownerId: BOB, name: 'Dr. Sipho Ndlovu', specialty: 'Physiotherapist', bio: 'Sports injury and rehabilitation specialist.', consultationFee: 380 },
    ],
  }).catch(e => { console.error('practitioners failed', e.message); return { count: 0 }; });
  log('HealthPractitioner (added)', practitioners.count);

  const pharmacyProducts = await prisma.healthPharmacyProduct.createMany({
    data: [
      { pharmacyId: PHARMACY, name: 'Vitamin C 1000mg (30 tabs)', price: 85, category: 'Vitamins' },
      { pharmacyId: PHARMACY, name: 'Paracetamol 500mg (20 tabs)', price: 35, category: 'Medicine' },
      { pharmacyId: PHARMACY, name: 'First Aid Kit', price: 220, category: 'First Aid' },
      { pharmacyId: PHARMACY, name: 'Hand Sanitizer 250ml', price: 45, category: 'Personal Care' },
    ],
  }).catch(e => { console.error('pharmacyProducts failed', e.message); return { count: 0 }; });
  log('HealthPharmacyProduct (added)', pharmacyProducts.count);

  // ── Travel (pad) ────────────────────────────────────────────────────
  const stays = await prisma.travelStay.createMany({
    data: [
      { hostId: GURANDA, title: 'Beachfront Villa', description: 'Steps from the beach, sleeps 6.', location: 'Umhlanga, Durban', pricePerNight: 2200, maxGuests: 6, amenities: ['WiFi', 'Pool', 'Parking'], rating: 4.9 },
      { hostId: BOB, title: 'Cozy City Apartment', description: 'Modern apartment near the CBD.', location: 'Cape Town CBD', pricePerNight: 950, maxGuests: 2, amenities: ['WiFi', 'Kitchen'], rating: 4.5 },
      { hostId: GURANDA, title: 'Bushveld Safari Lodge', description: 'Wake up to wildlife right outside.', location: 'Kruger National Park', pricePerNight: 3500, maxGuests: 4, amenities: ['WiFi', 'Game Drives', 'Breakfast'], rating: 4.95 },
    ],
  }).catch(e => { console.error('stays failed', e.message); return { count: 0 }; });
  log('TravelStay (added)', stays.count);

  const cars = await prisma.travelCar.createMany({
    data: [
      { hostId: GURANDA, make: 'Toyota', model: 'Corolla', category: 'Economy', location: 'Johannesburg', pricePerDay: 350, rating: 4.6 },
      { hostId: BOB, make: 'BMW', model: 'X3', category: 'Luxury', location: 'Cape Town', pricePerDay: 950, rating: 4.8 },
      { hostId: GURANDA, make: 'VW', model: 'Kombi', category: 'Van', location: 'Durban', pricePerDay: 600, rating: 4.4 },
    ],
  }).catch(e => { console.error('cars failed', e.message); return { count: 0 }; });
  log('TravelCar (added)', cars.count);

  console.log('\ndone.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
