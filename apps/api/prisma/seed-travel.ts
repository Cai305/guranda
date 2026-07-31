// One-off seed for the curated Travel catalogs (Flights + Holiday Packages).
// Run with: npx ts-node prisma/seed-travel.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function inDays(days: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  const existingFlights = await prisma.travelFlight.count();
  if (existingFlights === 0) {
    await prisma.travelFlight.createMany({
      data: [
        { airline: 'Guranda Air', flightNumber: 'LA101', origin: 'Johannesburg', destination: 'Cape Town', departureTime: inDays(3, 7), arrivalTime: inDays(3, 9), price: 1450, seatsTotal: 180, seatsAvailable: 180 },
        { airline: 'Guranda Air', flightNumber: 'LA204', origin: 'Cape Town', destination: 'Johannesburg', departureTime: inDays(3, 18), arrivalTime: inDays(3, 20), price: 1450, seatsTotal: 180, seatsAvailable: 180 },
        { airline: 'SkyBridge', flightNumber: 'SB330', origin: 'Johannesburg', destination: 'Durban', departureTime: inDays(4, 6), arrivalTime: inDays(4, 7), price: 890, seatsTotal: 150, seatsAvailable: 150 },
        { airline: 'SkyBridge', flightNumber: 'SB331', origin: 'Durban', destination: 'Johannesburg', departureTime: inDays(4, 17), arrivalTime: inDays(4, 18), price: 890, seatsTotal: 150, seatsAvailable: 150 },
        { airline: 'Guranda Air', flightNumber: 'LA512', origin: 'Johannesburg', destination: 'London', departureTime: inDays(7, 20), arrivalTime: inDays(8, 8), price: 12500, seatsTotal: 250, seatsAvailable: 250 },
        { airline: 'Continental Wings', flightNumber: 'CW220', origin: 'Cape Town', destination: 'Dubai', departureTime: inDays(10, 22), arrivalTime: inDays(11, 10), price: 9800, seatsTotal: 220, seatsAvailable: 220 },
        { airline: 'Continental Wings', flightNumber: 'CW118', origin: 'Johannesburg', destination: 'Nairobi', departureTime: inDays(5, 9), arrivalTime: inDays(5, 12), price: 3200, seatsTotal: 160, seatsAvailable: 160 },
        { airline: 'SkyBridge', flightNumber: 'SB405', origin: 'Cape Town', destination: 'Port Elizabeth', departureTime: inDays(2, 8), arrivalTime: inDays(2, 9), price: 620, seatsTotal: 100, seatsAvailable: 100 },
      ],
    });
    console.log('Seeded 8 flights');
  } else {
    console.log(`Flights already seeded (${existingFlights})`);
  }

  const existingPackages = await prisma.travelPackage.count();
  if (existingPackages === 0) {
    await prisma.travelPackage.createMany({
      data: [
        {
          title: 'Cape Town Coastal Escape',
          description: 'Table Mountain, Robben Island, and the Winelands — flights and 4-star stay included.',
          destination: 'Cape Town',
          durationDays: 5,
          price: 8900,
          includes: ['Return flights', '4-star hotel', 'Airport transfers', 'City tour'],
        },
        {
          title: 'Kruger Safari Adventure',
          description: 'Big Five game drives with an all-inclusive lodge stay.',
          destination: 'Kruger National Park',
          durationDays: 4,
          price: 14500,
          includes: ['Return flights', 'Safari lodge (all-inclusive)', '2 game drives daily', 'Park fees'],
        },
        {
          title: 'Dubai Luxury Getaway',
          description: 'Desert safari, Burj Khalifa, and a 5-star beachfront resort.',
          destination: 'Dubai',
          durationDays: 6,
          price: 24900,
          includes: ['Return flights', '5-star resort', 'Desert safari', 'Burj Khalifa tickets'],
        },
        {
          title: 'Zanzibar Beach Retreat',
          description: 'White-sand beaches and turquoise water, all-inclusive resort stay.',
          destination: 'Zanzibar',
          durationDays: 7,
          price: 17800,
          includes: ['Return flights', 'All-inclusive resort', 'Spice tour', 'Airport transfers'],
        },
        {
          title: 'London City Break',
          description: 'West End shows, museums, and a boutique hotel in the heart of the city.',
          destination: 'London',
          durationDays: 5,
          price: 21500,
          includes: ['Return flights', 'Boutique hotel', 'City travel pass', 'West End show ticket'],
        },
      ],
    });
    console.log('Seeded 5 holiday packages');
  } else {
    console.log(`Packages already seeded (${existingPackages})`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
