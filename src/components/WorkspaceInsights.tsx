import React, { useState } from 'react';
import { AuditItem, STATES_LIST, PAGES_LIST, SocialPage } from '../types';
import { TrendingUp, Users, Target, ThumbsUp, Activity, Smartphone, Play, MapPin, Globe, ExternalLink } from 'lucide-react';

interface Props {
  auditItems: AuditItem[];
  savedPages: SocialPage[];
  activePlatform: 'all' | 'facebook' | 'instagram' | 'youtube';
  onChangePlatform: (p: 'all' | 'facebook' | 'instagram' | 'youtube') => void;
}

type ContributorMetric = 'views' | 'engagement' | 'posts' | 'completion';

type ContributorStat = {
  name: string;
  count: number;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  avgCompletion: number;
  engagementRate: number;
  topPlatform: AuditItem['platform'];
};

export default function WorkspaceInsights({ 
  auditItems, 
  savedPages, 
  activePlatform, 
  onChangePlatform 
}: Props) {
  const [selectedMetric, setSelectedMetric] = useState<'views' | 'engagement'>('views');
  const [selectedContributor, setSelectedContributor] = useState<string>('All Contributors');
  const [selectedContributorMetric, setSelectedContributorMetric] = useState<ContributorMetric>('views');
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [hoveredContributor, setHoveredContributor] = useState<string | null>(null);
  const [hoveredEfficiencyContributor, setHoveredEfficiencyContributor] = useState<string | null>(null);
  const selectedPlatform = activePlatform;
  const setSelectedPlatform = onChangePlatform;
  
  // Theme Helper classes
  const getThemeClasses = () => {
    switch (activePlatform) {
      case 'facebook':
        return {
          primaryText: 'text-blue-600',
          primaryBg: 'bg-blue-600',
          primaryBorder: 'border-blue-500 focus:border-blue-500 focus:ring-blue-500',
          accentBorder: 'border-blue-100 hover:border-blue-300',
          primaryHover: 'hover:bg-blue-700',
          lightBg: 'bg-blue-50',
          textColor: 'text-blue-700',
          outlineRing: 'focus:outline-blue-500',
          chartFill: '#2563eb'
        };
      case 'instagram':
        return {
          primaryText: 'text-pink-600',
          primaryBg: 'bg-pink-600',
          primaryBorder: 'border-pink-500 focus:border-pink-500 focus:ring-pink-500',
          accentBorder: 'border-pink-100 hover:border-pink-300',
          primaryHover: 'hover:bg-pink-700',
          lightBg: 'bg-pink-50',
          textColor: 'text-pink-700',
          outlineRing: 'focus:outline-pink-500',
          chartFill: '#db2777'
        };
      case 'youtube':
        return {
          primaryText: 'text-red-600',
          primaryBg: 'bg-red-600',
          primaryBorder: 'border-red-500 focus:border-red-500 focus:ring-red-500',
          accentBorder: 'border-red-100 hover:border-red-300',
          primaryHover: 'hover:bg-red-700',
          lightBg: 'bg-red-50',
          textColor: 'text-red-700',
          outlineRing: 'focus:outline-red-500',
          chartFill: '#dc2626'
        };
      default:
        return {
          primaryText: 'text-orange-600',
          primaryBg: 'bg-orange-600',
          primaryBorder: 'border-orange-500 focus:border-orange-500 focus:ring-orange-500',
          accentBorder: 'border-orange-100 hover:border-orange-300',
          primaryHover: 'hover:bg-orange-700',
          lightBg: 'bg-orange-50',
          textColor: 'text-orange-700',
          outlineRing: 'focus:outline-orange-500',
          chartFill: '#ea580c'
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
    views: 'Views',
    engagement: 'Engagement',
    posts: 'Posts',
    completion: 'Completion'
  };
  const formatCompact = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Math.round(value).toLocaleString();
  };
  const getInitials = (name: string) => name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'C';

  // Timeline selection
  const [selectedTimeline, setSelectedTimeline] = useState<'7d' | '14d' | '30d' | 'custom'>('7d');
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


  // Calculate reference date based on data or today
  const getReferenceDate = () => {
    if (auditItems.length === 0) return new Date();
    const dates = auditItems.map(item => new Date(item.publishedAt).getTime());
    return new Date(Math.max(...dates));
  };

  const refDate = getReferenceDate();

  // Timeline + State + Page Filter
  const filteredTimelineAndStateData = auditItemsWithDefaults.filter(item => {
    // 1. Timeline filter
    const itemTime = new Date(item.publishedAt).getTime();
    let matchesTimeline = true;
    if (selectedTimeline === '7d') {
      const cutOff = new Date(refDate);
      cutOff.setDate(cutOff.getDate() - 7);
      matchesTimeline = itemTime >= cutOff.getTime();
    } else if (selectedTimeline === '14d') {
      const cutOff = new Date(refDate);
      cutOff.setDate(cutOff.getDate() - 14);
      matchesTimeline = itemTime >= cutOff.getTime();
    } else if (selectedTimeline === '30d') {
      const cutOff = new Date(refDate);
      cutOff.setDate(cutOff.getDate() - 30);
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
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    completionTotal: number;
    platforms: Record<AuditItem['platform'], number>;
  }> = {};
  filteredTimelineAndStateData.forEach(item => {
    const authorName = item.author || 'Unknown Contributor';
    if (!authorStatsMap[authorName]) {
      authorStatsMap[authorName] = {
        count: 0,
        views: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        completionTotal: 0,
        platforms: { facebook: 0, instagram: 0, youtube: 0 }
      };
    }
    authorStatsMap[authorName].count += 1;
    authorStatsMap[authorName].views += item.views;
    authorStatsMap[authorName].reach += item.reach;
    authorStatsMap[authorName].likes += item.likes;
    authorStatsMap[authorName].comments += item.comments;
    authorStatsMap[authorName].shares += item.shares;
    authorStatsMap[authorName].completionTotal += item.completionRate;
    authorStatsMap[authorName].platforms[item.platform] += 1;
  });

  const authorStats: ContributorStat[] = Object.entries(authorStatsMap).map(([name, stats]) => {
    const engagement = stats.likes + stats.comments + stats.shares;
    const topPlatform = (Object.entries(stats.platforms)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'facebook') as AuditItem['platform'];
    return {
      name,
      count: stats.count,
      views: stats.views,
      reach: stats.reach,
      likes: stats.likes,
      comments: stats.comments,
      shares: stats.shares,
      engagement,
      avgCompletion: stats.count > 0 ? stats.completionTotal / stats.count : 0,
      engagementRate: stats.reach > 0 ? (engagement / stats.reach) * 100 : 0,
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
      case 'engagement':
        return stat.engagement;
      case 'posts':
        return stat.count;
      case 'completion':
        return stat.avgCompletion;
      default:
        return stat.views;
    }
  };
  const formatContributorMetric = (value: number) => (
    selectedContributorMetric === 'completion' ? `${value.toFixed(1)}%` : formatCompact(value)
  );
  const rankedAuthorStats = [...authorStats].sort((a, b) => getContributorMetricValue(b) - getContributorMetricValue(a));
  const maxContributorMetric = Math.max(...rankedAuthorStats.map(getContributorMetricValue), 1);
  const maxContributorViews = Math.max(...authorStats.map(author => author.views), 1);
  const maxContributorEngagementRate = Math.max(...authorStats.map(author => author.engagementRate), 1);
  const detailContributor = authorStats.find(author => author.name === hoveredEfficiencyContributor)
    || focusedContributorStat
    || rankedAuthorStats[0]
    || null;

  // Metrics calculations
  const totalViews = focusedTimelineData.reduce((acc, item) => acc + item.views, 0);
  const totalReach = focusedTimelineData.reduce((acc, item) => acc + item.reach, 0);
  const totalLikes = focusedTimelineData.reduce((acc, item) => acc + item.likes, 0);
  const totalComments = focusedTimelineData.reduce((acc, item) => acc + item.comments, 0);
  const totalShares = focusedTimelineData.reduce((acc, item) => acc + item.shares, 0);
  const totalEngagement = totalLikes + totalComments + totalShares;
  const avgEngagementRate = totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(1) : '0.0';

  // Platform specific counts
  const fbItems = focusedTimelineData.filter(i => i.platform === 'facebook');
  const igItems = focusedTimelineData.filter(i => i.platform === 'instagram');
  const ytItems = focusedTimelineData.filter(i => i.platform === 'youtube');

  const fbViews = fbItems.reduce((acc, i) => acc + i.views, 0);
  const igViews = igItems.reduce((acc, i) => acc + i.views, 0);
  const ytViews = ytItems.reduce((acc, i) => acc + i.views, 0);
  const totalChannelViews = fbViews + igViews + ytViews;

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
      engagement: likes + comments + shares,
      posts: dayItems.length
    };
  });

  const currentMetricKey = selectedMetric === 'views' ? 'views' : 'engagement';
  const maxVal = Math.max(...chartData.map(d => d[currentMetricKey]), 100);
  const hoveredTrendPoint = hoveredTrendIndex !== null ? chartData[hoveredTrendIndex] : null;

  return (
    <div id="workspace-insights" className="space-y-6">
      
      {/* Top Filter & Control Panel with Orange Theme Accents */}
      <div className="flex flex-col gap-4 p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-800">Workspace Performance Insights</h2>
            <p className="text-xs text-slate-500">Subtle and real-time performance audit metrics of your handles.</p>
          </div>
          
          {/* Timeline Selector in Top Corner */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 font-mono">TIMELINE:</span>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-0.5 border border-slate-200">
              {([
                { id: '7d', label: '7D' },
                { id: '14d', label: '14D' },
                { id: '30d', label: '30D' },
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
          </div>
        </div>

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
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
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
                {(() => {
                  const matchingPage = savedPages.find(p => p.name === selectedPage);
                  if (matchingPage?.url) {
                    return (
                      <a 
                        href={matchingPage.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`${theme.primaryText} flex items-center gap-0.5 hover:underline`}
                      >
                        Visit Page: <span className="underline max-w-[150px] truncate">{matchingPage.url}</span> <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
                      </a>
                    );
                  }
                  return <span className="text-slate-400">No URL link attached</span>;
                })()}
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
          <div className="flex items-center gap-2 xl:justify-end">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight hidden lg:inline">Channel:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 gap-0.5 max-w-full overflow-x-auto">
              {(['all', 'facebook', 'instagram', 'youtube'] as const).map(plat => (
                <button
                  key={plat}
                  onClick={() => setSelectedPlatform(plat)}
                  className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold capitalize transition rounded-md cursor-pointer ${
                    selectedPlatform === plat 
                      ? `bg-white ${theme.primaryText} shadow-2xs` 
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

      {/* Subtle & Normal KPI metrics: views, engagement, engagement rate, and contents published */}
      <div id="insights-kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Views */}
        <div className={`p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:${theme.primaryBorder}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Views</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {totalViews.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-1">
            <span>{focusedTimelineData.length > 0 ? (focusedContributorStat ? focusedContributorStat.name : 'Current period') : 'No entries yet'}</span>
          </p>
        </div>

        {/* Metric 2: Engagement */}
        <div className={`p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:${theme.primaryBorder}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engagement</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <ThumbsUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {totalEngagement.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-1">
            <span>{focusedTimelineData.length > 0 ? 'Likes, comments & shares' : 'No entries yet'}</span>
          </p>
        </div>

        {/* Metric 3: Engagement Rate */}
        <div className={`p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:${theme.primaryBorder}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engagement Rate</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {avgEngagementRate}%
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Measured against raw impressions
          </p>
        </div>

        {/* Metric 4: Contents Published */}
        <div className={`p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:${theme.primaryBorder}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contents Published</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {focusedTimelineData.length} <span className="text-sm font-semibold text-slate-500">Units</span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Active in this context
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
                {(['views', 'engagement'] as const).map(met => (
                  <button
                    key={met}
                    onClick={() => setSelectedMetric(met)}
                    className={`px-3 py-1 font-bold uppercase rounded-md transition cursor-pointer ${
                      selectedMetric === met 
                        ? `bg-white ${theme.primaryText} shadow-2xs` 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {met}
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
                  Insufficient timeline sequence for selected parameters
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
                    {formatCompact(hoveredTrendPoint[currentMetricKey])} {selectedMetric}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{hoveredTrendPoint.posts} entries</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-bold text-orange-600">
              <span className="w-2.5 h-2.5 bg-orange-600 rounded-full inline-block"></span>
              {selectedMetric.toUpperCase()} Trends
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
                  <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5 text-orange-600" /> YouTube Reach</span>
                  <span>{ytViews.toLocaleString()} views</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${totalChannelViews > 0 ? Math.max(5, (ytViews / totalChannelViews) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Instagram */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-orange-600" /> Instagram Reels</span>
                  <span>{igViews.toLocaleString()} views</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${totalChannelViews > 0 ? Math.max(5, (igViews / totalChannelViews) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Facebook */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-orange-600" /> Facebook Feed</span>
                  <span>{fbViews.toLocaleString()} views</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-700 h-full rounded-full transition-all duration-500" 
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
                          contributorFilterValue === author.name ? `${theme.primaryBg} text-white` : 'bg-orange-50 text-orange-700'
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
                        <span className="text-slate-400 block text-[10px]">{author.engagementRate.toFixed(1)}% ER</span>
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Contributor-wise Performance</h3>
              <p className="text-xs text-slate-400">Ranking by uploaded contributor output in the current workspace context.</p>
            </div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs text-center overflow-x-auto">
              {(['views', 'engagement', 'posts', 'completion'] as const).map(metric => (
                <button
                  key={metric}
                  onClick={() => setSelectedContributorMetric(metric)}
                  className={`px-3 py-1 font-bold uppercase rounded-md transition cursor-pointer whitespace-nowrap ${
                    selectedContributorMetric === metric
                      ? `bg-white ${theme.primaryText} shadow-2xs`
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {contributorMetricLabels[metric]}
                </button>
              ))}
            </div>
          </div>

          {rankedAuthorStats.length > 0 ? (
            <div className="space-y-3">
              {rankedAuthorStats.map((author, index) => {
                const metricValue = getContributorMetricValue(author);
                const barWidth = metricValue > 0 ? Math.max(6, (metricValue / maxContributorMetric) * 100) : 0;
                const isActive = contributorFilterValue === author.name;
                const isHovered = hoveredContributor === author.name;

                return (
                  <button
                    key={author.name}
                    onClick={() => setSelectedContributor(author.name)}
                    onMouseEnter={() => setHoveredContributor(author.name)}
                    onMouseLeave={() => setHoveredContributor(null)}
                    onFocus={() => setHoveredContributor(author.name)}
                    onBlur={() => setHoveredContributor(null)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      isActive || isHovered
                        ? `${theme.accentBorder} ${theme.lightBg}`
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-xs font-extrabold ${
                          isActive ? `${theme.primaryBg} text-white` : 'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-800 truncate">{author.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                            {author.count} entries · {platformLabels[author.topPlatform]}
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
                        style={{ width: `${barWidth}%`, backgroundColor: theme.chartFill }}
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-[10px] text-slate-500">
                      <span><strong className="text-slate-700">{formatCompact(author.views)}</strong> views</span>
                      <span><strong className="text-slate-700">{formatCompact(author.engagement)}</strong> engagement</span>
                      <span><strong className="text-slate-700">{author.engagementRate.toFixed(1)}%</strong> ER</span>
                      <span><strong className="text-slate-700">{author.avgCompletion.toFixed(1)}%</strong> completion</span>
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

        <div className="xl:col-span-2 p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Contributor Efficiency Map</h3>
            <p className="text-xs text-slate-400 mt-1">Views against engagement rate, sized by entries.</p>
          </div>

          {detailContributor ? (
            <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Contributor</div>
                <div className="mt-1 font-extrabold text-slate-800 truncate">{detailContributor.name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Views</div>
                <div className="mt-1 font-extrabold text-slate-800">{formatCompact(detailContributor.views)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">ER</div>
                <div className="mt-1 font-extrabold text-slate-800">{detailContributor.engagementRate.toFixed(1)}%</div>
              </div>
            </div>
          ) : (
            <div className="mt-5 text-xs text-slate-400">No contributor data yet.</div>
          )}

          <div
            className="relative mt-5 h-72 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            style={{
              backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
              backgroundSize: '25% 25%'
            }}
          >
            <div className="absolute left-3 top-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Engagement Rate</div>
            <div className="absolute right-3 bottom-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Views</div>

            {authorStats.map(author => {
              const left = 8 + (author.views / maxContributorViews) * 84;
              const top = 86 - (author.engagementRate / maxContributorEngagementRate) * 76;
              const size = Math.min(34, Math.max(18, 16 + author.count * 3));
              const isActive = contributorFilterValue === author.name;
              const isHovered = hoveredEfficiencyContributor === author.name;

              return (
                <button
                  key={author.name}
                  title={author.name}
                  onClick={() => setSelectedContributor(author.name)}
                  onMouseEnter={() => setHoveredEfficiencyContributor(author.name)}
                  onMouseLeave={() => setHoveredEfficiencyContributor(null)}
                  onFocus={() => setHoveredEfficiencyContributor(author.name)}
                  onBlur={() => setHoveredEfficiencyContributor(null)}
                  className={`absolute flex items-center justify-center rounded-full border-2 text-[10px] font-extrabold shadow-sm transition ${
                    isActive || isHovered ? 'scale-110 border-slate-900 text-white z-20' : 'border-white text-white z-10'
                  }`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: theme.chartFill,
                    opacity: isActive || isHovered ? 1 : 0.78
                  }}
                >
                  {getInitials(author.name)}
                </button>
              );
            })}

            {authorStats.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                No contributor data yet.
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
            <span>Lower reach</span>
            <span>Higher reach</span>
          </div>
        </div>
      </div>
    </div>
  );
}
