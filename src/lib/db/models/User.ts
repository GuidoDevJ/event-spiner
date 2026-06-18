import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  organizationId: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  role: "super_admin" | "org_admin" | "operator";
  status: "active" | "inactive" | "invited";
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["super_admin", "org_admin", "operator"], default: "operator" },
    status: { type: String, enum: ["active", "inactive", "invited"], default: "inactive" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ organizationId: 1, role: 1 });

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
