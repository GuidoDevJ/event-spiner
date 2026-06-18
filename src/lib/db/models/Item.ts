import mongoose, { Schema, Document, Model } from "mongoose";

export interface IItem extends Document {
  collectionId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  imageURL: string;
  weight: number;
  isActive: boolean;
  metadata: Map<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    collectionId: { type: Schema.Types.ObjectId, ref: "Collection", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true, trim: true },
    imageURL: { type: String, required: true },
    weight: { type: Number, default: 50, min: 1, max: 100 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ItemSchema.index({ eventId: 1, isActive: 1 });
ItemSchema.index({ collectionId: 1 });

export const Item: Model<IItem> =
  mongoose.models.Item ?? mongoose.model<IItem>("Item", ItemSchema);
