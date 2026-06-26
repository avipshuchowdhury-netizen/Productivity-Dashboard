import React, { useState } from 'react';
import { AuditItem, STATES_LIST, PAGES_LIST, SocialPage } from '../types';
import { TrendingUp, Users, Target, ThumbsUp, Smartphone, Play, MapPin, Globe, ExternalLink, MessageCircle, Share2, Trophy, Pencil, Trash2, Save, X } from 'lucide-react';

interface Props {
  auditItems: AuditItem[];
  savedPages: SocialPage[];
  activePlatform: 'all' | 'facebook' | 'instagram' | 'youtube';
  onChangePlatform: (p: 'all' | 'facebook' | 'instagram' | 'youtube') => void;
  onUpdateAuditItem: (item: AuditItem) => Promise<void>;
  onDeleteAuditItem: (id: string) => Promise<void>;
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
  onUpdateAuditItem,
  onDeleteAuditItem
}: Props) {
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>('views');
  const [selectedContributor, setSelectedContributor] = useState<string>('All Contributors');
  const [selectedContributorMetric, setSelectedContributorMetric] = useState<ContributorMetric>('views');
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [hoveredContributor, setHoveredContributor] = useState<string | null>(null);
  const [hoveredMetricContributor, setHoveredMetricContributor] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AuditItem | null>(null);
  const [entryNotice, setEntryNotice] = useState('');
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
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
      likes,
      comments,
      shares,
      posts: dayItems.length
    };
  });

  const currentMetricKey = selectedMetric;
  const maxVal = Math.max(...chartData.map(d => d[currentMetricKey]), 100);
  const hoveredTrendPoint = hoveredTrendIndex !== null ? chartData[hoveredTrendIndex] : null;
  const managedEntries = [...focusedTimelineData].sort((a, b) => {
    const byDate = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    return byDate || b.id.localeCompare(a.id);
  });
  const formatOptions = ['reel', 'creative', 'repackage', 'carousel'];
  const editFormatOptions = editDraft?.format && !formatOptions.includes(editDraft.format)
    ? [editDraft.format, ...formatOptions]
    : formatOptions;
  const editPageOptions = editDraft?.page && !currentPagesList.includes(editDraft.page)
    ? [editDraft.page, ...currentPagesList]
    : currentPagesList;

  const beginEditEntry = (item: AuditItem) => {
    setEditDraft({ ...item });
    setEntryNotice('');
  };

  const updateEditDraft = (patch: Partial<AuditItem>) => {
    setEditDraft(prev => prev ? { ...prev, ...patch } : prev);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft) return;

    const normalizedDraft: AuditItem = {
      ...editDraft,
      title: editDraft.title.trim(),
      format: editDraft.format.trim() || 'reel',
      author: editDraft.author.trim() || 'Unknown Contributor',
      publishedAt: editDraft.publishedAt || new Date().toISOString().slice(0, 10),
      views: Number(editDraft.views) || 0,
      likes: Number(editDraft.likes) || 0,
      comments: Number(editDraft.comments) || 0,
      shares: Number(editDraft.shares) || 0,
      state: editDraft.state?.trim() || undefined,
      page: editDraft.page?.trim() || undefined,
      theme: editDraft.theme === 'negative' ? 'negative' : 'positive'
    };

    if (!normalizedDraft.title) {
      setEntryNotice('Title is required before saving this entry.');
      return;
    }

    setIsSavingEntry(true);
    try {
      await onUpdateAuditItem(normalizedDraft);
      setEditDraft(null);
      setEntryNotice('Entry updated successfully.');
    } catch (err) {
      console.error(err);
      setEntryNotice('Unable to update this entry. Please sync and try again.');
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (item: AuditItem) => {
    const confirmed = window.confirm(`Remove "${item.title}" from uploaded entries? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingEntryId(item.id);
    setEntryNotice('');
    try {
      await onDeleteAuditItem(item.id);
      if (editDraft?.id === item.id) {
        setEditDraft(null);
      }
      setEntryNotice('Entry removed from Insights.');
    } catch (err) {
      console.error(err);
      setEntryNotice('Unable to remove this entry. Please sync and try again.');
    } finally {
      setDeletingEntryId(null);
    }
  };

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

      {/* Core KPI metrics: content published, views, likes, comments, and shares */}
      <div id="insights-kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Contents Published */}
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

        {/* Metric 2: Views */}
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

        {/* Metric 3: Likes */}
        <div className={`p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:${theme.primaryBorder}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Likes</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <ThumbsUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {totalLikes.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5">
            Reactions recorded
          </p>
        </div>

        {/* Metric 4: Comments */}
        <div className={`p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:${theme.primaryBorder}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comments</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <MessageCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {totalComments.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5">
            Audience replies
          </p>
        </div>

        {/* Metric 5: Shares */}
        <div className={`p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-colors hover:${theme.primaryBorder}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shares</span>
            <div className={`p-2 ${theme.lightBg} ${theme.primaryText} rounded-lg`}>
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-display font-extrabold text-slate-900">
            {totalShares.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5">
            Forwarded content
          </p>
        </div>

      </div>

      {/* Uploaded entries management */}
      <div id="uploaded-entry-manager" className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Edit or Remove Uploaded Entries</h3>
            <p className="text-xs text-slate-400 mt-1">Review contributor uploads matching the active filters and correct wrong records.</p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${theme.lightBg} ${theme.primaryText}`}>
            {managedEntries.length} visible entries
          </div>
        </div>

        {entryNotice && (
          <div className="mx-5 mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {entryNotice}
          </div>
        )}

        {editDraft && (
          <form onSubmit={handleSaveEntry} className={`m-5 rounded-xl border ${theme.accentBorder} ${theme.lightBg} p-4 text-xs space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={`font-extrabold uppercase tracking-wider ${theme.primaryText}`}>Editing Entry</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Changes update the same record used by all Insights charts.</div>
              </div>
              <button
                type="button"
                onClick={() => setEditDraft(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 transition"
                title="Close editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="md:col-span-2">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Title</span>
                <input
                  type="text"
                  required
                  value={editDraft.title}
                  onChange={e => updateEditDraft({ title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-800 outline-hidden ${theme.primaryBorder}`}
                />
              </label>
              <label>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contributor</span>
                <input
                  type="text"
                  value={editDraft.author}
                  onChange={e => updateEditDraft({ author: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-800 outline-hidden ${theme.primaryBorder}`}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <label>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date</span>
                <input
                  type="date"
                  value={editDraft.publishedAt}
                  onChange={e => updateEditDraft({ publishedAt: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-800 outline-hidden ${theme.primaryBorder}`}
                />
              </label>
              <label>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Channel</span>
                <select
                  value={editDraft.platform}
                  onChange={e => updateEditDraft({ platform: e.target.value as AuditItem['platform'] })}
                  className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-800 outline-hidden capitalize ${theme.primaryBorder}`}
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                </select>
              </label>
              <label>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Format</span>
                <select
                  value={editDraft.format}
                  onChange={e => updateEditDraft({ format: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-800 outline-hidden capitalize ${theme.primaryBorder}`}
                >
                  {editFormatOptions.map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">State</span>
                <select
                  value={editDraft.state || ''}
                  onChange={e => updateEditDraft({ state: e.target.value || undefined })}
                  className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-800 outline-hidden ${theme.primaryBorder}`}
                >
                  <option value="">No state</option>
                  {STATES_LIST.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Theme</span>
                <select
                  value={editDraft.theme || 'positive'}
                  onChange={e => updateEditDraft({ theme: e.target.value as AuditItem['theme'] })}
                  className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-800 outline-hidden ${theme.primaryBorder}`}
                >
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <label className="md:col-span-2">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Page</span>
                <select
                  value={editDraft.page || ''}
                  onChange={e => updateEditDraft({ page: e.target.value || undefined })}
                  className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-800 outline-hidden ${theme.primaryBorder}`}
                >
                  <option value="">No page</option>
                  {editPageOptions.map(page => (
                    <option key={page} value={page}>{page}</option>
                  ))}
                </select>
              </label>
              {(['views', 'likes', 'comments', 'shares'] as const).map(metric => (
                <label key={metric}>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {trendMetricLabels[metric]}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={editDraft[metric]}
                    onChange={e => updateEditDraft({ [metric]: Number(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-800 outline-hidden ${theme.primaryBorder}`}
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditDraft(null)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold transition flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEntry}
                className={`px-4 py-2 rounded-lg text-white font-bold transition flex items-center gap-1.5 ${theme.primaryBg} ${theme.primaryHover} disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <Save className="w-3.5 h-3.5" /> {isSavingEntry ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
          {managedEntries.length > 0 ? (
            managedEntries.map(item => (
              <div key={item.id} className="p-4 flex flex-col xl:flex-row xl:items-center gap-4 hover:bg-slate-50/70 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${theme.lightBg} ${theme.primaryText}`}>
                      {platformLabels[item.platform]}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{item.format}</span>
                    <span className="text-[10px] font-mono text-slate-400">{item.publishedAt}</span>
                  </div>
                  <div className="font-bold text-sm text-slate-800 truncate" title={item.title}>{item.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span>{item.author || 'Unknown Contributor'}</span>
                    <span>{item.page || 'No page'}</span>
                    <span>{item.state || 'No state'}</span>
                    <span className={item.theme === 'negative' ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                      {item.theme === 'negative' ? 'Negative' : 'Positive'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[11px] text-slate-500 xl:w-96">
                  {(['views', 'likes', 'comments', 'shares'] as const).map(metric => (
                    <div key={metric} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5">
                      <div className="font-extrabold text-slate-800">{formatCompact(item[metric])}</div>
                      <div className="uppercase tracking-wider text-[9px]">{trendMetricLabels[metric]}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 xl:justify-end">
                  <button
                    type="button"
                    onClick={() => beginEditEntry(item)}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                    title={`Edit ${item.title}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={deletingEntryId === item.id}
                    onClick={() => handleDeleteEntry(item)}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Remove ${item.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No uploaded entries match the current filters.
            </div>
          )}
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
                        ? `bg-white ${theme.primaryText} shadow-2xs` 
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
                    {formatCompact(hoveredTrendPoint[currentMetricKey])} {trendMetricLabels[selectedMetric].toLowerCase()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{hoveredTrendPoint.posts} entries</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-bold text-orange-600">
              <span className="w-2.5 h-2.5 bg-orange-600 rounded-full inline-block"></span>
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
                  <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5 text-orange-600" /> YouTube Views</span>
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
                        <span className="text-slate-400 block text-[10px]">{author.count} posts · {formatCompact(author.shares)} shares</span>
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
              {(['performance', 'posts', 'views', 'likes', 'comments', 'shares'] as const).map(metric => (
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
                            {author.count} posts · {platformLabels[author.topPlatform]}
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

        <div className="xl:col-span-2 p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
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
                { label: 'Likes', value: author.likes, max: maxContributorLikes, color: '#16a34a' },
                { label: 'Comments', value: author.comments, max: maxContributorComments, color: '#0284c7' },
                { label: 'Shares', value: author.shares, max: maxContributorShares, color: '#7c3aed' }
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
