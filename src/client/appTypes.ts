import type { ProviderId } from "../shared/providerTypes";

export type StorageMode = "session" | "local";

export interface QualityRun {
  id: string;
  providerLabel: string;
  providerId: ProviderId;
  createdAt: string;
  text: string;
  settingsSummary: string;
  referenceAudioUsed: boolean;
  cleanupWarning?: string;
  audioUrl: string;
  downloadName: string;
  rating: number;
  notes: string;
}
