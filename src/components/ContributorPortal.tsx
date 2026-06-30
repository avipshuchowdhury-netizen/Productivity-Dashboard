import React, { useState, useEffect } from 'react';
import { AuditItem, SocialPage, STATES_LIST } from '../types';
import { 
  Upload, 
  Plus, 
  Trash2, 
  Globe, 
  ExternalLink, 
  ShieldCheck, 
  Check, 
  Info, 
  FileSpreadsheet,
  User,
  LogOut,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface Props {
  savedPages: SocialPage[];
  onAddPage: (page: SocialPage) => void;
  onRemovePage: (name: string) => void;
  onAddAuditItem: (item: Omit<AuditItem, 'id'>) => Promise<void>;
  activePlatform: 'all' | 'facebook' | 'instagram' | 'youtube';
  onChangePlatform: (p: 'all' | 'facebook' | 'instagram' | 'youtube') => void;
}

export interface ContributorProfile {
  contributorName: string;
  pageName: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
}

export default function ContributorPortal({
  savedPages,
  onAddPage,
  onRemovePage,
  onAddAuditItem,
  activePlatform,
  onChangePlatform,
}: Props) {
  // Onboarding profile loaded from localStorage
  const [onboardProfile, setOnboardProfile] = useState<ContributorProfile | null>(() => {
    const cached = localStorage.getItem('samarth_contributor_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (
          parsed && 
          typeof parsed === 'object' && 
          typeof parsed.contributorName === 'string' && parsed.contributorName.trim().length > 0 &&
          typeof parsed.pageName === 'string' && parsed.pageName.trim().length > 0
        ) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error reading contributor profile');
      }
    }
    return null;
  });

  // Onboarding fields state
  const [oboName, setOboName] = useState('');
  const [oboPage, setOboPage] = useState('');
  const [oboFacebook, setOboFacebook] = useState('');
  const [oboInstagram, setOboInstagram] = useState('');
  const [oboYoutube, setOboYoutube] = useState('');

  // Configured states for upload
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState<'facebook' | 'instagram' | 'youtube'>('instagram');
  const [newFormat, setNewFormat] = useState('reel');
  const [newTheme, setNewTheme] = useState<'positive' | 'negative'>('positive');
  const [newState, setNewState] = useState<string>(STATES_LIST[0]);
  const [newPageName, setNewPageName] = useState<string>('');
  const [newPageLink, setNewPageLink] = useState<string>('');
  const [customPageInput, setCustomPageInput] = useState(false);
  
  const [newAuthor, setNewAuthor] = useState('');
  const [newViews, setNewViews] = useState('');
  const [newLikes, setNewLikes] = useState('');
  const [newComments, setNewComments] = useState('');
  const [newShares, setNewShares] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Page configuration states
  const [configPageName, setConfigPageName] = useState('');
  const [configPageUrl, setConfigPageUrl] = useState('');

  // Dynamic initialization of forms based on onboarding info
  useEffect(() => {
    if (onboardProfile) {
      setNewAuthor(onboardProfile.contributorName);
      setNewPageName(onboardProfile.pageName);
      
      // Select appropriate URLs depending on platform selection
      let defaultLink = onboardProfile.instagramUrl || onboardProfile.facebookUrl || onboardProfile.youtubeUrl;
      setNewPageLink(defaultLink || 'https://instagram.com/');
    }
  }, [onboardProfile]);

  // Adjust pre-filled upload URLs dynamically when changing chosen platform
  useEffect(() => {
    if (onboardProfile) {
      if (newPlatform === 'facebook' && onboardProfile.facebookUrl) {
        setNewPageLink(onboardProfile.facebookUrl);
      } else if (newPlatform === 'instagram' && onboardProfile.instagramUrl) {
        setNewPageLink(onboardProfile.instagramUrl);
      } else if (newPlatform === 'youtube' && onboardProfile.youtubeUrl) {
        setNewPageLink(onboardProfile.youtubeUrl);
      } else {
        const fallback = onboardProfile.instagramUrl || onboardProfile.facebookUrl || onboardProfile.youtubeUrl;
        if (fallback) setNewPageLink(fallback);
      }
    }
  }, [newPlatform, onboardProfile]);

  // Handle Onboarding registration form submission
  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oboName.trim() || !oboPage.trim()) return;

    const profile: ContributorProfile = {
      contributorName: oboName.trim(),
      pageName: oboPage.trim(),
      facebookUrl: oboFacebook.trim() || 'https://facebook.com/' + encodeURIComponent(oboPage.trim()),
      instagramUrl: oboInstagram.trim() || 'https://instagram.com/' + encodeURIComponent(oboPage.trim()),
      youtubeUrl: oboYoutube.trim() || 'https://youtube.com/@' + encodeURIComponent(oboPage.trim().replace(/\s+/g, '')),
    };

    localStorage.setItem('samarth_contributor_profile', JSON.stringify(profile));
    setOnboardProfile(profile);

    // Sync saved pages immediately so it is available globally under administrative lists
    onAddPage({
      name: profile.pageName,
      url: profile.instagramUrl || profile.facebookUrl || profile.youtubeUrl
    });
  };

  // Log Out / Reset Onboarding Profile flow
  const handleResetProfile = () => {
    if (window.confirm('Are you sure you want to log out? Doing so will clear your preset contributor details from this tab.')) {
      localStorage.removeItem('samarth_contributor_profile');
      setOnboardProfile(null);
      // Reset onboarding text fields
      setOboName('');
      setOboPage('');
      setOboFacebook('');
      setOboInstagram('');
      setOboYoutube('');
    }
  };

  // Local component theme mapper
  const getThemeColor = () => {
    switch (activePlatform) {
      case 'facebook':
        return {
          primary: '#1877f2',
          hover: 'hover:bg-[#eef5ff]',
          border: 'border-[#bfd8ff] focus:border-[#1877f2]',
          text: 'text-[#1877f2]',
          lightBg: 'bg-[#eef5ff]',
          headingColor: 'text-[#1877f2]',
          buttonBg: 'bg-[#1877f2] text-white hover:bg-[#0b5fcc]',
          focusRing: 'focus:ring-[#1877f2]/10'
        };
      case 'instagram':
        return {
          primary: '#e1306c',
          hover: 'hover:bg-[#fff0f6]',
          border: 'border-[#ffc2da] focus:border-[#e1306c]',
          text: 'text-[#e1306c]',
          lightBg: 'bg-[#fff0f6]',
          headingColor: 'text-[#e1306c]',
          buttonBg: 'bg-[#e1306c] text-white hover:bg-[#c13584]',
          focusRing: 'focus:ring-[#e1306c]/10'
        };
      case 'youtube':
        return {
          primary: '#ff0000',
          hover: 'hover:bg-[#fff1f1]',
          border: 'border-[#ffb8b8] focus:border-[#ff0000]',
          text: 'text-[#ff0000]',
          lightBg: 'bg-[#fff1f1]',
          headingColor: 'text-[#ff0000]',
          buttonBg: 'bg-[#ff0000] text-white hover:bg-[#cc0000]',
          focusRing: 'focus:ring-[#ff0000]/10'
        };
      default:
        return {
          primary: '#f73b20',
          hover: 'hover:bg-[#fbdfd9]',
          border: 'border-[#f8a4a4] focus:border-[#f73b20]',
          text: 'text-[#f73b20]',
          lightBg: 'bg-[#fbdfd9]',
          headingColor: 'text-[#360802]',
          buttonBg: 'bg-[linear-gradient(135deg,#f8a4a4_0%,#f73b20_100%)] text-white hover:opacity-90',
          focusRing: 'focus:ring-[#f73b20]/10'
        };
    }
  };

  const themeColors = getThemeColor();

  const handleCreatePageConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configPageName.trim() || !configPageUrl.trim()) return;
    onAddPage({ name: configPageName.trim(), url: configPageUrl.trim() });
    
    // Automatically select newly created page name on upload context
    setNewPageName(configPageName.trim());
    setConfigPageName('');
    setConfigPageUrl('');
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Determine target page name and link details
    let finalPageName = newPageName;
    if (customPageInput && newPageName.trim()) {
      finalPageName = newPageName.trim();
      // Add custom page to pages list automatically if custom specified
      if (!savedPages.some(p => p.name.toLowerCase() === finalPageName.toLowerCase())) {
        onAddPage({ name: finalPageName, url: newPageLink.trim() || 'https://socialmedia.example.com/' + encodeURIComponent(finalPageName) });
      }
    } else if (!finalPageName && savedPages.length > 0) {
      finalPageName = savedPages[0].name;
    }

    setIsSubmitting(true);
    try {
      await onAddAuditItem({
        title: newTitle,
        platform: newPlatform,
        format: newFormat,
        publishedAt: new Date().toISOString().slice(0, 10),
        views: Number(newViews) || 0,
        likes: Number(newLikes) || 0,
        comments: Number(newComments) || 0,
        shares: Number(newShares) || 0,
        author: newAuthor,
        state: newState,
        page: finalPageName,
        theme: newTheme
      });

      setSuccessMessage(`Success! Content item "${newTitle}" has been logged successfully for Page "${finalPageName}".`);
      
      // Auto reset fields
      setNewTitle('');
      setNewViews('');
      setNewLikes('');
      setNewComments('');
      setNewShares('');
      setProofUrl('');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 6000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!onboardProfile) {
    return (
      <div id="contributor-onboarding" className="max-w-2xl mx-auto my-8 animate-fade-in font-sans">
        <div className="bg-[#fffaf8] border border-[#f8a4a4] rounded-xl shadow-xs overflow-hidden">
          {/* Top visual graphic style header */}
          <div className="p-8 bg-[linear-gradient(135deg,#fbdfd9_0%,#fef5f3_60%,#e6f0ff_100%)] text-[#360802] relative overflow-hidden border-b border-[#f8a4a4]">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#34c771,#477ee9,#fb2d54,#f73b20)]"></div>
            <div className="absolute top-4 right-4 p-2 bg-[#fffaf8] rounded-xl text-[#f73b20] border border-[#f8a4a4] shadow-2xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            
            <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#6c3a2f] bg-[#fffaf8] border border-[#f8a4a4] px-2.5 py-1 rounded-xl select-none">
              SAMARTH WORKSPACE ACCESS
            </span>
            <h2 className="text-3xl font-display font-normal tracking-[-0.02em] leading-none mt-3 flex items-center gap-2">
              <User className="w-6 h-6 text-[#f73b20]" /> Contributor Registration & Onboarding
            </h2>
            <p className="text-xs text-[#6c3a2f] mt-2 select-none leading-relaxed max-w-xl">
              Welcome to the Single Admin Managed Analytics Review of Thematic Handles (SAMARTH) Workspace. Register your profile to automatically pre-fill publish stats, verify metadata, and sync your designated thematic pages.
            </p>
          </div>

          <form onSubmit={handleOnboardingSubmit} className="p-8 space-y-5 text-xs">
            {/* Contributor Profile details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 opacity-90">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contributor full name"
                  className="w-full px-3.5 py-2.5 border border-[#f8a4a4] rounded-lg outline-hidden bg-[#fef5f3] focus:bg-[#fffaf8] focus:ring-2 focus:ring-[#f73b20]/10 focus:border-[#f73b20] transition-all font-semibold text-[#360802]"
                  value={oboName}
                  onChange={e => setOboName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 opacity-90">
                  Your Page Name / Handle *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Punjab Voice"
                  className="w-full px-3.5 py-2.5 border border-[#f8a4a4] rounded-lg outline-hidden bg-[#fef5f3] focus:bg-[#fffaf8] focus:ring-2 focus:ring-[#f73b20]/10 focus:border-[#f73b20] transition-all font-semibold text-[#360802]"
                  value={oboPage}
                  onChange={e => setOboPage(e.target.value)}
                />
              </div>
            </div>

            {/* Social channels link setup */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <Globe className="w-3.5 h-3.5 text-[#f73b20]" /> Configure Channel Profile URLs
              </div>
              <p className="text-[11px] text-slate-400 select-none pb-1 font-medium leading-relaxed">
                Provide live profile web links for your target channels. Leave blank to generate automatically based on page name.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Instagram Handle / URL Profile Link
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://instagram.com/punjab_voice"
                    className="w-full px-3 py-2 border border-[#f8a4a4] rounded-lg outline-hidden bg-[#fef5f3] focus:bg-[#fffaf8] focus:border-[#f73b20] focus:ring-1 focus:ring-[#f73b20]/10 font-mono text-[11px] text-[#6c3a2f]"
                    value={oboInstagram}
                    onChange={e => setOboInstagram(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Facebook Page URL link
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://facebook.com/punjabvoice"
                    className="w-full px-3 py-2 border border-[#f8a4a4] rounded-lg outline-hidden bg-[#fef5f3] focus:bg-[#fffaf8] focus:border-[#f73b20] focus:ring-1 focus:ring-[#f73b20]/10 font-mono text-[11px] text-[#6c3a2f]"
                    value={oboFacebook}
                    onChange={e => setOboFacebook(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    YouTube Channel Handle / URL Profile Link
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://youtube.com/@punjabvoice"
                    className="w-full px-3 py-2 border border-[#f8a4a4] rounded-lg outline-hidden bg-[#fef5f3] focus:bg-[#fffaf8] focus:border-[#f73b20] focus:ring-1 focus:ring-[#f73b20]/10 font-mono text-[11px] text-[#6c3a2f]"
                    value={oboYoutube}
                    onChange={e => setOboYoutube(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Submission triggers */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <span className="text-[10px] text-slate-400 font-medium select-none max-w-sm">
                * Onboarding automatically maps your page details to the workspace page config system.
              </span>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-[linear-gradient(135deg,#f8a4a4_0%,#f73b20_100%)] hover:opacity-90 text-white font-semibold rounded-2xl transition-all text-xs cursor-pointer select-none"
              >
                Complete Onboarding <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="contributor-portal-view" className="space-y-6">
      
      {/* Contributor Header */}
      <div className={`p-6 bg-white border ${themeColors.border} rounded-xl shadow-xs transition-colors duration-200`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${themeColors.lightBg} ${themeColors.text}`}>
              <ShieldCheck className="w-3.5 h-3.5" /> Security Role: Verified Contributor
            </span>
            <h2 className={`text-xl font-display font-bold ${themeColors.headingColor} mt-2`}>
              Contributor Content Upload & Configuration Portal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Directly sync live handle metrics, save page URLs under administrative Page Names, and log publish proofs.
            </p>
          </div>

          {/* Active Onboarded Profile Badge */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 shrink-0">
            <div className={`w-8 h-8 rounded-full ${themeColors.lightBg} ${themeColors.text} flex items-center justify-center font-bold text-xs shrink-0 select-none`}>
              {onboardProfile.contributorName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 pr-2">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block leading-3">Onboarded Contributor</span>
              <span className="text-xs font-bold text-slate-800 truncate block">{onboardProfile.contributorName}</span>
              <span className="text-[9px] text-slate-500 font-mono truncate block">Page: {onboardProfile.pageName}</span>
            </div>
            <button
              onClick={handleResetProfile}
              className="p-1 px-2 hover:bg-[#fbdfd9] hover:text-[#360802] text-[#9b6255] rounded transition flex items-center gap-0.5 text-[10px] font-bold cursor-pointer border border-transparent hover:border-[#f8a4a4]"
              title="Reset Profile / Switch User"
            >
              <LogOut className="w-3 h-3 shrink-0" /> Exit
            </button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-[#e6f0ff] border border-[#9fc0ff] rounded-xl flex items-start gap-2.5 animate-fade-in">
          <Check className="w-5 h-5 text-[#477ee9] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#360802] text-sm">Update Complete</span>
            <p className="text-xs text-[#6c3a2f] mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Upload Form side, Manage Saved Pages other side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Easy Upload Form */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleUploadSubmit} className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
            <div className={`p-4 border-b border-slate-100 text-xs font-bold flex items-center justify-between ${themeColors.lightBg}`}>
              <span className={`uppercase tracking-wider ${themeColors.text} flex items-center gap-1.5`}>
                <Upload className="w-4 h-4" /> Log Organic Handle Statistics
              </span>
              <span className="text-slate-400">Date: {new Date().toISOString().slice(0, 10)}</span>
            </div>

            <div className="p-5 space-y-4 text-xs">
              
              {/* Form Row 1: Title and Author */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Content Publication Title *</label>
                  <input
                    type="text"
                    required
                    className={`w-full px-3 py-2 border rounded-lg outline-hidden bg-slate-50 focus:bg-white focus:ring-1 ${themeColors.border} ${themeColors.focusRing}`}
                    placeholder="Provide a specific descriptive title..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Logged By Contributor</label>
                  <input
                    type="text"
                    required
                    readOnly
                    className={`w-full px-3 py-2 border rounded-lg bg-slate-100 font-bold text-slate-700 outline-hidden focus:outline-hidden ${themeColors.border}`}
                    value={newAuthor}
                  />
                </div>
              </div>

              {/* Form Row 2: Selection of States and Pages */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* UPGRADE States List precisely as requested */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target States/Territories</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white outline-hidden ${themeColors.border}`}
                    value={newState}
                    onChange={e => setNewState(e.target.value)}
                  >
                    {STATES_LIST.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Social Channel</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white outline-hidden capitalize ${themeColors.border}`}
                    value={newPlatform}
                    onChange={e => {
                      const plat = e.target.value as 'facebook' | 'instagram' | 'youtube';
                      setNewPlatform(plat);
                      onChangePlatform(plat);
                    }}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>

                {/* Page Name & Link attachment integration - locked to onboarded Page Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Page Name (Locked to Onboarded profile) *</label>
                  <input
                    type="text"
                    required
                    readOnly
                    className={`w-full px-3 py-2 border rounded-lg bg-slate-100 font-bold text-slate-700 outline-hidden focus:outline-none ${themeColors.border}`}
                    value={newPageName}
                  />
                </div>

              </div>

              {/* Form Row 3: Format Style, Theme Dropdown and Proof URLs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Format Style</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white outline-hidden ${themeColors.border}`}
                    value={newFormat}
                    onChange={e => setNewFormat(e.target.value)}
                  >
                    <option value="reel">Reel</option>
                    <option value="creative">Creative</option>
                    <option value="repackage">Repackage</option>
                    <option value="carousel">Carousel</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Theme (Thematic Sentiment)</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white outline-hidden ${themeColors.border}`}
                    value={newTheme}
                    onChange={e => setNewTheme(e.target.value as 'positive' | 'negative')}
                  >
                    <option value="positive">🟢 Positive Theme</option>
                    <option value="negative">🔴 Negative Theme</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Proof Link / Live Post URL</label>
                  <input
                    type="url"
                    className={`w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white outline-hidden ${themeColors.border}`}
                    placeholder="e.g., https://instagram.com/p/your-post-id/"
                    value={proofUrl}
                    onChange={e => setProofUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Form Row 4: Metrics Input */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-dotted border-slate-200 mt-2">
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Publish Performance Metrics</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Views Count</label>
                    <input
                      type="number"
                      className={`w-full px-2.5 py-1.5 border rounded-md outline-hidden focus:bg-white ${themeColors.border}`}
                      placeholder="e.g., 12000"
                      value={newViews}
                      onChange={e => setNewViews(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Likes</label>
                    <input
                      type="number"
                      className={`w-full px-2.5 py-1.5 border rounded-md outline-hidden focus:bg-white ${themeColors.border}`}
                      placeholder="e.g., 900"
                      value={newLikes}
                      onChange={e => setNewLikes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Comments</label>
                    <input
                      type="number"
                      className={`w-full px-2.5 py-1.5 border rounded-md outline-hidden focus:bg-white ${themeColors.border}`}
                      placeholder="e.g., 45"
                      value={newComments}
                      onChange={e => setNewComments(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Shares</label>
                    <input
                      type="number"
                      className={`w-full px-2.5 py-1.5 border rounded-md outline-hidden focus:bg-white ${themeColors.border}`}
                      placeholder="e.g., 120"
                      value={newShares}
                      onChange={e => setNewShares(e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Submission Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Uploads are saved and reflected in Insights
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center gap-1.5 px-6 py-2.5 rounded-2xl font-bold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${themeColors.buttonBg}`}
              >
                {isSubmitting ? 'Syncing...' : 'Upload Performance Metric Log'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Manage Pages & Attach Links */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Globe className={`w-4 h-4 ${themeColors.text}`} /> Manage Pages and Attach URLs
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 lines-clamp-3">
              Associate physical page identifiers with their relevant social profile Web page links. High-level dashboard displays draw direct clickable references from here.
            </p>

            {/* Create dynamic Page & URL relationship form */}
            <form onSubmit={handleCreatePageConfig} className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Map New Page:</span>
              <div>
                <input
                  type="text"
                  required
                  placeholder="Page Name (e.g., Punjab Voice)"
                  className={`w-full px-2.5 py-1.5 border rounded bg-white text-xs outline-hidden ${themeColors.border}`}
                  value={configPageName}
                  onChange={e => setConfigPageName(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  required
                  placeholder="https://facebook.com/punjabvoice"
                  className={`flex-1 px-2.5 py-1.5 border rounded bg-white text-xs outline-hidden ${themeColors.border}`}
                  value={configPageUrl}
                  onChange={e => setConfigPageUrl(e.target.value)}
                />
                <button
                  type="submit"
                  className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${themeColors.buttonBg}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Dynamic Pages and Custom page links lists display */}
            <div className="mt-5 space-y-2.5 max-h-96 overflow-y-auto pr-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">Configured Pages Map:</span>
              {savedPages.map(page => (
                <div key={page.name} className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100/85 transition border border-slate-200 rounded-lg flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 block truncate">{page.name}</span>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] font-medium hover:underline truncate inline-flex items-center gap-0.5 mt-0.5 ${themeColors.text}`}
                    >
                      {page.url} <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemovePage(page.name)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title={`De-activate ${page.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {savedPages.length === 0 && (
                <span className="block text-slate-400 italic text-[11px] text-center py-4">No configured pages setup yet</span>
              )}
            </div>
          </div>

          {/* Guidelines on correct uploads */}
          <div className="bg-[#fbdfd9] border border-[#f8a4a4] text-[#360802] rounded-xl shadow-xs p-5 space-y-2 text-xs">
            <span className="text-[#f73b20] uppercase font-bold text-[10px] tracking-wide block">Data Quality Integrity Checklist:</span>
            <ul className="space-y-1.5 text-[#6c3a2f] list-disc pl-4 text-[11px]">
              <li>Use absolute values of views and shares from platform native insights.</li>
              <li>Always attach exact channel page to retain real-time mapping consistency.</li>
              <li>Attach post proof URLs so supervisors can conduct target sample checks easily.</li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
