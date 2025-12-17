
import React from 'react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onSelect, onDelete, onClearAll, onClose }) => {
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
            {history.length > 0 && (
              <button 
                onClick={onClearAll}
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
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-base-mist gap-6 text-center">
              <div className="w-20 h-20 bg-base-graphite/40 rounded-full flex items-center justify-center opacity-20 border border-white/10">
                <i className="fas fa-ghost text-4xl"></i>
              </div>
              <div>
                <p className="font-display font-bold text-xl">The vault is vacant</p>
                <p className="text-sm opacity-50 mt-2 max-w-[200px] mx-auto font-sans">Initialize a generation to begin populating your creative archive.</p>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;
