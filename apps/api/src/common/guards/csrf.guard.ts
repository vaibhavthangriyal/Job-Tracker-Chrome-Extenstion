import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../../modules/auth/auth.constants";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = new Set(["/auth/login", "/auth/signup", "/auth/csrf"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = request.method.toUpperCase();
    const pathname = request.url.split("?")[0];

    if (SAFE_METHODS.has(method) || CSRF_EXEMPT_PATHS.has(pathname)) {
      return true;
    }

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return true;
    }

    const csrfCookie = request.cookies?.[CSRF_COOKIE_NAME];
    const csrfHeaderValue = request.headers[CSRF_HEADER_NAME] ?? request.headers[CSRF_HEADER_NAME.toLowerCase()];
    const csrfHeader = Array.isArray(csrfHeaderValue) ? csrfHeaderValue[0] : csrfHeaderValue;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    return true;
  }
}
