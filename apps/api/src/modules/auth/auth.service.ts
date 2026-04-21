import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";
import { JwtPayload } from "./types/jwt-payload.type";

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async signup(input: SignupDto) {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.usersService.create({
      email: input.email,
      passwordHash,
      name: input.name
    });

    return this.issueTokens(user.id, user.email, user.refreshTokenVersion ?? 0);
  }

  async login(input: LoginDto) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user.id, user.email, user.refreshTokenVersion ?? 0);
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokenVersion = payload.refreshTokenVersion;
    if (typeof tokenVersion !== "number" || tokenVersion !== user.refreshTokenVersion) {
      await this.usersService.revokeRefreshSession(user.id);
      throw new UnauthorizedException("Refresh token reuse detected. Session revoked.");
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      await this.usersService.revokeRefreshSession(user.id);
      throw new UnauthorizedException("Refresh token reuse detected. Session revoked.");
    }

    return this.issueTokens(user.id, user.email, user.refreshTokenVersion + 1);
  }

  async logout(userId: string) {
    await this.usersService.revokeRefreshSession(userId);
    return { success: true };
  }

  private async issueTokens(
    userId: string,
    email: string,
    refreshTokenVersion: number
  ): Promise<AuthTokens> {
    const expiresIn = this.configService.get<string>("jwtExpiresIn") ?? "7d";
    const refreshExpiresIn = this.configService.get<string>("jwtRefreshExpiresIn") ?? "30d";

    const refreshTokenId = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, tokenType: "access" },
        { expiresIn: expiresIn as any }
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          tokenType: "refresh",
          refreshTokenVersion,
          refreshTokenId
        },
        {
          secret: this.configService.get<string>("jwtRefreshSecret") ?? "dev-refresh-secret",
          expiresIn: refreshExpiresIn as any
        }
      )
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshSession(userId, refreshTokenHash, refreshTokenVersion);

    return {
      accessToken,
      refreshToken
    };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>("jwtRefreshSecret") ?? "dev-refresh-secret"
      });

      if (payload.tokenType !== "refresh") {
        throw new UnauthorizedException("Invalid refresh token");
      }

      return payload;
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }
}
