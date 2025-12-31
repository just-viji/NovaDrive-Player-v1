
export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  coverArt: string;
  mimeType: string;
  isRemote?: boolean;
}

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  repeat: 'none' | 'one' | 'all';
  shuffle: boolean;
}

export interface GeminiAnalysis {
  vibe: string;
  genres: string[];
  description: string;
  suggestedActivities: string[];
}
