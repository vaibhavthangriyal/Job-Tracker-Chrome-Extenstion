import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { QueryApplicationsDto } from "./dto/query-applications.dto";
import { UpdateApplicationDto } from "./dto/update-application.dto";

@UseGuards(JwtAuthGuard)
@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() body: CreateApplicationDto) {
    return this.applicationsService.create(user.sub, body);
  }

  @Get()
  findAll(@CurrentUser() user: { sub: string }, @Query() query: QueryApplicationsDto) {
    return this.applicationsService.findAll(user.sub, query);
  }

  @Get(":id")
  findOne(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.applicationsService.findOne(user.sub, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() body: UpdateApplicationDto
  ) {
    return this.applicationsService.update(user.sub, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.applicationsService.remove(user.sub, id);
  }
}
