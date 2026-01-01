import React, { useState } from 'react';
import { X, Save, Music } from 'lucide-react';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onSave: (name: string) => void;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Music className="text-blue-400" size={24} />
              New Playlist
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Playlist Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Mix"
                autoFocus
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit"
                disabled={!name.trim()}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                  name.trim() 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Save size={18} />
                <span>Create Playlist</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;
