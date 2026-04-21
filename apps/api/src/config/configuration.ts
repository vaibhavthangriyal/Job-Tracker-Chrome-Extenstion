export default () => ({
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/job-tracker",
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000"
});
