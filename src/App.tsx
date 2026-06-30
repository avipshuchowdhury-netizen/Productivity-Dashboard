import React, { useState, useEffect } from 'react';
import { 
  Archive,
  BarChart2, 
  RefreshCw, 
  Target, 
  Upload
} from 'lucide-react';

// Import Types
import { DashboardData, AuditItem, SocialPage, DEFAULT_PAGES } from './types';

// Import Modular Components
import WorkspaceInsights from './components/WorkspaceInsights';
import ContributorPortal from './components/ContributorPortal';
import EntryManagementArchive from './components/EntryManagementArchive';

const AUDIT_STORAGE_KEY = 'samarth_audit_items';

const readLocalAuditItems = (): AuditItem[] => {
  try {
    const cached = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Local audit storage reset');
    return [];
  }
};

const writeLocalAuditItems = (items: AuditItem[]) => {
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(items));
};

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
  archiveReason: item.archiveReason?.trim() || undefined
});

export default function App() {
  // Current Selected Tab
  const [activeTab, setActiveTab] = useState<'insights' | 'contributor' | 'management'>('insights');
  
  // High-level Platform Theme state
  const [activePlatform, setActivePlatform] = useState<'all' | 'facebook' | 'instagram' | 'youtube'>('all');

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
  
  const getAppThemeClasses = () => {
    return {
      headerText: 'text-[#ff3a63]',
      sideText: 'text-[#ff3a63]',
      logoBg: 'bg-[#0c0a2b]/80 border border-[#292a4d]',
      logoText: 'text-white',
      btnBg: 'bg-[linear-gradient(135deg,#ff8a76_0%,#ff3a63_100%)] text-white hover:opacity-90',
      accentText: 'text-[#ff3a63]',
      accentBg: 'bg-[#13151f] text-white border border-[#292a4d]',
      sideActive: 'bg-[#2c2b52] text-white border border-[#665eff]'
    };
  };

  const appTheme = getAppThemeClasses();

  
  // Database States
  const [data, setData] = useState<DashboardData>({
    auditItems: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Entire Database on Load
  const fetchDashboardData = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setIsSyncing(true);
    setErrorMessage('');
    try {
      const response = await fetch("/api/dashboard-data");
      if (!response.ok) {
        throw new Error("Server storage unavailable");
      }
      const json = await response.json();
      setData({
        auditItems: json.auditItems || []
      });
    } catch (err: any) {
      console.error(err);
      setData({ auditItems: readLocalAuditItems() });
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // API Call Helpers for updating server DB states

  // 1. Audit Items
  const handleAddAuditItem = async (item: Omit<AuditItem, 'id'>) => {
    const localItem: AuditItem = {
      ...item,
      id: "aud-" + Date.now(),
      views: Number(item.views) || 0,
      likes: Number(item.likes) || 0,
      comments: Number(item.comments) || 0,
      shares: Number(item.shares) || 0
    };

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", item })
      });
      if (res.ok) {
        await fetchDashboardData(true);
        return;
      }
      throw new Error("Server storage unavailable");
    } catch (e) {
      console.error(e);
      setData(prev => {
        const nextAuditItems = [...prev.auditItems, localItem];
        writeLocalAuditItems(nextAuditItems);
        return { auditItems: nextAuditItems };
      });
    }
  };

  const handleUpdateAuditItem = async (item: AuditItem) => {
    const normalizedItem = normalizeAuditItem(item);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", item: normalizedItem })
      });
      if (res.ok) {
        await fetchDashboardData(true);
        return;
      }
      throw new Error("Server storage unavailable");
    } catch (e) {
      console.error(e);
      setData(prev => {
        const nextAuditItems = prev.auditItems.map(existing =>
          existing.id === normalizedItem.id ? normalizedItem : existing
        );
        writeLocalAuditItems(nextAuditItems);
        return { auditItems: nextAuditItems };
      });
    }
  };

  const handleArchiveAuditItem = async (id: string) => {
    const archivedAt = new Date().toISOString();
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", item: { id, archiveReason: "manual" } })
      });
      if (res.ok) {
        await fetchDashboardData(true);
        return;
      }
      throw new Error("Server storage unavailable");
    } catch (e) {
      console.error(e);
      setData(prev => {
        const nextAuditItems = prev.auditItems.map(item =>
          item.id === id ? { ...item, archivedAt, archiveReason: "manual" } : item
        );
        writeLocalAuditItems(nextAuditItems);
        return { auditItems: nextAuditItems };
      });
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
    { id: 'insights', label: 'Workspace Insights', icon: BarChart2, iconTile: 'bg-[#665eff] text-white', idleTile: 'bg-[#13151f] text-[#9b9ba4]' },
    { id: 'contributor', label: 'Data Upload', icon: Upload, iconTile: 'bg-[#665eff] text-white', idleTile: 'bg-[#13151f] text-[#9b9ba4]' },
    { id: 'management', label: 'Entry Management', icon: Archive, iconTile: 'bg-[#665eff] text-white', idleTile: 'bg-[#13151f] text-[#9b9ba4]' },
  ] as const;
  const shortTabLabels: Record<typeof tabs[number]['id'], string> = {
    insights: 'Insights',
    contributor: 'Upload',
    management: 'Manage'
  };

  return (
    <div id="full-app-root" className="min-h-screen flex font-sans text-white overflow-x-hidden">
      
      {/* Left Navigation Rail (SAMARTH Theme) */}
      <aside id="left-sidebar-rail" className="hidden">
        {/* Sidebar Logo branded as SAMARTH with dynamic platform color matching */}
        <div className={`w-18 h-18 rounded-xl flex flex-col items-center justify-center font-bold text-xs select-none text-center px-1 font-display transition-all duration-300 ${appTheme.logoBg}`}>
          <span className={`font-extrabold uppercase tracking-[0.03em] text-[11px] ${appTheme.logoText}`}>SAMARTH</span>
          <span className="text-[7px] text-[#ff3a63] uppercase tracking-widest leading-none mt-0.5 font-bold">WORKSPACE</span>
        </div>

        {/* Sidebar Nav Buttons */}
        <nav className="flex-1 flex flex-col gap-3.5 w-full px-2 mt-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMessage('');
                }}
                className={`w-full py-3 px-1 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center relative group cursor-pointer ${
                  isSelected
                    ? appTheme.sideActive
                    : 'text-[#9b9ba4] border border-transparent hover:border-[#292a4d] hover:bg-[#13151f]'
                }`}
                title={tab.label}
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${isSelected ? tab.iconTile : tab.idleTile}`}>
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                </span>
                <span className="text-[8px] font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[76px] scale-95 uppercase font-mono">
                  {shortTabLabels[tab.id]}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Dynamic counter widget inside sidebar */}
        <div className="w-18 px-1 py-2 bg-[#13151f] rounded-xl text-center border border-[#292a4d] mb-2 hidden lg:block">
          <p className="text-[7px] text-[#9b9ba4] font-bold uppercase tracking-wider">Metrics</p>
          <span className={`text-xs font-bold font-mono transition-colors duration-350 ${appTheme.sideText}`}>{data.auditItems.length}</span>
        </div>

        {/* Avatar block */}
        <div className="mt-2 pt-4 border-t border-[#292a4d] w-full flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[#0c0a2b] border-2 border-[#ff3a63] text-[#ff3a63] flex items-center justify-center font-bold text-xs select-none">
            S
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="shrink-0 bg-[#04061c]/80 backdrop-blur flex flex-col gap-4 px-4 py-4 md:px-8 md:py-6 select-none z-50 border-b border-[#292a4d]">
          <div className="max-w-[1200px] w-full mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg md:hidden ${appTheme.accentBg}`}>
              <Target className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2">
              <h1 className="text-xl md:text-3xl font-normal leading-none font-display text-white">
                {tabs.find(t => t.id === activeTab)?.label || "Production Overview"}
              </h1>
              <span className={`text-[9px] md:text-[10px] font-semibold tracking-normal hidden sm:inline md:ml-1 uppercase font-mono ${appTheme.headerText}`}>
                SAMARTH (Single Admin Managed Analytics Review of Thematic Handles)
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center justify-center bg-[#0c0a2b]/85 border border-[#292a4d] rounded-[200px] p-1.5 gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setErrorMessage('');
                  }}
                  className={`flex items-center gap-2 rounded-[200px] px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    isSelected ? appTheme.sideActive : 'text-[#9b9ba4] hover:bg-[#13151f]'
                  }`}
                  title={tab.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#9b9ba4]'}`} />
                  <span>{shortTabLabels[tab.id]}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex gap-4 md:gap-5 items-center">
            {/* Dynamic score statistic */}
            <div className="text-right hidden md:block">
              <p className="text-[9px] uppercase text-[#9b9ba4] font-extrabold tracking-widest">Entries</p>
              <p className={`text-sm font-bold ${appTheme.headerText}`}>{data.auditItems.length}</p>
            </div>
            <div className="h-8 w-[1px] bg-[#292a4d] hidden md:block"></div>

            {/* Sync trigger button */}
            <button 
              onClick={() => fetchDashboardData(true)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${appTheme.btnBg}`}
              title="Sync team database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
          </div>
        </header>

        {/* Mobile Horizontal Navigation Tabs */}
        <div className="md:hidden mx-4 mb-3 flex overflow-x-auto whitespace-nowrap bg-[#0c0a2b]/85 border border-[#292a4d] rounded-[200px] p-1.5 gap-1.5 select-none z-40">
          {tabs.map(tab => {
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
                    : 'text-[#9b9ba4] hover:bg-[#13151f]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#9b9ba4]'}`} />
                <span>{shortTabLabels[tab.id]}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content scrollable panel */}
        <main className="p-4 md:p-8 flex-1 flex flex-col space-y-6 overflow-y-auto max-w-[1200px] w-full mx-auto">
          
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
                <p className="text-sm text-slate-500 font-semibold animate-pulse">Mounting social media productivity database streams...</p>
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
                {activeTab === 'management' && (
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
        <footer id="workspace-footer" className="bg-[#02030b] border-t border-[#292a4d] py-4 text-center text-[11px] text-[#9b9ba4] select-none">
          <p>© 2026 SAMARTH Social Media Team Workspace. All audits aligned and synced with process metrics.</p>
        </footer>

      </div>

    </div>
  );
}
