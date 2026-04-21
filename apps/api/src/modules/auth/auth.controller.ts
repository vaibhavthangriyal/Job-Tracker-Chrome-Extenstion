import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME
} from "./auth.constants";
import { CurrentUser } from "./decorators/current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Post("signup")
  async signup(@Body() body: SignupDto, @Res({ passthrough: true }) res: FastifyReply) {
    const tokens = await this.authService.signup(body);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  @Post("login")
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: FastifyReply) {
    const tokens = await this.authService.login(body);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  @Post("refresh")
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const refreshToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token");
    }

    const tokens = await this.authService.refresh(refreshToken);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(
    @CurrentUser() user: { sub: string },
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    this.clearAuthCookies(res);
    return this.authService.logout(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: { sub: string }) {
    return this.authService.me(user.sub);
  }

  @Get("csrf")
  csrf(@Res({ passthrough: true }) res: FastifyReply) {
    const token = this.setCsrfCookie(res);
    return { csrfToken: token };
  }

  private setAuthCookies(res: FastifyReply, accessToken: string, refreshToken: string) {
    const secure = this.configService.get<boolean>("cookieSecure") ?? false;

    res.setCookie(ACCESS_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/"
    });

    res.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/auth/refresh"
    });

    this.setCsrfCookie(res);
  }

  private clearAuthCookies(res: FastifyReply) {
    res.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/auth/refresh" });
    res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
  }

  private setCsrfCookie(res: FastifyReply) {
    const secure = this.configService.get<boolean>("cookieSecure") ?? false;
    const csrfToken = randomBytes(32).toString("hex");

    res.setCookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/"
    });

    return csrfToken;
  }
}
