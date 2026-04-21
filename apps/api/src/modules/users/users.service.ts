import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  create(input: { email: string; passwordHash: string; name?: string }) {
    const user = new this.userModel({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name
    });

    return user.save();
  }

  updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.userModel
      .findByIdAndUpdate(userId, { refreshTokenHash }, { new: true })
      .exec();
  }

  updateRefreshSession(userId: string, refreshTokenHash: string, refreshTokenVersion: number) {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { refreshTokenHash, refreshTokenVersion },
        { new: true }
      )
      .exec();
  }

  revokeRefreshSession(userId: string) {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          refreshTokenHash: null,
          $inc: { refreshTokenVersion: 1 }
        },
        { new: true }
      )
      .exec();
  }
}
