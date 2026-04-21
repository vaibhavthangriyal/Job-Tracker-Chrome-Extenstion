import { APPLICATION_STATUSES } from "@job-tracker/shared-types";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class QueryApplicationsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(APPLICATION_STATUSES)
  status?: (typeof APPLICATION_STATUSES)[number];

  @IsOptional()
  @IsString()
  sourcePlatform?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(["applicationDate", "createdAt", "updatedAt", "companyName", "jobTitle", "status"])
  sortBy?: string;

  @IsOptional()
  @Transform(({ value }) => (value ?? "desc").toLowerCase())
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}
