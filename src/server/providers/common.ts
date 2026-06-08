import { ProviderApiError, ProviderValidationError } from "./types";
import type { TtsRequestBody } from "../../shared/providerTypes";

const MAX_REFERENCE_AUDIO_BYTES = 20 * 1024 * 1024;
const SUPPORTED_REFERENCE_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm"
]);

export function assertBaseRequest(request: TtsRequestBody): void {
  if (!request.apiKey?.trim()) {
    throw new ProviderValidationError("Enter an API key for the selected provider.");
  }

  if (!request.text?.trim()) {
    throw new ProviderValidationError("Enter Cantonese text to synthesize.");
  }

  if (request.text.length > 5000) {
    throw new ProviderValidationError("Text is too long. Keep it under 5,000 characters.");
  }

  if (request.referenceAudio && !request.consentConfirmed) {
    throw new ProviderValidationError("Confirm that you have permission to use the uploaded reference voice.");
  }

  if (request.referenceAudio) {
    validateReferenceAudio(request.referenceAudio.mimeType, request.referenceAudio.base64);
  }
}

export function getStringSetting(
  request: TtsRequestBody,
  key: string,
  fallback: string
): string {
  const value = request.settings[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function getNumberSetting(
  request: TtsRequestBody,
  key: string,
  fallback: number
): number {
  const value = request.settings[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export async function assertOk(response: Response, providerLabel: string): Promise<void> {
  if (response.ok) {
    return;
  }

  const detail = await response.text().catch(() => "");
  throw new ProviderApiError(
    `${providerLabel} rejected the request.`,
    response.status,
    detail.slice(0, 1200)
  );
}

export function decodeReferenceAudio(base64: string): ArrayBuffer {
  const buffer = Buffer.from(base64, "base64");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

function validateReferenceAudio(mimeType: string, base64: string): void {
  const normalizedMimeType = mimeType.toLowerCase();
  if (!SUPPORTED_REFERENCE_AUDIO_TYPES.has(normalizedMimeType)) {
    throw new ProviderValidationError("Reference audio must be MP3, WAV, M4A, AAC, OGG, or WebM.");
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new ProviderValidationError("Reference audio could not be decoded.");
  }

  const byteLength = Buffer.byteLength(base64, "base64");
  if (byteLength === 0) {
    throw new ProviderValidationError("Reference audio is empty.");
  }

  if (byteLength > MAX_REFERENCE_AUDIO_BYTES) {
    throw new ProviderValidationError("Reference audio must be 20 MB or smaller.");
  }
}
