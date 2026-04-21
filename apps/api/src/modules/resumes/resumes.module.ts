import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Resume, ResumeSchema } from "./schemas/resume.schema";
import { ResumesController } from "./resumes.controller";
import { ResumesService } from "./resumes.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: Resume.name, schema: ResumeSchema }])],
  providers: [ResumesService],
  controllers: [ResumesController],
  exports: [ResumesService]
})
export class ResumesModule {}
