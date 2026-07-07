import React, { useState } from 'react';
import { AuditItem, STATES_LIST, PAGES_LIST, SocialPage } from '../types';
import { ArrowDown, ArrowUp, Minus, TrendingUp, Users, Target, ThumbsUp, Smartphone, Play, MapPin, Globe, ExternalLink, MessageCircle, Share2, FileText } from 'lucide-react';
import { generateWorkspaceReportPdf } from '../utils/reportExport';
import { socialPageUrlForPlatform } from '../utils/socialLinks';

interface Props {
  auditItems: AuditItem[];
  savedPages: SocialPage[];
  activePlatform: 'all' | 'facebook' | 'instagram' | 'youtube';
  onChangePlatform: (p: 'all' | 'facebook' | 'instagram' | 'youtube') => void;
  canGenerateReport?: boolean;
}

type ContributorMetric = 'performance' | 'posts' | 'views' | 'likes' | 'comments' | 'shares';
type ContributorPlatformFilter = 'all' | AuditItem['platform'];

type ContributorStat = {
  name: string;
  count: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  performance: number;
};

type RankMovement = {
  direction: 'up' | 'down' | 'same' | 'new';
  delta: number;
  label: string;
};

export default function WorkspaceInsights({ 
  auditItems, 
  savedPages, 
  activePlatform, 
  onChangePlatform,
  canGenerateReport = false
}: Props) {
  const [selectedContributor, setSelectedContributor] = useState<string>('All Contributors');
  const [selectedContributorMetric, setSelectedContributorMetric] = useState<ContributorMetric>('performance');
  const [selectedContributorPlatform, setSelectedContributorPlatform] = useState<ContributorPlatformFilter>('all');
  const [hoveredContributor, setHoveredContributor] = useState<string | null>(null);
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
  const contributorPlatformOptions: Array<{ id: ContributorPlatformFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'facebook', label: platformLabels.facebook },
    { id: 'instagram', label: platformLabels.instagram },
    { id: 'youtube', label: platformLabels.youtube }
  ];
  const contributorPlatformLabel = selectedContributorPlatform === 'all'
    ? 'All platforms'
    : platformLabels[selectedContributorPlatform];
  const contributorMetricLabels: Record<ContributorMetric, string> = {
    performance: 'Performance',
    posts: 'Posts',
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
  // Timeline selection
  const [selectedTimeline, setSelectedTimeline] = useState<'7d' | '15d' | '30d' | '90d' | 'custom'>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // State & Page filter states
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedPage, setSelectedPage] = useState<string>('All Pages');

  // Page list combines configured pages with page names already present on uploaded entries.
  const configuredPagesList = savedPages.length > 0 ? savedPages.map(p => p.name) : PAGES_LIST;

  // Assign deterministic fallbacks only when older records lack state/page fields.
  const auditItemsWithDefaults = auditItems.map((item, idx) => {
    const defaultState = STATES_LIST[idx % STATES_LIST.length];
    const defaultPage = configuredPagesList.length > 0 ? configuredPagesList[idx % configuredPagesList.length] : '';
    return {
      ...item,
      state: item.state || defaultState,
      page: item.page || defaultPage
    };
  });
  const activeAuditItemsWithDefaults = auditItemsWithDefaults.filter(item => !isArchived(item));
  const currentPagesList = Array.from(new Set([
    ...configuredPagesList,
    ...activeAuditItemsWithDefaults
      .filter(item => selectedState === 'All States' || item.state === selectedState)
      .map(item => item.page || '')
      .filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b));


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
  const getCurrentPeriodRange = () => {
    if (selectedTimeline === 'custom') {
      if (!customStartDate || !customEndDate) return null;
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
      return { start, end };
    }

    const days = timelineDays[selectedTimeline] || 7;
    const start = new Date(refDate);
    start.setDate(start.getDate() - days);
    return { start, end: new Date(refDate) };
  };
  const currentPeriodRange = getCurrentPeriodRange();
  const previousPeriodRange = currentPeriodRange
    ? (() => {
        const durationMs = Math.max(86_400_000, currentPeriodRange.end.getTime() - currentPeriodRange.start.getTime());
        const end = new Date(currentPeriodRange.start.getTime() - 1);
        const start = new Date(end.getTime() - durationMs);
        return { start, end };
      })()
    : null;

  // Timeline + State + Page Filter
  const filteredTimelineStatePageData = activeAuditItemsWithDefaults.filter(item => {
    // 1. Timeline filter
    const itemTime = new Date(item.publishedAt).getTime();
    const matchesTimeline = currentPeriodRange
      ? itemTime >= currentPeriodRange.start.getTime() && itemTime <= currentPeriodRange.end.getTime()
      : true;

    // 2. State Filter
    const matchesState = selectedState === 'All States' || item.state === selectedState;

    // 3. Page Filter
    const matchesPage = selectedPage === 'All Pages' || item.page === selectedPage;

    return matchesTimeline && matchesState && matchesPage;
  });
  const previousTimelineStatePageData = previousPeriodRange
    ? activeAuditItemsWithDefaults.filter(item => {
        const itemTime = new Date(item.publishedAt).getTime();
        const matchesTimeline = itemTime >= previousPeriodRange.start.getTime() && itemTime <= previousPeriodRange.end.getTime();
        const matchesState = selectedState === 'All States' || item.state === selectedState;
        const matchesPage = selectedPage === 'All Pages' || item.page === selectedPage;
        return matchesTimeline && matchesState && matchesPage;
      })
    : [];

  const filteredTimelineAndStateData = filteredTimelineStatePageData.filter(item => (
    selectedPlatform === 'all' || item.platform === selectedPlatform
  ));
  const contributorLeaderboardData = selectedContributorPlatform === 'all'
    ? filteredTimelineStatePageData
    : filteredTimelineStatePageData.filter(item => item.platform === selectedContributorPlatform);
  const previousContributorLeaderboardData = selectedContributorPlatform === 'all'
    ? previousTimelineStatePageData
    : previousTimelineStatePageData.filter(item => item.platform === selectedContributorPlatform);

  const buildContributorStats = (items: AuditItem[]): ContributorStat[] => {
    const statsMap: Record<string, {
      count: number;
      views: number;
      likes: number;
      comments: number;
      shares: number;
    }> = {};

    items.forEach(item => {
      const authorName = item.author || 'Unknown Contributor';
      if (!statsMap[authorName]) {
        statsMap[authorName] = {
          count: 0,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
        };
      }
      statsMap[authorName].count += 1;
      statsMap[authorName].views += item.views;
      statsMap[authorName].likes += item.likes;
      statsMap[authorName].comments += item.comments;
      statsMap[authorName].shares += item.shares;
    });

    return Object.entries(statsMap).map(([name, stats]) => {
      const performance = stats.views + stats.likes + stats.comments + stats.shares;
      return {
        name,
        count: stats.count,
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        shares: stats.shares,
        performance
      };
    }).sort((a, b) => b.views - a.views);
  };

  // Contributor stats are ranked from their own platform filter, defaulting to all platforms.
  const authorStats = buildContributorStats(contributorLeaderboardData);

  const contributorOptions = Array.from(new Set(
    filteredTimelineStatePageData.map(item => item.author || 'Unknown Contributor')
  )).sort((a, b) => a.localeCompare(b));
  const contributorFilterValue = contributorOptions.includes(selectedContributor) ? selectedContributor : 'All Contributors';
  const focusedTimelineData = contributorFilterValue === 'All Contributors'
    ? filteredTimelineAndStateData
    : filteredTimelineAndStateData.filter(item => (item.author || 'Unknown Contributor') === contributorFilterValue);

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
  const previousAuthorStats = buildContributorStats(previousContributorLeaderboardData);
  const previousRankedAuthorStats = [...previousAuthorStats].sort((a, b) => getContributorMetricValue(b) - getContributorMetricValue(a));
  const previousRankByName = new Map(previousRankedAuthorStats.map((author, index) => [author.name, index + 1]));
  const podiumStats = rankedAuthorStats.slice(0, 3);
  const getRankMovement = (name: string, currentRank: number): RankMovement => {
    const previousRank = previousRankByName.get(name);
    if (!previousRank) return { direction: 'new', delta: 0, label: 'New' };
    const delta = previousRank - currentRank;
    if (delta > 0) return { direction: 'up', delta, label: `+${delta}` };
    if (delta < 0) return { direction: 'down', delta: Math.abs(delta), label: `-${Math.abs(delta)}` };
    return { direction: 'same', delta: 0, label: 'Hold' };
  };
  const getGapToOvertake = (index: number) => {
    if (index <= 0 || !rankedAuthorStats[index - 1] || !rankedAuthorStats[index]) return 0;
    return Math.max(1, getContributorMetricValue(rankedAuthorStats[index - 1]) - getContributorMetricValue(rankedAuthorStats[index]) + 1);
  };
  const getLeaderMargin = () => {
    if (rankedAuthorStats.length < 2) return 0;
    return Math.max(0, getContributorMetricValue(rankedAuthorStats[0]) - getContributorMetricValue(rankedAuthorStats[1]));
  };
  const getRankMovementClasses = (movement: RankMovement) => {
    if (movement.direction === 'up') return 'border-[#34c771]/40 bg-[#34c771]/10 text-[#168542]';
    if (movement.direction === 'down') return 'border-[#fb2d54]/35 bg-[#fb2d54]/10 text-[#b81235]';
    if (movement.direction === 'new') return 'border-[#477ee9]/35 bg-[#477ee9]/10 text-[#285bbf]';
    return 'border-slate-200 bg-white text-slate-500';
  };

  // Metrics calculations
  const totalViews = focusedTimelineData.reduce((acc, item) => acc + item.views, 0);
  const totalLikes = focusedTimelineData.reduce((acc, item) => acc + item.likes, 0);
  const totalComments = focusedTimelineData.reduce((acc, item) => acc + item.comments, 0);
  const totalShares = focusedTimelineData.reduce((acc, item) => acc + item.shares, 0);
  const activeEntryCount = focusedTimelineData.length;
  const engagementTotal = totalLikes + totalComments + totalShares;
  const avgViewsPerEntry = activeEntryCount > 0 ? Math.round(totalViews / activeEntryCount) : 0;
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
                {contributorOptions.length} contributors
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
              onChange={e => {
                setSelectedState(e.target.value);
                setSelectedPage('All Pages');
              }}
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
        </div>

      </div>

      {/* Channel Breakdown */}
      <div className="grid grid-cols-1 gap-6">
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
                {rankedAuthorStats.length > 0 ? (
                  rankedAuthorStats.slice(0, 5).map((author, i) => (
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
      <div id="contributor-performance">
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Contributor Leaderboard</h3>
                <p className="text-xs text-slate-400">Ranked by {contributorMetricLabels[selectedContributorMetric].toLowerCase()} across {contributorPlatformLabel.toLowerCase()}.</p>
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Leaderboard:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs text-center overflow-x-auto">
                {contributorPlatformOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedContributorPlatform(option.id)}
                    className={`px-3 py-1 font-bold uppercase rounded-md transition cursor-pointer whitespace-nowrap ${
                      selectedContributorPlatform === option.id
                        ? `${theme.primaryBg} text-white shadow-2xs`
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {podiumStats.length > 0 && (
            <div className="mb-5 grid gap-3 lg:grid-cols-3">
              {podiumStats.map((author, index) => {
                const metricValue = getContributorMetricValue(author);
                const rankAccent = getRankAccent(index);
                const rankMovement = getRankMovement(author.name, index + 1);
                const gapToOvertake = getGapToOvertake(index);
                const leaderMargin = getLeaderMargin();

                return (
                  <button
                    key={author.name}
                    type="button"
                    onClick={() => setSelectedContributor(author.name)}
                    className={`rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                      index === 0
                        ? 'border-[#f8a4a4] bg-[linear-gradient(135deg,#fbdfd9_0%,#fffaf8_58%,#e6f0ff_100%)]'
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-white"
                        style={{ backgroundColor: rankAccent }}
                      >
                        #{index + 1}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${getRankMovementClasses(rankMovement)}`}>
                        {rankMovement.direction === 'up' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : rankMovement.direction === 'down' ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {rankMovement.label}
                      </span>
                    </div>
                    <div className="mt-3 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {index === 0 ? 'Race Leader' : 'Chasing Position'}
                      </div>
                      <div className="mt-1 truncate text-base font-display font-semibold text-slate-900">
                        {author.name}
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {contributorMetricLabels[selectedContributorMetric]}
                        </div>
                        <div className="text-2xl font-display font-semibold text-[#360802]">
                          {formatContributorMetric(metricValue)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {index === 0 ? 'Lead' : 'Gap'}
                        </div>
                        <div className="text-sm font-extrabold" style={{ color: rankAccent }}>
                          {index === 0
                            ? rankedAuthorStats.length > 1
                              ? `+${formatContributorMetric(leaderMargin)}`
                              : 'Solo'
                            : formatContributorMetric(gapToOvertake)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
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
                const rankMovement = getRankMovement(author.name, index + 1);
                const gapToOvertake = getGapToOvertake(index);

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
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getRankMovementClasses(rankMovement)}`}>
                              {rankMovement.direction === 'up' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : rankMovement.direction === 'down' ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {rankMovement.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                            {author.count} posts
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
                        <div className="mt-1 text-[10px] font-bold text-slate-500">
                          {index === 0 ? 'Top spot' : `Gap ${formatContributorMetric(gapToOvertake)}`}
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
      </div>
    </div>
  );
}
