import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  logoURL?: string;
  plan: "free" | "pro" | "enterprise";
  maxEvents: number;
  maxItemsPerEvent: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoURL: { type: String },
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
    maxEvents: { type: Number, default: 1 },
    maxItemsPerEvent: { type: Number, default: 50 },
    features: [{ type: String }],
  },
  { timestamps: true }
);

export const Organization: Model<IOrganization> =
  mongoose.models.Organization ?? mongoose.model<IOrganization>("Organization", OrganizationSchema);
