// Seeds the two real global channels the chat list previously faked
// client-side ("Global Lounge" and "Marketplace") as actual Chat rows with
// isPublic: true, so ChatListScreen.tsx's GET /chats/public fetch has
// something real to show. Idempotent — skips names that already exist.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const channels = [
    { name: 'Global Lounge' },
    { name: 'Marketplace' },
  ];

  for (const channel of channels) {
    const existing = await prisma.chat.findFirst({
      where: { name: channel.name, isPublic: true },
    });
    if (existing) {
      console.log(`Skipping "${channel.name}" — already exists.`);
      continue;
    }
    await prisma.chat.create({
      data: {
        type: 'CHANNEL',
        name: channel.name,
        channelType: 'TEXT',
        isPublic: true,
      },
    });
    console.log(`Created public channel "${channel.name}".`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
