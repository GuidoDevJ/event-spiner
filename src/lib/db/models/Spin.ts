import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISpin extends Document {
  eventId: mongoose.Types.ObjectId;
  sessionId: string;
  spinNumber: number;
  isWinner: boolean;
  itemWon?: mongoose.Types.ObjectId;
  redemptionId?: mongoose.Types.ObjectId;
  playerData?: Map<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

const SpinSchema = new Schema<ISpin>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    sessionId: { type: String, required: true },
    spinNumber: { type: Number, required: true },
    isWinner: { type: Boolean, default: false },
    itemWon: { type: Schema.Types.ObjectId, ref: "Item" },
    redemptionId: { type: Schema.Types.ObjectId, ref: "Redemption" },
    playerData: { type: Map, of: Schema.Types.Mixed },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SpinSchema.index({ eventId: 1, sessionId: 1 });
SpinSchema.index({ eventId: 1, createdAt: -1 });

export const Spin: Model<ISpin> =
  mongoose.models.Spin ?? mongoose.model<ISpin>("Spin", SpinSchema);
