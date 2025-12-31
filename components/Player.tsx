
import React, { useState, useEffect, useRef } from 'react';
import { Track } from '../types';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, AlertCircle, Repeat1, ChevronDown, Maximize2 } from 'lucide-react';
import Visualizer from './Visualizer';

interface PlayerProps {
  track: Track | null;
  onNext: () => void;
  onPrevious: () => void;
  repeatMode: 'none' | 'all' | 'one';
  isShuffle: boolean;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onUpdateTrackCover?: (id: string, cover: string) => void;
}

const Player: React.FC<PlayerProps> = ({ 
  track, 
  onNext, 
  onPrevious,
  repeatMode,
  isShuffle,
  toggleRepeat,
  toggleShuffle,
  isFullScreen = false,
  onToggleFullScreen,
  onUpdateTrackCover
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isInitialMount = useRef(true);

  // Initialize Audio Context and Analyser
  const initAudioContext = () => {
    if (!audioCtxRef.current && audioRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audioRef.current);
      const anal = ctx.createAnalyser();
      src.connect(anal);
      anal.connect(ctx.destination);
      anal.fftSize = isFullScreen ? 512 : 256; // Higher resolution in full screen
      audioCtxRef.current = ctx;
      setAnalyser(anal);
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Metadata Extraction for Remote Blobs
  useEffect(() => {
    if (!track) return;
    
    // If it's a blob URL (remote track from Drive), try to extract ID3 tags
    // Only proceed if extraction hasn't happened yet (to avoid loops or redundancy)
    // We check if the current coverArt is null or looks like a google placeholder
    if (track.url.startsWith('blob:') && (!track.coverArt || track.coverArt.includes('drive-thirdparty'))) {
      const jsmediatags = (window as any).jsmediatags;
      
      if (jsmediatags) {
        fetch(track.url)
          .then(res => res.blob())
          .then(blob => {
            jsmediatags.read(blob, {
              onSuccess: (tag: any) => {
                const { picture } = tag.tags;
                if (picture) {
                  let base64String = "";
                  for (let i = 0; i < picture.data.length; i++) {
                    base64String += String.fromCharCode(picture.data[i]);
                  }
                  const base64 = "data:" + picture.format + ";base64," + window.btoa(base64String);
                  
                  // Update parent state
                  if (onUpdateTrackCover) {
                    onUpdateTrackCover(track.id, base64);
                  }
                }
              },
              onError: (error: any) => {
                console.log('Error reading tags:', error.type, error.info);
              }
            });
          })
          .catch(err => console.error("Error fetching blob for tags", err));
      }
    }
  }, [track?.id]); // Only run when track ID changes

  useEffect(() => {
    // Only reload audio if the track ID changes
    // This allows metadata (coverArt) to update without interrupting playback
    if (track && audioRef.current) {
      setError(null);
      
      // Force the audio element to reload the new source
      audioRef.current.load();

      // Don't auto-play on the very first mount of the component
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      const attemptPlay = async () => {
        if (!audioRef.current) return;
        try {
          initAudioContext();
          playPromiseRef.current = audioRef.current.play();
          if (playPromiseRef.current) {
            await playPromiseRef.current;
            setIsPlaying(true);
          }
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            console.log("Playback failed or was prevented:", e);
          }
          setIsPlaying(false);
        } finally {
          playPromiseRef.current = null;
        }
      };

      attemptPlay();
    }
  }, [track?.id]); // Critical: Depend on ID, not entire track object

  const togglePlay = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!audioRef.current || !track) return;

    if (isPlaying) {
      try {
        if (playPromiseRef.current) {
          await playPromiseRef.current;
        }
        audioRef.current.pause();
        setIsPlaying(false);
      } catch (e) {
        console.error("Pause failed:", e);
      }
    } else {
      initAudioContext();
      try {
        if (audioRef.current.readyState === 0) {
          audioRef.current.load();
        }
        playPromiseRef.current = audioRef.current.play();
        await playPromiseRef.current;
        setIsPlaying(true);
        setError(null);
      } catch (e) {
        console.error("Manual play failed:", e);
        setError("Unable to play this source.");
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioError = () => {
    console.error("Audio source error detected");
    setError("Failed to load audio source.");
    setIsPlaying(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("Replay failed:", e));
    } else {
      onNext();
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBarClick = (e: React.MouseEvent) => {
    // Only toggle if not clicking a button/input
    if (onToggleFullScreen && 
       !(e.target as HTMLElement).closest('button') && 
       !(e.target as HTMLElement).closest('input')) {
      onToggleFullScreen();
    }
  };

  if (!track) return null;

  const activeCover = track.coverArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60';
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={track.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload="auto"
      />

      {/* FULL SCREEN MODE */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300">
           {/* Background Blur */}
           <div className="absolute inset-0 z-0 opacity-100 pointer-events-none overflow-hidden">
             <img 
               src={activeCover} 
               className="w-full h-full object-cover blur-[80px] scale-125 animate-pulse-slow transition-all duration-700" 
               alt="" 
             />
             <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/60 to-slate-950"></div>
           </div>

           {/* Full Screen Header */}
           <div className="relative z-10 p-6 flex items-center justify-between shrink-0">
             <button onClick={onToggleFullScreen} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors backdrop-blur-sm">
               <ChevronDown size={32} />
             </button>
             <h2 className="text-sm font-medium tracking-widest text-white/80 uppercase drop-shadow-md">Now Playing</h2>
             <div className="w-10" /> {/* Spacer */}
           </div>

           {/* Full Screen Content - Scrollable for small screens */}
           <div className="relative z-10 flex-1 overflow-y-auto w-full no-scrollbar">
             <div className="flex flex-col items-center justify-center min-h-full p-6 space-y-6 md:space-y-12 pb-24 md:pb-12 max-w-2xl mx-auto">
               
               {/* Big Cover Art */}
               <div className="relative aspect-square w-full max-w-sm md:max-w-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/10 group shrink-0">
                  <img 
                    src={activeCover} 
                    className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`} 
                    alt={track.name} 
                  />
               </div>

               {/* Info & Visualizer */}
               <div className="w-full space-y-4 md:space-y-6 shrink-0">
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl md:text-4xl font-bold text-white font-display truncate drop-shadow-lg px-4">{track.name}</h1>
                    <p className="text-lg text-white/80 truncate drop-shadow-md px-4">{track.artist}</p>
                    <p className="text-sm text-white/60 truncate drop-shadow-md px-4">{track.album}</p>
                  </div>

                  <div className="h-16 md:h-24 w-full px-4">
                    <Visualizer analyser={analyser} isPlaying={isPlaying && !error} />
                  </div>
               </div>
               
               {/* Progress & Controls Wrapper */}
               <div className="w-full space-y-6 shrink-0 px-2 md:px-0">
                 {/* Progress */}
                 <div className="w-full space-y-2">
                   <div className="flex items-center justify-between text-xs font-medium text-white/70">
                     <span>{formatTime(currentTime)}</span>
                     <span>{formatTime(duration)}</span>
                   </div>
                   <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-blue-400"
                  />
                 </div>

                 {/* Big Controls */}
                 <div className="flex items-center justify-between w-full max-w-xs md:max-w-md mx-auto">
                    <button onClick={toggleShuffle} className={`p-3 rounded-full transition-colors backdrop-blur-sm ${isShuffle ? 'text-blue-400 bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                      <Shuffle size={24} />
                    </button>
                    <button onClick={onPrevious} className="text-white hover:scale-110 transition-transform p-2 drop-shadow-lg">
                      <SkipBack size={36} fill="currentColor" />
                    </button>
                    <button 
                      onClick={togglePlay}
                      className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-white/20"
                    >
                      {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={onNext} className="text-white hover:scale-110 transition-transform p-2 drop-shadow-lg">
                      <SkipForward size={36} fill="currentColor" />
                    </button>
                    <button onClick={toggleRepeat} className={`p-3 rounded-full transition-colors backdrop-blur-sm ${repeatMode !== 'none' ? 'text-blue-400 bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                      {repeatMode === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
                    </button>
                 </div>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* MINIMIZED BAR (Only show if not full screen) */}
      {!isFullScreen && (
        <div 
          onClick={handleBarClick}
          className="fixed bottom-0 left-0 right-0 glass border-t border-slate-800 z-50 cursor-pointer hover:bg-slate-900/80 transition-colors pb-[env(safe-area-inset-bottom)]"
        >
          {/* Mobile Progress Bar (Top Edge) */}
          <div className="md:hidden absolute top-0 left-0 right-0 h-1 bg-slate-800">
            <div 
              className="h-full bg-blue-500 transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 w-full h-4 -top-2 opacity-0 cursor-pointer"
            />
          </div>

          <div className="max-w-7xl mx-auto flex flex-col md:grid md:grid-cols-3 gap-0 md:gap-4 items-center p-2 md:p-6">
            {/* Track Info */}
            <div className="flex items-center space-x-3 w-full md:w-auto overflow-hidden">
              <div className="relative flex-shrink-0 group">
                <img 
                  src={activeCover} 
                  alt={track.name} 
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover shadow-lg shadow-blue-500/10 border transition-colors ${error ? 'border-red-500/50' : 'border-slate-700'}`}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <Maximize2 size={16} className="text-white" />
                </div>
                {error && (
                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 shadow-lg" title={error}>
                    <AlertCircle size={10} className="text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`font-semibold truncate text-sm md:text-lg font-display ${error ? 'text-red-400' : 'text-white'}`}>{track.name}</h3>
                <p className="text-slate-400 text-xs md:text-sm truncate">{track.artist}</p>
              </div>
              
              {/* Mobile Controls embedded in the row */}
              <div className="flex md:hidden items-center space-x-3 ml-2 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); onPrevious(); }} className="text-slate-300 hover:text-white p-1"><SkipBack size={20} /></button>
                <button 
                  onClick={(e) => { togglePlay(e); }}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-md ${error ? 'bg-slate-700 text-slate-500' : 'bg-white text-slate-900'}`}
                  disabled={!!error}
                >
                  {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} className="ml-1" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-slate-300 hover:text-white p-1"><SkipForward size={20} /></button>
              </div>
            </div>

            {/* Desktop Controls */}
            <div className="hidden md:flex flex-col items-center space-y-2 w-full">
              <div className="flex items-center space-x-6">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleShuffle(); }}
                  className={`relative transition-colors p-2 rounded-full hover:bg-slate-800 ${isShuffle ? 'text-blue-400' : 'text-slate-400'}`}
                  title="Shuffle"
                >
                  <Shuffle size={18} />
                  {isShuffle && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></div>}
                </button>

                <button onClick={(e) => { e.stopPropagation(); onPrevious(); }} className="text-slate-300 hover:text-white transition-colors hover:scale-110"><SkipBack size={24} /></button>
                
                <button 
                  onClick={(e) => togglePlay(e)}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${error ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:scale-105 shadow-lg shadow-white/10'}`}
                  disabled={!!error}
                >
                  {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
                </button>
                
                <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-slate-300 hover:text-white transition-colors hover:scale-110"><SkipForward size={24} /></button>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleRepeat(); }}
                  className={`relative transition-colors p-2 rounded-full hover:bg-slate-800 ${repeatMode !== 'none' ? 'text-blue-400' : 'text-slate-400'}`}
                  title="Repeat"
                >
                  {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                  {repeatMode !== 'none' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></div>}
                </button>
              </div>
              
              <div className="w-full flex items-center space-x-3">
                <span className="text-xs text-slate-500 w-10 text-right font-mono">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-1.5 transition-all"
                />
                <span className="text-xs text-slate-500 w-10 font-mono">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Visualizer & Volume (Desktop Only) */}
            <div className="hidden md:flex flex-col items-end space-y-3 w-full">
              <Visualizer analyser={analyser} isPlaying={isPlaying && !error} />
              <div className="flex items-center space-x-3 w-32 group">
                <Volume2 size={18} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Player;
