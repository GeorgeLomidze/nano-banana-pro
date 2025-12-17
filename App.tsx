import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AspectRatio, 
  ImageSize, 
  GenerationConfig, 
  HistoryItem, 
  EditorState 
} from './types';
import { 
  ASPECT_RATIOS, 
  IMAGE_SIZES, 
  STORAGE_KEY, 
  LOADING_MESSAGES 
} from './constants';
import { GeminiService } from './services/geminiService';
import { StorageService } from './services/storageService';
import HistoryPanel from './components/HistoryPanel';

const App: React.FC = () => {
  // Check if running locally with API key or in AI Studio
  const isLocalMode = Boolean(process.env.API_KEY);
  const [isAuth, setIsAuth] = useState(isLocalMode);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<GenerationConfig>({
    aspectRatio: '1:1',
    imageSize: '1K',
    prompt: '',
    negativePrompt: '',
  });

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // In local mode, we're already authenticated via .env.local
      if (isLocalMode) {
        setIsAuth(true);
        return;
      }
      // In AI Studio mode, check via their API
      try {
        const hasKey = await window.aistudio?.hasSelectedApiKey();
        setIsAuth(hasKey ?? false);
      } catch (e) {
        console.log('Running in local mode');
        setIsAuth(isLocalMode);
      }
    };
    checkAuth();

    const loadHistory = async () => {
      try {
        const savedHistory = await StorageService.getAllHistory();
        setHistory(savedHistory);
      } catch (e) {
        console.error("Failed to load history from IndexedDB", e);
      }
    };
    loadHistory();
  }, []);

  const handleAuth = async () => {
    try {
      if (isLocalMode) {
        // Already have API key from .env.local
        setIsAuth(true);
        return;
      }
      await window.aistudio?.openSelectKey();
      setIsAuth(true);
    } catch (e) {
      setError("Failed to open API key selection dialog.");
    }
  };

  const handleGenerate = async () => {
    if (!config.prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    
    const interval = setInterval(() => {
      setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 3000);

    try {
      const url = await GeminiService.generateImage(config, referenceImage || undefined);
      setResultImage(url);
      
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        imageUrl: url,
        prompt: config.prompt,
        config: { ...config },
        timestamp: Date.now()
      };
      
      await StorageService.saveHistoryItem(newHistoryItem);
      setHistory(prev => [newHistoryItem, ...prev]);

    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setIsAuth(false);
        setError("Your API key session has expired. Please re-select your project.");
        if (!isLocalMode) {
          await window.aistudio?.openSelectKey();
          setIsAuth(true);
        }
      } else {
        setError(err.message || "An unexpected error occurred during generation.");
      }
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await StorageService.deleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error("Failed to delete history item", e);
    }
  };

  const clearAllHistory = async () => {
    if (window.confirm("Are you sure you want to clear all generation history?")) {
      try {
        await StorageService.clearAllHistory();
        setHistory([]);
      } catch (e) {
        console.error("Failed to clear history", e);
      }
    }
  };

  const selectHistoryItem = (item: HistoryItem) => {
    setResultImage(item.imageUrl);
    setConfig(item.config);
    setShowHistory(false);
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `banana-pro-${Date.now()}.png`;
    link.click();
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
        <div className="max-w-md w-full glass-card p-10 rounded-[32px] text-center shadow-2xl">
          <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(245,184,0,0.3)]">
            <i className="fas fa-wand-magic-sparkles text-4xl text-base-dark"></i>
          </div>
          <h1 className="text-4xl font-display font-bold mb-4 bg-gradient-to-r from-gold-marigold to-gold-warm bg-clip-text text-transparent">
            Banana Pro Vision
          </h1>
          <p className="text-base-mist mb-10 leading-relaxed font-sans">
            Step into the future of creative intelligence. Please authorize your session via the Google Cloud platform.
          </p>
          <button 
            onClick={handleAuth}
            className="w-full py-5 px-8 gradient-primary hover:brightness-110 text-base-dark font-bold rounded-2xl transition-all flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95 golden-glow"
          >
            <i className="fas fa-key"></i> Authorize Suite
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            className="block mt-8 text-xs text-base-mist hover:text-gold transition-colors underline underline-offset-4"
          >
            Billing & Documentation
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-white font-sans relative z-10">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-80 h-screen glass-card border-none rounded-none md:rounded-r-[32px] flex-col p-8 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
            <i className="fas fa-image text-base-dark text-xl"></i>
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Banana Pro</h1>
        </div>

        <section className="space-y-8 flex-1">
          {/* Aspect Ratio Selector */}
          <div>
            <label className="text-xs uppercase tracking-[0.1em] font-bold text-base-mist mb-4 block">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-3">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setConfig({ ...config, aspectRatio: ratio.value })}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                    config.aspectRatio === ratio.value 
                    ? 'border-gold bg-gold/15 text-gold shadow-[0_0_15px_rgba(245,184,0,0.2)]' 
                    : 'border-white/5 bg-base-graphite/40 text-base-mist hover:border-white/10'
                  }`}
                >
                  <span className="text-sm font-bold mb-1">{ratio.value}</span>
                  <span className="text-[10px] font-bold uppercase">{ratio.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Options */}
          <div>
            <label className="text-xs uppercase tracking-[0.1em] font-bold text-base-mist mb-4 block">Resolution</label>
            <div className="flex gap-3">
              {IMAGE_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setConfig({ ...config, imageSize: size })}
                  className={`flex-1 py-3 rounded-xl border transition-all text-xs font-bold uppercase ${
                    config.imageSize === size 
                    ? 'border-gold bg-gold/15 text-gold shadow-[0_0_15px_rgba(245,184,0,0.2)]' 
                    : 'border-white/5 bg-base-graphite/40 text-base-mist hover:border-white/10'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Section */}
          <div>
            <label className="text-xs uppercase tracking-[0.1em] font-bold text-base-mist mb-4 block">
              Reference Image
            </label>
            {referenceImage ? (
              <div className="relative rounded-2xl overflow-hidden group border border-gold/20 shadow-lg bg-base-dark/50 p-1">
                <img src={referenceImage} className="w-full h-44 object-contain rounded-xl" />
                <div className="absolute inset-0 bg-base-dark/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                   <button 
                    onClick={() => { setReferenceImage(null); }}
                    className="w-12 h-12 bg-red-500 rounded-full text-white shadow-xl hover:scale-110 transition-transform"
                   >
                    <i className="fas fa-trash"></i>
                   </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-44 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 text-base-mist hover:border-gold/50 hover:text-gold transition-all bg-base-graphite/30"
              >
                <i className="fas fa-plus-circle text-3xl opacity-50"></i>
                <span className="text-xs font-bold uppercase tracking-widest">Image</span>
              </button>
            )}
          </div>
        </section>

        <div className="pt-8 mt-8 border-t border-white/5">
          <button 
            onClick={() => setShowHistory(true)}
            className="w-full py-4 bg-white/5 hover:bg-gold/10 text-base-mist hover:text-gold rounded-2xl border border-white/5 hover:border-gold/30 flex items-center justify-center gap-3 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <i className="fas fa-folder-open"></i> Gallery
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden">
        {/* Mobile Header - Only visible on mobile */}
        <header className="md:hidden px-4 py-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-image text-base-dark text-lg"></i>
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight">Banana Pro</h1>
          </div>
          <button 
            onClick={() => setShowHistory(true)}
            className="px-4 py-2 bg-white/5 hover:bg-gold/10 text-base-mist hover:text-gold rounded-xl border border-white/5 hover:border-gold/30 flex items-center gap-2 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <i className="fas fa-folder-open"></i>
          </button>
        </header>

        {/* Central Display */}
        <div className="flex-1 overflow-auto p-4 md:p-6 flex items-center justify-center custom-scrollbar relative">
          {loading && (
            <div className="text-center space-y-10 max-w-md animate-in fade-in duration-700">
              <div className="relative w-44 h-44 mx-auto">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gold/20 via-gold-warm/10 to-gold/20 blur-xl animate-pulse"></div>
                {/* Spinning border */}
                <div className="absolute inset-0 border-[4px] border-gold/20 rounded-full"></div>
                <div className="absolute inset-0 border-[4px] border-transparent border-t-gold border-r-gold/50 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                {/* Inner circle with banana */}
                <div className="absolute inset-3 bg-gradient-to-br from-base-charcoal to-base-dark rounded-full flex items-center justify-center overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-gold/10 to-transparent"></div>
                  {/* Banana emoji with animations */}
                  <div className="relative">
                    <span 
                      className="text-7xl select-none"
                      style={{
                        animation: 'bananaFloat 3s ease-in-out infinite, bananaRotate 4s ease-in-out infinite',
                        display: 'inline-block',
                        filter: 'drop-shadow(0 0 20px rgba(245, 184, 0, 0.5))'
                      }}
                    >
                      🍌
                    </span>
                  </div>
                </div>
                {/* Orbiting particles */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-gold rounded-full shadow-[0_0_10px_rgba(245,184,0,0.8)]"></div>
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
                  <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-gold-warm rounded-full shadow-[0_0_8px_rgba(255,170,0,0.8)]"></div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-white via-gold-marigold to-white bg-clip-text text-transparent">Generating...</h3>
                <p className="text-gold/60 italic text-lg font-sans">{loadingMsg}</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="max-w-md w-full p-8 bg-red-500/10 border border-red-500/30 rounded-3xl text-center space-y-6 animate-in zoom-in-95 backdrop-blur-md">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <i className="fas fa-triangle-exclamation text-3xl text-red-500"></i>
              </div>
              <h3 className="text-2xl font-display font-bold">System Anomaly</h3>
              <p className="text-base-mist text-sm leading-relaxed">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all"
              >
                Clear Signal
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="w-full h-full flex items-center justify-center p-2 relative">
              {referenceImage && !resultImage ? (
                <div className="max-w-full max-h-full flex flex-col items-center justify-center gap-6 animate-in zoom-in duration-500">
                  <div className="relative glass-card p-1.5 rounded-[32px] overflow-hidden shadow-xl bg-base-dark/30">
                    <img src={referenceImage} alt="Reference" className="max-h-[65vh] w-auto rounded-[28px] object-contain block shadow-lg" />
                    <button 
                      onClick={() => setReferenceImage(null)}
                      className="absolute top-4 right-4 w-10 h-10 bg-red-500/80 hover:bg-red-500 text-white rounded-xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                  <div className="px-6 py-2.5 bg-base-charcoal/60 rounded-full border border-white/5 backdrop-blur-md flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold animate-pulse"></div>
                    <span className="text-[10px] font-bold text-base-mist uppercase tracking-widest">Reference Locked</span>
                  </div>
                </div>
              ) : resultImage ? (
                <div className="relative group max-w-full max-h-full flex items-center justify-center animate-in zoom-in duration-700">
                  <div className="p-1 glass-card rounded-[28px] overflow-hidden subtle-glow bg-base-dark/20 relative">
                    <img src={resultImage} alt="Artifact Output" className="max-h-[55vh] w-auto rounded-[24px] object-contain block mx-auto" />
                    {/* Overlay buttons on image */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => setIsMaximized(true)}
                        className="w-10 h-10 flex items-center justify-center bg-base-dark/70 hover:bg-gold hover:text-base-dark text-white rounded-xl backdrop-blur-md transition-all shadow-lg border border-white/10"
                        title="გაშლა"
                      >
                        <i className="fas fa-expand"></i>
                      </button>
                      <button 
                        onClick={downloadImage}
                        className="w-10 h-10 flex items-center justify-center bg-base-dark/70 hover:bg-gold hover:text-base-dark text-white rounded-xl backdrop-blur-md transition-all shadow-lg border border-white/10"
                        title="გადმოწერა"
                      >
                        <i className="fas fa-download"></i>
                      </button>
                    </div>
                    {/* Bottom action button */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => { setReferenceImage(resultImage); setResultImage(null); }}
                        className="px-5 py-2.5 bg-base-dark/70 hover:bg-gold hover:text-base-dark text-white rounded-xl backdrop-blur-md font-bold text-xs shadow-lg flex items-center gap-2 border border-white/10 transition-all"
                      >
                        <i className="fas fa-wand-magic-sparkles"></i> Use as Reference
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Floating Controller */}
        <div className="p-4 md:p-6 flex justify-center relative z-20">
          <div className="w-full max-w-4xl glass-card rounded-[24px] md:rounded-[32px] p-3 shadow-2xl flex flex-col gap-3">
            {/* Reference Image Preview - Mobile only when attached */}
            {referenceImage && (
              <div className="md:hidden flex items-center gap-3 px-3 py-2 bg-base-dark/30 rounded-xl border border-gold/20">
                <img src={referenceImage} className="w-12 h-12 object-cover rounded-lg" />
                <span className="text-xs text-base-mist flex-1">Reference attached</span>
                <button 
                  onClick={() => setReferenceImage(null)}
                  className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
            
            {/* Main Input Row */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea 
                  value={config.prompt}
                  onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                  placeholder="Enter prompt..."
                  className="w-full bg-base-dark/50 border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 text-base font-sans focus:border-gold/50 focus:ring-2 focus:ring-gold/5 outline-none resize-none min-h-[80px] md:min-h-[100px] transition-all custom-scrollbar"
                  rows={2}
                />
              </div>
              <button 
                onClick={handleGenerate}
                disabled={loading || !config.prompt.trim()}
                className={`generate-btn px-6 md:px-10 rounded-xl md:rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1 min-w-[100px] md:min-w-[140px] ${
                  loading || !config.prompt.trim()
                  ? 'bg-base-graphite text-base-mist cursor-not-allowed opacity-50'
                  : 'gradient-primary text-base-dark'
                }`}
              >
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-bolt-lightning'} text-xl md:text-2xl`}></i>
                <span className="text-[10px] uppercase tracking-widest">GENERATE</span>
              </button>
            </div>
            
            {/* Controls Row - Mobile: dropdowns, Desktop: just info display */}
            <div className="flex flex-wrap gap-2 items-center px-1 border-t border-white/5 pt-3">
              {/* Mobile Controls */}
              <div className="md:hidden flex flex-wrap gap-2 items-center w-full">
                {/* Aspect Ratio Dropdown */}
                <div className="relative">
                  <select
                    value={config.aspectRatio}
                    onChange={(e) => setConfig({ ...config, aspectRatio: e.target.value as any })}
                    className="appearance-none bg-base-graphite/60 border border-white/10 rounded-lg px-3 py-2 pr-8 text-xs font-bold text-white cursor-pointer hover:border-gold/30 focus:border-gold/50 focus:outline-none transition-all"
                  >
                    {ASPECT_RATIOS.map((ratio) => (
                      <option key={ratio.value} value={ratio.value}>{ratio.value}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-base-mist pointer-events-none"></i>
                </div>

                {/* Resolution Dropdown */}
                <div className="relative">
                  <select
                    value={config.imageSize}
                    onChange={(e) => setConfig({ ...config, imageSize: e.target.value as any })}
                    className="appearance-none bg-base-graphite/60 border border-white/10 rounded-lg px-3 py-2 pr-8 text-xs font-bold text-white cursor-pointer hover:border-gold/30 focus:border-gold/50 focus:outline-none transition-all"
                  >
                    {IMAGE_SIZES.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-base-mist pointer-events-none"></i>
                </div>

                {/* Reference Image Button */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                    referenceImage 
                    ? 'bg-gold/15 border-gold/30 text-gold' 
                    : 'bg-base-graphite/60 border-white/10 text-base-mist hover:border-gold/30 hover:text-gold'
                  }`}
                >
                  <i className="fas fa-image"></i>
                </button>

                {/* Negative Prompt */}
                <div className="flex-1 min-w-[100px]">
                  <input 
                    type="text" 
                    value={config.negativePrompt}
                    onChange={(e) => setConfig({ ...config, negativePrompt: e.target.value })}
                    placeholder="Negative..."
                    className="w-full bg-base-graphite/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder:text-base-mist/50 focus:border-gold/30 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Desktop Controls - Just display info and negative prompt */}
              <div className="hidden md:flex gap-6 items-center w-full">
                <div className="flex items-center gap-3 text-[11px] font-bold text-base-mist uppercase tracking-wider">
                  <i className="fas fa-circle-minus text-gold"></i>
                  <span className="opacity-60">Exclusions:</span>
                  <input 
                    type="text" 
                    value={config.negativePrompt}
                    onChange={(e) => setConfig({ ...config, negativePrompt: e.target.value })}
                    placeholder="Unwanted elements..."
                    className="bg-transparent border-none outline-none focus:text-gold transition-colors placeholder:italic placeholder:opacity-30 min-w-[150px]"
                  />
                </div>
                <div className="h-4 w-[1px] bg-white/10"></div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-gold/70 uppercase">
                  <i className="fas fa-vector-square"></i>
                  <span>{config.aspectRatio}</span>
                </div>
                <div className="h-4 w-[1px] bg-white/10"></div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-gold/70 uppercase">
                  <i className="fas fa-layer-group"></i>
                  <span>{config.imageSize}</span>
                </div>
              </div>
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        </div>
      </main>

      {/* Maximize Overlay */}
      {isMaximized && resultImage && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-base-dark/95 backdrop-blur-3xl animate-in fade-in duration-300">
          <header className="p-6 flex justify-end items-center bg-white/5 border-b border-white/5">
            <div className="flex gap-4">
              <button 
                onClick={downloadImage}
                className="px-6 py-2.5 bg-gold text-base-dark rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all"
              >
                <i className="fas fa-download"></i> Save Image
              </button>
              <button 
                onClick={() => setIsMaximized(false)}
                className="w-11 h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto custom-scrollbar">
            <img 
              src={resultImage} 
              alt="Maximized view" 
              className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10" 
            />
          </div>
        </div>
      )}

      {showHistory && (
        <HistoryPanel 
          history={history}
          onClose={() => setShowHistory(false)}
          onDelete={deleteHistoryItem}
          onClearAll={clearAllHistory}
          onSelect={selectHistoryItem}
        />
      )}
    </div>
  );
};

export default App;