import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { CSRF_COOKIE_NAME } from "../../modules/auth/auth.constants";
import { CsrfGuard } from "./csrf.guard";

function makeContext(request: {
  method: string;
  url: string;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string | undefined>;
}) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: request.method,
        url: request.url,
        headers: request.headers ?? {},
        cookies: request.cookies ?? {}
      })
    })
  } as ExecutionContext;
}

describe("CsrfGuard", () => {
  const guard = new CsrfGuard();

  it("allows safe methods", () => {
    const context = makeContext({ method: "GET", url: "/applications" });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("allows bearer token requests", () => {
    const context = makeContext({
      method: "POST",
      url: "/applications",
      headers: { authorization: "Bearer token" }
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects cookie-based mutating requests without matching csrf", () => {
    const context = makeContext({
      method: "POST",
      url: "/applications",
      cookies: { [CSRF_COOKIE_NAME]: "cookie-token" },
      headers: { "x-csrf-token": "header-token" }
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
