import React, { useState, useEffect } from 'react';
import { 
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

export default function App() {
  // Current Selected Tab
  const [activeTab, setActiveTab] = useState<'insights' | 'contributor'>('insights');
  
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
    switch (activePlatform) {
      case 'facebook':
        return {
          headerText: 'text-blue-650',
          sideText: 'text-blue-400',
          logoBg: 'bg-blue-600 shadow-blue-900/30',
          logoText: 'text-blue-200',
          btnBg: 'bg-blue-600 hover:bg-blue-700',
          accentText: 'text-blue-600',
          accentBg: 'bg-blue-50 text-blue-600',
          sideActive: 'bg-white/10 text-blue-400 border border-white/5 shadow-inner'
        };
      case 'instagram':
        return {
          headerText: 'text-pink-650',
          sideText: 'text-pink-400',
          logoBg: 'bg-pink-600 shadow-pink-900/30',
          logoText: 'text-pink-200',
          btnBg: 'bg-pink-600 hover:bg-pink-700',
          accentText: 'text-pink-600',
          accentBg: 'bg-pink-50 text-pink-600',
          sideActive: 'bg-white/10 text-pink-400 border border-white/5 shadow-inner'
        };
      case 'youtube':
        return {
          headerText: 'text-red-650',
          sideText: 'text-red-400',
          logoBg: 'bg-red-600 shadow-red-900/30',
          logoText: 'text-red-200',
          btnBg: 'bg-red-600 hover:bg-red-700',
          accentText: 'text-red-600',
          accentBg: 'bg-red-50 text-red-600',
          sideActive: 'bg-white/10 text-red-400 border border-white/5 shadow-inner'
        };
      default:
        return {
          headerText: 'text-orange-600',
          sideText: 'text-orange-400',
          logoBg: 'bg-orange-600 shadow-orange-900/30',
          logoText: 'text-orange-200',
          btnBg: 'bg-orange-600 hover:bg-orange-700',
          accentText: 'text-orange-600',
          accentBg: 'bg-orange-50 text-orange-600',
          sideActive: 'bg-white/10 text-orange-400 border border-white/5 shadow-inner'
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
    { id: 'insights', label: 'Workspace Insights', icon: BarChart2 },
    { id: 'contributor', label: 'Data Upload', icon: Upload },
  ] as const;

  return (
    <div id="full-app-root" className="min-h-screen bg-[#F1F5F9] flex font-sans text-slate-800 overflow-x-hidden">
      
      {/* Left Navigation Rail (SAMARTH Theme) */}
      <aside id="left-sidebar-rail" className="w-24 bg-[#0F172A] hidden md:flex flex-col items-center py-6 gap-6 shrink-0 border-r border-[#1E293B] select-none">
        {/* Sidebar Logo branded as SAMARTH with dynamic platform color matching */}
        <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center text-white font-bold text-xs select-none shadow-md text-center px-1 font-display transition-all duration-300 ${appTheme.logoBg}`}>
          <span className="font-extrabold uppercase tracking-tight text-[11px]">SAMARTH</span>
          <span className="text-[7px] text-slate-200 uppercase tracking-widest leading-none mt-0.5 font-bold">WORKSPACE</span>
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
                    ? `bg-white/10 ${appTheme.sideText} border border-white/5 shadow-inner` 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={tab.label}
              >
                <Icon className="w-5.5 h-5.5 shrink-0" />
                <span className="text-[8px] font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[76px] scale-95 uppercase font-mono">
                  {tab.id === 'insights' ? 'Insights' : 'Upload'}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Dynamic counter widget inside sidebar */}
        <div className="w-16 px-1 py-2 bg-slate-800/40 rounded-lg text-center border border-white/5 mb-2 hidden lg:block">
          <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Metrics</p>
          <span className={`text-xs font-bold font-mono transition-colors duration-350 ${appTheme.sideText}`}>{data.auditItems.length}</span>
        </div>

        {/* Avatar block */}
        <div className="mt-2 pt-4 border-t border-[#1C2533] w-full flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 text-white flex items-center justify-center font-bold text-xs select-none">
            S
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 select-none sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg md:hidden ${appTheme.accentBg}`}>
              <Target className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2">
              <h1 className="text-sm md:text-lg font-bold tracking-tight font-display text-slate-900 uppercase">
                {tabs.find(t => t.id === activeTab)?.label || "Production Overview"}
              </h1>
              <span className={`text-[9px] md:text-[10px] font-bold tracking-wide hidden sm:inline md:ml-1 uppercase font-mono ${appTheme.headerText}`}>
                SAMARTH (Single Admin Managed Analytics Review of Thematic Handles)
              </span>
            </div>
          </div>

          <div className="flex gap-4 md:gap-5 items-center">
            {/* Dynamic score statistic */}
            <div className="text-right hidden md:block">
              <p className="text-[9px] uppercase text-slate-400 font-extrabold tracking-widest">Entries</p>
              <p className={`text-sm font-bold ${appTheme.headerText}`}>{data.auditItems.length}</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

            {/* Sync trigger button */}
            <button 
              onClick={() => fetchDashboardData(true)}
              className={`text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${appTheme.btnBg}`}
              title="Sync team database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Navigation Tabs */}
        <div className="md:hidden flex overflow-x-auto whitespace-nowrap bg-white border-b border-slate-200 p-1.5 gap-1.5 select-none sticky top-16 z-40 shadow-xs">
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
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold select-none transition-colors cursor-pointer ${
                  isSelected 
                    ? `text-white shadow-xs ${appTheme.btnBg}` 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content scrollable panel */}
        <main className="p-4 md:p-8 flex-1 flex flex-col space-y-6 overflow-y-auto max-w-7xl w-full mx-auto">
          
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

              </div>
            )}
          </div>

        </main>

        {/* Professional Humble Footer */}
        <footer id="workspace-footer" className="bg-white border-t border-slate-200/80 py-4 text-center text-[11px] text-slate-400 select-none">
          <p>© 2026 SAMARTH Social Media Team Workspace. All audits aligned and synced with process metrics.</p>
        </footer>

      </div>

    </div>
  );
}
