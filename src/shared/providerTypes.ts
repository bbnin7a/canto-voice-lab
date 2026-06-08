export type ProviderId = "elevenlabs" | "openai";

export type OutputFormat = "mp3" | "wav";

export interface ProviderCapabilities {
  supportsReferenceAudio: boolean;
  supportsCantonese: "clear" | "likely" | "uncertain";
  supportsStreaming: boolean;
  requiresVoiceId: boolean;
  notes: string[];
}

export interface SettingOption {
  value: string;
  label: string;
}

export interface ProviderSetting {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  min?: number;
  max?: number;
  step?: number;
  options?: SettingOption[];
}

export interface ProviderMetadata {
  id: ProviderId;
  label: string;
  description: string;
  capabilities: ProviderCapabilities;
  settings: ProviderSetting[];
}

export interface ReferenceAudioPayload {
  fileName: string;
  mimeType: string;
  base64: string;
}

export interface TtsRequestBody {
  provider: ProviderId;
  apiKey: string;
  text: string;
  consentConfirmed: boolean;
  language: "zh-HK";
  settings: Record<string, string | number | boolean | undefined>;
  referenceAudio?: ReferenceAudioPayload;
}

export interface TtsSuccessResponse {
  ok: true;
  provider: ProviderId;
  mimeType: string;
  fileName: string;
  audioBase64: string;
  metadata: Record<string, string | number | boolean>;
}

export interface TtsErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    detail?: string;
  };
}

export type TtsResponse = TtsSuccessResponse | TtsErrorResponse;
