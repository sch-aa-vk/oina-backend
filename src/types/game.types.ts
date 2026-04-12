export type GameVisibility = 'draft' | 'private-link' | 'public';
export type GameType = 'choose-me' | 'guess-by-emoji' | 'crossword';
export type RewardType = 'text' | 'image' | 'video' | 'audio';

export interface ScoringConfig {
  enabled: boolean;
  maxScore?: number;
}

export interface Reward {
  id: string;
  pointsThreshold: number;
  label: string;
  type: RewardType;
  text?: string;
  // assetKey is backend-managed (Phase 3.2); clients must NOT send this field
  assetKey?: string;
}

export interface GameContent {
  scoring?: ScoringConfig;
  rewards?: Reward[];
  [key: string]: unknown;
}

export interface GameRecord {
  gameId: string;
  userId: string;
  type: GameType;
  title: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  visibility: GameVisibility;
  content: Record<string, unknown>;
  publishedAt?: string;
  shareLink?: string;
  viewCount: number;
  playCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  currentVersion: number;
}

export interface GameVersionRecord {
  versionId: string;
  gameId: string;
  userId: string;
  versionNumber: number;
  changeLog: string;
  visibility: GameVisibility;
  createdAt: string;
}

// DTOs

export interface CreateGamePayload {
  type: GameType;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  content: GameContent;
}

export interface UpdateGamePayload {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  content?: GameContent;
  changeLog?: string;
}

export interface PublishGamePayload {
  visibility: 'private-link' | 'public';
  changeLog?: string;
}

export interface GameResponse {
  gameId: string;
  userId: string;
  type: GameType;
  title: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  visibility: GameVisibility;
  content: Record<string, unknown>;
  publishedAt?: string;
  shareLink?: string;
  viewCount: number;
  playCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  currentVersion: number;
}

export interface GameListResponse {
  games: GameResponse[];
  nextCursor?: string;
}

export interface VersionResponse {
  versionId: string;
  gameId: string;
  versionNumber: number;
  changeLog: string;
  visibility: GameVisibility;
  createdAt: string;
}
