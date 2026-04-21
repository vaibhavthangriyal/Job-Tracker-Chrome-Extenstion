import { IsOptional, IsString, MinLength } from "class-validator";

export class ScoreJobDto {
  @IsOptional()
  @IsString()
  resumeId?: string;

  @IsString()
  @MinLength(1)
  jobTitle!: string;

  @IsOptional()
  @IsString()
  jobDescription?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  workplaceType?: string;
}
