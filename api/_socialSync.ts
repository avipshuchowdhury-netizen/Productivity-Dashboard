import type {
  AuditItem,
  PlatformLinks,
  SocialPage,
  SocialPlatform,
  SocialSyncAccountStatus,
  SocialSyncPlatformStatus
} from '../src/types';

type MetaPageConfig = {
  pageId?: string;
  accessToken?: string;
  accessTokenEnv?: string;
  pageAccessToken?: string;
  pageAccessTokenEnv?: string;
  limit?: number;
  sinceDays?: number;
};

type InstagramConfig = {
  igUserId?: string;
  accessToken?: string;
  accessTokenEnv?: string;
  limit?: number;
  sinceDays?: number;
};

type YouTubeConfig = {
  channelId?: string;
  handle?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  accessToken?: string;
  accessTokenEnv?: string;
  refreshToken?: string;
  refreshTokenEnv?: string;
  clientId?: string;
  clientIdEnv?: string;
  clientSecret?: string;
  clientSecretEnv?: string;
  limit?: number;
  sinceDays?: number;
};

export type SocialSyncAccount = {
  id?: string;
  name: string;
  author?: string;
  state?: string;
  theme?: AuditItem['theme'];
  pageUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  facebook?: MetaPageConfig;
  instagram?: InstagramConfig;
  youtube?: YouTubeConfig;
};

export type SocialSyncResult = {
  success: boolean;
  fetchedAt: string;
  items: AuditItem[];
  warnings: string[];
  configuredAccounts: number;
  requestedLookbackDays: number;
  requestedDateRange: {
    startDate: string;
    endDate: string;
  };
};

export type SocialSyncOptions = {
  startDate?: string;
  endDate?: string;
};

type ResolvedSyncDateRange = {
  startDate: string;
  endDate: string;
  start: Date;
  end: Date;
  lookbackDays: number;
};

type JsonRecord = Record<string, any>;

const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_MAX_ITEMS_PER_ACCOUNT = 25;
const SOCIAL_SYNC_USER = 'social-sync@varaheanalytics.com';

const clampPositiveInteger = (value: unknown, fallback: number, max: number) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return fallback;
  return Math.min(Math.floor(numericValue), max);
};

const normalizePlatformVersion = (version: string) => version.startsWith('v') ? version : `v${version}`;

const cleanHttpUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const truncateText = (value: unknown, fallback: string, maxLength: number) => {
  const text = typeof value === 'string' ? value : String(value || fallback);
  const normalized = text.replace(/\s+/g, ' ').trim();
  return (normalized || fallback).slice(0, maxLength);
};

const numericValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce((sum, entry) => sum + numericValue(entry), 0);
  }
  return 0;
};

const getEnvValue = (...names: Array<string | undefined>) => {
  for (const name of names) {
    if (!name) continue;
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
};

const resolveSecret = (directValue?: string, envName?: string, fallbackEnvName?: string) => {
  if (directValue) return directValue;
  return getEnvValue(envName, fallbackEnvName);
};

const normalizeKey = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || 'account';

const buildSyncId = (platform: SocialPlatform, accountId: string, sourceId: string) => {
  const normalizedSource = sourceId.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 120);
  return `sync-${platform}-${normalizeKey(accountId)}-${normalizedSource}`;
};

const platformLinksForAccount = (account: SocialSyncAccount): PlatformLinks | undefined => {
  const links: PlatformLinks = {};
  const facebookUrl = cleanHttpUrl(account.facebookUrl);
  const instagramUrl = cleanHttpUrl(account.instagramUrl);
  const youtubeUrl = cleanHttpUrl(account.youtubeUrl);
  if (facebookUrl) links.facebook = facebookUrl;
  if (instagramUrl) links.instagram = instagramUrl;
  if (youtubeUrl) links.youtube = youtubeUrl;
  return Object.keys(links).length > 0 ? links : undefined;
};

const pageUrlForPlatform = (
  account: SocialSyncAccount,
  platform: SocialPlatform,
  fallback?: string
) => {
  const links = platformLinksForAccount(account);
  return cleanHttpUrl(links?.[platform] || account.pageUrl || fallback);
};

const dateOnly = (value?: string) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

const cutoffDate = (days: number, now = new Date()) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const parseDateInput = (value?: string, endOfDay = false) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetweenInclusive = (start: Date, end: Date) => (
  Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1)
);

const resolveSyncDateRange = (options: SocialSyncOptions = {}): ResolvedSyncDateRange => {
  const configuredLookbackDays = clampPositiveInteger(
    process.env.SOCIAL_SYNC_LOOKBACK_DAYS,
    DEFAULT_LOOKBACK_DAYS,
    365
  );
  const todayEnd = parseDateInput(toIsoDate(new Date()), true) || new Date();

  if (!options.startDate && !options.endDate) {
    const start = cutoffDate(configuredLookbackDays, todayEnd);
    const startDate = toIsoDate(start);
    const endDate = toIsoDate(todayEnd);
    return {
      start: parseDateInput(startDate) || start,
      end: todayEnd,
      startDate,
      endDate,
      lookbackDays: configuredLookbackDays
    };
  }

  const start = parseDateInput(options.startDate);
  const end = parseDateInput(options.endDate, true);
  if (!start || !end) {
    throw new Error('Sync date range must use YYYY-MM-DD startDate and endDate.');
  }
  if (start.getTime() > end.getTime()) {
    throw new Error('Sync startDate must be on or before endDate.');
  }

  const lookbackDays = daysBetweenInclusive(start, end);
  if (lookbackDays > 365) {
    throw new Error('Sync date range cannot exceed 365 days.');
  }

  return {
    start,
    end,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    lookbackDays
  };
};

const defaultMaxItemsPerAccount = (max: number) => clampPositiveInteger(
  process.env.SOCIAL_SYNC_MAX_ITEMS_PER_ACCOUNT,
  DEFAULT_MAX_ITEMS_PER_ACCOUNT,
  max
);

const isWithinDateRange = (value: unknown, range: ResolvedSyncDateRange) => {
  const date = new Date(String(value || ''));
  const time = date.getTime();
  if (Number.isNaN(time)) return false;
  return time >= range.start.getTime() && time <= range.end.getTime();
};

const parseSocialSyncAccounts = () => {
  const warnings: string[] = [];
  const rawConfig = process.env.SOCIAL_SYNC_ACCOUNTS;
  if (!rawConfig?.trim()) {
    warnings.push('SOCIAL_SYNC_ACCOUNTS is not configured, so no platform accounts were fetched.');
    return { accounts: [] as SocialSyncAccount[], warnings };
  }

  try {
    const parsed = JSON.parse(rawConfig) as unknown;
    if (!Array.isArray(parsed)) {
      warnings.push('SOCIAL_SYNC_ACCOUNTS must be a JSON array.');
      return { accounts: [] as SocialSyncAccount[], warnings };
    }

    const accounts = parsed
      .filter((account): account is SocialSyncAccount => (
        Boolean(account) &&
        typeof account === 'object' &&
        typeof (account as SocialSyncAccount).name === 'string' &&
        Boolean((account as SocialSyncAccount).name.trim())
      ));

    if (accounts.length !== parsed.length) {
      warnings.push('Some SOCIAL_SYNC_ACCOUNTS entries were skipped because they did not include a name.');
    }

    return { accounts, warnings };
  } catch (error) {
    warnings.push(`SOCIAL_SYNC_ACCOUNTS could not be parsed as JSON: ${(error as Error).message}`);
    return { accounts: [] as SocialSyncAccount[], warnings };
  }
};

const platformStatus = (
  linked: boolean,
  missing: string[]
): SocialSyncPlatformStatus => ({
  linked,
  ready: linked && missing.length === 0,
  missing
});

const facebookStatus = (account: SocialSyncAccount) => {
  const config = account.facebook;
  if (!config) return platformStatus(false, []);
  const missing: string[] = [];
  if (!config.pageId) missing.push('Page ID');
  if (!resolveSecret(
    config.pageAccessToken || config.accessToken,
    config.pageAccessTokenEnv || config.accessTokenEnv,
    'META_PAGE_ACCESS_TOKEN'
  )) missing.push('Page token');
  return platformStatus(true, missing);
};

const instagramStatus = (account: SocialSyncAccount) => {
  const config = account.instagram;
  if (!config) return platformStatus(false, []);
  const missing: string[] = [];
  if (!config.igUserId) missing.push('IG account ID');
  if (!resolveSecret(config.accessToken, config.accessTokenEnv, 'META_PAGE_ACCESS_TOKEN')) {
    missing.push('IG token');
  }
  return platformStatus(true, missing);
};

const youtubeStatus = (account: SocialSyncAccount) => {
  const config = account.youtube;
  if (!config) return platformStatus(false, []);
  const missing: string[] = [];
  const hasChannelReference = Boolean(config.channelId || config.handle);
  const hasApiKey = Boolean(resolveSecret(config.apiKey, config.apiKeyEnv, 'YOUTUBE_API_KEY'));
  const hasAccessToken = Boolean(resolveSecret(config.accessToken, config.accessTokenEnv, 'YOUTUBE_ACCESS_TOKEN'));
  const hasRefreshBundle = Boolean(
    resolveSecret(config.refreshToken, config.refreshTokenEnv, 'YOUTUBE_REFRESH_TOKEN') &&
    resolveSecret(config.clientId, config.clientIdEnv, 'YOUTUBE_OAUTH_CLIENT_ID') &&
    resolveSecret(config.clientSecret, config.clientSecretEnv, 'YOUTUBE_OAUTH_CLIENT_SECRET')
  );

  if (!hasChannelReference) missing.push('Channel ID or handle');
  if (!hasApiKey && !hasAccessToken && !hasRefreshBundle) missing.push('API key or OAuth');
  return platformStatus(true, missing);
};

export const getConfiguredSocialSyncAccounts = () => {
  const { accounts, warnings } = parseSocialSyncAccounts();
  const accountStatuses: SocialSyncAccountStatus[] = accounts.map((account) => ({
    id: normalizeKey(account.id || account.name),
    name: account.name,
    author: account.author,
    state: account.state,
    pageLinks: platformLinksForAccount(account),
    platforms: {
      facebook: facebookStatus(account),
      instagram: instagramStatus(account),
      youtube: youtubeStatus(account)
    }
  }));

  return {
    accounts: accountStatuses,
    warnings
  };
};

export const getConfiguredSocialPages = (): SocialPage[] => {
  const { accounts } = getConfiguredSocialSyncAccounts();
  return accounts
    .map((account): SocialPage | null => {
      const links = account.pageLinks || {};
      const url = cleanHttpUrl(links.instagram || links.facebook || links.youtube);
      if (!url) return null;
      return {
        name: account.name,
        url,
        facebookUrl: cleanHttpUrl(links.facebook),
        instagramUrl: cleanHttpUrl(links.instagram),
        youtubeUrl: cleanHttpUrl(links.youtube)
      };
    })
    .filter((page): page is SocialPage => Boolean(page));
};

const fetchJson = async (url: string, init?: RequestInit): Promise<JsonRecord> => {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: JsonRecord = {};

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const message = body?.error?.message || body?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return body;
};

const fetchPagedData = async (
  initialUrl: string,
  maxItems: number,
  stopWhen?: (items: JsonRecord[]) => boolean
) => {
  const collected: JsonRecord[] = [];
  let nextUrl = initialUrl;

  while (nextUrl && collected.length < maxItems) {
    const payload = await fetchJson(nextUrl);
    const items = Array.isArray(payload.data) ? payload.data : [];
    collected.push(...items);
    if (stopWhen?.(items) || items.length === 0) break;
    nextUrl = String(payload.paging?.next || '');
  }

  return collected.slice(0, maxItems);
};

const graphUrl = (
  path: string,
  params: Record<string, string | number | undefined>,
  accessToken: string
) => {
  const version = normalizePlatformVersion(process.env.META_GRAPH_API_VERSION || 'v23.0');
  const url = new URL(`https://graph.facebook.com/${version}/${path.replace(/^\/+/, '')}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  url.searchParams.set('access_token', accessToken);
  return url.toString();
};

const graphGet = async (
  path: string,
  params: Record<string, string | number | undefined>,
  accessToken: string
) => {
  return fetchJson(graphUrl(path, params, accessToken));
};

const extractInsightMetric = (insights: JsonRecord | undefined, metricNames: string[]) => {
  const rows = Array.isArray(insights?.data) ? insights?.data : [];
  for (const metricName of metricNames) {
    const metric = rows.find((row: JsonRecord) => row?.name === metricName);
    const values = Array.isArray(metric?.values) ? metric.values : [];
    const latestValue = values.length > 0 ? values[values.length - 1]?.value : undefined;
    const parsed = numericValue(latestValue);
    if (parsed > 0) return parsed;
  }
  return 0;
};

const makeAuditItem = ({
  account,
  platform,
  sourceId,
  title,
  format,
  publishedAt,
  views,
  likes,
  comments,
  shares,
  proofUrl,
  pageUrlFallback,
  source,
  syncedAt
}: {
  account: SocialSyncAccount;
  platform: SocialPlatform;
  sourceId: string;
  title: string;
  format: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  proofUrl?: string;
  pageUrlFallback?: string;
  source: AuditItem['source'];
  syncedAt: string;
}): AuditItem => {
  const accountId = account.id || account.name;
  return {
    id: buildSyncId(platform, accountId, sourceId),
    title: truncateText(title, `${platform} content`, 220),
    platform,
    format: truncateText(format, platform === 'youtube' ? 'video' : 'post', 40).toLowerCase(),
    publishedAt: dateOnly(publishedAt),
    views: numericValue(views),
    likes: numericValue(likes),
    comments: numericValue(comments),
    shares: numericValue(shares),
    author: truncateText(account.author || account.name, 'Unknown Contributor', 120),
    state: account.state,
    page: account.name,
    proofUrl: cleanHttpUrl(proofUrl),
    pageUrl: pageUrlForPlatform(account, platform, pageUrlFallback),
    pageLinks: platformLinksForAccount(account),
    theme: account.theme === 'negative' ? 'negative' : 'positive',
    createdAt: syncedAt,
    createdByEmail: SOCIAL_SYNC_USER,
    updatedAt: syncedAt,
    updatedByEmail: SOCIAL_SYNC_USER,
    source,
    sourceId,
    sourceAccountId: normalizeKey(accountId),
    syncedAt
  };
};

const facebookFormat = (post: JsonRecord) => {
  const permalink = String(post.permalink_url || '').toLowerCase();
  const attachment = Array.isArray(post.attachments?.data) ? post.attachments.data[0] : undefined;
  const attachmentType = String(attachment?.media_type || attachment?.type || '').toLowerCase();
  if (permalink.includes('/reel/') || attachmentType.includes('reel')) return 'reel';
  if (attachmentType.includes('video')) return 'video';
  if (attachmentType.includes('album') || attachmentType.includes('carousel')) return 'carousel';
  return 'post';
};

const fetchFacebookItems = async (
  account: SocialSyncAccount,
  facebook: MetaPageConfig,
  range: ResolvedSyncDateRange,
  syncedAt: string,
  warnings: string[]
) => {
  const accessToken = resolveSecret(
    facebook.pageAccessToken || facebook.accessToken,
    facebook.pageAccessTokenEnv || facebook.accessTokenEnv,
    'META_PAGE_ACCESS_TOKEN'
  );

  if (!facebook.pageId || !accessToken) {
    warnings.push(`${account.name}: Facebook sync skipped because pageId or page access token is missing.`);
    return [] as AuditItem[];
  }

  const limit = clampPositiveInteger(facebook.limit, defaultMaxItemsPerAccount(100), 100);
  const since = Math.floor(range.start.getTime() / 1000);
  const until = Math.floor(range.end.getTime() / 1000);
  const baseFields = [
    'id',
    'message',
    'story',
    'created_time',
    'permalink_url',
    'shares',
    'attachments{media_type,type,title,url,description}',
    'likes.limit(0).summary(true)',
    'comments.limit(0).summary(true)'
  ].join(',');
  const insightFields = `${baseFields},insights.metric(post_impressions,post_impressions_unique,post_engaged_users)`;

  let payload: JsonRecord;
  try {
    payload = await graphGet(`${facebook.pageId}/posts`, {
      fields: insightFields,
      since,
      until,
      limit
    }, accessToken);
  } catch (error) {
    warnings.push(`${account.name}: Facebook insights were unavailable; fetched basic post stats instead. ${(error as Error).message}`);
    payload = await graphGet(`${facebook.pageId}/posts`, {
      fields: baseFields,
      since,
      until,
      limit
    }, accessToken);
  }

  const posts = Array.isArray(payload.data) ? payload.data : [];
  return posts.filter((post: JsonRecord) => isWithinDateRange(post.created_time, range)).map((post: JsonRecord) => {
    const attachment = Array.isArray(post.attachments?.data) ? post.attachments.data[0] : undefined;
    const title = post.message || post.story || attachment?.title || attachment?.description || 'Facebook post';
    return makeAuditItem({
      account,
      platform: 'facebook',
      sourceId: String(post.id),
      title,
      format: facebookFormat(post),
      publishedAt: String(post.created_time || syncedAt),
      views: extractInsightMetric(post.insights, ['post_impressions', 'post_impressions_unique', 'post_engaged_users']),
      likes: numericValue(post.likes?.summary?.total_count),
      comments: numericValue(post.comments?.summary?.total_count),
      shares: numericValue(post.shares?.count),
      proofUrl: post.permalink_url,
      pageUrlFallback: `https://facebook.com/${facebook.pageId}`,
      source: 'meta-api',
      syncedAt
    });
  });
};

const instagramFormat = (media: JsonRecord) => {
  const productType = String(media.media_product_type || '').toUpperCase();
  const mediaType = String(media.media_type || '').toUpperCase();
  if (productType === 'REELS') return 'reel';
  if (mediaType === 'CAROUSEL_ALBUM') return 'carousel';
  if (mediaType === 'VIDEO') return 'video';
  return 'post';
};

const fetchInstagramItems = async (
  account: SocialSyncAccount,
  instagram: InstagramConfig,
  range: ResolvedSyncDateRange,
  syncedAt: string,
  warnings: string[]
) => {
  const accessToken = resolveSecret(instagram.accessToken, instagram.accessTokenEnv, 'META_PAGE_ACCESS_TOKEN');
  if (!instagram.igUserId || !accessToken) {
    warnings.push(`${account.name}: Instagram sync skipped because igUserId or access token is missing.`);
    return [] as AuditItem[];
  }

  const limit = clampPositiveInteger(instagram.limit, defaultMaxItemsPerAccount(100), 100);
  const baseFields = [
    'id',
    'caption',
    'media_type',
    'media_product_type',
    'timestamp',
    'permalink',
    'like_count',
    'comments_count'
  ].join(',');
  const insightFields = `${baseFields},insights.metric(views,plays,reach,shares,total_interactions)`;

  let mediaItems: JsonRecord[] = [];
  try {
    mediaItems = await fetchPagedData(graphUrl(`${instagram.igUserId}/media`, {
      fields: insightFields,
      limit
    }, accessToken), limit, (items) => (
      items.some((media) => new Date(media.timestamp || 0).getTime() < range.start.getTime())
    ));
  } catch (error) {
    warnings.push(`${account.name}: Instagram insights were unavailable; fetched basic media stats instead. ${(error as Error).message}`);
    mediaItems = await fetchPagedData(graphUrl(`${instagram.igUserId}/media`, {
      fields: baseFields,
      limit
    }, accessToken), limit, (items) => (
      items.some((media) => new Date(media.timestamp || 0).getTime() < range.start.getTime())
    ));
  }

  return mediaItems
    .filter((media: JsonRecord) => isWithinDateRange(media.timestamp, range))
    .map((media: JsonRecord) => makeAuditItem({
      account,
      platform: 'instagram',
      sourceId: String(media.id),
      title: media.caption || 'Instagram media',
      format: instagramFormat(media),
      publishedAt: String(media.timestamp || syncedAt),
      views: extractInsightMetric(media.insights, ['views', 'plays', 'reach', 'total_interactions']),
      likes: numericValue(media.like_count),
      comments: numericValue(media.comments_count),
      shares: extractInsightMetric(media.insights, ['shares']),
      proofUrl: media.permalink,
      pageUrlFallback: `https://instagram.com/`,
      source: 'meta-api',
      syncedAt
    }));
};

const youtubeGet = async (
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  apiKey?: string,
  accessToken?: string
) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  if (apiKey) url.searchParams.set('key', apiKey);
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  return fetchJson(url.toString(), { headers });
};

const refreshYouTubeAccessToken = async (youtube: YouTubeConfig, accountName: string, warnings: string[]) => {
  const refreshToken = resolveSecret(youtube.refreshToken, youtube.refreshTokenEnv, 'YOUTUBE_REFRESH_TOKEN');
  const clientId = resolveSecret(youtube.clientId, youtube.clientIdEnv, 'YOUTUBE_OAUTH_CLIENT_ID');
  const clientSecret = resolveSecret(youtube.clientSecret, youtube.clientSecretEnv, 'YOUTUBE_OAUTH_CLIENT_SECRET');

  if (!refreshToken || !clientId || !clientSecret) return undefined;

  try {
    const response = await fetchJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    return typeof response.access_token === 'string' ? response.access_token : undefined;
  } catch (error) {
    warnings.push(`${accountName}: YouTube OAuth token refresh failed. ${(error as Error).message}`);
    return undefined;
  }
};

const parseYouTubeDurationSeconds = (duration?: string) => {
  const match = String(duration || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
};

const fetchYouTubeAnalyticsShares = async (
  accessToken: string | undefined,
  channelId: string,
  videoIds: string[],
  startDate: string,
  endDate: string,
  accountName: string,
  warnings: string[]
) => {
  const sharesByVideo = new Map<string, number>();
  if (!accessToken || videoIds.length === 0) return sharesByVideo;

  try {
    const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
    url.searchParams.set('ids', `channel==${channelId}`);
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', endDate);
    url.searchParams.set('metrics', 'shares');
    url.searchParams.set('dimensions', 'video');
    url.searchParams.set('filters', `video==${videoIds.join(',')}`);
    const payload = await fetchJson(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const headers = Array.isArray(payload.columnHeaders) ? payload.columnHeaders : [];
    const videoIndex = headers.findIndex((header: JsonRecord) => header?.name === 'video');
    const sharesIndex = headers.findIndex((header: JsonRecord) => header?.name === 'shares');
    const rows = Array.isArray(payload.rows) ? payload.rows : [];

    rows.forEach((row: unknown[]) => {
      const videoId = String(row?.[videoIndex] || '');
      if (videoId) sharesByVideo.set(videoId, numericValue(row?.[sharesIndex]));
    });
  } catch (error) {
    warnings.push(`${accountName}: YouTube Analytics shares were unavailable; YouTube share counts defaulted to 0. ${(error as Error).message}`);
  }

  return sharesByVideo;
};

const fetchYouTubeItems = async (
  account: SocialSyncAccount,
  youtube: YouTubeConfig,
  range: ResolvedSyncDateRange,
  syncedAt: string,
  warnings: string[]
) => {
  const apiKey = resolveSecret(youtube.apiKey, youtube.apiKeyEnv, 'YOUTUBE_API_KEY');
  let accessToken = resolveSecret(youtube.accessToken, youtube.accessTokenEnv, 'YOUTUBE_ACCESS_TOKEN');
  if (!accessToken) {
    accessToken = await refreshYouTubeAccessToken(youtube, account.name, warnings);
  }

  if (!apiKey && !accessToken) {
    warnings.push(`${account.name}: YouTube sync skipped because API key or OAuth access token is missing.`);
    return [] as AuditItem[];
  }

  const limit = clampPositiveInteger(youtube.limit, defaultMaxItemsPerAccount(50), 50);

  const channelParams = youtube.channelId
    ? { part: 'snippet,contentDetails', id: youtube.channelId }
    : youtube.handle
      ? { part: 'snippet,contentDetails', forHandle: youtube.handle }
      : { part: 'snippet,contentDetails', mine: true };
  const channelPayload = await youtubeGet('channels', channelParams, apiKey, accessToken);
  const channel = Array.isArray(channelPayload.items) ? channelPayload.items[0] : undefined;
  const channelId = String(channel?.id || youtube.channelId || '');
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;

  if (!channelId || !uploadsPlaylistId) {
    warnings.push(`${account.name}: YouTube channel or uploads playlist could not be resolved.`);
    return [] as AuditItem[];
  }

  const playlistItems: JsonRecord[] = [];
  let pageToken = '';
  while (playlistItems.length < limit) {
    const playlistPayload = await youtubeGet('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: Math.min(50, limit - playlistItems.length),
      pageToken
    }, apiKey, accessToken);
    const items = Array.isArray(playlistPayload.items) ? playlistPayload.items : [];
    const matchingItems = items.filter((item: JsonRecord) => (
      isWithinDateRange(item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt, range)
    ));
    playlistItems.push(...matchingItems);
    const reachedOlderContent = items.some((item: JsonRecord) => (
      new Date(item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || 0).getTime() < range.start.getTime()
    ));
    pageToken = String(playlistPayload.nextPageToken || '');
    if (!pageToken || items.length === 0 || reachedOlderContent) break;
  }

  const videoIds = playlistItems.slice(0, limit)
    .map((item) => String(item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || ''))
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  const videosPayload = await youtubeGet('videos', {
    part: 'snippet,statistics,contentDetails',
    id: videoIds.join(',')
  }, apiKey, accessToken);
  const videos = Array.isArray(videosPayload.items) ? videosPayload.items : [];
  const sharesByVideo = await fetchYouTubeAnalyticsShares(
    accessToken,
    channelId,
    videoIds,
    range.startDate,
    range.endDate,
    account.name,
    warnings
  );

  return videos.map((video: JsonRecord) => {
    const videoId = String(video.id);
    const durationSeconds = parseYouTubeDurationSeconds(video.contentDetails?.duration);
    return makeAuditItem({
      account,
      platform: 'youtube',
      sourceId: videoId,
      title: video.snippet?.title || 'YouTube video',
      format: durationSeconds > 0 && durationSeconds <= 60 ? 'short' : 'video',
      publishedAt: String(video.snippet?.publishedAt || syncedAt),
      views: numericValue(video.statistics?.viewCount),
      likes: numericValue(video.statistics?.likeCount),
      comments: numericValue(video.statistics?.commentCount),
      shares: sharesByVideo.get(videoId) || 0,
      proofUrl: `https://www.youtube.com/watch?v=${videoId}`,
      pageUrlFallback: `https://www.youtube.com/channel/${channelId}`,
      source: 'youtube-api',
      syncedAt
    });
  });
};

export const fetchSocialAuditItems = async (options: SocialSyncOptions = {}): Promise<SocialSyncResult> => {
  const fetchedAt = new Date().toISOString();
  const { accounts, warnings } = parseSocialSyncAccounts();
  const range = resolveSyncDateRange(options);

  if (accounts.length === 0) {
    return {
      success: false,
      fetchedAt,
      items: [],
      warnings,
      configuredAccounts: 0,
      requestedLookbackDays: range.lookbackDays,
      requestedDateRange: {
        startDate: range.startDate,
        endDate: range.endDate
      }
    };
  }

  const tasks = accounts.flatMap((account) => {
    const platformTasks: Array<Promise<AuditItem[]>> = [];
    if (account.facebook) {
      platformTasks.push(
        fetchFacebookItems(account, account.facebook, range, fetchedAt, warnings)
          .catch((error) => {
            warnings.push(`${account.name}: Facebook sync failed. ${(error as Error).message}`);
            return [];
          })
      );
    }
    if (account.instagram) {
      platformTasks.push(
        fetchInstagramItems(account, account.instagram, range, fetchedAt, warnings)
          .catch((error) => {
            warnings.push(`${account.name}: Instagram sync failed. ${(error as Error).message}`);
            return [];
          })
      );
    }
    if (account.youtube) {
      platformTasks.push(
        fetchYouTubeItems(account, account.youtube, range, fetchedAt, warnings)
          .catch((error) => {
            warnings.push(`${account.name}: YouTube sync failed. ${(error as Error).message}`);
            return [];
          })
      );
    }
    if (platformTasks.length === 0) {
      warnings.push(`${account.name}: no platform config found, so this account was skipped.`);
    }
    return platformTasks;
  });

  const batches = await Promise.all(tasks);
  const itemsById = new Map<string, AuditItem>();
  batches.flat().forEach((item) => itemsById.set(item.id, item));

  return {
    success: true,
    fetchedAt,
    items: Array.from(itemsById.values()),
    warnings,
    configuredAccounts: accounts.length,
    requestedLookbackDays: range.lookbackDays,
    requestedDateRange: {
      startDate: range.startDate,
      endDate: range.endDate
    }
  };
};

export const mergeSyncedAuditItems = (
  existingItems: AuditItem[],
  incomingItems: AuditItem[],
  syncedAt: string
) => {
  const itemsById = new Map<string, AuditItem>();
  existingItems.forEach((item) => itemsById.set(item.id, item));

  incomingItems.forEach((item) => {
    const existingItem = itemsById.get(item.id);
    itemsById.set(item.id, {
      ...(existingItem || {}),
      ...item,
      createdAt: existingItem?.createdAt || item.createdAt || syncedAt,
      createdByEmail: existingItem?.createdByEmail || item.createdByEmail || SOCIAL_SYNC_USER,
      archivedAt: existingItem?.archivedAt,
      archiveReason: existingItem?.archiveReason,
      archivedByEmail: existingItem?.archivedByEmail,
      updatedAt: syncedAt,
      updatedByEmail: SOCIAL_SYNC_USER,
      syncedAt
    });
  });

  return Array.from(itemsById.values()).sort((a, b) => (
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() ||
    b.id.localeCompare(a.id)
  ));
};

export const isValidSocialSyncSecret = (headers: Record<string, string | string[] | undefined>) => {
  const configuredSecret = process.env.SOCIAL_SYNC_CRON_SECRET;
  if (!configuredSecret) return false;

  const headerValue = (name: string) => {
    const value = headers[name] || headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };
  const bearerToken = headerValue('authorization')?.startsWith('Bearer ')
    ? headerValue('authorization')?.slice('Bearer '.length)
    : '';
  return headerValue('x-social-sync-secret') === configuredSecret || bearerToken === configuredSecret;
};
