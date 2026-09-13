import './env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Without this, Nest never runs OnModuleDestroy (PrismaService.$disconnect())
  // on SIGTERM/SIGINT — every `nest start --watch` hot-reload during dev then
  // leaves its old process's Postgres connections open until the OS reaps
  // them, which is what exhausted max_connections repeatedly today.
  app.enableShutdownHooks();
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    // Required by browser requests routed through an ngrok free tunnel.
    // Without this, CORS preflight rejects the frontend's
    // `ngrok-skip-browser-warning` header before a login request reaches API.
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'ngrok-skip-browser-warning'],
  });
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
