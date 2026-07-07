import type { AuditItem, SocialPage } from '../types';
import { auditItemPageUrl, auditItemPostUrl } from './socialLinks';

type Platform = AuditItem['platform'];
type ReportContributorMetric = 'performance' | 'posts' | 'views' | 'likes' | 'comments' | 'shares';

export type ReportPlatformBreakdown = {
  platform: Platform;
  entries: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

export type ReportContributor = {
  name: string;
  count: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  performance: number;
};

export type WorkspaceReportInput = {
  generatedAt: string;
  dateRangeLabel: string;
  filters: {
    timeline: string;
    state: string;
    page: string;
    contributor: string;
    platform: string;
  };
  leaderboard: {
    metric: ReportContributorMetric;
    metricLabel: string;
    platform: string;
  };
  metrics: {
    entries: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
    avgViews: number;
    actionSignalRate: number;
  };
  platformBreakdown: ReportPlatformBreakdown[];
  contributors: ReportContributor[];
  topPosts: AuditItem[];
  savedPages: SocialPage[];
};

const platformMeta: Record<Platform, { label: string; color: string; soft: string }> = {
  facebook: {
    label: 'Facebook',
    color: '#1877f2',
    soft: '#e8f1ff'
  },
  instagram: {
    label: 'Instagram',
    color: '#e1306c',
    soft: '#fff0f6'
  },
  youtube: {
    label: 'YouTube',
    color: '#ff0000',
    soft: '#fff1f1'
  }
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatNumber = (value: number) => Math.round(value).toLocaleString('en-IN');

const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatNumber(value);
};

const metricCard = (label: string, value: string) => `
  <article class="metric-card">
    <strong>${escapeHtml(value)}</strong>
    <span>${escapeHtml(label)}</span>
  </article>
`;

const platformLogo = (platform: Platform) => {
  const meta = platformMeta[platform];
  const icons: Record<Platform, string> = {
    facebook: '<span class="facebook-mark">f</span>',
    instagram: `
      <svg class="instagram-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4.6"></rect>
        <circle cx="12" cy="12" r="3.55"></circle>
        <circle cx="16.7" cy="7.35" r="1.15"></circle>
      </svg>
    `,
    youtube: `
      <svg class="youtube-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3" y="6.5" width="18" height="11" rx="3"></rect>
        <path d="M10.4 9.35 15.2 12l-4.8 2.65Z"></path>
      </svg>
    `
  };
  return `<span class="platform-logo logo-${platform}" style="--platform-color:${meta.color};--platform-soft:${meta.soft}">${icons[platform]}</span>`;
};

const anchor = (label: string, url: string, className = '') => {
  if (!url) return escapeHtml(label);
  const classAttr = className ? ` class="${escapeHtml(className)}"` : '';
  return `<a${classAttr} href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
};

const renderPlatformSection = (item: ReportPlatformBreakdown, maxViews: number) => {
  const meta = platformMeta[item.platform];
  const width = maxViews > 0 ? Math.max(4, Math.round((item.views / maxViews) * 100)) : 0;
  const engagement = item.likes + item.comments + item.shares;

  return `
    <section class="platform-card" style="--platform-color:${meta.color};--platform-soft:${meta.soft}">
      <div class="platform-heading">
        ${platformLogo(item.platform)}
        <div>
          <h3>${escapeHtml(meta.label)}</h3>
          <p>${item.entries} entries - ${formatCompact(item.views)} views</p>
        </div>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
      <div class="platform-grid">
        <div><span>Likes</span><strong>${formatCompact(item.likes)}</strong></div>
        <div><span>Comments</span><strong>${formatCompact(item.comments)}</strong></div>
        <div><span>Shares</span><strong>${formatCompact(item.shares)}</strong></div>
        <div><span>Engagement</span><strong>${formatCompact(engagement)}</strong></div>
      </div>
    </section>
  `;
};

const contributorMetricValue = (contributor: ReportContributor, metric: ReportContributorMetric) => {
  switch (metric) {
    case 'performance':
      return contributor.performance;
    case 'posts':
      return contributor.count;
    case 'likes':
      return contributor.likes;
    case 'comments':
      return contributor.comments;
    case 'shares':
      return contributor.shares;
    default:
      return contributor.views;
  }
};

const medalSlots = [
  { rank: 2, className: 'silver', height: 86 },
  { rank: 1, className: 'gold', height: 116 },
  { rank: 3, className: 'bronze', height: 72 }
];

const renderContributorPodium = (input: WorkspaceReportInput) => {
  const byRank = new Map(input.contributors.slice(0, 3).map((contributor, index) => [index + 1, contributor]));
  const cards = medalSlots
    .map(slot => {
      const contributor = byRank.get(slot.rank);
      if (!contributor) return '';
      const metricValue = contributorMetricValue(contributor, input.leaderboard.metric);

      return `
        <article class="podium-card podium-${slot.className}">
          <div class="medal-icon">
            <span class="medal-ring"></span>
            <span class="medal-ribbon"></span>
            <strong>${slot.rank}</strong>
          </div>
          <div class="podium-name">${escapeHtml(contributor.name)}</div>
          <div class="podium-score">${formatCompact(metricValue)}</div>
          <div class="podium-step" style="height:${slot.height}px"><strong>${slot.rank}</strong></div>
        </article>
      `;
    })
    .join('');

  return cards || '<p class="empty-state">No contributor data available.</p>';
};

const renderTopPostRow = (post: AuditItem, index: number, input: WorkspaceReportInput) => {
  const postUrl = auditItemPostUrl(post);
  const pageUrl = auditItemPageUrl(post, input.savedPages);
  const pageLabel = post.page || 'No page';

  return `
    <tr>
      <td>${index + 1}</td>
      <td>
        <strong>${anchor(post.title, postUrl, 'post-link')}</strong>
        <small>${postUrl ? anchor('Open live post', postUrl, 'inline-link') : 'No live post URL attached'} - ${escapeHtml(post.format)}</small>
      </td>
      <td>${platformLogo(post.platform)} ${escapeHtml(platformMeta[post.platform].label)}</td>
      <td>${anchor(pageLabel, pageUrl, 'page-link')}<small>${escapeHtml(post.state || 'No state')}</small></td>
      <td>${escapeHtml(post.author || 'Unknown Contributor')}</td>
      <td>${formatCompact(post.views)}</td>
      <td>${formatCompact(post.likes + post.comments + post.shares)}</td>
    </tr>
  `;
};

const renderTopPostsByPage = (input: WorkspaceReportInput) => {
  const groupedPosts = new Map<string, AuditItem[]>();

  input.topPosts.forEach(post => {
    const pageName = post.page || 'No page';
    const currentPosts = groupedPosts.get(pageName) || [];
    currentPosts.push(post);
    groupedPosts.set(pageName, currentPosts);
  });

  const pageSections = Array.from(groupedPosts.entries())
    .map(([pageName, posts]) => {
      const sortedPosts = [...posts].sort((a, b) => b.views - a.views);
      const totalViews = sortedPosts.reduce((sum, post) => sum + post.views, 0);
      const totalEngagement = sortedPosts.reduce((sum, post) => sum + post.likes + post.comments + post.shares, 0);
      const pageUrl = auditItemPageUrl(sortedPosts[0], input.savedPages);

      return {
        pageName,
        pageUrl,
        totalViews,
        totalEngagement,
        posts: sortedPosts.slice(0, 3)
      };
    })
    .sort((a, b) => b.totalViews - a.totalViews);

  if (pageSections.length === 0) return '<p class="empty-state">No content data available.</p>';

  return pageSections.map(section => `
    <article class="page-posts-card">
      <div class="page-posts-heading">
        <div>
          <h3>${anchor(section.pageName, section.pageUrl, 'page-link')}</h3>
          <p>${formatCompact(section.totalViews)} page views - ${formatCompact(section.totalEngagement)} engagement</p>
        </div>
        <span>Top 3 posts</span>
      </div>
      <table class="report-table content-table page-posts-table">
        <colgroup>
          <col class="rank-column" />
          <col class="content-column" />
          <col class="platform-column" />
          <col />
          <col />
          <col class="small-number-column" />
          <col class="small-number-column" />
        </colgroup>
        <thead><tr><th>#</th><th>Content</th><th>Platform</th><th>Page</th><th>Contributor</th><th>Views</th><th>Eng.</th></tr></thead>
        <tbody>${section.posts.map((post, index) => renderTopPostRow(post, index, input)).join('')}</tbody>
      </table>
    </article>
  `).join('');
};

const renderReportHtml = (input: WorkspaceReportInput) => {
  const maxPlatformViews = Math.max(...input.platformBreakdown.map(item => item.views), 1);
  const topContributorRows = input.contributors.slice(0, 8).map((contributor, index) => `
    <tr>
      <td><span class="rank-pill">${index + 1}</span></td>
      <td><strong>${escapeHtml(contributor.name)}</strong></td>
      <td>${contributor.count}</td>
      <td>${formatCompact(contributorMetricValue(contributor, input.leaderboard.metric))}</td>
      <td>${formatCompact(contributor.views)}</td>
      <td>${formatCompact(contributor.likes + contributor.comments + contributor.shares)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>SAMARTH Performance Report</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f5f7fb;
        color: #182230;
        font-family: Inter, Arial, sans-serif;
        font-size: 10.5px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report {
        width: 100%;
        background: #f5f7fb;
      }
      .cover {
        border: 1px solid #dce6f2;
        background:
          linear-gradient(135deg, rgba(232, 63, 35, 0.12), rgba(255, 255, 255, 0.96) 44%, rgba(38, 184, 255, 0.1)),
          repeating-linear-gradient(90deg, rgba(24, 34, 48, 0.04) 0 1px, transparent 1px 34px);
        padding: 22px;
        border-radius: 16px;
        page-break-inside: avoid;
      }
      .cover-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }
      .report-stamp {
        border: 1px solid #ffd1c8;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.76);
        color: #d7351c;
        padding: 7px 10px;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .eyebrow {
        color: #e83f23;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }
      h1 {
        margin: 10px 0 4px;
        color: #111827;
        font-size: 32px;
        letter-spacing: -0.02em;
        line-height: 1;
      }
      .subtitle {
        margin: 0;
        max-width: 620px;
        color: #526071;
        font-size: 13px;
        font-weight: 700;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-top: 18px;
      }
      .meta-grid div,
      .metric-card,
      .platform-card,
      .section {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #e2e8f0;
        border-radius: 12px;
      }
      .meta-grid div {
        padding: 9px 10px;
      }
      .meta-grid span,
      .metric-card span,
      .platform-grid span {
        display: block;
        color: #758195;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .meta-grid strong {
        display: block;
        margin-top: 4px;
        color: #182230;
        font-size: 11px;
        line-height: 1.25;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-top: 14px;
      }
      .metric-card {
        padding: 12px;
        min-height: 70px;
      }
      .metric-card strong {
        display: block;
        margin: 0 0 7px;
        color: #111827;
        font-size: 22px;
        line-height: 1;
      }
      .section {
        margin-top: 14px;
        padding: 16px;
        page-break-inside: avoid;
      }
      .section h2 {
        margin: 0 0 12px;
        color: #111827;
        font-size: 15px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .section-heading-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .section-heading-row h2 {
        margin-bottom: 0;
      }
      .leaderboard-context {
        color: #758195;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.1em;
        line-height: 1.45;
        text-align: right;
        text-transform: uppercase;
      }
      .platforms {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .platform-card {
        padding: 14px;
        border-color: var(--platform-color);
        background: linear-gradient(180deg, var(--platform-soft), #ffffff 72%);
      }
      .platform-heading {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .platform-heading h3 {
        margin: 0;
        color: var(--platform-color);
        font-size: 15px;
      }
      .platform-heading p {
        margin: 2px 0 0;
        color: #526071;
        font-size: 10px;
        font-weight: 800;
      }
      .platform-logo {
        display: inline-flex;
        width: 25px;
        height: 25px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--platform-color);
        color: white;
        font-size: 16px;
        font-weight: 900;
        line-height: 1;
      }
      .platform-logo svg {
        width: 18px;
        height: 18px;
      }
      .logo-instagram {
        background: radial-gradient(circle at 30% 110%, #fdf497 0 14%, #fd5949 35%, #d6249f 64%, #285aeb 100%);
      }
      .logo-instagram svg {
        fill: none;
        stroke: #fff;
        stroke-width: 1.9;
      }
      .logo-instagram circle:last-child {
        fill: #fff;
        stroke: none;
      }
      .logo-youtube {
        border-radius: 7px;
      }
      .logo-youtube svg {
        fill: #fff;
      }
      .logo-youtube rect {
        fill: transparent;
      }
      .logo-youtube path {
        fill: #fff;
      }
      .facebook-mark {
        transform: translateY(1px);
        font-family: Arial, sans-serif;
        font-size: 18px;
        font-weight: 900;
      }
      .bar-track {
        overflow: hidden;
        border-radius: 999px;
        background: #e8eef6;
      }
      .bar-track {
        height: 8px;
        margin: 14px 0 12px;
      }
      .bar-fill {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--platform-color);
      }
      .platform-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      .platform-grid div {
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        padding-top: 8px;
      }
      .platform-grid strong {
        display: block;
        margin-top: 3px;
        font-size: 13px;
      }
      .page-posts-card {
        margin-top: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.9);
        padding: 12px;
        page-break-inside: avoid;
      }
      .page-posts-card:first-child {
        margin-top: 0;
      }
      .page-posts-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }
      .page-posts-heading h3 {
        margin: 0;
        color: #111827;
        font-size: 13px;
        line-height: 1.2;
      }
      .page-posts-heading p {
        margin: 3px 0 0;
        color: #526071;
        font-size: 9px;
        font-weight: 800;
      }
      .page-posts-heading span {
        border: 1px solid #ffd1c8;
        border-radius: 999px;
        background: #fff7f2;
        color: #d7351c;
        padding: 5px 8px;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .page-posts-table {
        font-size: 9.5px;
      }
      .contributor-podium {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        align-items: end;
        gap: 10px;
        margin-bottom: 14px;
      }
      .podium-card {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        padding: 12px;
        text-align: center;
        page-break-inside: avoid;
      }
      .podium-gold {
        border-color: #f5b544;
        transform: translateY(-6px);
      }
      .podium-silver {
        border-color: #94a3b8;
      }
      .podium-bronze {
        border-color: #b7793d;
      }
      .medal-icon {
        position: relative;
        width: 38px;
        height: 42px;
        margin: 0 auto 7px;
      }
      .medal-ring {
        position: absolute;
        left: 9px;
        top: 13px;
        width: 20px;
        height: 20px;
        border: 2px solid currentColor;
        border-radius: 999px;
        background: #ffffff;
      }
      .medal-ribbon {
        position: absolute;
        left: 12px;
        top: 0;
        width: 14px;
        height: 18px;
        clip-path: polygon(0 0, 100% 0, 78% 100%, 50% 78%, 22% 100%);
        background: currentColor;
        opacity: 0.82;
      }
      .medal-icon strong {
        position: absolute;
        left: 0;
        right: 0;
        top: 17px;
        color: #182230;
        font-size: 9px;
        line-height: 1;
      }
      .podium-gold .medal-icon,
      .podium-gold .podium-score {
        color: #d29518;
      }
      .podium-silver .medal-icon,
      .podium-silver .podium-score {
        color: #64748b;
      }
      .podium-bronze .medal-icon,
      .podium-bronze .podium-score {
        color: #9a5b24;
      }
      .podium-name {
        overflow: hidden;
        color: #111827;
        font-size: 12px;
        font-weight: 900;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .podium-score {
        margin-top: 3px;
        font-size: 11px;
        font-weight: 900;
      }
      .podium-step {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        margin-top: 10px;
        border-radius: 10px 10px 0 0;
        padding-bottom: 10px;
      }
      .podium-step strong {
        color: #ffffff;
        font-size: 28px;
        line-height: 1;
      }
      .podium-gold .podium-step {
        background: linear-gradient(180deg, #f5b544, #d99a22);
      }
      .podium-silver .podium-step {
        background: linear-gradient(180deg, #94a3b8, #64748b);
      }
      .podium-bronze .podium-step {
        background: linear-gradient(180deg, #b7793d, #8a4f22);
      }
      .empty-state {
        margin: 0;
        color: #8f6b61;
        font-size: 11px;
        font-weight: 800;
      }
      .report-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
        table-layout: fixed;
      }
      .report-table thead {
        display: table-header-group;
      }
      .report-table tr {
        page-break-inside: avoid;
      }
      .report-table th {
        color: #758195;
        font-size: 9px;
        letter-spacing: 0.1em;
        text-align: left;
        text-transform: uppercase;
      }
      .report-table th,
      .report-table td {
        border-bottom: 1px solid #e6edf5;
        padding: 8px 6px;
        vertical-align: middle;
        overflow-wrap: anywhere;
      }
      .report-table tbody tr:nth-child(even) {
        background: #f8fafc;
      }
      .rank-column {
        width: 32px;
      }
      .contributor-column {
        width: 30%;
      }
      .content-column {
        width: 32%;
      }
      .platform-column {
        width: 88px;
      }
      .small-number-column {
        width: 70px;
      }
      .report-table td strong {
        display: block;
        font-size: 10px;
        line-height: 1.35;
      }
      .report-table td small {
        display: block;
        margin-top: 2px;
        color: #758195;
        font-size: 9px;
      }
      .rank-pill {
        display: inline-flex;
        min-width: 20px;
        height: 20px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #fff1e8;
        color: #d7351c;
        font-size: 9px;
        font-weight: 900;
      }
      .report-table a {
        color: #d7351c;
        font-weight: 900;
        text-decoration: none;
      }
      .report-table a:hover {
        text-decoration: underline;
      }
      .report-table .post-link {
        color: #111827;
      }
      .report-table .page-link,
      .report-table .inline-link {
        color: #d7351c;
      }
      footer {
        margin-top: 16px;
        color: #758195;
        font-size: 9px;
        font-weight: 700;
        text-align: center;
      }
      .print-button {
        position: fixed;
        right: 16px;
        top: 16px;
        z-index: 10;
        border: 1px solid #ffc0b3;
        border-radius: 999px;
        background: #e83f23;
        color: #fff;
        padding: 10px 14px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        box-shadow: 0 12px 24px rgba(232, 63, 35, 0.18);
        cursor: pointer;
      }
      @media print {
        body { background: white; }
        .report { background: white; }
        .print-button { display: none; }
        a { color: inherit; }
      }
    </style>
  </head>
  <body>
    <button class="print-button" onclick="window.print()">Print / Save PDF</button>
    <main class="report">
      <section class="cover">
        <div class="cover-top">
          <div>
            <div class="eyebrow">SAMARTH Report</div>
            <h1>Social Performance Report</h1>
            <p class="subtitle">Single Admin Managed AI Run Thematic Handles - generated ${escapeHtml(input.generatedAt)}</p>
          </div>
          <div class="report-stamp">${escapeHtml(input.filters.timeline)}</div>
        </div>
        <div class="meta-grid">
          <div><span>Date Range</span><strong>${escapeHtml(input.dateRangeLabel)}</strong></div>
          <div><span>Timeline</span><strong>${escapeHtml(input.filters.timeline)}</strong></div>
          <div><span>Channel</span><strong>${escapeHtml(input.filters.platform)}</strong></div>
          <div><span>State</span><strong>${escapeHtml(input.filters.state)}</strong></div>
          <div><span>Page</span><strong>${escapeHtml(input.filters.page)}</strong></div>
          <div><span>Contributor</span><strong>${escapeHtml(input.filters.contributor)}</strong></div>
          <div><span>Leaderboard</span><strong>${escapeHtml(input.leaderboard.metricLabel)} - ${escapeHtml(input.leaderboard.platform)}</strong></div>
        </div>
        <div class="metrics">
          ${metricCard('Contents', formatNumber(input.metrics.entries))}
          ${metricCard('Views', formatCompact(input.metrics.views))}
          ${metricCard('Engagement', formatCompact(input.metrics.engagement))}
          ${metricCard('Action Signal', `${input.metrics.actionSignalRate.toFixed(1)}%`)}
          ${metricCard('Likes', formatCompact(input.metrics.likes))}
          ${metricCard('Comments', formatCompact(input.metrics.comments))}
          ${metricCard('Shares', formatCompact(input.metrics.shares))}
          ${metricCard('Platforms', String(input.platformBreakdown.filter(item => item.entries > 0).length))}
        </div>
      </section>

      <section class="section">
        <h2>Channel Breakdown</h2>
        <div class="platforms">
          ${input.platformBreakdown.map(item => renderPlatformSection(item, maxPlatformViews)).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-heading-row">
          <h2>Contributor Podium</h2>
          <div class="leaderboard-context">${escapeHtml(input.leaderboard.metricLabel)} - ${escapeHtml(input.leaderboard.platform)}</div>
        </div>
        <div class="contributor-podium">
          ${renderContributorPodium(input)}
        </div>
        <table class="report-table contributors-table">
          <colgroup>
            <col class="rank-column" />
            <col class="contributor-column" />
            <col class="small-number-column" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead><tr><th>#</th><th>Contributor</th><th>Posts</th><th>${escapeHtml(input.leaderboard.metricLabel)}</th><th>Views</th><th>Engagement</th></tr></thead>
          <tbody>${topContributorRows || '<tr><td colspan="6">No contributor data available.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="section">
        <div class="section-heading-row">
          <h2>Top Posts By Page</h2>
          <div class="leaderboard-context">Top 3 posts per page</div>
        </div>
        ${renderTopPostsByPage(input)}
      </section>

      <footer>Prepared by SAMARTH Workspace - export reflects selected dashboard filters at generation time.</footer>
    </main>
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 300);
      });
    </script>
  </body>
</html>`;
};

export const generateWorkspaceReportPdf = (input: WorkspaceReportInput) => {
  const reportWindow = window.open('', '_blank', 'width=1024,height=768');
  if (!reportWindow) return false;

  reportWindow.document.open();
  reportWindow.document.write(renderReportHtml(input));
  reportWindow.document.close();
  return true;
};
