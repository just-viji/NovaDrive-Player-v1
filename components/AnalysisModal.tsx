
import React from 'react';
import { GeminiAnalysis, Track } from '../types';
import { X, Sparkles, Music, Activity, Quote } from 'lucide-react';

interface AnalysisModalProps {
  track: Track;
  analysis: GeminiAnalysis | null;
  onClose: () => void;
  loading: boolean;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ track, analysis, onClose, loading }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-blue-500/30 animate-in fade-in zoom-in duration-300">
        <div className="p-6 relative">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>

          <div className="flex items-center space-x-4 mb-8">
            <img src={track.coverArt} className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shadow-lg" alt={track.name} />
            <div>
              <h2 className="text-2xl font-bold text-white font-display">{track.name}</h2>
              <p className="text-slate-400">{track.artist}</p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-blue-400 font-medium animate-pulse">Gemini is listening to the soul of the track...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50">
                  <div className="flex items-center space-x-2 text-blue-400 mb-2">
                    <Sparkles size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Mood / Vibe</span>
                  </div>
                  <p className="text-xl font-semibold text-white capitalize">{analysis.vibe}</p>
                </div>
                <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50">
                  <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                    <Music size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Sub-genres</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.genres.map(g => (
                      <span key={g} className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20">{g}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 text-amber-400 mb-3">
                  <Quote size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Perception</span>
                </div>
                <p className="text-slate-300 italic leading-relaxed">"{analysis.description}"</p>
              </div>

              <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center space-x-2 text-indigo-400 mb-3">
                  <Activity size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Best For</span>
                </div>
                <ul className="grid grid-cols-2 gap-2">
                  {analysis.suggestedActivities.map((act, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button 
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition-opacity"
              >
                Close Analysis
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
