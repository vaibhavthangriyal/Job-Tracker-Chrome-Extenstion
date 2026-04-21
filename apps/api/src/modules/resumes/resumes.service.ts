import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import pdfParse from "pdf-parse";
import { parseResumeText } from "./resume-parser";
import { UpdateResumeProfileDto } from "./dto/update-resume-profile.dto";
import { UploadResumeDto } from "./dto/upload-resume.dto";
import { Resume, ResumeDocument } from "./schemas/resume.schema";

@Injectable()
export class ResumesService {
  constructor(@InjectModel(Resume.name) private readonly resumeModel: Model<ResumeDocument>) {}

  async upload(userId: string, payload: UploadResumeDto) {
    const rawText = await this.extractRawResumeText(payload);
    const parsed = parseResumeText(rawText);
    const existingCount = await this.resumeModel.countDocuments({ userId: new Types.ObjectId(userId) }).exec();

    if (existingCount === 0) {
      await this.resumeModel
        .updateMany({ userId: new Types.ObjectId(userId), isActive: true }, { isActive: false })
        .exec();
    }

    const resume = new this.resumeModel({
      userId: new Types.ObjectId(userId),
      fileName: payload.fileName,
      rawText,
      skills: parsed.skills,
      totalYearsExperience: parsed.totalYearsExperience,
      preferredLocations: parsed.preferredLocations,
      workModePreference: parsed.workModePreference,
      isActive: existingCount === 0
    });

    return resume.save();
  }

  list(userId: string) {
    return this.resumeModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ isActive: -1, createdAt: -1 })
      .exec();
  }

  async activate(userId: string, resumeId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: userObjectId })
      .exec();

    if (!resume) {
      throw new NotFoundException("Resume not found");
    }

    await this.resumeModel.updateMany({ userId: userObjectId, isActive: true }, { isActive: false }).exec();
    await this.resumeModel.findByIdAndUpdate(resumeId, { isActive: true }).exec();

    return { success: true };
  }

  async updateProfile(userId: string, resumeId: string, payload: UpdateResumeProfileDto) {
    const normalized = {
      ...(payload.totalYearsExperience !== undefined
        ? { totalYearsExperience: payload.totalYearsExperience }
        : {}),
      ...(payload.skills
        ? {
            skills: [...new Set(payload.skills.map((skill) => skill.trim()).filter(Boolean))]
          }
        : {}),
      ...(payload.preferredLocations
        ? {
            preferredLocations: [
              ...new Set(payload.preferredLocations.map((location) => location.trim()).filter(Boolean))
            ]
          }
        : {}),
      ...(payload.workModePreference ? { workModePreference: payload.workModePreference } : {})
    };

    const updated = await this.resumeModel
      .findOneAndUpdate(
        { _id: resumeId, userId: new Types.ObjectId(userId) },
        normalized,
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("Resume not found");
    }

    return updated;
  }

  async getOne(userId: string, resumeId?: string) {
    const where = resumeId
      ? { _id: resumeId, userId: new Types.ObjectId(userId) }
      : { userId: new Types.ObjectId(userId), isActive: true };

    const resume = await this.resumeModel.findOne(where).exec();
    if (!resume) {
      throw new NotFoundException("Resume not found");
    }

    return resume;
  }

  private async extractRawResumeText(payload: UploadResumeDto) {
    if (payload.fileContentBase64) {
      const buffer = Buffer.from(payload.fileContentBase64, "base64");
      const isPdf =
        payload.mimeType === "application/pdf" || payload.fileName.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const parsedPdf = await pdfParse(buffer);
        const text = (parsedPdf.text || "").trim();
        if (text.length < 30) {
          throw new BadRequestException("Unable to parse readable text from the PDF resume.");
        }

        return text;
      }

      const plainText = buffer.toString("utf8").trim();
      if (plainText.length >= 30) {
        return plainText;
      }
    }

    const rawText = (payload.resumeText || "").trim();
    if (rawText.length < 30) {
      throw new BadRequestException(
        "Resume content is too short. Upload a readable text/PDF resume with more details."
      );
    }

    return rawText;
  }
}
