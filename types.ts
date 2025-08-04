

export interface Person {
  id: string;
  name: string;
  relationship: string;
  photoUrl: string; // URL to an image
  keyInfo: string;
  keyInfoSummary?: string; // AI-generated summary for quick recall
  voiceNoteUrl?: string; // Optional: URL to a pre-recorded voice note
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  text: string;
  mood?: string; // Optional mood tracking
  tags?: string[]; // AI-generated tags
}

export interface Activity {
  id: string;
  name: string;
  time: string; // HH:MM format
  description?: string;
  isRecurring: boolean; // For simplicity, just a flag. Could be more complex.
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  address?: string; // Optional, if reverse geocoding is implemented
}

export interface SavedLocation {
  id: string;
  name: string;
  location: LocationInfo;
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // Other types of chunks can be added here if needed
}
