export interface AniListTitle {
  romaji?: string;
  english?: string;
  native?: string;
}

export interface CoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface StreamingEpisode {
  title?: string;
  thumbnail?: string;
  url?: string;
  site?: string;
}

export interface CharacterNode {
  id: number;
  name: {
    full: string;
  };
  image?: {
    medium?: string;
  };
}

export interface CharacterEdge {
  role: string;
  node: CharacterNode;
}

export interface StudioNode {
  id: number;
  name: string;
}

export interface RecommendationNode {
  mediaRecommendation?: AnimeMedia;
}

export interface AnimeMedia {
  id: number;
  idMal?: number;
  isAdult?: boolean;
  rating?: string;
  tags?: { id?: number; name: string; isAdult?: boolean }[];
  synonyms?: string[];
  title: AniListTitle;
  coverImage?: CoverImage;
  bannerImage?: string;
  description?: string;
  format?: string;
  episodes?: number;
  duration?: number;
  status?: string;
  seasonYear?: number;
  season?: string;
  genres?: string[];
  averageScore?: number;
  malScore?: number;
  aniListScore?: number;
  popularity?: number;
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
  latestEpisodeNumber?: number;
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  streamingEpisodes?: StreamingEpisode[];
  studios?: {
    nodes?: StudioNode[];
  };
  characters?: {
    edges?: CharacterEdge[];
  };
  recommendations?: {
    nodes?: RecommendationNode[];
  };
}

export interface AniListPageResponse {
  pageInfo: {
    total: number;
    currentPage: number;
    hasNextPage: boolean;
  };
  media: AnimeMedia[];
  didYouMean?: string;
  correctedQuery?: string;
  originalQuery?: string;
}
