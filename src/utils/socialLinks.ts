import type { AuditItem, SocialPage, SocialPlatform } from '../types';

export const cleanExternalUrl = (value: unknown) => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate) return '';

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

export const socialPageUrlForPlatform = (page: SocialPage | undefined, platform: SocialPlatform) => {
  if (!page) return '';
  if (platform === 'facebook') return cleanExternalUrl(page.facebookUrl || page.url);
  if (platform === 'instagram') return cleanExternalUrl(page.instagramUrl || page.url);
  return cleanExternalUrl(page.youtubeUrl || page.url);
};

export const inferSocialPageUrls = (url: string) => {
  const safeUrl = cleanExternalUrl(url);
  const urls: Pick<SocialPage, 'url' | 'facebookUrl' | 'instagramUrl' | 'youtubeUrl'> = {
    url: safeUrl
  };

  if (safeUrl.includes('facebook.com')) urls.facebookUrl = safeUrl;
  if (safeUrl.includes('instagram.com')) urls.instagramUrl = safeUrl;
  if (safeUrl.includes('youtube.com') || safeUrl.includes('youtu.be')) urls.youtubeUrl = safeUrl;

  return urls;
};

export const platformLinksFromPage = (page: SocialPage | undefined) => {
  if (!page) return undefined;

  const links = {
    facebook: cleanExternalUrl(page.facebookUrl),
    instagram: cleanExternalUrl(page.instagramUrl),
    youtube: cleanExternalUrl(page.youtubeUrl)
  };

  return Object.values(links).some(Boolean) ? links : undefined;
};

export const auditItemPageUrl = (item: AuditItem, savedPages: SocialPage[]) => {
  const matchingPage = savedPages.find(page => page.name === item.page);
  return cleanExternalUrl(
    item.pageLinks?.[item.platform] ||
    item.pageUrl ||
    socialPageUrlForPlatform(matchingPage, item.platform) ||
    matchingPage?.url
  );
};

export const auditItemPostUrl = (item: AuditItem) => cleanExternalUrl(item.proofUrl);
