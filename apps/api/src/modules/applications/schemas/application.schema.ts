import { APPLICATION_STATUSES } from "@job-tracker/shared-types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ApplicationDocument = HydratedDocument<Application>;

@Schema({ timestamps: true })
export class Application {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  companyName!: string;

  @Prop({ required: true, trim: true })
  jobTitle!: string;

  @Prop()
  location?: string;

  @Prop()
  employmentType?: string;

  @Prop()
  workplaceType?: string;

  @Prop()
  salary?: string;

  @Prop()
  sourcePlatform?: string;

  @Prop()
  jobUrl?: string;

  @Prop()
  companyWebsite?: string;

  @Prop()
  jobDescription?: string;

  @Prop()
  recruiterName?: string;

  @Prop()
  recruiterEmail?: string;

  @Prop()
  recruiterLinkedIn?: string;

  @Prop({ required: true })
  applicationDate!: Date;

  @Prop({ required: true, enum: APPLICATION_STATUSES, default: "Applied" })
  status!: string;

  @Prop()
  notes?: string;

  @Prop()
  followUpDate?: Date;

  @Prop({ default: false })
  referral?: boolean;

  @Prop()
  resumeVersion?: string;

  @Prop({ default: false })
  coverLetterUsed?: boolean;

  @Prop({ type: [String], default: [] })
  tags?: string[];
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
ApplicationSchema.index({ userId: 1, applicationDate: -1 });
ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ companyName: "text", jobTitle: "text", notes: "text" });
