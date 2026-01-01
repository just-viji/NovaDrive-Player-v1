
import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import SettingsModal from './components/SettingsModal';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import AddToPlaylistModal from './components/AddToPlaylistModal';
import { MOCK_TRACKS } from './constants';
import { Track, Playlist } from './types';
import { driveService } from './services/googleDriveService';
import { Cloud, Play, MoreVertical, Clock, Music, Grid, List as ListIcon, Search as SearchIcon, Loader2, CheckCircle2, Settings, Menu, ListPlus, FolderHeart } from 'lucide-react';

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(MOCK_TRACKS);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(MOCK_TRACKS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Playlist State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState<Track | null>(null); // Triggers AddToPlaylistModal if not null
  const [currentView, setCurrentView] = useState<{ type: 'all' | 'playlist', id?: string }>({ type: 'all' });

  // Player State
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledTracks, setShuffledTracks] = useState<Track[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Load Playlists on Mount
  useEffect(() => {
    const saved = localStorage.getItem('nova_playlists');
    if (saved) {
      try {
        setPlaylists(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse playlists", e);
      }
    }
  }, []);

  // Save Playlists on Change
  useEffect(() => {
    localStorage.setItem('nova_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Auto-connect on mount if token is stored
  useEffect(() => {
    const autoConnect = async () => {
      const storedToken = driveService.getStoredToken();
      if (storedToken) {
        setIsConnected(true);
        try {
          setIsSyncing(true);
          const driveTracks = await driveService.fetchAudioFiles();
          if (driveTracks.length > 0) {
            setTracks(driveTracks);
            // Don't auto-set current track if we are restoring state, but for now simple default:
            if (!currentTrack) setCurrentTrack(driveTracks[0]);
          }
        } catch (error) {
          console.error("Auto-sync failed:", error);
          setIsConnected(false);
          driveService.clearStoredToken();
        } finally {
          setIsSyncing(false);
        }
      }
    };
    
    // Tiny delay to ensure Google script loaded if needed
    setTimeout(autoConnect, 500);
  }, []);

  const handleConnectDrive = async () => {
    try {
      setIsSyncing(true);
      await driveService.connect();
      const driveTracks = await driveService.fetchAudioFiles();
      
      if (driveTracks.length > 0) {
        setTracks(driveTracks);
        if (isShuffle) {
          setShuffledTracks(shuffleArray(driveTracks));
        }
        setCurrentTrack(driveTracks[0]);
        setIsConnected(true);
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      if (error.message === 'MISSING_CLIENT_ID') {
        setShowSettings(true);
      } else {
        alert("Failed to connect: " + (error.message || JSON.stringify(error)));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreatePlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      trackIds: [],
      createdAt: Date.now()
    };
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (currentView.type === 'playlist' && currentView.id === id) {
      setCurrentView({ type: 'all' });
    }
  };

  const handleAddToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId && !pl.trackIds.includes(trackId)) {
        return { ...pl, trackIds: [...pl.trackIds, trackId] };
      }
      return pl;
    }));
    setTrackToAdd(null);
  };

  const handleTrackSelect = async (track: Track) => {
    if (track.isRemote) {
      try {
        const blobUrl = await driveService.getTrackUrl(track.id);
        setCurrentTrack({ ...track, url: blobUrl });
      } catch (e) {
        console.error("Failed to fetch track media:", e);
      }
    } else {
      setCurrentTrack(track);
    }
  };

  // New handler to update cover art in the main list when Player extracts it
  const handleUpdateTrackCover = useCallback((trackId: string, base64Cover: string) => {
    // Always update if we found better metadata (ID3 tag)
    setTracks(prevTracks => 
      prevTracks.map(t => 
        t.id === trackId 
          ? { ...t, coverArt: base64Cover } 
          : t
      )
    );

    // Also update current track if it matches
    setCurrentTrack(prev => 
      prev && prev.id === trackId 
        ? { ...prev, coverArt: base64Cover } 
        : prev
    );
  }, []);

  const shuffleArray = (array: Track[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => {
      const newState = !prev;
      if (newState) {
        // We need to decide what to shuffle. currently showing tracks?
        // For simplicity, let's shuffle the full displayed list.
        setShuffledTracks(shuffleArray(filteredTracks)); 
      }
      return newState;
    });
  }, [tracks]); // Dependencies will need logic update below

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  }, []);

  // Compute displayed tracks based on View + Search
  const getBaseTracks = () => {
    if (currentView.type === 'playlist' && currentView.id) {
      const playlist = playlists.find(p => p.id === currentView.id);
      if (!playlist) return tracks;
      // Filter main tracks by IDs in playlist.
      // Note: If Drive hasn't loaded yet, these might be missing.
      return tracks.filter(t => playlist.trackIds.includes(t.id));
    }
    return tracks;
  };

  const baseTracks = getBaseTracks();

  const filteredTracks = baseTracks.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update shuffle when base list changes significantly? 
  // For now, let's keep simple shuffle logic: if shuffle is on, we use shuffled version of 'filteredTracks'
  // But updating 'shuffledTracks' on every render is bad. 
  // Let's just update shuffle queue when 'isShuffle' is toggled or when track list changes drastically (handled in useEffect below).

  useEffect(() => {
    if (isShuffle) {
      setShuffledTracks(shuffleArray(filteredTracks));
    }
  }, [currentView, isShuffle]); // Re-shuffle when view changes

  const handleNext = useCallback(() => {
    if (!currentTrack) return;
    
    const queue = isShuffle ? shuffledTracks : filteredTracks;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    
    // If current track isn't in current view (e.g. switched playlist), try to find next in queue anyway, or start from 0
    let nextIndex = currentIndex + 1;
    
    if (currentIndex === -1) nextIndex = 0;
    
    if (nextIndex >= queue.length) {
      nextIndex = 0;
    }
    
    if (queue[nextIndex]) {
      handleTrackSelect(queue[nextIndex]);
    }
  }, [currentTrack, filteredTracks, shuffledTracks, isShuffle, repeatMode]);

  const handlePrevious = useCallback(() => {
    if (!currentTrack) return;

    const queue = isShuffle ? shuffledTracks : filteredTracks;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    if (queue[prevIndex]) {
      handleTrackSelect(queue[prevIndex]);
    }
  }, [currentTrack, filteredTracks, shuffledTracks, isShuffle]);

  const currentPlaylistName = currentView.type === 'playlist' 
    ? playlists.find(p => p.id === currentView.id)?.name || 'Unknown Playlist'
    : isConnected ? "Google Drive Files" : "Demo Tracks";

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <Sidebar 
        onConnect={handleConnectDrive} 
        isSyncing={isSyncing} 
        isConnected={isConnected} 
        onOpenSettings={() => setShowSettings(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        playlists={playlists}
        onCreatePlaylist={() => setShowCreatePlaylist(true)}
        currentView={currentView}
        onSelectView={setCurrentView}
        onDeletePlaylist={handleDeletePlaylist}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <header className="pt-[calc(3rem+env(safe-area-inset-top))] p-4 md:p-6 flex items-center justify-between glass border-b border-slate-800/50 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <Menu size={24} />
            </button>

            <div className="relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 translate-y-[calc(-50%+0.25rem)] text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search..."
                className="w-full bg-slate-900/50 border border-slate-800 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4 ml-4">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors hidden sm:block"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors sm:hidden"
              title="Settings"
            >
              <Settings size={20} />
            </button>

            <button 
              onClick={handleConnectDrive}
              disabled={isSyncing}
              className={`flex items-center justify-center space-x-2 px-3 py-2 md:px-4 rounded-full border transition-all text-sm font-medium ${
                isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
            >
              {isSyncing ? <Loader2 size={16} className="animate-spin" /> : isConnected ? <CheckCircle2 size={16} /> : <Cloud size={16} className="text-blue-400" />}
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : isConnected ? 'Connected' : 'Connect Drive'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-40">
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-10">
            {currentView.type === 'all' && (
                <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-800 p-6 md:p-8 shadow-2xl shadow-blue-500/20">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Music size={120} />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center space-x-2 text-blue-100 mb-2 font-medium">
                    <div className="bg-white/20 p-1 rounded-md">
                        <Cloud size={16} />
                    </div>
                    <span className="text-xs md:text-sm uppercase tracking-widest">Cloud Streaming</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold font-display text-white mb-4 leading-tight">
                    {isConnected ? "Your Drive Library is Ready." : "Stream from the Cloud."}
                    </h2>
                    <p className="text-blue-100/80 mb-6 text-sm md:text-lg">
                    {isConnected 
                        ? "Enjoy your high-fidelity audio stream directly from Google Drive." 
                        : "Connect your Google Drive to access your entire music collection instantly."}
                    </p>
                    {!isConnected && (
                    <button 
                        onClick={handleConnectDrive}
                        className="bg-white text-slate-900 px-6 py-2 md:px-8 md:py-3 rounded-full font-bold text-sm md:text-base hover:bg-blue-50 transition-colors shadow-lg"
                    >
                        Sync Google Drive
                    </button>
                    )}
                </div>
                </div>
            )}

            {currentView.type === 'playlist' && (
                <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-800 p-6 md:p-8 shadow-2xl shadow-indigo-500/20 flex items-end min-h-[200px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <FolderHeart size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-xs md:text-sm uppercase tracking-widest text-indigo-200 font-bold mb-1">Playlist</div>
                        <h2 className="text-3xl md:text-5xl font-bold font-display text-white leading-tight">
                            {currentPlaylistName}
                        </h2>
                        <p className="text-indigo-200 mt-2">{filteredTracks.length} tracks</p>
                    </div>
                </div>
            )}

            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-2xl font-bold font-display flex items-center space-x-2">
                  <span>{currentPlaylistName}</span>
                  <span className="text-slate-500 font-normal text-xs md:text-sm ml-2">({filteredTracks.length})</span>
                </h3>
                <div className="flex items-center space-x-1 md:space-x-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 md:p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-white'}`}><Grid size={16} /></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 md:p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-white'}`}><ListIcon size={16} /></button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                  {filteredTracks.map(track => (
                    <div 
                      key={track.id}
                      onClick={() => handleTrackSelect(track)}
                      className={`group cursor-pointer glass rounded-xl md:rounded-2xl p-3 md:p-4 transition-all duration-300 border-transparent hover:border-blue-500/40 hover:-translate-y-1 ${currentTrack?.id === track.id ? 'bg-blue-600/10 border-blue-500/30 ring-1 ring-blue-500/20' : ''}`}
                    >
                      <div className="relative aspect-square mb-3 md:mb-4 rounded-lg md:rounded-xl overflow-hidden shadow-lg shadow-black/40">
                        <img src={track.coverArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={track.name} />
                        <div className={`absolute inset-0 bg-slate-950/40 flex items-center justify-center transition-opacity duration-300 ${currentTrack?.id === track.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                            <Play size={20} fill="white" className="ml-1" />
                          </div>
                        </div>
                        {/* Add to Playlist Overlay Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setTrackToAdd(track); }}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-blue-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                            title="Add to Playlist"
                        >
                            <ListPlus size={16} />
                        </button>
                      </div>
                      <h4 className="font-semibold text-white truncate mb-1 text-xs md:text-sm">{track.name}</h4>
                      <p className="text-slate-500 text-[10px] md:text-xs truncate">{track.artist}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl md:rounded-2xl overflow-hidden border border-slate-800/50">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 text-[10px] md:text-xs uppercase tracking-wider border-b border-slate-800/50">
                        <th className="px-4 py-3 md:px-6 md:py-4 font-semibold w-8">#</th>
                        <th className="px-4 py-3 md:px-6 md:py-4 font-semibold">Title</th>
                        <th className="px-4 py-3 md:px-6 md:py-4 font-semibold hidden sm:table-cell">Artist</th>
                        <th className="px-4 py-3 md:px-6 md:py-4 font-semibold hidden md:table-cell">Album</th>
                        <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-right w-10"></th>
                        <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-right"><Clock size={14} className="inline mr-1" /></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {filteredTracks.map((track, idx) => (
                        <tr 
                          key={track.id} 
                          onClick={() => handleTrackSelect(track)}
                          className={`hover:bg-blue-600/5 transition-colors cursor-pointer group ${currentTrack?.id === track.id ? 'bg-blue-600/10' : ''}`}
                        >
                          <td className="px-4 py-3 md:px-6 md:py-4 text-xs text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3 md:px-6 md:py-4">
                            <div className="flex items-center space-x-3">
                              <img src={track.coverArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60'} className="w-8 h-8 md:w-10 md:h-10 rounded-md object-cover shadow-sm" alt="" />
                              <div className="min-w-0">
                                <span className={`block font-medium text-xs md:text-sm truncate ${currentTrack?.id === track.id ? 'text-blue-400' : 'text-slate-200'}`}>{track.name}</span>
                                <span className="block text-[10px] text-slate-500 sm:hidden">{track.artist}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 md:px-6 md:py-4 text-xs text-slate-400 hidden sm:table-cell">{track.artist}</td>
                          <td className="px-4 py-3 md:px-6 md:py-4 text-xs text-slate-400 hidden md:table-cell">{track.album || 'Unknown'}</td>
                          <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                             <button 
                                onClick={(e) => { e.stopPropagation(); setTrackToAdd(track); }}
                                className="text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="Add to Playlist"
                             >
                                <ListPlus size={16} />
                             </button>
                          </td>
                          <td className="px-4 py-3 md:px-6 md:py-4 text-xs text-slate-500 text-right">
                            {track.duration > 0 ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Player 
        track={currentTrack} 
        onNext={handleNext} 
        onPrevious={handlePrevious} 
        repeatMode={repeatMode}
        isShuffle={isShuffle}
        toggleRepeat={toggleRepeat}
        toggleShuffle={toggleShuffle}
        isFullScreen={isFullScreen}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
        onUpdateTrackCover={handleUpdateTrackCover}
      />

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showCreatePlaylist && (
        <CreatePlaylistModal 
          onClose={() => setShowCreatePlaylist(false)} 
          onSave={handleCreatePlaylist} 
        />
      )}

      {trackToAdd && (
        <AddToPlaylistModal
            track={trackToAdd}
            playlists={playlists}
            onClose={() => setTrackToAdd(null)}
            onAdd={handleAddToPlaylist}
            onCreateNew={() => { setTrackToAdd(null); setShowCreatePlaylist(true); }}
        />
      )}
    </div>
  );
};

export default App;
