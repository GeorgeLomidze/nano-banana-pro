
import React, { useState } from 'react';
import { HistoryItem, VideoHistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  videoHistory: VideoHistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onSelectVideo: (item: VideoHistoryItem) => void;
  onDelete: (id: string) => void;
  onDeleteVideo: (id: string) => void;
  onClearAll: () => void;
  onClearAllVideos: () => void;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  history, 
  videoHistory,
  onSelect, 
  onSelectVideo,
  onDelete, 
  onDeleteVideo,
  onClearAll, 
  onClearAllVideos,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-base-dark/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full glass-card border-none rounded-none border-l border-gold/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-base-dark/20">
          <div>
            <h2 className="text-2xl font-display font-bold flex items-center gap-3">
              <i className="fas fa-archive text-gold"></i> Creator Vault
            </h2>
            <p className="text-[10px] text-base-mist uppercase tracking-[0.2em] font-bold mt-1 opacity-60">Persistent Storage • IndexedDB</p>
          </div>
          <div className="flex gap-4 items-center">
            {((activeTab === 'images' && history.length > 0) || (activeTab === 'videos' && videoHistory.length > 0)) && (
              <button 
                onClick={activeTab === 'images' ? onClearAll : onClearAllVideos}
                className="text-[10px] uppercase font-bold text-base-mist hover:text-red-400 transition-colors tracking-widest"
              >
                Purge All
              </button>
            )}
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-all border border-white/10">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-8 pt-6">
          <div className="flex gap-2 p-1 bg-base-dark/50 rounded-2xl">
            <button
              onClick={() => setActiveTab('images')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'images'
                ? 'bg-gradient-to-r from-gold to-gold-warm text-base-dark shadow-lg'
                : 'text-base-mist hover:text-white'
              }`}
            >
              <i className="fas fa-image"></i> Images
              <span className="text-[10px] opacity-70">({history.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'videos'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                : 'text-base-mist hover:text-white'
              }`}
            >
              <i className="fas fa-video"></i> Videos
              <span className="text-[10px] opacity-70">({videoHistory.length})</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          {activeTab === 'images' ? (
            // Images Tab
            history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-base-mist gap-6 text-center">
                <div className="w-20 h-20 bg-base-graphite/40 rounded-full flex items-center justify-center opacity-20 border border-white/10">
                  <i className="fas fa-image text-4xl"></i>
                </div>
                <div>
                  <p className="font-display font-bold text-xl">No images yet</p>
                  <p className="text-sm opacity-50 mt-2 max-w-[200px] mx-auto font-sans">Generate images to populate your gallery.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {history.sort((a,b) => b.timestamp - a.timestamp).map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative rounded-3xl overflow-hidden bg-base-charcoal/40 border border-white/5 hover:border-gold/40 transition-all cursor-pointer shadow-lg hover:shadow-gold/5"
                    onClick={() => onSelect(item)}
                  >
                    <img src={item.imageUrl} alt={item.prompt} className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-base-dark via-base-dark/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                      <p className="text-sm line-clamp-2 text-white font-sans font-medium leading-relaxed mb-3">{item.prompt}</p>
                      <div className="flex justify-between items-center pt-3 border-t border-white/10">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gold font-bold uppercase tracking-wider">
                            {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-[9px] text-base-mist uppercase opacity-50">
                            {item.config.aspectRatio} • {item.config.imageSize}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                          className="w-9 h-9 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 shadow-lg"
                          title="Delete Entry"
                        >
                          <i className="fas fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Videos Tab
            videoHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-base-mist gap-6 text-center">
                <div className="w-20 h-20 bg-base-graphite/40 rounded-full flex items-center justify-center opacity-20 border border-white/10">
                  <i className="fas fa-video text-4xl"></i>
                </div>
                <div>
                  <p className="font-display font-bold text-xl">No videos yet</p>
                  <p className="text-sm opacity-50 mt-2 max-w-[200px] mx-auto font-sans">Generate videos to populate your gallery.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {videoHistory.sort((a,b) => b.timestamp - a.timestamp).map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative rounded-3xl overflow-hidden bg-base-charcoal/40 border border-white/5 hover:border-orange-500/40 transition-all cursor-pointer shadow-lg hover:shadow-orange-500/10"
                    onClick={() => onSelectVideo(item)}
                  >
                    <div className="relative h-56 bg-base-dark flex items-center justify-center">
                      <video 
                        src={item.videoUrl} 
                        className="w-full h-full object-cover"
                        muted
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-14 h-14 bg-orange-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                          <i className="fas fa-play text-white text-lg ml-1"></i>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-base-dark via-base-dark/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end pointer-events-none">
                      <p className="text-sm line-clamp-2 text-white font-sans font-medium leading-relaxed mb-3">{item.prompt}</p>
                      <div className="flex justify-between items-center pt-3 border-t border-white/10 pointer-events-auto">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                            {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-[9px] text-base-mist uppercase opacity-50">
                            {item.config.aspectRatio} • {item.config.resolution}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteVideo(item.id); }}
                          className="w-9 h-9 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 shadow-lg"
                          title="Delete Entry"
                        >
                          <i className="fas fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;
