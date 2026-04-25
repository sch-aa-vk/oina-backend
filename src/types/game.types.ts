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
  titleLower?: string;
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
  isDeleted?: boolean;
  deletedAt?: string;
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

export interface CreateGamePayload {
  type: GameType;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  content: GameContent;
  coverImageContentType?: string;
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
  isDeleted?: boolean;
  deletedAt?: string;
  coverUploadUrl?: string;
}

export interface GameListResponse {
  games: GameResponse[];
  nextCursor?: string;
}

export type SortBy = 'newest' | 'popular';

export interface GameSummaryResponse {
  gameId: string;
  userId: string;
  authorName?: string;
  type: GameType;
  title: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  visibility: GameVisibility;
  publishedAt?: string;
  shareLink?: string;
  viewCount: number;
  playCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface PublicGameListResponse {
  games: GameSummaryResponse[];
  nextCursor?: string;
}

export type CompletionStatus = 'completed' | 'abandoned';

export interface GameResultRecord {
  gameResultId: string;
  userId: string;
  gameId: string;
  score: number;
  maxScore: number;
  duration: number;
  completionStatus: CompletionStatus;
  playedAt: string;
}

export interface RecordGameResultPayload {
  score: number;
  maxScore: number;
  duration: number;
  completionStatus: CompletionStatus;
}

export interface GameResultResponse {
  gameResultId: string;
  gameId: string;
  gameTitle?: string;
  isGameDeleted?: boolean;
  score: number;
  maxScore: number;
  duration: number;
  completionStatus: CompletionStatus;
  playedAt: string;
}

export interface GameHistoryResponse {
  results: GameResultResponse[];
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
