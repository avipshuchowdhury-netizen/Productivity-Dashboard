import type { AuditItem } from '../types';

type Platform = AuditItem['platform'];

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
};

export type ReportTrendPoint = {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  posts: number;
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
  trendData: ReportTrendPoint[];
};

const platformMeta: Record<Platform, { label: string; color: string; soft: string; logo: string }> = {
  facebook: {
    label: 'Facebook',
    color: '#1877f2',
    soft: '#e8f1ff',
    logo: 'f'
  },
  instagram: {
    label: 'Instagram',
    color: '#e1306c',
    soft: '#fff0f6',
    logo: '◎'
  },
  youtube: {
    label: 'YouTube',
    color: '#ff0000',
    soft: '#fff1f1',
    logo: '▶'
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
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatNumber(value);
};

const metricCard = (label: string, value: string, helper: string) => `
  <article class="metric-card">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
    <small>${escapeHtml(helper)}</small>
  </article>
`;

const platformLogo = (platform: Platform) => {
  const meta = platformMeta[platform];
  const youtubeClass = platform === 'youtube' ? ' logo-youtube' : '';
  return `<span class="platform-logo${youtubeClass}" style="--platform-color:${meta.color};--platform-soft:${meta.soft}">${escapeHtml(meta.logo)}</span>`;
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
          <p>${item.entries} entries · ${formatCompact(item.views)} views</p>
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

const renderTrend = (trendData: ReportTrendPoint[]) => {
  const maxViews = Math.max(...trendData.map(point => point.views), 1);
  const rows = trendData.slice(-12).map(point => {
    const width = Math.max(3, Math.round((point.views / maxViews) * 100));
    return `
      <tr>
        <td>${escapeHtml(point.date)}</td>
        <td>${point.posts}</td>
        <td>
          <div class="trend-cell">
            <div class="trend-bar"><span style="width:${width}%"></span></div>
            <strong>${formatCompact(point.views)}</strong>
          </div>
        </td>
        <td>${formatCompact(point.likes)}</td>
        <td>${formatCompact(point.comments)}</td>
        <td>${formatCompact(point.shares)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="report-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Posts</th>
          <th>Views</th>
          <th>Likes</th>
          <th>Comments</th>
          <th>Shares</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="6">No trend data available for this range.</td></tr>'}</tbody>
    </table>
  `;
};

const renderReportHtml = (input: WorkspaceReportInput) => {
  const maxPlatformViews = Math.max(...input.platformBreakdown.map(item => item.views), 1);
  const topContributorRows = input.contributors.slice(0, 8).map((contributor, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(contributor.name)}</td>
      <td>${contributor.count}</td>
      <td>${formatCompact(contributor.views)}</td>
      <td>${formatCompact(contributor.likes + contributor.comments + contributor.shares)}</td>
    </tr>
  `).join('');
  const topPostRows = input.topPosts.slice(0, 10).map((post, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <strong>${escapeHtml(post.title)}</strong>
        <small>${escapeHtml(post.page || 'No page')} · ${escapeHtml(post.state || 'No state')}</small>
      </td>
      <td>${platformLogo(post.platform)} ${escapeHtml(platformMeta[post.platform].label)}</td>
      <td>${escapeHtml(post.author)}</td>
      <td>${formatCompact(post.views)}</td>
      <td>${formatCompact(post.likes + post.comments + post.shares)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>SAMARTH Performance Report</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #fffaf7;
        color: #241815;
        font-family: Inter, Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report {
        width: 100%;
        background: #fffaf7;
      }
      .cover {
        border: 1px solid #ffc0b3;
        background:
          linear-gradient(135deg, rgba(232, 63, 35, 0.12), rgba(255, 250, 247, 0.94) 42%, rgba(38, 184, 255, 0.08)),
          repeating-linear-gradient(90deg, rgba(232, 63, 35, 0.06) 0 1px, transparent 1px 34px);
        padding: 24px;
        border-radius: 14px;
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
        font-size: 34px;
        letter-spacing: -0.02em;
        line-height: 1;
      }
      .subtitle {
        margin: 0;
        color: #7f574c;
        font-size: 13px;
        font-weight: 700;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 20px;
      }
      .meta-grid div,
      .metric-card,
      .platform-card,
      .section {
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid #ffd1c8;
        border-radius: 12px;
      }
      .meta-grid div {
        padding: 10px 12px;
      }
      .meta-grid span,
      .metric-card span,
      .platform-grid span {
        display: block;
        color: #8f6b61;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .meta-grid strong {
        display: block;
        margin-top: 4px;
        font-size: 12px;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-top: 14px;
      }
      .metric-card {
        padding: 14px;
        min-height: 92px;
      }
      .metric-card strong {
        display: block;
        margin: 8px 0 5px;
        font-size: 22px;
        line-height: 1;
      }
      .metric-card small {
        color: #7f574c;
        font-size: 10px;
        font-weight: 700;
      }
      .section {
        margin-top: 14px;
        padding: 18px;
        page-break-inside: avoid;
      }
      .section h2 {
        margin: 0 0 12px;
        color: #241815;
        font-size: 15px;
        letter-spacing: 0.1em;
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
        color: #6e5a54;
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
      .logo-youtube {
        border-radius: 7px;
        font-size: 12px;
      }
      .bar-track,
      .trend-bar {
        overflow: hidden;
        border-radius: 999px;
        background: #f1e6e2;
      }
      .bar-track {
        height: 8px;
        margin: 14px 0 12px;
      }
      .bar-fill,
      .trend-bar span {
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
      .report-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }
      .report-table th {
        color: #8f6b61;
        font-size: 9px;
        letter-spacing: 0.1em;
        text-align: left;
        text-transform: uppercase;
      }
      .report-table th,
      .report-table td {
        border-bottom: 1px solid #f0d8d1;
        padding: 8px 6px;
        vertical-align: middle;
      }
      .report-table td strong {
        display: block;
        font-size: 10px;
      }
      .report-table td small {
        display: block;
        margin-top: 2px;
        color: #8f6b61;
        font-size: 9px;
      }
      .trend-cell {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
      }
      .trend-bar {
        height: 7px;
      }
      .trend-bar span {
        background: #e83f23;
      }
      footer {
        margin-top: 16px;
        color: #8f6b61;
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
      }
    </style>
  </head>
  <body>
    <button class="print-button" onclick="window.print()">Print / Save PDF</button>
    <main class="report">
      <section class="cover">
        <div class="eyebrow">SAMARTH Report</div>
        <h1>Social Performance Report</h1>
        <p class="subtitle">Single Admin Managed AI Run Thematic Handles · Generated ${escapeHtml(input.generatedAt)}</p>
        <div class="meta-grid">
          <div><span>Date Range</span><strong>${escapeHtml(input.dateRangeLabel)}</strong></div>
          <div><span>Timeline</span><strong>${escapeHtml(input.filters.timeline)}</strong></div>
          <div><span>Channel</span><strong>${escapeHtml(input.filters.platform)}</strong></div>
          <div><span>State</span><strong>${escapeHtml(input.filters.state)}</strong></div>
          <div><span>Page</span><strong>${escapeHtml(input.filters.page)}</strong></div>
          <div><span>Contributor</span><strong>${escapeHtml(input.filters.contributor)}</strong></div>
        </div>
        <div class="metrics">
          ${metricCard('Contents Published', formatNumber(input.metrics.entries), 'active records in range')}
          ${metricCard('Views', formatNumber(input.metrics.views), `${formatCompact(input.metrics.avgViews)} avg per entry`)}
          ${metricCard('Engagement', formatNumber(input.metrics.engagement), 'likes + comments + shares')}
          ${metricCard('Action Signal', `${input.metrics.actionSignalRate.toFixed(1)}%`, 'comments + shares / views')}
          ${metricCard('Likes', formatNumber(input.metrics.likes), 'reaction volume')}
          ${metricCard('Comments', formatNumber(input.metrics.comments), 'audience replies')}
          ${metricCard('Shares', formatNumber(input.metrics.shares), 'forwarded content')}
          ${metricCard('Platforms', String(input.platformBreakdown.filter(item => item.entries > 0).length), 'channels with activity')}
        </div>
      </section>

      <section class="section">
        <h2>Channel Breakdown</h2>
        <div class="platforms">
          ${input.platformBreakdown.map(item => renderPlatformSection(item, maxPlatformViews)).join('')}
        </div>
      </section>

      <section class="section">
        <h2>Daily Trend</h2>
        ${renderTrend(input.trendData)}
      </section>

      <section class="section">
        <h2>Top Contributors</h2>
        <table class="report-table">
          <thead><tr><th>#</th><th>Contributor</th><th>Posts</th><th>Views</th><th>Engagement</th></tr></thead>
          <tbody>${topContributorRows || '<tr><td colspan="5">No contributor data available.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="section">
        <h2>Top Content</h2>
        <table class="report-table">
          <thead><tr><th>#</th><th>Content</th><th>Platform</th><th>Contributor</th><th>Views</th><th>Engagement</th></tr></thead>
          <tbody>${topPostRows || '<tr><td colspan="6">No content data available.</td></tr>'}</tbody>
        </table>
      </section>

      <footer>Prepared by SAMARTH Workspace · Export reflects selected dashboard filters at generation time.</footer>
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
