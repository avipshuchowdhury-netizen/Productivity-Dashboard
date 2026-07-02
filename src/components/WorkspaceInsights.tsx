import React, { useState } from 'react';
import { AuditItem, STATES_LIST, PAGES_LIST, SocialPage } from '../types';
import { TrendingUp, Users, Target, ThumbsUp, Smartphone, Play, MapPin, Globe, ExternalLink, MessageCircle, Share2, Trophy, FileText } from 'lucide-react';
import { generateWorkspaceReportPdf } from '../utils/reportExport';
import { socialPageUrlForPlatform } from '../utils/socialLinks';

interface Props {
  auditItems: AuditItem[];
  savedPages: SocialPage[];
  activePlatform: 'all' | 'facebook' | 'instagram' | 'youtube';
  onChangePlatform: (p: 'all' | 'facebook' | 'instagram' | 'youtube') => void;
  canGenerateReport?: boolean;
}

type TrendMetric = 'views' | 'likes' | 'comments' | 'shares';
type ContributorMetric = 'performance' | 'posts' | 'views' | 'likes' | 'comments' | 'shares';

type ContributorStat = {
  name: string;
  count: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  performance: number;
  topPlatform: AuditItem['platform'];
};

export default function WorkspaceInsights({ 
  auditItems, 
  savedPages, 
  activePlatform, 
  onChangePlatform,
  canGenerateReport = false
}: Props) {
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>('views');
  const [selectedContributor, setSelectedContributor] = useState<string>('All Contributors');
  const [selectedContributorMetric, setSelectedContributorMetric] = useState<ContributorMetric>('views');
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [hoveredContributor, setHoveredContributor] = useState<string | null>(null);
  const [hoveredMetricContributor, setHoveredMetricContributor] = useState<string | null>(null);
  const [reportNotice, setReportNotice] = useState('');
  const selectedPlatform = activePlatform;
  const setSelectedPlatform = onChangePlatform;
  
  // Theme Helper classes
  const getThemeClasses = () => {
    switch (activePlatform) {
      case 'facebook':
        return {
          primaryText: 'text-[#1877f2]',
          primaryBg: 'bg-[#1877f2]',
          primaryBorder: 'border-[#bfd8ff] focus:border-[#1877f2] focus:ring-[#1877f2]/10',
          accentBorder: 'border-[#bfd8ff] hover:border-[#1877f2]',
          primaryHover: 'hover:bg-[#0b5fcc]',
          lightBg: 'bg-[#eef5ff]',
          textColor: 'text-[#1877f2]',
          outlineRing: 'focus:outline-[#1877f2]',
          chartFill: '#1877f2'
        };
      case 'instagram':
        return {
          primaryText: 'text-[#e1306c]',
          primaryBg: 'bg-[#e1306c]',
          primaryBorder: 'border-[#ffc2da] focus:border-[#e1306c] focus:ring-[#e1306c]/10',
          accentBorder: 'border-[#ffc2da] hover:border-[#e1306c]',
          primaryHover: 'hover:bg-[#c13584]',
          lightBg: 'bg-[#fff0f6]',
          textColor: 'text-[#e1306c]',
          outlineRing: 'focus:outline-[#e1306c]',
          chartFill: '#e1306c'
        };
      case 'youtube':
        return {
          primaryText: 'text-[#ff0000]',
          primaryBg: 'bg-[#ff0000]',
          primaryBorder: 'border-[#ffb8b8] focus:border-[#ff0000] focus:ring-[#ff0000]/10',
          accentBorder: 'border-[#ffb8b8] hover:border-[#ff0000]',
          primaryHover: 'hover:bg-[#cc0000]',
          lightBg: 'bg-[#fff1f1]',
          textColor: 'text-[#ff0000]',
          outlineRing: 'focus:outline-[#ff0000]',
          chartFill: '#ff0000'
        };
      default:
        return {
          primaryText: 'text-[var(--palette-accent)]',
          primaryBg: 'bg-[var(--palette-accent)]',
          primaryBorder: 'border-[var(--palette-line)] focus:border-[var(--palette-accent)]',
          accentBorder: 'border-[var(--palette-line)] hover:border-[var(--palette-accent)]',
          primaryHover: 'hover:opacity-90',
          lightBg: 'bg-[var(--palette-soft)]',
          textColor: 'text-[var(--palette-ink)]',
          outlineRing: 'focus:outline-[var(--palette-accent)]',
          chartFill: 'var(--palette-accent)'
        };
    }
  };

  const theme = getThemeClasses();
  const platformLabels: Record<AuditItem['platform'], string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'YouTube'
  };
  const contributorMetricLabels: Record<ContributorMetric, string> = {
    performance: 'Performance',
    posts: 'Posts',
    views: 'Views',
    likes: 'Likes',
    comments: 'Comments',
    shares: 'Shares'
  };
  const trendMetricLabels: Record<TrendMetric, string> = {
    views: 'Views',
    likes: 'Likes',
    comments: 'Comments',
    shares: 'Shares'
  };
  const formatCompact = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Math.round(value).toLocaleString();
  };
  const isArchived = (item: AuditItem) => Boolean(item.archivedAt);
  const getInitials = (name: string) => name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'C';

  // Timeline selection
  const [selectedTimeline, setSelectedTimeline] = useState<'7d' | '15d' | '30d' | '90d' | 'custom'>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // State & Page filter states
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedPage, setSelectedPage] = useState<string>('All Pages');

  // Page List dynamically maps to configured Saved Pages list
  const currentPagesList = savedPages.length > 0 ? savedPages.map(p => p.name) : PAGES_LIST;

  // Assign deterministic fallbacks only when older records lack state/page fields.
  const auditItemsWithDefaults = auditItems.map((item, idx) => {
    const defaultState = STATES_LIST[idx % STATES_LIST.length];
    const defaultPage = currentPagesList.length > 0 ? currentPagesList[idx % currentPagesList.length] : '';
    return {
      ...item,
      state: item.state || defaultState,
      page: item.page || defaultPage
    };
  });
  const activeAuditItemsWithDefaults = auditItemsWithDefaults.filter(item => !isArchived(item));


  // Calculate reference date based on data or today
  const getReferenceDate = () => {
    if (activeAuditItemsWithDefaults.length === 0) return new Date();
    const dates = activeAuditItemsWithDefaults.map(item => new Date(item.publishedAt).getTime());
    return new Date(Math.max(...dates));
  };

  const refDate = getReferenceDate();
  const timelineDays: Partial<Record<typeof selectedTimeline, number>> = {
    '7d': 7,
    '15d': 15,
    '30d': 30,
    '90d': 90
  };
  const timelineLabels: Record<typeof selectedTimeline, string> = {
    '7d': 'Last 7 days',
    '15d': 'Last 15 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    custom: 'Custom range'
  };
  const formatDateLabel = (date: Date) => date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const getDateRangeLabel = () => {
    if (selectedTimeline === 'custom') {
      if (customStartDate && customEndDate) return `${customStartDate} to ${customEndDate}`;
      return 'Custom range';
    }
    const days = timelineDays[selectedTimeline] || 7;
    const startDate = new Date(refDate);
    startDate.setDate(startDate.getDate() - days);
    return `${formatDateLabel(startDate)} to ${formatDateLabel(refDate)}`;
  };

  // Timeline + State + Page Filter
  const filteredTimelineAndStateData = activeAuditItemsWithDefaults.filter(item => {
    // 1. Timeline filter
    const itemTime = new Date(item.publishedAt).getTime();
    let matchesTimeline = true;
    if (selectedTimeline !== 'custom') {
      const cutOff = new Date(refDate);
      cutOff.setDate(cutOff.getDate() - (timelineDays[selectedTimeline] || 7));
      matchesTimeline = itemTime >= cutOff.getTime();
    } else if (selectedTimeline === 'custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate).getTime();
        const end = new Date(customEndDate).getTime();
        matchesTimeline = itemTime >= start && itemTime <= end;
      }
    }

    // 2. State Filter
    const matchesState = selectedState === 'All States' || item.state === selectedState;

    // 3. Page Filter
    const matchesPage = selectedPage === 'All Pages' || item.page === selectedPage;

    // 4. Platform Filter
    const matchesPlatform = selectedPlatform === 'all' || item.platform === selectedPlatform;

    return matchesTimeline && matchesState && matchesPage && matchesPlatform;
  });

  // Contributor stats based on the current timeline/state/page/platform context.
  const authorStatsMap: Record<string, {
    count: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    platforms: Record<AuditItem['platform'], number>;
  }> = {};
  filteredTimelineAndStateData.forEach(item => {
    const authorName = item.author || 'Unknown Contributor';
    if (!authorStatsMap[authorName]) {
      authorStatsMap[authorName] = {
        count: 0,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        platforms: { facebook: 0, instagram: 0, youtube: 0 }
      };
    }
    authorStatsMap[authorName].count += 1;
    authorStatsMap[authorName].views += item.views;
    authorStatsMap[authorName].likes += item.likes;
    authorStatsMap[authorName].comments += item.comments;
    authorStatsMap[authorName].shares += item.shares;
    authorStatsMap[authorName].platforms[item.platform] += 1;
  });

  const authorStats: ContributorStat[] = Object.entries(authorStatsMap).map(([name, stats]) => {
    const performance = stats.views + stats.likes + stats.comments + stats.shares;
    const topPlatform = (Object.entries(stats.platforms)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'facebook') as AuditItem['platform'];
    return {
      name,
      count: stats.count,
      views: stats.views,
      likes: stats.likes,
      comments: stats.comments,
      shares: stats.shares,
      performance,
      topPlatform
    };
  }).sort((a, b) => b.views - a.views);

  const contributorOptions = authorStats.map(author => author.name);
  const contributorFilterValue = contributorOptions.includes(selectedContributor) ? selectedContributor : 'All Contributors';
  const focusedTimelineData = contributorFilterValue === 'All Contributors'
    ? filteredTimelineAndStateData
    : filteredTimelineAndStateData.filter(item => (item.author || 'Unknown Contributor') === contributorFilterValue);
  const focusedContributorStat = contributorFilterValue === 'All Contributors'
    ? null
    : authorStats.find(author => author.name === contributorFilterValue) || null;

  const getContributorMetricValue = (stat: ContributorStat) => {
    switch (selectedContributorMetric) {
      case 'performance':
        return stat.performance;
      case 'posts':
        return stat.count;
      case 'likes':
        return stat.likes;
      case 'comments':
        return stat.comments;
      case 'shares':
        return stat.shares;
      default:
        return stat.views;
    }
  };
  const formatContributorMetric = (value: number) => formatCompact(value);
  const rankedAuthorStats = [...authorStats].sort((a, b) => getContributorMetricValue(b) - getContributorMetricValue(a));
  const maxContributorMetric = Math.max(...rankedAuthorStats.map(getContributorMetricValue), 1);
  const maxContributorViews = Math.max(...authorStats.map(author => author.views), 1);
  const maxContributorLikes = Math.max(...authorStats.map(author => author.likes), 1);
  const maxContributorComments = Math.max(...authorStats.map(author => author.comments), 1);
  const maxContributorShares = Math.max(...authorStats.map(author => author.shares), 1);
  const detailContributor = authorStats.find(author => author.name === hoveredMetricContributor)
    || focusedContributorStat
    || rankedAuthorStats[0]
    || null;

  // Metrics calculations
  const totalViews = focusedTimelineData.reduce((acc, item) => acc + item.views, 0);
  const totalLikes = focusedTimelineData.reduce((acc, item) => acc + item.likes, 0);
  const totalComments = focusedTimelineData.reduce((acc, item) => acc + item.comments, 0);
  const totalShares = focusedTimelineData.reduce((acc, item) => acc + item.shares, 0);
  const activeEntryCount = focusedTimelineData.length;
  const engagementTotal = totalLikes + totalComments + totalShares;
  const avgViewsPerEntry = activeEntryCount > 0 ? Math.round(totalViews / activeEntryCount) : 0;
  const avgEngagementPerEntry = activeEntryCount > 0 ? Math.round(engagementTotal / activeEntryCount) : 0;
  const commentShareSignal = totalViews > 0 ? ((totalComments + totalShares) / totalViews) * 100 : 0;
  const selectedTimelineLabel = timelineLabels[selectedTimeline];

  // Platform specific counts
  const fbItems = focusedTimelineData.filter(i => i.platform === 'facebook');
  const igItems = focusedTimelineData.filter(i => i.platform === 'instagram');
  const ytItems = focusedTimelineData.filter(i => i.platform === 'youtube');

  const fbViews = fbItems.reduce((acc, i) => acc + i.views, 0);
  const igViews = igItems.reduce((acc, i) => acc + i.views, 0);
  const ytViews = ytItems.reduce((acc, i) => acc + i.views, 0);
  const totalChannelViews = fbViews + igViews + ytViews;
  const platformBreakdown = ([
    ['facebook', fbItems],
    ['instagram', igItems],
    ['youtube', ytItems]
  ] as const).map(([platform, items]) => ({
    platform,
    entries: items.length,
    views: items.reduce((acc, item) => acc + item.views, 0),
    likes: items.reduce((acc, item) => acc + item.likes, 0),
    comments: items.reduce((acc, item) => acc + item.comments, 0),
    shares: items.reduce((acc, item) => acc + item.shares, 0)
  }));

  // Prepare daily trends for SVG chart
  const uniqueDates = Array.from(new Set(focusedTimelineData.map(item => item.publishedAt))).sort();
  const chartData = uniqueDates.map(date => {
    const dayItems = focusedTimelineData.filter(item => item.publishedAt === date);
    const views = dayItems.reduce((acc, i) => acc + i.views, 0);
    const likes = dayItems.reduce((acc, i) => acc + i.likes, 0);
    const comments = dayItems.reduce((acc, i) => acc + i.comments, 0);
    const shares = dayItems.reduce((acc, i) => acc + i.shares, 0);
    return {
      date: date.slice(5),
      fullDate: date,
      views,
      likes,
      comments,
      shares,
      posts: dayItems.length
    };
  });

  const currentMetricKey = selectedMetric;
  const maxVal = Math.max(...chartData.map(d => d[currentMetricKey]), 100);
  const hoveredTrendPoint = hoveredTrendIndex !== null ? chartData[hoveredTrendIndex] : null;
  const leaderboardLeader = rankedAuthorStats[0] || null;
  const leaderScore = leaderboardLeader ? getContributorMetricValue(leaderboardLeader) : 0;
  const getRankLabel = (index: number) => {
    if (index === 0) return 'Champion';
    if (index === 1) return 'Runner-up';
    return '';
  };
  const getRankAccent = (index: number) => {
    if (index === 0) return '#f73b20';
    if (index === 1) return '#477ee9';
    if (index === 2) return '#34c771';
    return '#fb2d54';
  };
  const selectedPageLinks = selectedPage !== 'All Pages'
    ? savedPages.find(page => page.name === selectedPage)
    : undefined;
  const selectedPagePlatformLinks = selectedPageLinks
    ? ([
        ['facebook', socialPageUrlForPlatform(selectedPageLinks, 'facebook')],
        ['instagram', socialPageUrlForPlatform(selectedPageLinks, 'instagram')],
        ['youtube', socialPageUrlForPlatform(selectedPageLinks, 'youtube')]
      ] as const).filter(([, url]) => Boolean(url))
    : [];
  const activeSelectedPageLink = selectedPageLinks
    ? selectedPlatform === 'all'
      ? selectedPagePlatformLinks[0]?.[1] || selectedPageLinks.url
      : socialPageUrlForPlatform(selectedPageLinks, selectedPlatform)
    : '';
  const handleGenerateReport = () => {
    const reportOpened = generateWorkspaceReportPdf({
      generatedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      dateRangeLabel: getDateRangeLabel(),
      filters: {
        timeline: selectedTimelineLabel,
        state: selectedState,
        page: selectedPage,
        contributor: contributorFilterValue,
        platform: selectedPlatform === 'all' ? 'All platforms' : platformLabels[selectedPlatform]
      },
      metrics: {
        entries: activeEntryCount,
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        engagement: engagementTotal,
        avgViews: avgViewsPerEntry,
        actionSignalRate: commentShareSignal
      },
      platformBreakdown,
      contributors: rankedAuthorStats.map(author => ({
        name: author.name,
        count: author.count,
        views: author.views,
        likes: author.likes,
        comments: author.comments,
        shares: author.shares
      })),
      topPosts: [...focusedTimelineData].sort((a, b) => b.views - a.views),
      trendData: chartData.map(point => ({
        date: point.fullDate,
        views: point.views,
        likes: point.likes,
        comments: point.comments,
        shares: point.shares,
        posts: point.posts
      })),
      savedPages
    });

    setReportNotice(reportOpened
      ? 'Report opened. Use Save as PDF in the print dialog.'
      : 'Popup blocked. Allow popups for this site to generate the PDF.');
  };

  return (
    <div id="workspace-insights" className="space-y-6">
      
      {/* Top Filter & Control Panel with Orange Theme Accents */}
      <div className="samarth-command-panel relative overflow-hidden flex flex-col gap-4 p-6 rounded-xl shadow-xs">
        <div className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,var(--palette-accent),var(--sci-cyan))]" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-800">SAMARTH Command Grid</h2>
            <p className="text-xs text-slate-500">Live performance signals for active handles and contributor uploads.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--palette-line)] bg-[var(--surface-glass)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {focusedTimelineData.length} active entries
              </span>
              <span className="rounded-full border border-[color-mix(in_srgb,var(--sci-cyan)_38%,transparent)] bg-[color-mix(in_srgb,var(--sci-cyan)_10%,transparent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sci-cyan)]">
                {formatCompact(totalViews)} views
              </span>
              <span className="rounded-full border border-[color-mix(in_srgb,var(--palette-accent-3)_38%,transparent)] bg-[color-mix(in_srgb,var(--palette-accent-3)_10%,transparent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--palette-accent-3)]">
                {authorStats.length} contributors
              </span>
            </div>
          </div>
          
          {/* Timeline Selector in Top Corner */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 font-mono">TIMELINE:</span>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-0.5 border border-slate-200">
              {([
                { id: '7d', label: '7D' },
                { id: '15d', label: '15D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
                { id: 'custom', label: 'Custom' }
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTimeline(t.id)}
                  className={`px-3 py-1 text-xs font-bold transition rounded-md cursor-pointer ${
                    selectedTimeline === t.id 
                      ? `${theme.primaryBg} text-white shadow-xs` 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {canGenerateReport && (
              <button
                type="button"
                onClick={handleGenerateReport}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--palette-line)] bg-[var(--surface-glass)] px-3 py-2 text-xs font-bold text-[var(--palette-ink)] shadow-xs transition hover:border-[var(--palette-accent)]"
              >
                <FileText className="h-4 w-4 text-[var(--palette-accent)]" />
                Generate PDF
              </button>
            )}
          </div>
        </div>

        {reportNotice && (
          <div className="self-start rounded-lg border border-[var(--palette-line)] bg-[var(--surface-glass)] px-3 py-2 text-xs font-bold text-[var(--text-muted)]">
            {reportNotice}
          </div>
        )}

        {/* Custom date range display if 'custom' is active */}
        {selectedTimeline === 'custom' && (
          <div className={`flex flex-wrap items-center gap-4 ${theme.lightBg} p-3 rounded-lg border ${theme.accentBorder} text-xs animate-fade-in self-start`}>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">From:</span>
              <input 
                type="date" 
                className={`px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 ${theme.outlineRing}`}
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">To:</span>
              <input 
                type="date" 
                className={`px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 ${theme.outlineRing}`}
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* State-wise, Page-wise, Contributor-wise, and Channel filters */}
        <div className="rounded-lg border border-[var(--palette-line)] bg-[var(--surface-panel)] p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
          {/* State Filter */}
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 shrink-0 ${theme.primaryText}`} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">State:</span>
            <select
              className={`flex-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden transition ${theme.primaryBorder}`}
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
            >
              <option value="All States">All States (Consolidated)</option>
              {STATES_LIST.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Page Name Filter with URL link display */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Globe className={`w-4 h-4 shrink-0 ${theme.primaryText}`} />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Page Name:</span>
              <select
                className={`flex-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden transition ${theme.primaryBorder}`}
                value={selectedPage}
                onChange={e => setSelectedPage(e.target.value)}
              >
                <option value="All Pages">All Pages</option>
                {currentPagesList.map(pg => (
                  <option key={pg} value={pg}>{pg}</option>
                ))}
              </select>
            </div>
            {selectedPage !== 'All Pages' && (
              <div className="text-[10px] self-end font-semibold flex items-center gap-1 mt-0.5">
                {activeSelectedPageLink ? (
                  <a
                    href={activeSelectedPageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${theme.primaryText} flex items-center gap-0.5 hover:underline`}
                  >
                    Visit Page: <span className="underline max-w-[150px] truncate">{activeSelectedPageLink}</span> <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-400">No URL link attached</span>
                )}
              </div>
            )}
          </div>

          {/* Contributor Filter */}
          <div className="flex items-center gap-2">
            <Users className={`w-4 h-4 shrink-0 ${theme.primaryText}`} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Contributor:</span>
            <select
              className={`flex-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden transition ${theme.primaryBorder}`}
              value={contributorFilterValue}
              onChange={e => setSelectedContributor(e.target.value)}
            >
              <option value="All Contributors">All Contributors</option>
              {contributorOptions.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          {/* Channel Platform Tab */}
          <div className="flex items-center gap-2 md:col-span-2 xl:col-span-3 2xl:col-span-1 2xl:justify-end">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight hidden lg:inline">Channel:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 gap-0.5 max-w-full overflow-x-auto">
              {(['all', 'facebook', 'instagram', 'youtube'] as const).map(plat => (
                <button
                  key={plat}
                  onClick={() => setSelectedPlatform(plat)}
                  className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold capitalize transition rounded-md cursor-pointer ${
                    selectedPlatform === plat
                      ? `${theme.primaryBg} text-white shadow-2xs`
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {plat === 'all' ? 'All' : plat}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Core KPI metrics: content published, views, likes, comments, and shares */}
      <div id="insights-kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Contents Published */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:border-[#e83f23]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contents Published</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {activeEntryCount} <span className="text-sm font-semibold text-slate-500">Units</span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center justify-between gap-2">
            <span>{selectedTimelineLabel}</span>
            <span className="font-mono text-[var(--palette-accent)]">{authorStats.length} users</span>
          </p>
        </div>

        {/* Metric 2: Views */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:border-[#e83f23]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Views</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {totalViews.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center justify-between gap-2">
            <span>{focusedContributorStat ? focusedContributorStat.name : 'Current period'}</span>
            <span className="font-mono text-[var(--palette-accent-2)]">{formatCompact(avgViewsPerEntry)} avg</span>
          </p>
        </div>

        {/* Metric 3: Likes */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:border-[#e83f23]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Likes</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <ThumbsUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {totalLikes.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center justify-between gap-2">
            <span>Reactions recorded</span>
            <span className="font-mono text-[var(--palette-accent-3)]">{formatCompact(avgEngagementPerEntry)} avg eng.</span>
          </p>
        </div>

        {/* Metric 4: Comments */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:border-[#e83f23]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comments</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <MessageCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {totalComments.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center justify-between gap-2">
            <span>Audience replies</span>
            <span className="font-mono text-[#fb2d54]">{formatCompact(totalComments + totalShares)} action signal</span>
          </p>
        </div>

        {/* Metric 5: Shares */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:border-[#e83f23]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shares</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {totalShares.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center justify-between gap-2">
            <span>Forwarded content</span>
            <span className="font-mono text-[var(--sci-violet)]">{commentShareSignal.toFixed(1)}% signal</span>
          </p>
        </div>

      </div>

      {/* Main Graph & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive SVG Chart with dynamic theme and simple text */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Performance Trends</h3>
                <p className="text-xs text-slate-400">Comparing active levels over the selected audit timeline.</p>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs text-center">
                {(['views', 'likes', 'comments', 'shares'] as const).map(met => (
                  <button
                    key={met}
                    onClick={() => setSelectedMetric(met)}
                    className={`px-3 py-1 font-bold uppercase rounded-md transition cursor-pointer ${
                      selectedMetric === met
                        ? `${theme.primaryBg} text-white shadow-2xs`
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {trendMetricLabels[met]}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Visual Canvas Area */}
            <div className="h-64 w-full relative select-none">
              {chartData.length > 1 ? (
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Horizontal reference lines */}
                  {[0, 25, 50, 75, 100].map((percent, ix) => (
                    <line 
                      key={ix} 
                      x1="0" 
                      y1={percent} 
                      x2="100" 
                      y2={percent} 
                      stroke="#f1f5f9" 
                      strokeWidth="0.5" 
                    />
                  ))}

                  {/* Graph Path */}
                  <path
                    d={chartData.reduce((pathStr, d, idx) => {
                      const x = (idx / (chartData.length - 1)) * 100;
                      const y = 90 - (d[currentMetricKey] / maxVal) * 80;
                      return `${pathStr} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }, '')}
                    fill="none"
                    stroke={theme.chartFill}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Filled Gradient Underneath */}
                  <path
                    d={`${chartData.reduce((pathStr, d, idx) => {
                      const x = (idx / (chartData.length - 1)) * 100;
                      const y = 90 - (d[currentMetricKey] / maxVal) * 80;
                      return `${pathStr} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }, '')} L 100 100 L 0 100 Z`}
                    fill="url(#trend-gradient)"
                    opacity="0.12"
                  />

                  {/* Gradient Definition */}
                  <defs>
                    <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.chartFill} />
                      <stop offset="100%" stopColor={theme.chartFill} stopOpacity="0.1" />
                    </linearGradient>
                  </defs>

                  {/* Data Points */}
                  {chartData.map((d, index) => {
                    const x = (index / (chartData.length - 1)) * 100;
                    const y = 90 - (d[currentMetricKey] / maxVal) * 80;
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r={hoveredTrendIndex === index ? '2.9' : '1.8'}
                        stroke="white"
                        strokeWidth="0.4"
                        fill={theme.chartFill}
                        tabIndex={0}
                        onMouseEnter={() => setHoveredTrendIndex(index)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                        onFocus={() => setHoveredTrendIndex(index)}
                        onBlur={() => setHoveredTrendIndex(null)}
                        className="transition cursor-pointer outline-none"
                      />
                    );
                  })}
                </svg>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                  Add another dated entry to draw this trend.
                </div>
              )}

              {/* Float value indicators */}
              {chartData.length > 1 && (
                <div className="absolute inset-x-0 bottom-0 top-2 flex justify-between pointer-events-none text-[10px] text-slate-400 font-mono items-end mt-1 px-1">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className="bg-slate-950/5 text-slate-800 px-1 py-0.5 rounded-sm font-semibold mb-1">
                        {d[currentMetricKey] >= 1000 
                          ? `${(d[currentMetricKey] / 1000).toFixed(1)}k` 
                          : d[currentMetricKey]}
                      </span>
                      <span className="font-semibold text-slate-500">{d.date}</span>
                    </div>
                  ))}
                </div>
              )}

              {hoveredTrendPoint && (
                <div className="absolute right-2 top-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg text-xs pointer-events-none">
                  <div className="font-bold text-slate-800">{hoveredTrendPoint.fullDate}</div>
                  <div className={`${theme.primaryText} font-extrabold mt-0.5`}>
                    {formatCompact(hoveredTrendPoint[currentMetricKey])} {trendMetricLabels[selectedMetric].toLowerCase()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{hoveredTrendPoint.posts} entries</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className={`flex items-center gap-1.5 font-bold ${theme.primaryText}`}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: theme.chartFill }}></span>
              {trendMetricLabels[selectedMetric].toUpperCase()} Trends
            </span>
            <span>{focusedContributorStat ? `${focusedContributorStat.name} contribution view` : 'All contributor activity'}</span>
          </div>
        </div>

        {/* Platform Share and Leaderboard */}
        <div id="channel-share-matrix" className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">Channel Volume</h3>
            
            {/* Visual Bars for Channels */}
            <div className="space-y-4">
              {/* YouTube */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5 text-[#ff0000]" /> YouTube Views</span>
                  <span>{ytViews.toLocaleString()} views</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#ff0000] h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalChannelViews > 0 ? Math.max(5, (ytViews / totalChannelViews) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Instagram */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-[#e1306c]" /> Instagram Reels</span>
                  <span>{igViews.toLocaleString()} views</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#e1306c] h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalChannelViews > 0 ? Math.max(5, (igViews / totalChannelViews) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Facebook */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-[#1877f2]" /> Facebook Feed</span>
                  <span>{fbViews.toLocaleString()} views</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#1877f2] h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalChannelViews > 0 ? Math.max(5, (fbViews / totalChannelViews) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Team Contributor Leaderboard */}
            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Top Contributors</h4>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                {authorStats.length > 0 ? (
                  authorStats.slice(0, 5).map((author, i) => (
                    <button
                      key={author.name}
                      onClick={() => setSelectedContributor(author.name)}
                      className={`w-full py-2 flex items-center justify-between text-xs text-left transition ${
                        contributorFilterValue === author.name ? theme.lightBg : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          contributorFilterValue === author.name ? `${theme.primaryBg} text-white` : 'bg-[#fef5f3] text-[#6c3a2f]'
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 block">{author.name}</span>
                          <span className="text-slate-400 block text-[10px]">{platformLabels[author.topPlatform]} focus</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-800">
                          {formatCompact(author.views)} views
                        </span>
                        <span className="text-slate-400 block text-[10px]">{author.count} posts / {formatCompact(author.shares)} shares</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-3 text-center">No contributor activity within filters</div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400">
            Current filters and uploaded contributor entries.
          </div>
        </div>
      </div>

      {/* Contributor-wise Performance */}
      <div id="contributor-performance" className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Contributor Leaderboard</h3>
              <p className="text-xs text-slate-400">Ranked by the selected metric and current filters.</p>
            </div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs text-center overflow-x-auto">
              {(['performance', 'posts', 'views', 'likes', 'comments', 'shares'] as const).map(metric => (
                <button
                  key={metric}
                  onClick={() => setSelectedContributorMetric(metric)}
                  className={`px-3 py-1 font-bold uppercase rounded-md transition cursor-pointer whitespace-nowrap ${
                    selectedContributorMetric === metric
                      ? `${theme.primaryBg} text-white shadow-2xs`
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {contributorMetricLabels[metric]}
                </button>
              ))}
            </div>
          </div>

          {leaderboardLeader && (
            <button
              type="button"
              onClick={() => setSelectedContributor(leaderboardLeader.name)}
              className="mb-5 w-full rounded-lg border border-[#f8a4a4] bg-[linear-gradient(135deg,#fbdfd9_0%,#fef5f3_55%,#e6f0ff_100%)] p-4 text-left transition hover:brightness-[0.99]"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-full bg-[#f73b20] text-white flex items-center justify-center shrink-0">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#f73b20]">Current Leader</div>
                    <div className="mt-1 text-2xl font-display font-semibold leading-none text-[#360802] truncate">
                      {leaderboardLeader.name}
                    </div>
                    <div className="mt-1 text-[11px] text-[#6c3a2f]">
                      Leading on {contributorMetricLabels[selectedContributorMetric].toLowerCase()} with {leaderboardLeader.count} posts and {platformLabels[leaderboardLeader.topPlatform]} focus.
                    </div>
                  </div>
                </div>
                <div className="text-right lg:min-w-44">
                  <div className="rounded-lg bg-[#fffaf8] border border-[#f8a4a4] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-[#9b6255]">Top Score</div>
                    <div className="mt-1 text-xl font-display font-semibold text-[#360802]">{formatContributorMetric(leaderScore)}</div>
                  </div>
                </div>
              </div>
            </button>
          )}

          {rankedAuthorStats.length > 0 ? (
            <div className="space-y-3">
              {rankedAuthorStats.map((author, index) => {
                const metricValue = getContributorMetricValue(author);
                const barWidth = metricValue > 0 ? Math.max(6, (metricValue / maxContributorMetric) * 100) : 0;
                const isActive = contributorFilterValue === author.name;
                const isHovered = hoveredContributor === author.name;
                const rankAccent = getRankAccent(index);
                const rankLabel = getRankLabel(index);

                return (
                  <button
                    key={author.name}
                    onClick={() => setSelectedContributor(author.name)}
                    onMouseEnter={() => setHoveredContributor(author.name)}
                    onMouseLeave={() => setHoveredContributor(null)}
                    onFocus={() => setHoveredContributor(author.name)}
                    onBlur={() => setHoveredContributor(null)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition relative overflow-hidden ${
                      index === 0
                        ? 'border-[#f8a4a4] bg-[#fffaf8] hover:bg-[#fbdfd9]'
                        : isActive || isHovered
                          ? `${theme.accentBorder} ${theme.lightBg}`
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ backgroundColor: rankAccent }}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center text-xs font-extrabold border"
                          style={{
                            borderColor: rankAccent,
                            color: index === 0 ? '#ffffff' : rankAccent,
                            backgroundColor: index === 0 ? '#f73b20' : '#fffaf8'
                          }}
                        >
                          #{index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-bold text-sm text-slate-800 truncate">{author.name}</div>
                            {rankLabel && (
                              <span
                                className="rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                style={{ borderColor: rankAccent, color: rankAccent }}
                              >
                                {rankLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                            {author.count} posts / {platformLabels[author.topPlatform]}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-extrabold ${theme.primaryText}`}>
                          {formatContributorMetric(metricValue)}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {contributorMetricLabels[selectedContributorMetric]}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%`, backgroundColor: rankAccent }}
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1 text-[10px] text-slate-500">
                      <span><strong className="text-slate-700">{author.count}</strong> posts</span>
                      <span><strong className="text-slate-700">{formatCompact(author.views)}</strong> views</span>
                      <span><strong className="text-slate-700">{formatCompact(author.likes)}</strong> likes</span>
                      <span><strong className="text-slate-700">{formatCompact(author.comments)}</strong> comments</span>
                      <span><strong className="text-slate-700">{formatCompact(author.shares)}</strong> shares</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
              No contributor data yet.
            </div>
          )}
        </div>

        <div className="xl:col-span-2 p-5 bg-[#e6f0ff] border border-[#9fc0ff] rounded-xl shadow-xs">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Contributor Metric Comparison</h3>
            <p className="text-xs text-slate-400 mt-1">Side-by-side bars for views, likes, comments, and shares.</p>
          </div>

          {detailContributor ? (
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Selected</div>
                <div className="mt-1 font-extrabold text-slate-800 truncate">{detailContributor.name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Performance</div>
                <div className="mt-1 font-extrabold text-slate-800">{formatCompact(detailContributor.performance)}</div>
              </div>
            </div>
          ) : (
            <div className="mt-5 text-xs text-slate-400">No contributor data yet.</div>
          )}

          <div className="mt-5 space-y-4 max-h-96 overflow-y-auto pr-1">
            {rankedAuthorStats.map(author => {
              const isActive = contributorFilterValue === author.name;
              const isHovered = hoveredMetricContributor === author.name;
              const metrics = [
                { label: 'Views', value: author.views, max: maxContributorViews, color: theme.chartFill },
                { label: 'Likes', value: author.likes, max: maxContributorLikes, color: '#4a90e2' },
                { label: 'Comments', value: author.comments, max: maxContributorComments, color: '#34c771' },
                { label: 'Shares', value: author.shares, max: maxContributorShares, color: '#fb2d54' }
              ];

              return (
                <button
                  key={author.name}
                  onClick={() => setSelectedContributor(author.name)}
                  onMouseEnter={() => setHoveredMetricContributor(author.name)}
                  onMouseLeave={() => setHoveredMetricContributor(null)}
                  onFocus={() => setHoveredMetricContributor(author.name)}
                  onBlur={() => setHoveredMetricContributor(null)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    isActive || isHovered ? `${theme.accentBorder} ${theme.lightBg}` : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                        isActive ? `${theme.primaryBg} text-white` : 'bg-slate-100 text-slate-600'
                      }`}>
                        {getInitials(author.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-800 truncate">{author.name}</div>
                        <div className="text-[10px] text-slate-400">{author.count} posts</div>
                      </div>
                    </div>
                    <Trophy className={`w-4 h-4 shrink-0 ${theme.primaryText}`} />
                  </div>

                  <div className="mt-3 space-y-2">
                    {metrics.map(metric => (
                      <div key={metric.label}>
                        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                          <span>{metric.label}</span>
                          <span>{formatCompact(metric.value)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${metric.value > 0 ? Math.max(5, (metric.value / metric.max) * 100) : 0}%`,
                              backgroundColor: metric.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}

            {rankedAuthorStats.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                No contributor data yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
