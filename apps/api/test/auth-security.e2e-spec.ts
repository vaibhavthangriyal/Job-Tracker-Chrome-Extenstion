import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { AppModule } from "../src/app.module";

function getCookieValue(setCookie: string | string[] | undefined, name: string): string | null {
  if (!setCookie) {
    return null;
  }

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];

  const cookie = cookies.find((entry) => entry.startsWith(`${name}=`));
  if (!cookie) {
    return null;
  }

  return cookie.split(";")[0].split("=").slice(1).join("=");
}

describe("Auth Security (e2e)", () => {
  let app: NestFastifyApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET = "e2e-access-secret";
    process.env.JWT_REFRESH_SECRET = "e2e-refresh-secret";
    process.env.JWT_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "30d";
    process.env.COOKIE_SECURE = "false";
    process.env.WEB_ORIGIN = "http://localhost:3000";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.register(import("@fastify/cookie"));
    await app.register(import("@fastify/cors"), {
      origin: "http://localhost:3000",
      credentials: true
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
      })
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it("enforces csrf for cookie auth and revokes on refresh token replay", async () => {
    const agent = request.agent(app.getHttpServer());

    const email = `user.${Date.now()}@example.com`;
    const password = "secret123";

    await agent.post("/auth/signup").send({ email, password, name: "E2E" }).expect(201);

    const loginRes = await agent.post("/auth/login").send({ email, password }).expect(201);

    const csrfToken = getCookieValue(loginRes.headers["set-cookie"], "jt_csrf");
    const firstRefreshToken = getCookieValue(loginRes.headers["set-cookie"], "jt_refresh");

    expect(csrfToken).toBeTruthy();
    expect(firstRefreshToken).toBeTruthy();

    await agent
      .post("/applications")
      .send({
        companyName: "Acme",
        jobTitle: "Frontend Engineer",
        applicationDate: new Date().toISOString(),
        status: "Applied"
      })
      .expect(403);

    await agent
      .post("/applications")
      .set("x-csrf-token", csrfToken as string)
      .send({
        companyName: "Acme",
        jobTitle: "Frontend Engineer",
        applicationDate: new Date().toISOString(),
        status: "Applied"
      })
      .expect(201);

    const refreshRes = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("x-csrf-token", csrfToken as string)
      .set("Cookie", [
        `jt_refresh=${firstRefreshToken as string}`,
        `jt_csrf=${csrfToken as string}`
      ])
      .expect(201);

    const rotatedRefreshToken = getCookieValue(refreshRes.headers["set-cookie"], "jt_refresh");
    const rotatedCsrfToken = getCookieValue(refreshRes.headers["set-cookie"], "jt_csrf");

    expect(rotatedRefreshToken).toBeTruthy();
    expect(rotatedRefreshToken).not.toBe(firstRefreshToken);
    expect(rotatedCsrfToken).toBeTruthy();

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", [
        `jt_refresh=${firstRefreshToken as string}`,
        `jt_csrf=${rotatedCsrfToken as string}`
      ])
      .set("x-csrf-token", rotatedCsrfToken as string)
      .expect(401);

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", [
        `jt_refresh=${rotatedRefreshToken as string}`,
        `jt_csrf=${rotatedCsrfToken as string}`
      ])
      .set("x-csrf-token", rotatedCsrfToken as string)
      .expect(401);
  });
});
