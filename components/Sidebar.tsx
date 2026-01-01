
import React from 'react';
import { Home, Search, Library, PlusCircle, Heart, FolderOpen, Share2, Zap, Cloud, Loader2, Settings, X, ListMusic, Trash2 } from 'lucide-react';
import { Playlist } from '../types';

interface SidebarProps {
  onConnect: () => void;
  isSyncing: boolean;
  isConnected: boolean;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onCreatePlaylist: () => void;
  currentView: { type: 'all' | 'playlist', id?: string };
  onSelectView: (view: { type: 'all' | 'playlist', id?: string }) => void;
  onDeletePlaylist: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onConnect, 
  isSyncing, 
  isConnected, 
  onOpenSettings, 
  isOpen, 
  onClose,
  playlists,
  onCreatePlaylist,
  currentView,
  onSelectView,
  onDeletePlaylist
}) => {

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this playlist?')) {
      onDeletePlaylist(id);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 glass border-r border-slate-800 flex flex-col p-6 pt-[calc(3rem+env(safe-area-inset-top))] transform transition-transform duration-300 lg:translate-x-0 lg:static ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <h1 className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              NovaDrive
            </h1>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Menu</p>
            <div onClick={() => { onSelectView({ type: 'all' }); onClose(); }}>
                <NavItem icon={<Home size={20} />} label="Home" active={currentView.type === 'all'} />
            </div>
            {/* Placeholders for future features */}
            <NavItem icon={<Search size={20} />} label="Explore" />
            <NavItem icon={<Library size={20} />} label="My Library" />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Google Drive</p>
            <button 
              onClick={() => { onConnect(); onClose(); }}
              className={`flex items-center space-x-4 px-3 py-2 rounded-lg transition-all duration-200 w-full text-left ${
                isConnected 
                ? 'text-emerald-400 bg-emerald-500/5' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <Cloud size={20} />}
              <span className="font-medium">{isConnected ? 'Library Synced' : 'Connect Drive'}</span>
            </button>
            <NavItem icon={<FolderOpen size={20} />} label="All Audio" />
            <NavItem icon={<Heart size={20} />} label="Liked Songs" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Playlists</p>
               <button onClick={onCreatePlaylist} className="text-slate-400 hover:text-blue-400 transition-colors">
                 <PlusCircle size={16} />
               </button>
            </div>
            
            {playlists.length === 0 ? (
                <p className="text-xs text-slate-600 px-3 italic">No playlists created.</p>
            ) : (
                playlists.map(pl => (
                    <div 
                        key={pl.id} 
                        onClick={() => { onSelectView({ type: 'playlist', id: pl.id }); onClose(); }}
                        className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                            currentView.type === 'playlist' && currentView.id === pl.id
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                        }`}
                    >
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <ListMusic size={18} />
                            <span className="font-medium truncate text-sm">{pl.name}</span>
                        </div>
                        <button 
                            onClick={(e) => handleDelete(e, pl.id)}
                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))
            )}
          </div>

          <div className="pt-6 border-t border-slate-800/50 mt-auto">
            <button 
              onClick={() => { onCreatePlaylist(); onClose(); }}
              className="flex items-center space-x-3 w-full px-2 py-2 text-slate-400 hover:text-white transition-colors group"
            >
              <PlusCircle size={20} className="group-hover:text-blue-400" />
              <span className="font-medium">Create Playlist</span>
            </button>
            
            <button 
              onClick={() => { onOpenSettings(); onClose(); }}
              className="flex items-center space-x-3 w-full px-2 py-2 text-slate-400 hover:text-white transition-colors group"
            >
              <Settings size={20} className="group-hover:text-blue-400" />
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean }> = ({ icon, label, active }) => (
  <a 
    href="#" 
    onClick={(e) => e.preventDefault()}
    className={`flex items-center space-x-4 px-3 py-2 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </a>
);

export default Sidebar;
