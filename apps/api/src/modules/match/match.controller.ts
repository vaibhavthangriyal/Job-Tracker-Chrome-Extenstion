import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ScoreJobDto } from "./dto/score-job.dto";
import { MatchService } from "./match.service";

@UseGuards(JwtAuthGuard)
@Controller("match")
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post("score")
  score(@CurrentUser() user: { sub: string }, @Body() body: ScoreJobDto) {
    return this.matchService.scoreJob(user.sub, body);
  }
}
