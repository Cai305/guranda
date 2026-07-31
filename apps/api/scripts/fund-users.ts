import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetUsernames = ['activatetest1', 'activatetest2'];
  
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: targetUsernames
      }
    },
    include: { wallet: true }
  });

  if (users.length === 0) {
    console.log('No users found with those usernames.');
    return;
  }

  for (const u of users) {
    if (u.wallet) {
      await prisma.wallet.update({
        where: { id: u.wallet.id },
        data: { balanceMasheleni: u.wallet.balanceMasheleni + 50000 }
      });
      console.log(`Funded ${u.username} with 50,000 MSH. New balance: ${u.wallet.balanceMasheleni + 50000}`);
    } else {
      await prisma.wallet.create({
        data: {
          userId: u.id,
          balanceMasheleni: 50000
        }
      });
      console.log(`Created wallet and funded ${u.username} with 50,000 MSH.`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
