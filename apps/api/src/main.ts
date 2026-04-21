import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>("port") ?? 4000;
  const origin = configService.get<string>("webOrigin") ?? "http://localhost:3000";

  await app.register(import("@fastify/cookie"));

  await app.register(import("@fastify/cors"), {
    origin,
    credentials: true
  });

  await app.listen({ port, host: "0.0.0.0" });
}

void bootstrap();
