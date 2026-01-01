
import React from 'react';
import { Track } from './types';

// ==========================================
// APP CONFIGURATION
// ==========================================

// 1. Paste your Google Cloud Client ID here.
//    You can get this from https://console.cloud.google.com/apis/credentials
//    If left empty, you will need to enter it in the App Settings UI.
export const GOOGLE_CLIENT_ID = '740773563373-luo03qlgkd3i3iafpefanjg6jod0d0ml.apps.googleusercontent.com'; 

// 2. (Optional) Paste your Gmail address here.
//    If set, the app will ONLY allow this specific email to log in.
//    Example: 'john.doe@gmail.com'
export const ALLOWED_USER_EMAIL = ''; 

// ==========================================

export const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    name: 'Midnight City',
    artist: 'Future Echoes',
    album: 'Neon Horizon',
    duration: 243,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverArt: 'https://picsum.photos/seed/track1/400/400',
    mimeType: 'audio/mpeg'
  },
  {
    id: '2',
    name: 'Starlight Drift',
    artist: 'Lumina',
    album: 'Celestial Paths',
    duration: 185,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverArt: 'https://picsum.photos/seed/track2/400/400',
    mimeType: 'audio/mpeg'
  },
  {
    id: '3',
    name: 'Digital Rain',
    artist: 'Cyber Runner',
    album: 'The Grid',
    duration: 312,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverArt: 'https://picsum.photos/seed/track3/400/400',
    mimeType: 'audio/mpeg'
  },
  {
    id: '4',
    name: 'Ethereal Whispers',
    artist: 'Spirit Walk',
    album: 'Nature Core',
    duration: 278,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    coverArt: 'https://picsum.photos/seed/track4/400/400',
    mimeType: 'audio/mpeg'
  }
];

export const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  bg: '#020617',
  surface: '#0f172a'
};
