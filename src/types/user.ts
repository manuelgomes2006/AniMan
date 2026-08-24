import { AudioVariant } from './stream';

export type WatchlistCategory = 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';

export interface WatchlistItem {
  animeId: number;
  title: string;
  coverImage?: string;
  bannerImage?: string;
  averageScore?: number;
  format?: string;
  episodes?: number;
  category: WatchlistCategory;
  addedAt: string;
}

export interface WatchProgress {
  animeId: number;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  percentage: number;
  title: string;
  coverImage?: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  preferredAudio: AudioVariant;
  customTheme: string;
}
