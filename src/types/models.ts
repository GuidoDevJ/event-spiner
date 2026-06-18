export interface Organization {
  _id: string;
  name: string;
  slug: string;
  logoURL?: string;
  plan: "free" | "pro" | "enterprise";
}

export interface User {
  _id: string;
  email: string;
  role: "super_admin" | "org_admin" | "operator";
  status: "active" | "inactive" | "invited";
}

export interface EventTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  logoURL?: string;
  backgroundURL?: string;
  winAnimation: "confetti" | "fireworks" | "stars";
}

export interface PlayerDataField {
  key: string;
  label: string;
  type: "text" | "email" | "number";
  required: boolean;
}

export interface GameConfig {
  winnerInterval: number;
  spinDurationMs: number;
  codePrefix: string;
  codeExpiryMinutes: number;
  requirePlayerData: boolean;
  playerDataFields: PlayerDataField[];
  maxSpinsPerSession: number;
}

export interface EventCopy {
  language: "es" | "en" | "pt";
  winMessage: string;
  loseMessage: string;
  ctaPlay: string;
  ctaPlayAgain: string;
}

export interface EventStats {
  totalSpins: number;
  totalWinners: number;
  totalRedemptions: number;
}

export interface GameEvent {
  _id: string;
  organizationId: string;
  slug: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused" | "ended";
  theme: EventTheme;
  gameConfig: GameConfig;
  copy: EventCopy;
  startsAt: string;
  endsAt: string;
  timezone: string;
  stats: EventStats;
  createdAt: string;
}

export interface SchemaField {
  key: string;
  label: string;
  type: "text" | "number" | "url";
  showInCard: boolean;
  showInWin: boolean;
}

export interface Collection {
  _id: string;
  eventId: string;
  name: string;
  description?: string;
  imageURL?: string;
  order: number;
  isActive: boolean;
  itemSchema: { fields: SchemaField[] };
}

export interface Item {
  _id: string;
  collectionId: string;
  eventId: string;
  name: string;
  imageURL: string;
  weight: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface Redemption {
  _id: string;
  code: string;
  qrDataURL: string;
  itemSnapshot: {
    name: string;
    imageURL: string;
    metadata: Record<string, unknown>;
  };
  status: "pending" | "redeemed" | "expired";
  redeemedAt?: string;
  expiresAt: string;
  timeRemainingMs: number;
  createdAt: string;
}

export interface SpinResult {
  isWinner: boolean;
  spinNumber: number;
  spinsUntilWin: number;
  redemption?: {
    code: string;
    qrDataURL: string;
    item: {
      name: string;
      imageURL: string;
      metadata: Record<string, unknown>;
    };
  };
  copy: {
    winMessage: string;
    loseMessage: string;
  };
}
