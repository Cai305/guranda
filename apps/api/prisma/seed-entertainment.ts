// One-off seed for the curated Entertainment catalogs (Movies, Concerts, Live Events).
// Run with: npx ts-node prisma/seed-entertainment.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function inDays(days: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const wholeHour = Math.floor(hour);
  const minutes = Math.round((hour - wholeHour) * 60);
  d.setHours(wholeHour, minutes, 0, 0);
  return d;
}

async function main() {
  const existingMovies = await prisma.movie.count();
  if (existingMovies === 0) {
    const movies = [
      {
        title: 'Neon Horizon', genre: 'Sci-Fi', rating: 'PG13', durationMins: 128,
        synopsis: 'A salvage pilot discovers a signal that rewrites everything humanity knows about the edge of the galaxy.',
        posterUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&auto=format&fit=crop',
        showtimeTemplate: [
          { cinema: 'Ster-Kinekor Sandton', hours: [16, 19, 21.5] },
          { cinema: 'Nu Metro V&A Waterfront', hours: [17, 20] },
        ],
        price: 95,
      },
      {
        title: 'The Last Braai', genre: 'Comedy', rating: 'PG', durationMins: 104,
        synopsis: 'Three feuding brothers must host one final family braai before the family farm is sold.',
        posterUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop',
        showtimeTemplate: [
          { cinema: 'Ster-Kinekor Sandton', hours: [15, 18] },
          { cinema: 'CineCentre Rosebank', hours: [16.5, 19.5] },
        ],
        price: 85,
      },
      {
        title: 'Midnight in Maboneng', genre: 'Drama', rating: '16', durationMins: 118,
        synopsis: 'A jazz singer and a street artist chase one last night of freedom through Johannesburg’s inner city.',
        posterUrl: 'https://images.unsplash.com/photo-1489599162946-4b8b7e6dc9a0?w=500&auto=format&fit=crop',
        showtimeTemplate: [
          { cinema: 'CineCentre Rosebank', hours: [18, 21] },
        ],
        price: 90,
      },
      {
        title: 'Township Titans', genre: 'Action', rating: 'PG13', durationMins: 135,
        synopsis: 'An underground street-racing crew takes on a corrupt syndicate that’s been fixing the league.',
        posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&auto=format&fit=crop',
        showtimeTemplate: [
          { cinema: 'Nu Metro V&A Waterfront', hours: [14, 17, 20] },
          { cinema: 'Ster-Kinekor Sandton', hours: [15.5, 21] },
        ],
        price: 100,
      },
      {
        title: 'Wild Karoo', genre: 'Documentary', rating: 'A', durationMins: 96,
        synopsis: 'A year following the last free-roaming cheetah pack across the Karoo’s changing landscape.',
        posterUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=500&auto=format&fit=crop',
        showtimeTemplate: [
          { cinema: 'CineCentre Rosebank', hours: [13, 16] },
        ],
        price: 75,
      },
    ];

    for (const m of movies) {
      await prisma.movie.create({
        data: {
          title: m.title, genre: m.genre, rating: m.rating, durationMins: m.durationMins,
          synopsis: m.synopsis, posterUrl: m.posterUrl,
          showtimes: {
            create: m.showtimeTemplate.flatMap(t =>
              [2, 3, 4].flatMap(dayOffset =>
                t.hours.map(h => ({
                  cinema: t.cinema,
                  startsAt: inDays(dayOffset, h),
                  price: m.price,
                  seatsTotal: 80,
                  seatsAvailable: 80,
                }))
              )
            ),
          },
        },
      });
    }
    console.log(`Seeded ${movies.length} movies with showtimes`);
  } else {
    console.log(`Movies already seeded (${existingMovies})`);
  }

  const existingConcerts = await prisma.concert.count();
  if (existingConcerts === 0) {
    await prisma.concert.createMany({
      data: [
        { artist: 'Naledi Music', title: 'Naledi Live: Under the Stars', genre: 'Afro-Soul', venue: 'The Wanderers Stadium', city: 'Johannesburg', startsAt: inDays(14, 19), posterUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop', price: 350, ticketsTotal: 8000, ticketsAvailable: 8000 },
        { artist: 'DJ Kaygee', title: 'Amapiano Sunset Sessions', genre: 'Amapiano', venue: 'Kirstenbosch Gardens', city: 'Cape Town', startsAt: inDays(9, 17), posterUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop', price: 280, ticketsTotal: 5000, ticketsAvailable: 5000 },
        { artist: 'The Township Sound', title: 'Homecoming Tour', genre: 'Jazz', venue: 'Durban ICC Arena', city: 'Durban', startsAt: inDays(21, 19.5), posterUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&auto=format&fit=crop', price: 220, ticketsTotal: 4000, ticketsAvailable: 4000 },
        { artist: 'Lindiwe & The Collective', title: 'Acoustic Sessions Vol. 3', genre: 'Neo-Soul', venue: 'The Barn, Constantia', city: 'Cape Town', startsAt: inDays(6, 19), posterUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&auto=format&fit=crop', price: 190, ticketsTotal: 800, ticketsAvailable: 800 },
        { artist: 'MC Zulu & Guests', title: 'Hip-Hop Heritage Night', genre: 'Hip-Hop', venue: 'Constitution Hill', city: 'Johannesburg', startsAt: inDays(11, 18.5), posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop', price: 260, ticketsTotal: 3000, ticketsAvailable: 3000 },
      ],
    });
    console.log('Seeded 5 concerts');
  } else {
    console.log(`Concerts already seeded (${existingConcerts})`);
  }

  const existingEvents = await prisma.eventListing.count();
  if (existingEvents === 0) {
    await prisma.eventListing.createMany({
      data: [
        { title: 'LaughTrack Comedy Showcase', category: 'Comedy', venue: 'Theatre on the Bay', city: 'Cape Town', startsAt: inDays(5, 20), posterUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=500&auto=format&fit=crop', description: 'A night of stand-up from the country’s sharpest rising comics, hosted by LaughTrack Comedy.', price: 150, ticketsTotal: 500, ticketsAvailable: 500 },
        { title: 'Sarafina! The Musical', category: 'Theatre', venue: 'Joburg Theatre', city: 'Johannesburg', startsAt: inDays(18, 19), posterUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=500&auto=format&fit=crop', description: 'The iconic anti-apartheid musical returns to the main stage for a limited run.', price: 320, ticketsTotal: 1200, ticketsAvailable: 1200 },
        { title: 'Township FC Derby Day', category: 'Sports', venue: 'FNB Stadium', city: 'Johannesburg', startsAt: inDays(8, 15), posterUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop', description: 'The biggest local derby of the season — Township FC host their fiercest rivals.', price: 180, ticketsTotal: 30000, ticketsAvailable: 30000 },
        { title: 'Cape Town Food & Wine Festival', category: 'Festival', venue: 'CTICC', city: 'Cape Town', startsAt: inDays(16, 11), posterUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&auto=format&fit=crop', description: 'Three days of tastings, chef demos and live cooking battles from across the Cape winelands.', price: 240, ticketsTotal: 6000, ticketsAvailable: 6000 },
        { title: 'UniLife Trivia Championship', category: 'Comedy', venue: 'Wits Great Hall', city: 'Johannesburg', startsAt: inDays(4, 18), posterUrl: 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=500&auto=format&fit=crop', description: 'Teams battle it out live for the UniLife Study Group trivia crown.', price: 60, ticketsTotal: 400, ticketsAvailable: 400 },
      ],
    });
    console.log('Seeded 5 live events');
  } else {
    console.log(`Live events already seeded (${existingEvents})`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
