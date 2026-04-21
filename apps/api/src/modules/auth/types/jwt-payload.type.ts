export interface JwtPayload {
  sub: string;
  email: string;
  tokenType?: "access" | "refresh";
  refreshTokenVersion?: number;
  refreshTokenId?: string;
}
