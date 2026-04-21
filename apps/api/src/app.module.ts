import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { CsrfGuard } from "./common/guards/csrf.guard";
import configuration from "./config/configuration";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { MatchModule } from "./modules/match/match.module";
import { ResumesModule } from "./modules/resumes/resumes.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ApplicationsModule,
    ResumesModule,
    MatchModule
  ],
  providers: [{ provide: APP_GUARD, useClass: CsrfGuard }]
})
export class AppModule {}
