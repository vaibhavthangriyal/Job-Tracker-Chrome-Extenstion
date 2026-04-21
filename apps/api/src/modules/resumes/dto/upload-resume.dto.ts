import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UploadResumeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fileName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400000)
  resumeText?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  fileContentBase64?: string;
}
