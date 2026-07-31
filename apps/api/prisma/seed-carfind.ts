// One-off seed for sample CarFind listings.
// Run with: npx ts-node prisma/seed-carfind.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CAR_IMAGES = [
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=700&auto=format&fit=crop',
];

async function main() {
  const existing = await prisma.carListing.count();
  if (existing > 0) {
    console.log(`CarFind listings already seeded (${existing})`);
    return;
  }

  const seller = await prisma.user.findFirst({ select: { id: true } });
  if (!seller) {
    console.log('No users in DB yet — skipping CarFind seed.');
    return;
  }

  await prisma.carListing.createMany({
    data: [
      { sellerId: seller.id, title: '2020 Volkswagen Polo TSI Comfortline', make: 'Volkswagen', model: 'Polo', year: 2020, price: 245000, mileage: 42000, transmission: 'MANUAL', fuelType: 'PETROL', bodyType: 'HATCHBACK', condition: 'USED', location: 'Pretoria', description: 'Full service history, one owner, non-smoker.', images: CAR_IMAGES },
      { sellerId: seller.id, title: '2019 Toyota Hilux 2.8 GD-6 Raider', make: 'Toyota', model: 'Hilux', year: 2019, price: 512000, mileage: 78000, transmission: 'AUTOMATIC', fuelType: 'DIESEL', bodyType: 'BAKKIE', condition: 'USED', location: 'Johannesburg', description: 'Tow bar, canopy included, well maintained.', images: CAR_IMAGES },
      { sellerId: seller.id, title: '2022 Suzuki Swift 1.2 GL', make: 'Suzuki', model: 'Swift', year: 2022, price: 199000, mileage: 15000, transmission: 'MANUAL', fuelType: 'PETROL', bodyType: 'HATCHBACK', condition: 'USED', location: 'Cape Town', description: 'Still under motor plan, immaculate condition.', images: CAR_IMAGES },
      { sellerId: seller.id, title: '2021 BMW X3 xDrive20d', make: 'BMW', model: 'X3', year: 2021, price: 785000, mileage: 38000, transmission: 'AUTOMATIC', fuelType: 'DIESEL', bodyType: 'SUV', condition: 'USED', location: 'Sandton', description: 'M Sport package, panoramic sunroof, full BMW service plan.', images: CAR_IMAGES },
      { sellerId: seller.id, title: '2024 Hyundai Grand i10 Motion', make: 'Hyundai', model: 'Grand i10', year: 2024, price: 269900, mileage: 0, transmission: 'MANUAL', fuelType: 'PETROL', bodyType: 'HATCHBACK', condition: 'NEW', location: 'Durban', description: 'Brand new, dealer stock, 5-year warranty.', images: CAR_IMAGES },
      { sellerId: seller.id, title: '2018 Ford Ranger 3.2 Wildtrak', make: 'Ford', model: 'Ranger', year: 2018, price: 449000, mileage: 95000, transmission: 'AUTOMATIC', fuelType: 'DIESEL', bodyType: 'BAKKIE', condition: 'USED', location: 'Pretoria', description: 'Leather seats, rollbar, side steps.', images: CAR_IMAGES },
      { sellerId: seller.id, title: '2023 Tesla Model 3', make: 'Tesla', model: 'Model 3', year: 2023, price: 899000, mileage: 8500, transmission: 'AUTOMATIC', fuelType: 'ELECTRIC', bodyType: 'SEDAN', condition: 'USED', location: 'Cape Town', description: 'Long Range AWD, Autopilot, home charger included.', images: CAR_IMAGES },
      { sellerId: seller.id, title: '2017 Honda Jazz 1.5 Elegance', make: 'Honda', model: 'Jazz', year: 2017, price: 165000, mileage: 88000, transmission: 'AUTOMATIC', fuelType: 'PETROL', bodyType: 'HATCHBACK', condition: 'USED', location: 'Johannesburg', description: 'Reliable runaround, great on fuel, magic seats.', images: CAR_IMAGES },
    ],
  });
  console.log('Seeded 8 CarFind listings');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
