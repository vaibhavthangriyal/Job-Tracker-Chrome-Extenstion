import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { QueryApplicationsDto } from "./dto/query-applications.dto";
import { UpdateApplicationDto } from "./dto/update-application.dto";
import { Application, ApplicationDocument } from "./schemas/application.schema";

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>
  ) {}

  async create(userId: string, payload: CreateApplicationDto) {
    const duplicate = await this.applicationModel
      .findOne({
        userId: new Types.ObjectId(userId),
        companyName: payload.companyName,
        jobTitle: payload.jobTitle,
        ...(payload.jobUrl ? { jobUrl: payload.jobUrl } : {})
      })
      .exec();

    if (duplicate) {
      throw new ConflictException({
        message: "Potential duplicate application found",
        duplicateId: duplicate.id
      });
    }

    const created = new this.applicationModel({
      ...payload,
      applicationDate: new Date(payload.applicationDate),
      followUpDate: payload.followUpDate ? new Date(payload.followUpDate) : undefined,
      userId: new Types.ObjectId(userId)
    });

    return created.save();
  }

  async findAll(userId: string, query: QueryApplicationsDto) {
    const where: FilterQuery<ApplicationDocument> = {
      userId: new Types.ObjectId(userId)
    };

    if (query.status) where.status = query.status;
    if (query.sourcePlatform) where.sourcePlatform = query.sourcePlatform;
    if (query.companyName) where.companyName = { $regex: query.companyName, $options: "i" };
    if (query.search) {
      where.$or = [
        { companyName: { $regex: query.search, $options: "i" } },
        { jobTitle: { $regex: query.search, $options: "i" } },
        { notes: { $regex: query.search, $options: "i" } }
      ];
    }

    const sortBy = query.sortBy ?? "applicationDate";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;
    const skip = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.applicationModel.find(where).sort({ [sortBy]: sortOrder }).skip(skip).limit(query.limit).exec(),
      this.applicationModel.countDocuments(where).exec()
    ]);

    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    };
  }

  async findOne(userId: string, id: string) {
    const application = await this.applicationModel
      .findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    return application;
  }

  async update(userId: string, id: string, payload: UpdateApplicationDto) {
    const updated = await this.applicationModel
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        {
          ...payload,
          ...(payload.applicationDate ? { applicationDate: new Date(payload.applicationDate) } : {}),
          ...(payload.followUpDate ? { followUpDate: new Date(payload.followUpDate) } : {})
        },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("Application not found");
    }

    return updated;
  }

  async remove(userId: string, id: string) {
    const deleted = await this.applicationModel
      .findOneAndDelete({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();

    if (!deleted) {
      throw new NotFoundException("Application not found");
    }

    return { success: true };
  }
}
