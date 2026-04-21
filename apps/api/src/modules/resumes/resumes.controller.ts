import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UpdateResumeProfileDto } from "./dto/update-resume-profile.dto";
import { UploadResumeDto } from "./dto/upload-resume.dto";
import { ResumesService } from "./resumes.service";

@UseGuards(JwtAuthGuard)
@Controller("resumes")
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post("upload")
  upload(@CurrentUser() user: { sub: string }, @Body() body: UploadResumeDto) {
    return this.resumesService.upload(user.sub, body);
  }

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.resumesService.list(user.sub);
  }

  @Patch(":id/activate")
  activate(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.resumesService.activate(user.sub, id);
  }

  @Patch(":id/profile")
  updateProfile(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() body: UpdateResumeProfileDto
  ) {
    return this.resumesService.updateProfile(user.sub, id, body);
  }
}
