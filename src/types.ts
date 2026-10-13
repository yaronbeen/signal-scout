export const platforms = ['youtube', 'instagram', 'tiktok', 'linkedin', 'x'] as const;
export type Platform = typeof platforms[number];
export const platformNames: Record<Platform, string> = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', x: 'X' };
export type RawRecord = Record<string, unknown>;
export interface Evidence { url: string; text: string; kind: 'profile' | 'content' | 'search' | 'website' }
export interface Contact { email: string; sourceUrl: string; source: string }
export interface Creator {
  id: string;
  platform: Platform;
  url: string;
  name: string;
  handle: string;
  bio: string;
  avatar: string;
  followers: number | null;
  location: string;
  verified: boolean;
  websites: string[];
  contacts: Contact[];
  evidence: Evidence[];
  matchedTerms: string[];
  collectedAt: string;
  sample?: boolean;
  enrichmentError?: string;
}
export interface SearchConfig { brief: string; keywords: string[]; platforms: Platform[]; depth: number }
export interface PlatformProgress { phase: 'idle' | 'discovering' | 'enriching' | 'done' | 'error'; message: string; count: number; startedAt?: number; snapshot?: string }
export type Progress = Record<Platform, PlatformProgress>;
export interface Job { platform: Platform; stage: 'queued' | 'discover' | 'ready' | 'enrich' | 'uncertain'; snapshot: string; createdAt: number; config: SearchConfig; candidates?: Creator[]; uncertainStage?: 'discover' | 'enrich' | 'search'; message?: string }
