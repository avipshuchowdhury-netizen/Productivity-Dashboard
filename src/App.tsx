import React, { useState, useEffect } from 'react';
import { 
  Archive,
  BarChart2, 
  LogOut,
  Moon,
  RefreshCw, 
  Sun,
  Target, 
  Upload
} from 'lucide-react';

// Import Types
import { DashboardData, AuditItem, SocialPage, DEFAULT_PAGES } from './types';

// Import Modular Components
import WorkspaceInsights from './components/WorkspaceInsights';
import ContributorPortal from './components/ContributorPortal';
import EntryManagementArchive from './components/EntryManagementArchive';
import AuthScreen from './components/AuthScreen';
import { useAuth } from './auth/AuthContext';

const MODE_STORAGE_KEY = 'samarth_display_mode';
const SAMARTH_FULL_FORM = 'Single Admin Managed AI Run Thematic Handles';

type DisplayMode = 'light' | 'dark';

const normalizeAuditItem = (item: AuditItem): AuditItem => ({
  ...item,
  title: item.title.trim(),
  format: item.format.trim() || 'reel',
  publishedAt: item.publishedAt || new Date().toISOString().slice(0, 10),
  views: Number(item.views) || 0,
  likes: Number(item.likes) || 0,
  comments: Number(item.comments) || 0,
  shares: Number(item.shares) || 0,
  author: item.author.trim() || 'Unknown Contributor',
  state: item.state?.trim() || undefined,
  page: item.page?.trim() || undefined,
  theme: item.theme === 'negative' ? 'negative' : 'positive',
  archivedAt: item.archivedAt || undefined,
  archiveReason: item.archiveReason?.trim() || undefined,
  archivedByEmail: item.archivedByEmail?.trim() || undefined,
  createdAt: item.createdAt || undefined,
  createdByEmail: item.createdByEmail?.trim() || undefined,
  updatedAt: item.updatedAt || undefined,
  updatedByEmail: item.updatedByEmail?.trim() || undefined
});

export default function App() {
  const {
    user,
    isLoading: isAuthLoading,
    isConfigured: isAuthConfigured,
    canManageEntries,
    allowedDomain,
    missingConfig,
    authError,
    signInWithGoogle,
    signOut,
    getIdToken
  } = useAuth();

  // Current Selected Tab
  const [activeTab, setActiveTab] = useState<'insights' | 'contributor' | 'management'>('insights');
  
  // High-level Platform Theme state
  const [activePlatform, setActivePlatform] = useState<'all' | 'facebook' | 'instagram' | 'youtube'>('all');
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const cachedMode = localStorage.getItem(MODE_STORAGE_KEY);
    return cachedMode === 'dark' ? 'dark' : 'light';
  });

  const oldDemoPageNames = [
    "Jan Manch News",
    "Vikas Watch",
    "Youth for Bharat",
    "Sanskritik Gaurav",
    "Scheme Desk",
    "PolitiSatire"
  ];

  // Pages are configured through contributor onboarding or manual page mapping.
  const [savedPages, setSavedPages] = useState<SocialPage[]>(() => {
    const cached = localStorage.getItem('samarth_saved_pages');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (
          parsed && 
          Array.isArray(parsed) && 
          parsed.length > 0 && 
          parsed.every(p => p && typeof p.name === 'string' && typeof p.url === 'string')
        ) {
          const onlyOldDemoPages = parsed.every(p => oldDemoPageNames.includes(p.name));
          if (onlyOldDemoPages) {
            return DEFAULT_PAGES;
          }
          return parsed;
        }
      } catch (e) {
        console.warn('Stale storage reset');
      }
    }
    return DEFAULT_PAGES;
  });

  useEffect(() => {
    localStorage.setItem('samarth_saved_pages', JSON.stringify(savedPages));
  }, [savedPages]);

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, displayMode);
  }, [displayMode]);
  
  const getAppThemeClasses = () => {
    switch (activePlatform) {
      case 'facebook':
        return {
          headerText: 'text-[#1877f2]',
          sideText: 'text-[#1877f2]',
          logoBg: 'bg-white border border-[#1877f2]',
          logoText: 'text-[#1877f2]',
          btnBg: 'bg-[#1877f2] text-white hover:bg-[#0b5fcc]',
          accentText: 'text-[#1877f2]',
          accentBg: 'bg-[#eef5ff] text-[#1877f2] border border-[#bfd8ff]',
          sideActive: 'bg-[#1877f2] text-white'
        };
      case 'instagram':
        return {
          headerText: 'text-[#e1306c]',
          sideText: 'text-[#e1306c]',
          logoBg: 'bg-white border border-[#e1306c]',
          logoText: 'text-[#e1306c]',
          btnBg: 'bg-[#e1306c] text-white hover:bg-[#c13584]',
          accentText: 'text-[#e1306c]',
          accentBg: 'bg-[#fff0f6] text-[#e1306c] border border-[#ffc2da]',
          sideActive: 'bg-[#e1306c] text-white'
        };
      case 'youtube':
        return {
          headerText: 'text-[#ff0000]',
          sideText: 'text-[#ff0000]',
          logoBg: 'bg-white border border-[#ff0000]',
          logoText: 'text-[#ff0000]',
          btnBg: 'bg-[#ff0000] text-white hover:bg-[#cc0000]',
          accentText: 'text-[#ff0000]',
          accentBg: 'bg-[#fff1f1] text-[#ff0000] border border-[#ffb8b8]',
          sideActive: 'bg-[#ff0000] text-white'
        };
      default:
        return {
          headerText: 'text-[var(--palette-accent)]',
          sideText: 'text-[var(--palette-accent)]',
          logoBg: 'bg-[var(--palette-soft)] border border-[var(--palette-line)]',
          logoText: 'text-[var(--palette-ink)]',
          btnBg: 'samarth-theme-button text-white hover:opacity-90',
          accentText: 'text-[var(--palette-accent)]',
          accentBg: 'bg-[var(--palette-soft)] text-[var(--palette-ink)] border border-[var(--palette-line)]',
          sideActive: 'samarth-theme-button text-white'
        };
    }
  };

  const appTheme = getAppThemeClasses();

  
  // Database States
  const [data, setData] = useState<DashboardData>({
    auditItems: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getFirebaseAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch Entire Database on Load
  const fetchDashboardData = async (showSyncIndicator = false) => {
    if (!user) {
      setData({ auditItems: [] });
      setIsLoading(false);
      setIsSyncing(false);
      return;
    }

    if (showSyncIndicator) setIsSyncing(true);
    setErrorMessage('');
    try {
      const response = await fetch("/api/dashboard-data", {
        headers: await getFirebaseAuthHeaders()
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage("Your Firebase session is not authorized for this workspace.");
        setData({ auditItems: [] });
        return;
      }
      if (!response.ok) {
        throw new Error("Server storage unavailable");
      }
      const json = await response.json();
      setData({
        auditItems: json.auditItems || []
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Workspace data could not be loaded from the secure API.");
      setData({ auditItems: [] });
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      fetchDashboardData();
    }
  }, [isAuthLoading, user?.uid]);

  // API Call Helpers for updating server DB states

  // 1. Audit Items
  const handleAddAuditItem = async (item: Omit<AuditItem, 'id'>) => {
    try {
      const authHeaders = await getFirebaseAuthHeaders();
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "create", item })
      });
      if (res.status === 401 || res.status === 403) {
        setErrorMessage("Your Firebase session is not authorized to upload metrics.");
        throw new Error("Not authorized to upload metrics");
      }
      if (res.ok) {
        await fetchDashboardData(true);
        return;
      }
      throw new Error("Server storage unavailable");
    } catch (e) {
      console.error(e);
      setErrorMessage("Upload failed because the secure API did not accept the entry.");
      throw e;
    }
  };

  const handleUpdateAuditItem = async (item: AuditItem) => {
    if (!canManageEntries) {
      setErrorMessage("Only avipshu.chowdhury@varaheanalytics.com can edit entries.");
      throw new Error("Current user cannot edit entries");
    }

    const normalizedItem = normalizeAuditItem(item);

    try {
      const authHeaders = await getFirebaseAuthHeaders();
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "update", item: normalizedItem })
      });
      if (res.status === 401 || res.status === 403) {
        setErrorMessage("Your Firebase session is not authorized to update entries.");
        throw new Error("Not authorized to update entries");
      }
      if (res.ok) {
        await fetchDashboardData(true);
        return;
      }
      throw new Error("Server storage unavailable");
    } catch (e) {
      console.error(e);
      setErrorMessage("Update failed because the secure API did not accept the change.");
      throw e;
    }
  };

  const handleArchiveAuditItem = async (id: string) => {
    if (!canManageEntries) {
      setErrorMessage("Only avipshu.chowdhury@varaheanalytics.com can archive or delete entries.");
      throw new Error("Current user cannot archive entries");
    }

    try {
      const authHeaders = await getFirebaseAuthHeaders();
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "archive", item: { id, archiveReason: "manual" } })
      });
      if (res.status === 401 || res.status === 403) {
        setErrorMessage("Your Firebase session is not authorized to archive entries.");
        throw new Error("Not authorized to archive entries");
      }
      if (res.ok) {
        await fetchDashboardData(true);
        return;
      }
      throw new Error("Server storage unavailable");
    } catch (e) {
      console.error(e);
      setErrorMessage("Archive failed because the secure API did not accept the change.");
      throw e;
    }
  };

  const handleAddPage = (page: SocialPage) => {
    setSavedPages(prev => {
      if (prev.some(p => p.name.toLowerCase() === page.name.toLowerCase())) {
        return prev.map(p => p.name.toLowerCase() === page.name.toLowerCase() ? page : p);
      }
      return [...prev, page];
    });
  };

  const handleRemovePage = (name: string) => {
    setSavedPages(prev => prev.filter(p => p.name !== name));
  };

  // Navigation tab styling helpers
  const tabs = [
    { id: 'insights', label: 'Workspace Insights', icon: BarChart2, iconTile: 'bg-[#f73b20] text-white', idleTile: 'bg-[#fef5f3] text-[#f73b20]' },
    { id: 'contributor', label: 'Data Upload', icon: Upload, iconTile: 'bg-[#477ee9] text-white', idleTile: 'bg-[#e6f0ff] text-[#477ee9]' },
    { id: 'management', label: 'Entry Management', icon: Archive, iconTile: 'bg-[#fb2d54] text-white', idleTile: 'bg-[#ffe8f0] text-[#fb2d54]' },
  ] as const;
  const visibleTabs = canManageEntries ? tabs : tabs.filter(tab => tab.id !== 'management');
  const shortTabLabels: Record<typeof tabs[number]['id'], string> = {
    insights: 'Insights',
    contributor: 'Upload',
    management: 'Manage'
  };

  useEffect(() => {
    if (!canManageEntries && activeTab === 'management') {
      setActiveTab('insights');
    }
  }, [activeTab, canManageEntries]);

  if (isAuthLoading) {
    return (
      <div id="full-app-root" data-mode={displayMode} className="min-h-[100dvh] flex font-sans text-[#360802] overflow-x-hidden isolate">
        <div className="flex min-h-[100dvh] w-full items-center justify-center px-4">
          <div className="rounded-xl border border-[var(--palette-line)] bg-[var(--surface-card)] p-6 text-center shadow-xs">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--palette-accent)]" />
            <p className="mt-3 text-sm font-bold text-[var(--text-main)]">Checking Firebase session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthConfigured || !user) {
    return (
      <div id="full-app-root" data-mode={displayMode} className="min-h-[100dvh] flex font-sans text-[#360802] overflow-x-hidden isolate">
        <AuthScreen
          displayMode={displayMode}
          onToggleDisplayMode={() => setDisplayMode(prev => prev === 'dark' ? 'light' : 'dark')}
          isConfigured={isAuthConfigured}
          allowedDomain={allowedDomain}
          missingConfig={missingConfig}
          authError={authError}
          onSignInWithGoogle={signInWithGoogle}
        />
      </div>
    );
  }

  return (
    <div id="full-app-root" data-mode={displayMode} className="min-h-[100dvh] flex font-sans text-[#360802] overflow-x-hidden isolate">
      
      {/* Left Navigation Rail (SAMARTH Theme) */}
      <aside id="left-sidebar-rail" className="hidden lg:flex sticky top-0 h-[100dvh] w-[132px] shrink-0 flex-col items-center gap-4 border-r border-[var(--palette-line)] bg-[var(--surface-header)] px-4 py-4 shadow-[8px_0_30px_-26px_rgba(47,23,16,0.45)] backdrop-blur-md">
        {/* Sidebar Logo branded as SAMARTH with dynamic platform color matching */}
        <div className={`w-22 h-20 rounded-xl flex flex-col items-center justify-center font-bold text-xs select-none text-center px-1 font-display transition-all duration-300 shadow-xs ${appTheme.logoBg}`}>
          <span className={`font-extrabold uppercase tracking-[0.03em] text-sm ${appTheme.logoText}`}>SAMARTH</span>
          <span className={`text-[10px] uppercase tracking-widest leading-none mt-1 font-bold ${appTheme.sideText}`}>WORKSPACE</span>
        </div>

        {/* Sidebar Nav Buttons */}
        <nav className="flex-1 flex flex-col gap-3 w-full px-1 mt-2">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMessage('');
                }}
                aria-current={isSelected ? 'page' : undefined}
                className={`samarth-sidebar-item w-full py-3.5 px-1 rounded-xl flex flex-col items-center justify-center gap-2 text-center relative group cursor-pointer border ${
                  isSelected
                    ? `${appTheme.sideActive} samarth-sidebar-active border-transparent shadow-xs`
                    : 'text-[var(--text-muted)] border-transparent hover:border-[var(--palette-line)] hover:bg-[var(--palette-soft)]'
                }`}
                title={tab.label}
              >
                <span className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${isSelected ? tab.iconTile : tab.idleTile}`}>
                  <Icon className="w-5 h-5 shrink-0" />
                </span>
                <span className="text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[92px] uppercase font-mono">
                  {shortTabLabels[tab.id]}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Dynamic counter widget inside sidebar */}
        <div className="samarth-rail-counter w-22 px-2 py-2.5 bg-[var(--surface-panel)] rounded-xl text-center border border-[var(--palette-line)] mb-1 hidden lg:block shadow-xs">
          <p className="text-xs text-[var(--text-faint)] font-bold uppercase tracking-wider">Records</p>
          <span className={`text-lg font-bold font-mono transition-colors duration-350 ${appTheme.sideText}`}>{data.auditItems.length}</span>
        </div>

        {/* Avatar block */}
        <div className="mt-1 pt-4 border-t border-[var(--palette-line)] w-full flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center font-bold text-xs select-none shadow-xs ${appTheme.headerText}`}>
            {(user.email || 'S').charAt(0).toUpperCase()}
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="sticky top-0 shrink-0 bg-[var(--surface-header)] backdrop-blur-md flex flex-col gap-3 px-4 py-3 md:px-8 md:py-4 select-none z-50 border-b border-[var(--palette-line)]">
          <div className="max-w-[1360px] w-full mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${appTheme.accentBg}`}>
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.14em] ${appTheme.headerText}`}>
                Team Workspace
              </div>
              <div className="mt-0.5 flex flex-wrap items-end gap-x-3 gap-y-1">
                <h1 className="text-2xl sm:text-3xl font-semibold leading-none font-display text-[var(--text-main)]">
                  SAMARTH
                </h1>
                <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${appTheme.accentBg}`}>
                  {shortTabLabels[activeTab]}
                </div>
              </div>
              <p className="mt-1 text-xs md:text-sm font-medium leading-snug text-[var(--text-muted)] max-w-[760px]">
                {SAMARTH_FULL_FORM}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex lg:hidden items-center justify-center bg-[var(--surface-panel)] border border-[var(--palette-line)] rounded-[200px] p-1 gap-1 shadow-xs">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setErrorMessage('');
                  }}
                  className={`flex items-center gap-2 rounded-[200px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                    isSelected ? appTheme.sideActive : 'text-[var(--text-muted)] hover:bg-[var(--palette-soft)]'
                  }`}
                  title={tab.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[var(--palette-accent)]'}`} />
                  <span>{shortTabLabels[tab.id]}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex flex-wrap justify-end gap-3 md:gap-4 items-center">
            <button
              type="button"
              onClick={() => setDisplayMode(prev => prev === 'dark' ? 'light' : 'dark')}
              className="samarth-mode-toggle flex items-center gap-2 rounded-xl border border-[var(--palette-line)] bg-[var(--surface-glass)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] shadow-xs"
              title={`Switch to ${displayMode === 'dark' ? 'light' : 'dark'} mode`}
            >
              {displayMode === 'dark' ? <Sun className="w-4 h-4 text-[var(--palette-accent)]" /> : <Moon className="w-4 h-4 text-[var(--palette-accent)]" />}
              <span>{displayMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className="flex items-center rounded-xl border border-[var(--palette-line)] bg-[var(--surface-glass)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] shadow-xs">
              {canManageEntries ? 'Entry Manager' : 'Contributor'}
            </div>

            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-2 rounded-xl border border-[var(--palette-line)] bg-[var(--surface-glass)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] shadow-xs hover:border-[var(--palette-accent)]"
              title={`Sign out ${user.email || 'current user'}`}
            >
              <LogOut className="w-4 h-4 text-[var(--palette-accent)]" />
              <span>Sign Out</span>
            </button>

            {/* Dynamic score statistic */}
            <div className="text-right hidden md:block rounded-lg border border-[var(--palette-line)] bg-[var(--surface-glass)] px-3 py-1.5">
              <p className="text-[9px] uppercase text-[var(--text-faint)] font-extrabold tracking-widest">Entries</p>
              <p className={`text-sm font-bold font-mono ${appTheme.headerText}`}>{data.auditItems.length}</p>
            </div>

            {/* Sync trigger button */}
            <button 
              onClick={() => fetchDashboardData(true)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${appTheme.btnBg}`}
              title="Sync team database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing' : 'Sync Data'}</span>
            </button>
          </div>
          </div>
        </header>

        {/* Mobile Horizontal Navigation Tabs */}
        <div className="md:hidden mx-4 mt-3 mb-3 flex overflow-x-auto whitespace-nowrap bg-[var(--surface-glass)] border border-[var(--palette-line)] rounded-[200px] p-1 gap-1 select-none z-40 shadow-xs">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMessage('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[200px] text-xs font-semibold select-none transition-colors cursor-pointer ${
                  isSelected 
                    ? appTheme.btnBg
                    : 'text-[var(--text-muted)] hover:bg-[var(--palette-soft)]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[var(--palette-accent)]'}`} />
                <span>{shortTabLabels[tab.id]}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content scrollable panel */}
        <main className="p-4 md:p-6 flex-1 flex flex-col space-y-6 overflow-y-auto max-w-[1360px] w-full mx-auto">
          
          {/* Sync notification message banner if any */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          {/* Tab component loader */}
          <div className="flex-1">
            {isLoading ? (
              <div className="py-24 text-center space-y-3 flex flex-col items-center justify-center">
                <RefreshCw className={`w-8 h-8 animate-spin ${appTheme.headerText}`} />
                <p className="text-sm text-slate-500 font-semibold">Loading workspace data...</p>
              </div>
            ) : (
              <div className="opacity-100 transition-opacity duration-300">
                
                {/* Insights aggregate dashboard */}
                {activeTab === 'insights' && (
                  <WorkspaceInsights 
                    auditItems={data.auditItems} 
                    savedPages={savedPages}
                    activePlatform={activePlatform}
                    onChangePlatform={setActivePlatform}
                  />
                )}

                {/* Contributor data upload portal feeding Insights */}
                {activeTab === 'contributor' && (
                  <ContributorPortal 
                    savedPages={savedPages}
                    onAddPage={handleAddPage}
                    onRemovePage={handleRemovePage}
                    activePlatform={activePlatform}
                    onChangePlatform={setActivePlatform}
                    onAddAuditItem={handleAddAuditItem}
                  />
                )}

                {/* Entry editing, soft archive, and restore controls */}
                {activeTab === 'management' && canManageEntries && (
                  <EntryManagementArchive
                    auditItems={data.auditItems}
                    savedPages={savedPages}
                    activePlatform={activePlatform}
                    onChangePlatform={setActivePlatform}
                    onUpdateAuditItem={handleUpdateAuditItem}
                    onArchiveAuditItem={handleArchiveAuditItem}
                  />
                )}

              </div>
            )}
          </div>

        </main>

        {/* Professional Humble Footer */}
        <footer id="workspace-footer" className="bg-[var(--surface-header)] border-t border-[var(--palette-line)] py-4 text-center text-[11px] text-[var(--text-faint)] select-none">
          <p>© 2026 SAMARTH Social Media Team Workspace. All audits aligned and synced with process metrics.</p>
        </footer>

      </div>

    </div>
  );
}
