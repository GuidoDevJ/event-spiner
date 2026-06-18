import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlayerDataField {
  key: string;
  label: string;
  type: "text" | "email" | "number";
  required: boolean;
}

export interface IEvent extends Document {
  organizationId: mongoose.Types.ObjectId;
  slug: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused" | "ended";
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    logoURL?: string;
    backgroundURL?: string;
    winAnimation: "confetti" | "fireworks" | "stars";
  };
  gameConfig: {
    winnerInterval: number;
    spinDurationMs: number;
    codePrefix: string;
    codeExpiryMinutes: number;
    requirePlayerData: boolean;
    playerDataFields: IPlayerDataField[];
    maxSpinsPerSession: number;
  };
  copy: {
    language: "es" | "en" | "pt";
    winMessage: string;
    loseMessage: string;
    ctaPlay: string;
    ctaPlayAgain: string;
  };
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  stats: {
    totalSpins: number;
    totalWinners: number;
    totalRedemptions: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ["draft", "active", "paused", "ended"], default: "draft" },
    theme: {
      primaryColor: { type: String, default: "#C0392B" },
      secondaryColor: { type: String, default: "#D4AC0D" },
      backgroundColor: { type: String, default: "#1a1a2e" },
      logoURL: { type: String },
      backgroundURL: { type: String },
      winAnimation: { type: String, enum: ["confetti", "fireworks", "stars"], default: "confetti" },
    },
    gameConfig: {
      winnerInterval: { type: Number, default: 5, min: 1 },
      spinDurationMs: { type: Number, default: 2000 },
      codePrefix: { type: String, default: "WIN", uppercase: true, trim: true },
      codeExpiryMinutes: { type: Number, default: 30 },
      requirePlayerData: { type: Boolean, default: false },
      playerDataFields: [
        {
          key: String,
          label: String,
          type: { type: String, enum: ["text", "email", "number"] },
          required: Boolean,
        },
      ],
      maxSpinsPerSession: { type: Number, default: 0 },
    },
    copy: {
      language: { type: String, enum: ["es", "en", "pt"], default: "es" },
      winMessage: { type: String, default: "¡Te ganaste [ITEM]!" },
      loseMessage: { type: String, default: "¡Seguí intentando!" },
      ctaPlay: { type: String, default: "GIRAR" },
      ctaPlayAgain: { type: String, default: "JUGAR DE NUEVO" },
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    timezone: { type: String, default: "America/Argentina/Buenos_Aires" },
    stats: {
      totalSpins: { type: Number, default: 0 },
      totalWinners: { type: Number, default: 0 },
      totalRedemptions: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

EventSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
EventSchema.index({ status: 1 });

export const Event: Model<IEvent> =
  mongoose.models.Event ?? mongoose.model<IEvent>("Event", EventSchema);
