const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apps = [
    { name: 'Chess', type: 'Game', iconUrl: 'extension-puzzle', color: '#8B4513', isNative: true, nativeRoute: 'Category', routeParams: '{"categoryName": "Games"}' },
    { name: 'Ludo', type: 'Game', iconUrl: 'dice', color: '#E53935', isNative: true, nativeRoute: 'Category', routeParams: '{"categoryName": "Games"}' },
    { name: 'Words Game', type: 'Game', iconUrl: 'text', color: '#4CAF50', isNative: true, nativeRoute: 'Category', routeParams: '{"categoryName": "Games"}' },
    { name: 'MoonBase Arcade', type: 'Game', iconUrl: 'game-controller', color: '#FF006E', isNative: true, nativeRoute: 'Arcade' },
    { name: 'Ride Hailing', type: 'Plugin', iconUrl: 'car', color: '#3A86FF', isNative: true, nativeRoute: 'Ride' },
    { name: 'Food Delivery', type: 'Plugin', iconUrl: 'pizza', color: '#FB5607', isNative: true, nativeRoute: 'Food' },
    { name: '2048 (Web)', type: 'Game', iconUrl: 'grid', color: '#FFB300', isNative: false, sourceUrl: 'https://play2048.co/' }
  ];

  for (const app of apps) {
    await prisma.storeApp.create({ data: app });
  }
  console.log('Seeded store apps');
}

main().catch(console.error).finally(() => prisma.$disconnect());
