export interface AuditItem {
  id: string;
  title: string;
  platform: 'facebook' | 'instagram' | 'youtube';
  format: string; // Reel, Video, Post, Carousel, etc.
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  author: string;
  state?: string;
  page?: string;
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
}

export const DEFAULT_PAGES: SocialPage[] = [];

export const PAGES_LIST = DEFAULT_PAGES.map(p => p.name);
