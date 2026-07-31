import './env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    // Required by browser requests routed through an ngrok free tunnel.
    // Without this, CORS preflight rejects the frontend's
    // `ngrok-skip-browser-warning` header before a login request reaches API.
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'ngrok-skip-browser-warning'],
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
