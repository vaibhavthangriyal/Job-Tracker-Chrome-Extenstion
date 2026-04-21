import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
    updateRefreshSession: jest.fn(),
    revokeRefreshSession: jest.fn()
  } as unknown as UsersService;

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn()
  } as unknown as JwtService;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === "jwtExpiresIn") return "7d";
      if (key === "jwtRefreshExpiresIn") return "30d";
      if (key === "jwtRefreshSecret") return "refresh-secret";
      return "jwt-secret";
    })
  };

  const authService = new AuthService(usersService, jwtService, configService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns access and refresh tokens on login", async () => {
    const passwordHash = bcrypt.hashSync("secret12", 10);
    usersService.findByEmail = jest.fn().mockResolvedValue({
      id: "u1",
      email: "test@mail.com",
      passwordHash,
      refreshTokenVersion: 0
    });

    jwtService.signAsync = jest
      .fn()
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");

    const result = await authService.login({ email: "test@mail.com", password: "secret12" });

    expect(result).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
    expect(usersService.updateRefreshSession).toHaveBeenCalledWith("u1", expect.any(String), 0);
  });

  it("throws for invalid login password", async () => {
    const passwordHash = bcrypt.hashSync("not-the-password", 10);
    usersService.findByEmail = jest.fn().mockResolvedValue({
      id: "u1",
      email: "test@mail.com",
      passwordHash,
      refreshTokenVersion: 0
    });

    await expect(authService.login({ email: "test@mail.com", password: "wrong" })).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("revokes refresh session on token reuse", async () => {
    const storedRefreshTokenHash = bcrypt.hashSync("current-refresh-token", 10);
    jwtService.verifyAsync = jest.fn().mockResolvedValue({
      sub: "u1",
      email: "test@mail.com",
      tokenType: "refresh",
      refreshTokenVersion: 0
    });

    usersService.findById = jest.fn().mockResolvedValue({
      id: "u1",
      email: "test@mail.com",
      refreshTokenHash: storedRefreshTokenHash,
      refreshTokenVersion: 0
    });

    await expect(authService.refresh("reused-refresh-token")).rejects.toThrow(
      "Refresh token reuse detected. Session revoked."
    );
    expect(usersService.revokeRefreshSession).toHaveBeenCalledWith("u1");
  });
});
