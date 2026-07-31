import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Guranda seed...');

  // 1. Create or Find User Guranda
  let user = await prisma.user.findUnique({
    where: { username: 'Guranda' }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        username: 'Guranda',
        phoneNumber: '+27600000000',
        passwordHash: 'placeholder_hash_for_password123',
        role: 'MEMBER',
      }
    });
    console.log('Created user Guranda');
  } else {
    console.log('User Guranda already exists');
  }

  // Set active username if needed (requires a Username record)
  let usernameObj = await prisma.username.findUnique({ where: { label: 'Guranda' } });
  if (!usernameObj) {
    usernameObj = await prisma.username.create({
      data: {
        label: 'Guranda',
        ownerId: user.id,
        acquiredVia: 'ADMIN_SEED'
      }
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { activeUsernameId: usernameObj.id }
    });
    console.log('Created Username record for Guranda');
  }

  // 2. Shopping Store & Products
  await prisma.shoppingStore.create({
    data: {
      ownerId: user.id,
      name: 'Guranda Electronics',
      description: 'The best gadgets in town.',
      category: 'Electronics',
      rating: 4.8,
      products: {
        create: [
          { name: 'Smartphone Pro Max', description: 'Latest model', price: 15000, category: 'Phones', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500' },
          { name: 'Wireless Headphones', description: 'Noise cancelling', price: 2500, category: 'Audio', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' }
        ]
      }
    }
  });
  console.log('Created ShoppingStore and Products');

  // 3. Eat Store & Products
  await prisma.eatStore.create({
    data: {
      ownerId: user.id,
      name: 'Guranda Eats',
      description: 'Delicious fast food and more.',
      address: '123 Food Street, Cape Town',
      category: 'Fast Food',
      rating: 4.5,
      products: {
        create: [
          { name: 'Classic Burger', description: 'Beef patty with cheese', price: 85, category: 'Burgers', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500' },
          { name: 'Margherita Pizza', description: 'Wood fired', price: 120, category: 'Pizza', imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500' }
        ]
      }
    }
  });
  console.log('Created EatStore and Products');

  // 4. Health Practitioner
  await prisma.healthPractitioner.create({
    data: {
      ownerId: user.id,
      name: 'Dr. Guranda',
      specialty: 'General Practitioner',
      bio: 'Experienced GP ready to help.',
      consultationFee: 450,
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500'
    }
  });
  console.log('Created HealthPractitioner');

  // 5. Health Pharmacy
  await prisma.healthPharmacy.create({
    data: {
      ownerId: user.id,
      name: 'Guranda Pharmacy',
      description: 'Your neighborhood pharmacy.',
      address: '45 Health Ave, Johannesburg',
      rating: 4.7,
      products: {
        create: [
          { name: 'Vitamin C 1000mg', description: 'Immune booster', price: 150, category: 'Vitamins', requiresPrescription: false, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500' },
          { name: 'Paracetamol 500mg', description: 'Pain relief', price: 45, category: 'Medicine', requiresPrescription: false, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500' }
        ]
      }
    }
  });
  console.log('Created HealthPharmacy and Products');

  // 6. Property Listing
  await prisma.property.create({
    data: {
      agentId: user.id,
      title: 'Luxury 2 Bed Apartment in Sandton',
      kind: 'APARTMENT',
      listingType: 'RENT',
      price: 15000,
      address: 'Sandton CBD',
      description: 'Modern finishes, secure building.',
      bedrooms: 2,
      bathrooms: 2,
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500']
    }
  });
  console.log('Created Property listing');

  // 7. Car Listing
  await prisma.carListing.create({
    data: {
      sellerId: user.id,
      title: '2022 Toyota Corolla Cross',
      make: 'Toyota',
      model: 'Corolla Cross',
      year: 2022,
      price: 350000,
      mileage: 15000,
      transmission: 'AUTOMATIC',
      fuelType: 'PETROL',
      bodyType: 'SUV',
      condition: 'USED',
      location: 'Pretoria',
      description: 'Like new, full service history.',
      images: ['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=500']
    }
  });
  console.log('Created CarListing');

  // 8. Work Company & Jobs
  await prisma.workCompany.create({
    data: {
      ownerId: user.id,
      name: 'Guranda Tech',
      description: 'Innovating the future.',
      industry: 'Technology',
      jobs: {
        create: [
          {
            postedById: user.id,
            title: 'Senior React Developer',
            description: 'Looking for an experienced React dev.',
            employmentType: 'Full-time',
            locationType: 'Remote',
            salaryMin: 50000,
            salaryMax: 80000
          }
        ]
      }
    }
  });
  console.log('Created WorkCompany and Jobs');

  // 9. Travel Stay
  await prisma.travelStay.create({
    data: {
      hostId: user.id,
      title: 'Cosy Cabin in the Woods',
      description: 'Perfect weekend getaway.',
      location: 'Dullstroom',
      pricePerNight: 1200,
      maxGuests: 4,
      amenities: ['Fireplace', 'WiFi', 'Kitchen'],
      imageUrl: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=500'
    }
  });
  console.log('Created TravelStay');

  // 10. Travel Car
  await prisma.travelCar.create({
    data: {
      hostId: user.id,
      make: 'Ford',
      model: 'Ranger',
      category: 'SUV',
      location: 'Cape Town Airport',
      pricePerDay: 850,
      imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=500'
    }
  });
  console.log('Created TravelCar');

  // 11. Marketplace Listing
  await prisma.marketplaceListing.create({
    data: {
      sellerId: user.id,
      title: 'PS5 Console',
      description: 'Barely used, with 2 controllers.',
      category: 'Gaming',
      condition: 'LIKE_NEW',
      listingType: 'FIXED',
      price: 8500,
      images: ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500']
    }
  });
  console.log('Created MarketplaceListing');

  // 12. Event Listing
  await prisma.eventListing.create({
    data: {
      organizerId: user.id,
      title: 'Guranda Comedy Night',
      category: 'Comedy',
      venue: 'The Laugh Club',
      city: 'Johannesburg',
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      price: 150,
      description: 'A night of laughs with local comedians.',
      posterUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=500'
    }
  });
  console.log('Created EventListing');

  console.log('Guranda seed complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
