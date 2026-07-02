export type SocialPlatform = 'facebook' | 'instagram' | 'youtube';

export type PlatformLinks = Partial<Record<SocialPlatform, string>>;

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
}

export interface DashboardData {
  auditItems: AuditItem[];
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
