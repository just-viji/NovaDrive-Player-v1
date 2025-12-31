
import React from 'react';
import { Home, Search, Library, PlusCircle, Heart, FolderOpen, Share2, Zap, Cloud, Loader2, Settings, X } from 'lucide-react';

interface SidebarProps {
  onConnect: () => void;
  isSyncing: boolean;
  isConnected: boolean;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onConnect, isSyncing, isConnected, onOpenSettings, isOpen, onClose }) => {
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
      {/* 
        Modified: Added pt-[env(safe-area-inset-top)] and extra padding to ensure content clears the notch.
        The glass effect will cover the status bar area.
      */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 glass border-r border-slate-800 flex flex-col p-6 pt-[calc(2rem+env(safe-area-inset-top))] transform transition-transform duration-300 lg:translate-x-0 lg:static ${
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
            <NavItem icon={<Home size={20} />} label="Home" active />
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
            <NavItem icon={<Share2 size={20} />} label="Shared" />
          </div>

          <div className="pt-6 border-t border-slate-800/50">
            <button className="flex items-center space-x-3 w-full px-2 py-2 text-slate-400 hover:text-white transition-colors group">
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
