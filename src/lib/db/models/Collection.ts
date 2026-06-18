import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISchemaField {
  key: string;
  label: string;
  type: "text" | "number" | "url";
  showInCard: boolean;
  showInWin: boolean;
}

export interface ICollection extends Document {
  eventId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  imageURL?: string;
  order: number;
  isActive: boolean;
  itemSchema: { fields: ISchemaField[] };
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    imageURL: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    itemSchema: {
      fields: [
        {
          key: { type: String, required: true },
          label: { type: String, required: true },
          type: { type: String, enum: ["text", "number", "url"], default: "text" },
          showInCard: { type: Boolean, default: false },
          showInWin: { type: Boolean, default: false },
        },
      ],
    },
  },
  { timestamps: true }
);

CollectionSchema.index({ eventId: 1, order: 1 });

export const Collection: Model<ICollection> =
  mongoose.models.Collection ?? mongoose.model<ICollection>("Collection", CollectionSchema);
