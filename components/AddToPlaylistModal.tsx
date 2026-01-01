import React from 'react';
import { X, Plus, ListMusic, CheckCircle2 } from 'lucide-react';
import { Playlist, Track } from '../types';

interface AddToPlaylistModalProps {
  track: Track;
  playlists: Playlist[];
  onClose: () => void;
  onAdd: (playlistId: string, trackId: string) => void;
  onCreateNew: () => void;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ track, playlists, onClose, onAdd, onCreateNew }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ListMusic className="text-blue-400" size={20} />
              Add to Playlist
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <p className="text-slate-400 text-sm mb-4 truncate">
            Adding <span className="text-white font-medium">{track.name}</span>...
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {playlists.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                No playlists yet.
              </div>
            ) : (
              playlists.map(playlist => {
                const isAlreadyIn = playlist.trackIds.includes(track.id);
                return (
                  <button
                    key={playlist.id}
                    onClick={() => !isAlreadyIn && onAdd(playlist.id, track.id)}
                    disabled={isAlreadyIn}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      isAlreadyIn 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default' 
                        : 'bg-slate-800/40 hover:bg-slate-700 text-white border border-transparent'
                    }`}
                  >
                    <span className="truncate font-medium">{playlist.name}</span>
                    {isAlreadyIn ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                        {playlist.trackIds.length} songs
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <button 
              onClick={onCreateNew}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 hover:bg-slate-800/30 transition-all text-sm font-medium"
            >
              <Plus size={16} />
              <span>Create New Playlist</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
