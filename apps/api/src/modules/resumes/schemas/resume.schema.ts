import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({ timestamps: true })
export class Resume {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true })
  rawText!: string;

  @Prop({ type: [String], default: [] })
  skills!: string[];

  @Prop({ default: 0 })
  totalYearsExperience!: number;

  @Prop({ type: [String], default: [] })
  preferredLocations!: string[];

  @Prop({ default: "any" })
  workModePreference!: "onsite" | "remote" | "hybrid" | "any";

  @Prop({ default: false })
  isActive!: boolean;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);
ResumeSchema.index({ userId: 1, createdAt: -1 });
