import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AspectRatio, 
  ImageSize, 
  GenerationConfig, 
  HistoryItem, 
  VideoHistoryItem,
  EditorState,
  GenerationMode,
  VideoGenerationConfig,
  VideoAspectRatio,
  VideoResolution,
  VideoGenerationSpeed
} from './types';
import { 
  ASPECT_RATIOS, 
  IMAGE_SIZES, 
  STORAGE_KEY, 
  LOADING_MESSAGES,
  VIDEO_ASPECT_RATIOS,
  VIDEO_RESOLUTIONS,
  VIDEO_GENERATION_SPEEDS,
  VIDEO_LOADING_MESSAGES
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
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  // Mode: image or video
  const [mode, setMode] = useState<GenerationMode>('image');

  // Image config
  const [config, setConfig] = useState<GenerationConfig>({
    aspectRatio: '1:1',
    imageSize: '1K',
    prompt: '',
    negativePrompt: '',
  });

  // Video config
  const [videoConfig, setVideoConfig] = useState<VideoGenerationConfig>({
    aspectRatio: '16:9',
    resolution: '1080p',
    generationSpeed: 'fast',
    prompt: '',
    negativePrompt: '',
  });

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);

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
        const savedVideoHistory = await StorageService.getAllVideoHistory();
        setVideoHistory(savedVideoHistory);
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
    if (mode === 'image') {
      if (!config.prompt.trim()) return;
      
      setLoading(true);
      setError(null);
      
      const interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 3000);

      try {
        const url = await GeminiService.generateImage(config, referenceImages.length > 0 ? referenceImages : undefined);
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
        } else if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("quota")) {
          setIsRateLimited(true);
        } else {
          setError(err.message || "An unexpected error occurred during generation.");
        }
      } finally {
        clearInterval(interval);
        setLoading(false);
      }
    } else {
      // Video generation
      if (!videoConfig.prompt.trim()) return;
      
      setLoading(true);
      setError(null);
      setResultVideo(null);
      
      const interval = setInterval(() => {
        setLoadingMsg(VIDEO_LOADING_MESSAGES[Math.floor(Math.random() * VIDEO_LOADING_MESSAGES.length)]);
      }, 5000);

      try {
        const url = await GeminiService.generateVideo(
          videoConfig, 
          firstFrame || undefined, 
          lastFrame || undefined
        );
        setResultVideo(url);
        
        // Save video to history
        const newVideoHistoryItem: VideoHistoryItem = {
          id: Date.now().toString(),
          videoUrl: url,
          prompt: videoConfig.prompt,
          config: { ...videoConfig },
          timestamp: Date.now()
        };
        
        await StorageService.saveVideoHistoryItem(newVideoHistoryItem);
        setVideoHistory(prev => [newVideoHistoryItem, ...prev]);
        
      } catch (err: any) {
        if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("quota")) {
          setIsRateLimited(true);
        } else {
          setError(err.message || "An unexpected error occurred during video generation.");
        }
      } finally {
        clearInterval(interval);
        setLoading(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newImage = event.target?.result as string;
      setReferenceImages(prev => [...prev, newImage]);
    };
    reader.readAsDataURL(file);
    // Reset input value so the same file can be selected again
    if (e.target) e.target.value = '';
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllReferenceImages = () => {
    setReferenceImages([]);
  };

  const handleFirstFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFirstFrame(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLastFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLastFrame(event.target?.result as string);
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

  const deleteVideoHistoryItem = async (id: string) => {
    try {
      await StorageService.deleteVideoHistoryItem(id);
      setVideoHistory(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error("Failed to delete video history item", e);
    }
  };

  const clearAllHistory = async () => {
    if (window.confirm("Are you sure you want to clear all image history?")) {
      try {
        await StorageService.clearAllHistory();
        setHistory([]);
      } catch (e) {
        console.error("Failed to clear history", e);
      }
    }
  };

  const clearAllVideoHistory = async () => {
    if (window.confirm("Are you sure you want to clear all video history?")) {
      try {
        await StorageService.clearAllVideoHistory();
        setVideoHistory([]);
      } catch (e) {
        console.error("Failed to clear video history", e);
      }
    }
  };

  const selectHistoryItem = (item: HistoryItem) => {
    setResultImage(item.imageUrl);
    setConfig(item.config);
    setShowHistory(false);
    setMode('image');
  };

  const selectVideoHistoryItem = (item: VideoHistoryItem) => {
    setResultVideo(item.videoUrl);
    setVideoConfig(item.config);
    setShowHistory(false);
    setMode('video');
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
      <aside className={`hidden md:flex w-80 h-screen glass-card border-none rounded-none md:rounded-r-[32px] flex-col p-8 overflow-y-auto custom-scrollbar ${mode === 'video' ? 'video-mode' : ''}`}>
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${mode === 'video' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'gradient-primary'}`}>
            <i className={`fas ${mode === 'video' ? 'fa-video' : 'fa-image'} text-base-dark text-xl`}></i>
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight">{mode === 'video' ? 'VEO 3.1' : 'Banana Pro'}</h1>
        </div>

        {/* Mode Switcher */}
        <div className="flex gap-2 p-1 bg-base-dark/50 rounded-2xl mb-8">
          <button
            onClick={() => setMode('image')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              mode === 'image'
              ? 'bg-gradient-to-r from-gold to-gold-warm text-base-dark shadow-lg'
              : 'text-base-mist hover:text-white'
            }`}
          >
            <i className="fas fa-image"></i> Image
          </button>
          <button
            onClick={() => setMode('video')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              mode === 'video'
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
              : 'text-base-mist hover:text-white'
            }`}
          >
            <i className="fas fa-video"></i> Video
          </button>
        </div>

        <section className="space-y-6 flex-1">
          {mode === 'image' ? (
            <>
              {/* Image: Aspect Ratio Selector */}
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

              {/* Image: Resolution Options */}
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

              {/* Image: Reference Upload */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs uppercase tracking-[0.1em] font-bold text-base-mist">
                    Reference Images {referenceImages.length > 0 && <span className="text-gold">({referenceImages.length})</span>}
                  </label>
                  {referenceImages.length > 0 && (
                    <button 
                      onClick={clearAllReferenceImages}
                      className="text-[10px] text-red-400 hover:text-red-300 transition-all"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {/* Reference Images Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {referenceImages.map((img, index) => (
                    <div key={index} className="relative rounded-xl overflow-hidden group border border-gold/20 shadow-lg bg-base-dark/50 aspect-square">
                      <img src={img} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-base-dark/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <button 
                          onClick={() => removeReferenceImage(index)}
                          className="w-8 h-8 bg-red-500 rounded-full text-white shadow-xl hover:scale-110 transition-transform"
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-base-dark/70 rounded text-[10px] text-gold font-bold">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                  
                  {/* Add More Button */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-1.5 text-base-mist hover:border-gold/50 hover:text-gold transition-all bg-base-graphite/30"
                  >
                    <i className="fas fa-plus text-lg opacity-50"></i>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Video: Aspect Ratio Selector */}
              <div>
                <label className="text-xs uppercase tracking-[0.1em] font-bold text-orange-400 mb-4 block">Aspect Ratio</label>
                <div className="flex gap-3">
                  {VIDEO_ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setVideoConfig({ ...videoConfig, aspectRatio: ratio.value })}
                      className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-all ${
                        videoConfig.aspectRatio === ratio.value 
                        ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                        : 'border-white/5 bg-base-graphite/40 text-base-mist hover:border-white/10'
                      }`}
                    >
                      <span className="text-sm font-bold mb-1">{ratio.value}</span>
                      <span className="text-[10px] font-bold uppercase">{ratio.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Video: Resolution Options */}
              <div>
                <label className="text-xs uppercase tracking-[0.1em] font-bold text-orange-400 mb-4 block">Resolution</label>
                <div className="flex gap-3">
                  {VIDEO_RESOLUTIONS.map((res) => (
                    <button
                      key={res}
                      onClick={() => setVideoConfig({ ...videoConfig, resolution: res })}
                      className={`flex-1 py-3 rounded-xl border transition-all text-xs font-bold uppercase ${
                        videoConfig.resolution === res 
                        ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                        : 'border-white/5 bg-base-graphite/40 text-base-mist hover:border-white/10'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video: Generation Speed */}
              <div>
                <label className="text-xs uppercase tracking-[0.1em] font-bold text-orange-400 mb-4 block">Generation Mode</label>
                <div className="relative">
                  <select
                    value={videoConfig.generationSpeed}
                    onChange={(e) => setVideoConfig({ ...videoConfig, generationSpeed: e.target.value as VideoGenerationSpeed })}
                    className="w-full appearance-none bg-base-graphite/60 border border-orange-500/20 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-white cursor-pointer hover:border-orange-500/40 focus:border-orange-500/50 focus:outline-none transition-all"
                  >
                    {VIDEO_GENERATION_SPEEDS.map((speed) => (
                      <option key={speed.value} value={speed.value}>{speed.label}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-xs text-orange-400 pointer-events-none"></i>
                </div>
                <p className="text-[10px] text-base-mist mt-2 opacity-60">
                  {videoConfig.generationSpeed === 'fast' ? 'Faster generation, 5 sec video' : 'Higher quality, 8 sec video with audio'}
                </p>
              </div>

              {/* Video: First & Last Frame - Side by Side */}
              <div>
                <label className="text-xs uppercase tracking-[0.1em] font-bold text-orange-400 mb-3 block">Reference Frames <span className="text-base-mist font-normal">(optional)</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {/* First Frame */}
                  {firstFrame ? (
                    <div className="relative rounded-lg overflow-hidden group border border-orange-500/30 shadow-lg bg-base-dark/50 p-0.5">
                      <img src={firstFrame} className="w-full h-16 object-cover rounded-md" />
                      <div className="absolute inset-0 bg-base-dark/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <button 
                          onClick={() => { setFirstFrame(null); }}
                          className="w-6 h-6 bg-red-500 rounded-full text-white shadow-xl hover:scale-110 transition-transform"
                        >
                          <i className="fas fa-times text-[10px]"></i>
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 text-[8px] font-bold text-orange-400 bg-base-dark/80 px-1.5 py-0.5 rounded">FIRST</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => firstFrameInputRef.current?.click()}
                      className="h-16 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-0.5 text-base-mist hover:border-orange-500/50 hover:text-orange-400 transition-all bg-base-graphite/30"
                    >
                      <i className="fas fa-play text-sm opacity-50"></i>
                      <span className="text-[8px] font-bold uppercase">First</span>
                    </button>
                  )}
                  
                  {/* Last Frame */}
                  {lastFrame ? (
                    <div className="relative rounded-lg overflow-hidden group border border-orange-500/30 shadow-lg bg-base-dark/50 p-0.5">
                      <img src={lastFrame} className="w-full h-16 object-cover rounded-md" />
                      <div className="absolute inset-0 bg-base-dark/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <button 
                          onClick={() => { setLastFrame(null); }}
                          className="w-6 h-6 bg-red-500 rounded-full text-white shadow-xl hover:scale-110 transition-transform"
                        >
                          <i className="fas fa-times text-[10px]"></i>
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 text-[8px] font-bold text-orange-400 bg-base-dark/80 px-1.5 py-0.5 rounded">LAST</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => lastFrameInputRef.current?.click()}
                      className="h-16 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-0.5 text-base-mist hover:border-orange-500/50 hover:text-orange-400 transition-all bg-base-graphite/30"
                    >
                      <i className="fas fa-stop text-sm opacity-50"></i>
                      <span className="text-[8px] font-bold uppercase">Last</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <div className="pt-6 mt-6 border-t border-white/5">
          <button 
            onClick={() => setShowHistory(true)}
            className="w-full py-4 bg-white/5 hover:bg-gold/10 text-base-mist hover:text-gold rounded-2xl border border-white/5 hover:border-gold/30 flex items-center justify-center gap-3 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <i className="fas fa-folder-open"></i> Gallery
          </button>
        </div>
        
        {/* Hidden file inputs */}
        <input type="file" ref={firstFrameInputRef} onChange={handleFirstFrameUpload} className="hidden" accept="image/*" />
        <input type="file" ref={lastFrameInputRef} onChange={handleLastFrameUpload} className="hidden" accept="image/*" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden">
        {/* Mobile Header - Only visible on mobile */}
        <header className="md:hidden px-4 py-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${mode === 'video' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'gradient-primary'}`}>
              <i className={`fas ${mode === 'video' ? 'fa-video' : 'fa-image'} text-base-dark text-lg`}></i>
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight">{mode === 'video' ? 'VEO 3.1' : 'Banana Pro'}</h1>
          </div>
          
          {/* Mobile Mode Switcher */}
          <div className="flex gap-1 p-1 bg-base-dark/50 rounded-xl">
            <button
              onClick={() => setMode('image')}
              className={`p-2 rounded-lg transition-all ${
                mode === 'image'
                ? 'bg-gradient-to-r from-gold to-gold-warm text-base-dark'
                : 'text-base-mist'
              }`}
            >
              <i className="fas fa-image"></i>
            </button>
            <button
              onClick={() => setMode('video')}
              className={`p-2 rounded-lg transition-all ${
                mode === 'video'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                : 'text-base-mist'
              }`}
            >
              <i className="fas fa-video"></i>
            </button>
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
                <div className={`absolute inset-0 rounded-full blur-xl animate-pulse ${mode === 'video' ? 'bg-gradient-to-r from-orange-500/20 via-orange-400/10 to-orange-500/20' : 'bg-gradient-to-r from-gold/20 via-gold-warm/10 to-gold/20'}`}></div>
                {/* Spinning border */}
                <div className={`absolute inset-0 border-[4px] rounded-full ${mode === 'video' ? 'border-orange-500/20' : 'border-gold/20'}`}></div>
                <div className={`absolute inset-0 border-[4px] border-transparent rounded-full animate-spin ${mode === 'video' ? 'border-t-orange-500 border-r-orange-500/50' : 'border-t-gold border-r-gold/50'}`} style={{ animationDuration: '2s' }}></div>
                {/* Inner circle with emoji */}
                <div className="absolute inset-3 bg-gradient-to-br from-base-charcoal to-base-dark rounded-full flex items-center justify-center overflow-hidden shadow-2xl">
                  <div className={`absolute inset-0 bg-gradient-to-t to-transparent ${mode === 'video' ? 'from-orange-500/10' : 'from-gold/10'}`}></div>
                  {/* Emoji with animations */}
                  <div className="relative">
                    <span 
                      className="text-7xl select-none"
                      style={{
                        animation: mode === 'video' 
                          ? 'videoFloat 2s ease-in-out infinite' 
                          : 'bananaFloat 3s ease-in-out infinite, bananaRotate 4s ease-in-out infinite',
                        display: 'inline-block',
                        filter: mode === 'video' 
                          ? 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.5))' 
                          : 'drop-shadow(0 0 20px rgba(245, 184, 0, 0.5))'
                      }}
                    >
                      {mode === 'video' ? '🎬' : '🍌'}
                    </span>
                  </div>
                </div>
                {/* Orbiting particles */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${mode === 'video' ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-gold shadow-[0_0_10px_rgba(245,184,0,0.8)]'}`}></div>
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
                  <div className={`absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full ${mode === 'video' ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]' : 'bg-gold-warm shadow-[0_0_8px_rgba(255,170,0,0.8)]'}`}></div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className={`text-3xl font-display font-bold tracking-tight bg-clip-text text-transparent ${mode === 'video' ? 'bg-gradient-to-r from-white via-orange-400 to-white' : 'bg-gradient-to-r from-white via-gold-marigold to-white'}`}>
                  {mode === 'video' ? 'Creating Video...' : 'Generating...'}
                </h3>
                <p className={`italic text-lg font-sans ${mode === 'video' ? 'text-orange-500/60' : 'text-gold/60'}`}>{loadingMsg}</p>
              </div>
            </div>
          )}

          {error && !loading && !isRateLimited && (
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

          {isRateLimited && !loading && (
            <div className="max-w-md w-full p-8 bg-amber-500/10 border border-amber-500/30 rounded-3xl text-center space-y-6 animate-in zoom-in-95 backdrop-blur-md">
              <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                <i className="fas fa-hourglass-half text-4xl text-amber-400"></i>
              </div>
              <h3 className="text-2xl font-display font-bold text-amber-300">Daily Limit Reached</h3>
              <p className="text-base-mist text-sm leading-relaxed">
                You've reached your daily API quota. The limit will reset at midnight (Pacific Time).
              </p>
              <p className="text-amber-400/80 text-xs">
                <i className="fas fa-lightbulb mr-2"></i>
                Tip: Consider upgrading your plan for higher limits.
              </p>
              <button 
                onClick={() => setIsRateLimited(false)}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black rounded-2xl font-bold transition-all"
              >
                Got it
              </button>
            </div>
          )}

          {!loading && !error && !isRateLimited && (
            <div className="w-full h-full flex items-center justify-center p-2 relative">
              {referenceImages.length > 0 && !resultImage ? (
                <div className="max-w-full max-h-full flex flex-col items-center justify-center gap-6 animate-in zoom-in duration-500">
                  {referenceImages.length === 1 ? (
                    <div className="relative group glass-card p-1.5 rounded-[32px] overflow-hidden shadow-xl bg-base-dark/30">
                      <img src={referenceImages[0]} alt="Reference" className="max-h-[65vh] w-auto rounded-[28px] object-contain block shadow-lg" />
                      <button 
                        onClick={() => removeReferenceImage(0)}
                        className="absolute top-4 right-4 w-10 h-10 bg-red-500/80 hover:bg-red-500 text-white rounded-xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl">
                      {referenceImages.map((img, index) => (
                        <div key={index} className="relative group glass-card p-1 rounded-2xl overflow-hidden shadow-xl bg-base-dark/30">
                          <img src={img} alt={`Reference ${index + 1}`} className="w-full h-40 object-cover rounded-xl" />
                          <button 
                            onClick={() => removeReferenceImage(index)}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                          >
                            <i className="fas fa-trash text-xs"></i>
                          </button>
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-base-dark/70 rounded-lg text-xs text-gold font-bold backdrop-blur-md">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-6 py-2.5 bg-base-charcoal/60 rounded-full border border-white/5 backdrop-blur-md flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold animate-pulse"></div>
                    <span className="text-[10px] font-bold text-base-mist uppercase tracking-widest">
                      {referenceImages.length} Reference{referenceImages.length > 1 ? 's' : ''} Locked
                    </span>
                  </div>
                </div>
              ) : resultImage && mode === 'image' ? (
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
                      <button 
                        onClick={() => { 
                          setFirstFrame(resultImage); 
                          setMode('video'); 
                          setResultImage(null); 
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-base-dark/70 hover:bg-orange-500 hover:text-white text-white rounded-xl backdrop-blur-md transition-all shadow-lg border border-white/10"
                        title="ვიდეოდ გადაქცევა"
                      >
                        <i className="fas fa-video"></i>
                      </button>
                    </div>
                    {/* Bottom action button */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => { setReferenceImages(prev => [...prev, resultImage!]); setResultImage(null); }}
                        className="px-5 py-2.5 bg-base-dark/70 hover:bg-gold hover:text-base-dark text-white rounded-xl backdrop-blur-md font-bold text-xs shadow-lg flex items-center gap-2 border border-white/10 transition-all"
                      >
                        <i className="fas fa-wand-magic-sparkles"></i> Add as Reference
                      </button>
                    </div>
                  </div>
                </div>
              ) : resultVideo && mode === 'video' ? (
                <div className="relative group max-w-full max-h-full flex flex-col items-center justify-center animate-in zoom-in duration-700 gap-5">
                  {/* Ultra Modern Video Player Container */}
                  <div className="relative rounded-[28px] overflow-hidden" style={{ 
                    background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.08) 0%, rgba(15, 15, 15, 0.95) 100%)',
                    boxShadow: '0 0 80px rgba(249, 115, 22, 0.12), 0 32px 64px -16px rgba(0, 0, 0, 0.6)'
                  }}>
                    {/* Animated gradient border */}
                    <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-orange-500/40 via-orange-400/20 to-orange-600/40 p-[1.5px]" style={{
                      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.5) 0%, transparent 50%, rgba(251, 146, 60, 0.3) 100%)'
                    }}></div>
                    
                    <div className="p-1.5 relative bg-base-dark/80 rounded-[27px] m-[1.5px]">
                      {/* Custom styled video with modern controls */}
                      <video 
                        src={resultVideo} 
                        controls 
                        autoPlay 
                        loop
                        className="max-h-[55vh] w-auto rounded-[24px] object-contain block mx-auto video-player-custom"
                        style={{
                          filter: 'contrast(1.02) saturate(1.05)'
                        }}
                      />
                      
                      {/* Subtle corner accents */}
                      <div className="absolute top-3 left-3 w-8 h-8 border-l-2 border-t-2 border-orange-500/30 rounded-tl-xl pointer-events-none"></div>
                      <div className="absolute top-3 right-3 w-8 h-8 border-r-2 border-t-2 border-orange-500/30 rounded-tr-xl pointer-events-none"></div>
                      <div className="absolute bottom-3 left-3 w-8 h-8 border-l-2 border-b-2 border-orange-500/30 rounded-bl-xl pointer-events-none"></div>
                      <div className="absolute bottom-3 right-3 w-8 h-8 border-r-2 border-b-2 border-orange-500/30 rounded-br-xl pointer-events-none"></div>
                      
                      {/* Download button - floating pill style */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                        <a 
                          href={resultVideo}
                          download={`banana-video-${Date.now()}.mp4`}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full backdrop-blur-md transition-all shadow-xl hover:shadow-orange-500/40 hover:scale-105 font-bold text-xs uppercase tracking-wider"
                          title="Download Video"
                        >
                          <i className="fas fa-download"></i>
                          <span>Save</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  {/* Premium info badge */}
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-base-charcoal/80 to-base-dark/80 rounded-full border border-orange-500/15 backdrop-blur-2xl shadow-xl">
                    <div className="flex items-center gap-2 pr-3 border-r border-white/10">
                      <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping opacity-50"></div>
                      </div>
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.15em]">VEO 3.1</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-base-mist/80 uppercase tracking-wider">
                      <i className="fas fa-film text-orange-500/60 text-[9px]"></i>
                      <span>{videoConfig.aspectRatio}</span>
                      <span className="text-orange-500/40">•</span>
                      <span>{videoConfig.resolution}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Floating Controller */}
        <div className="p-4 md:p-6 flex justify-center relative z-20">
          <div className={`w-full max-w-4xl glass-card rounded-[24px] md:rounded-[32px] p-3 shadow-2xl flex flex-col gap-3 ${mode === 'video' ? 'border-orange-500/20' : ''}`}>
            {/* Reference Images Preview - Mobile only when attached (Image mode) */}
            {mode === 'image' && referenceImages.length > 0 && (
              <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-base-dark/30 rounded-xl border border-gold/20 overflow-x-auto">
                {referenceImages.map((img, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img src={img} className="w-10 h-10 object-cover rounded-lg" />
                    <button 
                      onClick={() => removeReferenceImage(index)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
                <span className="text-xs text-base-mist flex-1 ml-2">{referenceImages.length} ref{referenceImages.length > 1 ? 's' : ''}</span>
                <button 
                  onClick={clearAllReferenceImages}
                  className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/20 rounded-lg transition-all flex-shrink-0"
                >
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
            )}

            {/* Frame Previews - Mobile only (Video mode) */}
            {mode === 'video' && (firstFrame || lastFrame) && (
              <div className="md:hidden flex gap-2 px-2">
                {firstFrame && (
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-base-dark/30 rounded-lg border border-orange-500/20 flex-1">
                    <img src={firstFrame} className="w-8 h-8 object-cover rounded" />
                    <span className="text-[10px] text-base-mist flex-1">First</span>
                    <button onClick={() => setFirstFrame(null)} className="text-red-400 text-xs"><i className="fas fa-times"></i></button>
                  </div>
                )}
                {lastFrame && (
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-base-dark/30 rounded-lg border border-orange-500/20 flex-1">
                    <img src={lastFrame} className="w-8 h-8 object-cover rounded" />
                    <span className="text-[10px] text-base-mist flex-1">Last</span>
                    <button onClick={() => setLastFrame(null)} className="text-red-400 text-xs"><i className="fas fa-times"></i></button>
                  </div>
                )}
              </div>
            )}
            
            {/* Main Input Row */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea 
                  value={mode === 'image' ? config.prompt : videoConfig.prompt}
                  onChange={(e) => mode === 'image' 
                    ? setConfig({ ...config, prompt: e.target.value })
                    : setVideoConfig({ ...videoConfig, prompt: e.target.value })
                  }
                  placeholder={mode === 'video' ? "Describe your video..." : "Enter prompt..."}
                  className={`w-full bg-base-dark/50 border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 text-base font-sans outline-none resize-none min-h-[80px] md:min-h-[100px] transition-all custom-scrollbar ${
                    mode === 'video' 
                    ? 'focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/5' 
                    : 'focus:border-gold/50 focus:ring-2 focus:ring-gold/5'
                  }`}
                  rows={2}
                />
              </div>
              <button 
                onClick={handleGenerate}
                disabled={loading || (mode === 'image' ? !config.prompt.trim() : !videoConfig.prompt.trim())}
                className={`generate-btn px-6 md:px-10 rounded-xl md:rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1 min-w-[100px] md:min-w-[140px] ${
                  loading || (mode === 'image' ? !config.prompt.trim() : !videoConfig.prompt.trim())
                  ? 'bg-base-graphite text-base-mist cursor-not-allowed opacity-50'
                  : mode === 'video' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                    : 'gradient-primary text-base-dark'
                }`}
              >
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : mode === 'video' ? 'fa-video' : 'fa-bolt-lightning'} text-xl md:text-2xl`}></i>
                <span className="text-[10px] uppercase tracking-widest">GENERATE</span>
              </button>
            </div>
            
            {/* Controls Row - Mobile: dropdowns, Desktop: just info display */}
            <div className="flex flex-wrap gap-2 items-center px-1 border-t border-white/5 pt-3">
              {/* Mobile Controls */}
              <div className="md:hidden flex flex-wrap gap-2 items-center w-full">
                {mode === 'image' ? (
                  <>
                    {/* Image: Aspect Ratio Dropdown */}
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

                    {/* Image: Resolution Dropdown */}
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

                    {/* Image: Reference Button */}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                        referenceImages.length > 0 
                        ? 'bg-gold/15 border-gold/30 text-gold' 
                        : 'bg-base-graphite/60 border-white/10 text-base-mist hover:border-gold/30 hover:text-gold'
                      }`}
                    >
                      <i className="fas fa-image"></i>
                      {referenceImages.length > 0 && <span>{referenceImages.length}</span>}
                    </button>

                    {/* Image: Negative Prompt */}
                    <div className="flex-1 min-w-[100px]">
                      <input 
                        type="text" 
                        value={config.negativePrompt}
                        onChange={(e) => setConfig({ ...config, negativePrompt: e.target.value })}
                        placeholder="Negative..."
                        className="w-full bg-base-graphite/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder:text-base-mist/50 focus:border-gold/30 focus:outline-none transition-all"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Video: Generation Speed Dropdown */}
                    <div className="relative">
                      <select
                        value={videoConfig.generationSpeed}
                        onChange={(e) => setVideoConfig({ ...videoConfig, generationSpeed: e.target.value as VideoGenerationSpeed })}
                        className="appearance-none bg-base-graphite/60 border border-orange-500/20 rounded-lg px-3 py-2 pr-8 text-xs font-bold text-white cursor-pointer hover:border-orange-500/40 focus:border-orange-500/50 focus:outline-none transition-all"
                      >
                        {VIDEO_GENERATION_SPEEDS.map((speed) => (
                          <option key={speed.value} value={speed.value}>{speed.label}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-orange-400 pointer-events-none"></i>
                    </div>

                    {/* Video: Aspect Ratio Dropdown */}
                    <div className="relative">
                      <select
                        value={videoConfig.aspectRatio}
                        onChange={(e) => setVideoConfig({ ...videoConfig, aspectRatio: e.target.value as any })}
                        className="appearance-none bg-base-graphite/60 border border-orange-500/20 rounded-lg px-3 py-2 pr-8 text-xs font-bold text-white cursor-pointer hover:border-orange-500/40 focus:border-orange-500/50 focus:outline-none transition-all"
                      >
                        {VIDEO_ASPECT_RATIOS.map((ratio) => (
                          <option key={ratio.value} value={ratio.value}>{ratio.value}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-orange-400 pointer-events-none"></i>
                    </div>

                    {/* Video: Resolution Dropdown */}
                    <div className="relative">
                      <select
                        value={videoConfig.resolution}
                        onChange={(e) => setVideoConfig({ ...videoConfig, resolution: e.target.value as any })}
                        className="appearance-none bg-base-graphite/60 border border-orange-500/20 rounded-lg px-3 py-2 pr-8 text-xs font-bold text-white cursor-pointer hover:border-orange-500/40 focus:border-orange-500/50 focus:outline-none transition-all"
                      >
                        {VIDEO_RESOLUTIONS.map((res) => (
                          <option key={res} value={res}>{res}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-orange-400 pointer-events-none"></i>
                    </div>

                    {/* Video: Frame Buttons */}
                    <button 
                      onClick={() => firstFrameInputRef.current?.click()}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                        firstFrame 
                        ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' 
                        : 'bg-base-graphite/60 border-white/10 text-base-mist hover:border-orange-500/30 hover:text-orange-400'
                      }`}
                    >
                      <i className="fas fa-play text-[10px]"></i>
                    </button>
                    <button 
                      onClick={() => lastFrameInputRef.current?.click()}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                        lastFrame 
                        ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' 
                        : 'bg-base-graphite/60 border-white/10 text-base-mist hover:border-orange-500/30 hover:text-orange-400'
                      }`}
                    >
                      <i className="fas fa-stop text-[10px]"></i>
                    </button>

                    {/* Video: Negative Prompt */}
                    <div className="flex-1 min-w-[80px]">
                      <input 
                        type="text" 
                        value={videoConfig.negativePrompt}
                        onChange={(e) => setVideoConfig({ ...videoConfig, negativePrompt: e.target.value })}
                        placeholder="Avoid..."
                        className="w-full bg-base-graphite/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder:text-base-mist/50 focus:border-orange-500/30 focus:outline-none transition-all"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Desktop Controls - Just display info and negative prompt */}
              <div className="hidden md:flex gap-6 items-center w-full">
                {mode === 'image' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-[11px] font-bold text-base-mist uppercase tracking-wider">
                      <i className="fas fa-circle-minus text-orange-500"></i>
                      <span className="opacity-60">Avoid:</span>
                      <input 
                        type="text" 
                        value={videoConfig.negativePrompt}
                        onChange={(e) => setVideoConfig({ ...videoConfig, negativePrompt: e.target.value })}
                        placeholder="Unwanted elements..."
                        className="bg-transparent border-none outline-none focus:text-orange-400 transition-colors placeholder:italic placeholder:opacity-30 min-w-[150px]"
                      />
                    </div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-orange-500/70 uppercase">
                      <i className="fas fa-vector-square"></i>
                      <span>{videoConfig.aspectRatio}</span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-orange-500/70 uppercase">
                      <i className="fas fa-film"></i>
                      <span>{videoConfig.resolution}</span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase">
                      {firstFrame || lastFrame ? (
                        <span className="text-orange-400">
                          <i className="fas fa-images mr-1"></i>
                          {firstFrame && lastFrame ? 'Both Frames' : firstFrame ? 'First Frame' : 'Last Frame'}
                        </span>
                      ) : (
                        <span className="text-base-mist/50">Text to Video</span>
                      )}
                    </div>
                  </>
                )}
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
          videoHistory={videoHistory}
          onClose={() => setShowHistory(false)}
          onDelete={deleteHistoryItem}
          onDeleteVideo={deleteVideoHistoryItem}
          onClearAll={clearAllHistory}
          onClearAllVideos={clearAllVideoHistory}
          onSelect={selectHistoryItem}
          onSelectVideo={selectVideoHistoryItem}
        />
      )}
    </div>
  );
};

export default App;