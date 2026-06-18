import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRedemption extends Document {
  eventId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  spinId: mongoose.Types.ObjectId;
  code: string;
  qrDataURL: string;
  itemId: mongoose.Types.ObjectId;
  itemSnapshot: {
    name: string;
    imageURL: string;
    metadata: Map<string, unknown>;
  };
  status: "pending" | "redeemed" | "expired";
  redeemedAt?: Date;
  redeemedBy?: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const RedemptionSchema = new Schema<IRedemption>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    spinId: { type: Schema.Types.ObjectId, ref: "Spin", required: true },
    code: { type: String, required: true, unique: true },
    qrDataURL: { type: String, required: true },
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    itemSnapshot: {
      name: { type: String, required: true },
      imageURL: { type: String, required: true },
      metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
    },
    status: { type: String, enum: ["pending", "redeemed", "expired"], default: "pending" },
    redeemedAt: { type: Date },
    redeemedBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RedemptionSchema.index({ code: 1 }, { unique: true });
RedemptionSchema.index({ eventId: 1, status: 1 });
RedemptionSchema.index({ eventId: 1, createdAt: -1 });

export const Redemption: Model<IRedemption> =
  mongoose.models.Redemption ?? mongoose.model<IRedemption>("Redemption", RedemptionSchema);
