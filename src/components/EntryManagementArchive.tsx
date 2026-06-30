import React, { useState } from 'react';
import { Archive, ExternalLink, Globe, MapPin, Pencil, RotateCcw, Save, Users, X } from 'lucide-react';
import { AuditItem, STATES_LIST, PAGES_LIST, SocialPage } from '../types';

interface Props {
  auditItems: AuditItem[];
  savedPages: SocialPage[];
  activePlatform: 'all' | 'facebook' | 'instagram' | 'youtube';
  onChangePlatform: (p: 'all' | 'facebook' | 'instagram' | 'youtube') => void;
  onUpdateAuditItem: (item: AuditItem) => Promise<void>;
  onArchiveAuditItem: (id: string) => Promise<void>;
}

type ManagementView = 'active' | 'archive';
type MetricKey = 'views' | 'likes' | 'comments' | 'shares';

const ARCHIVE_VISIBLE_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;
const FORMAT_OPTIONS = ['reel', 'creative', 'repackage', 'carousel'];

export default function EntryManagementArchive({
  auditItems,
  savedPages,
  activePlatform,
  onChangePlatform,
  onUpdateAuditItem,
  onArchiveAuditItem
}: Props) {
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedPage, setSelectedPage] = useState<string>('All Pages');
  const [selectedContributor, setSelectedContributor] = useState<string>('All Contributors');
  const [managementView, setManagementView] = useState<ManagementView>('active');
  const [editDraft, setEditDraft] = useState<AuditItem | null>(null);
  const [entryNotice, setEntryNotice] = useState('');
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [archivingEntryId, setArchivingEntryId] = useState<string | null>(null);
  const [restoringEntryId, setRestoringEntryId] = useState<string | null>(null);

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
          outlineRing: 'focus:outline-[#1877f2]'
        };
      case 'instagram':
        return {
          primaryText: 'text-[#e1306c]',
          primaryBg: 'bg-[#e1306c]',
          primaryBorder: 'border-[#ffc2da] focus:border-[#e1306c] focus:ring-[#e1306c]/10',
          accentBorder: 'border-[#ffc2da] hover:border-[#e1306c]',
          primaryHover: 'hover:bg-[#c13584]',
          lightBg: 'bg-[#fff0f6]',
          outlineRing: 'focus:outline-[#e1306c]'
        };
      case 'youtube':
        return {
          primaryText: 'text-[#ff0000]',
          primaryBg: 'bg-[#ff0000]',
          primaryBorder: 'border-[#ffb8b8] focus:border-[#ff0000] focus:ring-[#ff0000]/10',
          accentBorder: 'border-[#ffb8b8] hover:border-[#ff0000]',
          primaryHover: 'hover:bg-[#cc0000]',
          lightBg: 'bg-[#fff1f1]',
          outlineRing: 'focus:outline-[#ff0000]'
        };
      default:
        return {
          primaryText: 'text-[#202020]',
          primaryBg: 'bg-[#202020]',
          primaryBorder: 'border-[#e8e8e8] focus:border-[#202020] focus:ring-[#202020]/10',
          accentBorder: 'border-[#e8e8e8] hover:border-[#828282]',
          primaryHover: 'hover:bg-[#4d4d4d]',
          lightBg: 'bg-[#f5f5f5]',
          outlineRing: 'focus:outline-[#202020]'
        };
    }
  };

  const theme = getThemeClasses();
  const selectedPlatform = activePlatform;
  const setSelectedPlatform = onChangePlatform;
  const currentPagesList = savedPages.length > 0 ? savedPages.map(p => p.name) : PAGES_LIST;
  const platformLabels: Record<AuditItem['platform'], string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'YouTube'
  };
  const metricLabels: Record<MetricKey, string> = {
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
  const formatArchiveDate = (value?: string) => {
    if (!value) return 'Not archived';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };
  const isArchived = (item: AuditItem) => Boolean(item.archivedAt);
  const isRecentArchive = (item: AuditItem) => {
    if (!item.archivedAt) return false;
    const archivedTime = new Date(item.archivedAt).getTime();
    if (Number.isNaN(archivedTime)) return false;
    return Date.now() - archivedTime <= ARCHIVE_VISIBLE_DAYS * DAY_MS;
  };

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
  const recentArchivedItemsWithDefaults = auditItemsWithDefaults.filter(isRecentArchive);
  const contributorOptions = Array.from(new Set(
    auditItemsWithDefaults.map(item => item.author || 'Unknown Contributor')
  )).sort();
  const contributorFilterValue = contributorOptions.includes(selectedContributor)
    ? selectedContributor
    : 'All Contributors';
  const matchesEntryManagementFilters = (item: AuditItem) => {
    const matchesState = selectedState === 'All States' || item.state === selectedState;
    const matchesPage = selectedPage === 'All Pages' || item.page === selectedPage;
    const matchesPlatform = selectedPlatform === 'all' || item.platform === selectedPlatform;
    const matchesContributor = contributorFilterValue === 'All Contributors'
      || (item.author || 'Unknown Contributor') === contributorFilterValue;

    return matchesState && matchesPage && matchesPlatform && matchesContributor;
  };

  const activeManagedEntries = activeAuditItemsWithDefaults.filter(matchesEntryManagementFilters);
  const archivedManagedEntries = recentArchivedItemsWithDefaults.filter(matchesEntryManagementFilters);
  const managedEntries = [...(managementView === 'active' ? activeManagedEntries : archivedManagedEntries)].sort((a, b) => {
    if (managementView === 'archive') {
      const aArchivedAt = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
      const bArchivedAt = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
      return bArchivedAt - aArchivedAt || b.id.localeCompare(a.id);
    }
    const byDate = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    return byDate || b.id.localeCompare(a.id);
  });
  const storedEntryCount = auditItemsWithDefaults.length;
  const activeStoredEntryCount = activeAuditItemsWithDefaults.length;
  const archivedStoredEntryCount = auditItemsWithDefaults.filter(isArchived).length;
  const editFormatOptions = editDraft?.format && !FORMAT_OPTIONS.includes(editDraft.format)
    ? [editDraft.format, ...FORMAT_OPTIONS]
    : FORMAT_OPTIONS;
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

  const handleArchiveEntry = async (item: AuditItem) => {
    const confirmed = window.confirm(`Archive "${item.title}" from active Insights? The record will stay stored and appear in the archive view for 15 days.`);
    if (!confirmed) return;

    setArchivingEntryId(item.id);
    setEntryNotice('');
    try {
      await onArchiveAuditItem(item.id);
      if (editDraft?.id === item.id) {
        setEditDraft(null);
      }
      setManagementView('archive');
      setEntryNotice('Entry archived. Data is still stored and visible in the archive view for 15 days.');
    } catch (err) {
      console.error(err);
      setEntryNotice('Unable to archive this entry. Please sync and try again.');
    } finally {
      setArchivingEntryId(null);
    }
  };

  const handleRestoreEntry = async (item: AuditItem) => {
    setRestoringEntryId(item.id);
    setEntryNotice('');
    try {
      await onUpdateAuditItem({
        ...item,
        archivedAt: undefined,
        archiveReason: undefined
      });
      setManagementView('active');
      setEntryNotice('Entry restored to active Insights.');
    } catch (err) {
      console.error(err);
      setEntryNotice('Unable to restore this entry. Please sync and try again.');
    } finally {
      setRestoringEntryId(null);
    }
  };

  return (
    <div id="entry-management-archive-section" className="space-y-6">
      <div className="flex flex-col gap-4 p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-800">Entry Management & Archive</h2>
            <p className="text-xs text-slate-500">Active entries, archived records, and stored audit totals.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              { id: 'active', label: 'Active Entries', count: activeManagedEntries.length },
              { id: 'archive', label: `Archive ${ARCHIVE_VISIBLE_DAYS}D`, count: archivedManagedEntries.length }
            ] as const).map(view => (
              <button
                key={view.id}
                type="button"
                onClick={() => {
                  setManagementView(view.id);
                  setEditDraft(null);
                  setEntryNotice('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  managementView === view.id
                    ? `${theme.primaryBg} text-white shadow-xs`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {view.label}
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  managementView === view.id ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                }`}>
                  {view.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 shrink-0 ${theme.primaryText}`} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">State:</span>
            <select
              className={`flex-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden transition ${theme.primaryBorder}`}
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
            >
              <option value="All States">All States</option>
              {STATES_LIST.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Globe className={`w-4 h-4 shrink-0 ${theme.primaryText}`} />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Page:</span>
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

          <div className="flex items-center gap-2 xl:justify-end">
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

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/60">
          <div className="px-5 py-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Active Stored</div>
            <div className="text-lg font-extrabold text-slate-800">{activeStoredEntryCount}</div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Archived Stored</div>
            <div className="text-lg font-extrabold text-slate-800">{archivedStoredEntryCount}</div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Stored</div>
            <div className="text-lg font-extrabold text-slate-800">{storedEntryCount}</div>
          </div>
        </div>

        {entryNotice && (
          <div className="mx-5 mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {entryNotice}
          </div>
        )}

        {managementView === 'active' && editDraft && (
          <form onSubmit={handleSaveEntry} className={`m-5 rounded-xl border ${theme.accentBorder} ${theme.lightBg} p-4 text-xs space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={`font-extrabold uppercase tracking-wider ${theme.primaryText}`}>Editing Entry</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Changes update the active record used by Insights charts.</div>
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
                    {metricLabels[metric]}
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

        <div className="divide-y divide-slate-100 max-h-[36rem] overflow-y-auto">
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
                    {item.archivedAt && (
                      <span className="text-[10px] uppercase font-bold text-[#816729] bg-[#f5f5f5] px-2 py-0.5 rounded">
                        Archived {formatArchiveDate(item.archivedAt)}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-slate-800 truncate" title={item.title}>{item.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span>{item.author || 'Unknown Contributor'}</span>
                    <span>{item.page || 'No page'}</span>
                    <span>{item.state || 'No state'}</span>
                    <span className={item.theme === 'negative' ? 'text-[#816729] font-semibold' : 'text-[#4d4d4d] font-semibold'}>
                      {item.theme === 'negative' ? 'Negative' : 'Positive'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[11px] text-slate-500 xl:w-96">
                  {(['views', 'likes', 'comments', 'shares'] as const).map(metric => (
                    <div key={metric} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5">
                      <div className="font-extrabold text-slate-800">{formatCompact(item[metric])}</div>
                      <div className="uppercase tracking-wider text-[9px]">{metricLabels[metric]}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 xl:justify-end">
                  {managementView === 'active' ? (
                    <>
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
                        disabled={archivingEntryId === item.id}
                        onClick={() => handleArchiveEntry(item)}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#202020] hover:bg-[#f5f5f5] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title={`Archive ${item.title}`}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={restoringEntryId === item.id}
                      onClick={() => handleRestoreEntry(item)}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#202020] hover:bg-[#f5f5f5] transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Restore ${item.title}`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              {managementView === 'active'
                ? 'No active uploaded entries match the current filters.'
                : `No archived entries from the last ${ARCHIVE_VISIBLE_DAYS} days match the current filters.`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
