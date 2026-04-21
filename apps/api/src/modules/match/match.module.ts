import { Module } from "@nestjs/common";
import { ResumesModule } from "../resumes/resumes.module";
import { MatchController } from "./match.controller";
import { MatchService } from "./match.service";

@Module({
  imports: [ResumesModule],
  providers: [MatchService],
  controllers: [MatchController]
})
export class MatchModule {}
