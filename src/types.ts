export type SocialPlatform = 'facebook' | 'instagram' | 'youtube';

export type PlatformLinks = Partial<Record<SocialPlatform, string>>;

export type AuditSource = 'manual' | 'meta-api' | 'youtube-api';

export type SocialSyncPlatformStatus = {
  linked: boolean;
  ready: boolean;
  missing: string[];
};

export type SocialSyncAccountStatus = {
  id: string;
  name: string;
  author?: string;
  state?: string;
  pageLinks?: PlatformLinks;
  platforms: Record<SocialPlatform, SocialSyncPlatformStatus>;
};

export interface AuditItem {
  id: string;
  title: string;
  platform: SocialPlatform;
  format: string; // Reel, Video, Post, Carousel, etc.
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  author: string;
  state?: string;
  page?: string;
  proofUrl?: string;
  pageUrl?: string;
  pageLinks?: PlatformLinks;
  theme?: 'positive' | 'negative';
  archivedAt?: string;
  archiveReason?: string;
  archivedByEmail?: string;
  createdAt?: string;
  createdByEmail?: string;
  updatedAt?: string;
  updatedByEmail?: string;
  source?: AuditSource;
  sourceId?: string;
  sourceAccountId?: string;
  syncedAt?: string;
}

export interface DashboardData {
  auditItems: AuditItem[];
  socialPages?: SocialPage[];
  socialSync?: {
    accounts: SocialSyncAccountStatus[];
    warnings: string[];
  };
}

export const STATES_LIST = [
  "Uttar Pradesh",
  "Uttarakhand",
  "Goa",
  "Punjab",
  "West Bengal",
  "Kerala",
  "National"
];

export interface SocialPage {
  name: string;
  url: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
}

export const DEFAULT_PAGES: SocialPage[] = [];

export const PAGES_LIST = DEFAULT_PAGES.map(p => p.name);
