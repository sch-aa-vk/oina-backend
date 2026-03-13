export interface UserRecord {
  userId: string;
  email: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  isVerified: boolean;
  totalGames: number;
  gamesThisMonth: number;
  currentMonthStart: string;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  language?: string;
}

export interface PublicUserProfile {
  userId: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  totalGames: number;
  createdAt: string;
}
