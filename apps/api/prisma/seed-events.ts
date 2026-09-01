// Seeds 3 real, bookable events organized by the official "Guranda" account,
// so HomeScreen's "Upcoming events" section (which now reads live data from
// GET /entertainment/events instead of a hardcoded array) has something real
// to show for a fresh install. Idempotent — skips titles that already exist.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysFromNow(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const organizer = await prisma.user.findUnique({ where: { username: 'Guranda' } });
  if (!organizer) {
    throw new Error('Expected an official "Guranda" user to already exist — none found.');
  }

  const events = [
    {
      title: 'Guranda Creator Meetup — Johannesburg',
      category: 'Festival',
      venue: 'The Marabi Club',
      city: 'Johannesburg',
      startsAt: daysFromNow(7, 18, 0),
      description: 'A night for Guranda creators, streamers and store builders to meet in person — demos, networking, and a few surprise announcements.',
      price: 0,
      ticketsTotal: 150,
    },
    {
      title: 'Cape Town Comedy Night ft. Local Headliners',
      category: 'Comedy',
      venue: 'The Comedy Room',
      city: 'Cape Town',
      startsAt: daysFromNow(4, 19, 30),
      description: 'A stacked lineup of Cape Town\'s sharpest comics for one night only. 18+.',
      price: 120,
      ticketsTotal: 200,
    },
    {
      title: 'Sunset Rooftop Sessions — Durban',
      category: 'Festival',
      venue: 'The Rooftop, Umhlanga',
      city: 'Durban',
      startsAt: daysFromNow(12, 17, 0),
      description: 'Live DJs, food trucks and an ocean view as the sun goes down. Bring your Guranda wallet — cashless bar all night.',
      price: 80,
      ticketsTotal: 300,
    },
  ];

  for (const ev of events) {
    const existing = await prisma.eventListing.findFirst({ where: { title: ev.title } });
    if (existing) {
      console.log(`Skipping "${ev.title}" — already seeded.`);
      continue;
    }
    await prisma.eventListing.create({
      data: {
        organizerId: organizer.id,
        title: ev.title,
        category: ev.category,
        venue: ev.venue,
        city: ev.city,
        startsAt: ev.startsAt,
        description: ev.description,
        price: ev.price,
        ticketsTotal: ev.ticketsTotal,
        ticketsAvailable: ev.ticketsTotal,
      },
    });
    console.log(`Created "${ev.title}"`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
