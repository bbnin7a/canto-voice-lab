import type { ProviderMetadata, TtsRequestBody } from "../../shared/providerTypes";
import {
  assertBaseRequest,
  assertOk,
  decodeReferenceAudio,
  getNumberSetting,
  getStringSetting
} from "./common";
import { ProviderValidationError, type TtsProvider, type TtsResult } from "./types";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

export const elevenLabsMetadata: ProviderMetadata = {
  id: "elevenlabs",
  label: "ElevenLabs",
  description: "Human-style TTS with voice IDs and optional temporary reference-audio cloning.",
  capabilities: {
    supportsReferenceAudio: true,
    supportsCantonese: "uncertain",
    supportsStreaming: false,
    requiresVoiceId: false,
    notes: [
      "Use an existing voice ID for the most predictable flow.",
      "Reference audio creates a temporary IVC voice through ElevenLabs, then attempts cleanup.",
      "Cantonese support is not guaranteed to be native; listen for Mandarin-like pronunciation."
    ]
  },
  settings: [
    {
      key: "model",
      label: "Model",
      type: "select",
      defaultValue: "eleven_multilingual_v2",
      options: [
        { value: "eleven_multilingual_v2", label: "eleven_multilingual_v2" },
        { value: "eleven_turbo_v2_5", label: "eleven_turbo_v2_5" },
        { value: "eleven_flash_v2_5", label: "eleven_flash_v2_5" }
      ]
    },
    {
      key: "languageCode",
      label: "Language code",
      type: "select",
      defaultValue: "zh",
      options: [
        { value: "zh", label: "Chinese (zh)" },
        { value: "", label: "Auto-detect" }
      ]
    },
    {
      key: "voiceId",
      label: "Voice ID",
      type: "text",
      placeholder: "Existing ElevenLabs voice ID, or upload reference audio"
    },
    {
      key: "stability",
      label: "Stability",
      type: "number",
      defaultValue: 0.45,
      min: 0,
      max: 1,
      step: 0.05
    },
    {
      key: "similarityBoost",
      label: "Similarity",
      type: "number",
      defaultValue: 0.75,
      min: 0,
      max: 1,
      step: 0.05
    }
  ]
};

export const elevenLabsProvider: TtsProvider = {
  metadata: elevenLabsMetadata,
  async synthesize(request): Promise<TtsResult> {
    assertBaseRequest(request);

    const model = getStringSetting(request, "model", "eleven_multilingual_v2");
    const languageCode = getStringSetting(request, "languageCode", "zh");
    const providedVoiceId = getStringSetting(request, "voiceId", "");
    let voiceId = providedVoiceId;
    let temporaryVoiceId: string | undefined;
    const warnings: string[] = [];

    if (!voiceId && !request.referenceAudio) {
      throw new ProviderValidationError("Enter an ElevenLabs voice ID or upload permitted reference audio.");
    }

    try {
      if (!voiceId && request.referenceAudio) {
        temporaryVoiceId = await createTemporaryVoice(request);
        voiceId = temporaryVoiceId;
      }

      const stability = clamp01(getNumberSetting(request, "stability", 0.45));
      const similarityBoost = clamp01(getNumberSetting(request, "similarityBoost", 0.75));

      const response = await fetch(
        `${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": request.apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: request.text,
            model_id: model,
            ...(languageCode ? { language_code: languageCode } : {}),
            voice_settings: {
              stability,
              similarity_boost: similarityBoost
            }
          })
        }
      );

      await assertOk(response, "ElevenLabs");

      return {
        audio: await response.arrayBuffer(),
        mimeType: "audio/mpeg",
        fileName: "elevenlabs-cantonese-tts.mp3",
        metadata: {
          model,
          languageCode: languageCode || "auto",
          voiceId,
          language: request.language,
          referenceAudioUsed: Boolean(request.referenceAudio),
          temporaryVoiceCreated: Boolean(temporaryVoiceId)
        },
        warnings
      };
    } finally {
      if (temporaryVoiceId) {
        const deleted = await deleteTemporaryVoice(request.apiKey, temporaryVoiceId);
        if (!deleted) {
          warnings.push("Temporary ElevenLabs voice cleanup failed; check your ElevenLabs voice library.");
        }
      }
    }
  }
};

async function createTemporaryVoice(request: TtsRequestBody): Promise<string> {
  if (!request.referenceAudio) {
    throw new ProviderValidationError("Reference audio is required to create a temporary ElevenLabs voice.");
  }

  const formData = new FormData();
  formData.append("name", `canto-voice-lab-${Date.now()}`);
  formData.append(
    "files",
    new Blob([decodeReferenceAudio(request.referenceAudio.base64)], {
      type: request.referenceAudio.mimeType || "audio/mpeg"
    }),
    request.referenceAudio.fileName || "reference-audio.mp3"
  );

  const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/add`, {
    method: "POST",
    headers: {
      "xi-api-key": request.apiKey
    },
    body: formData
  });

  await assertOk(response, "ElevenLabs voice creation");

  const payload = (await response.json()) as { voice_id?: string };
  if (!payload.voice_id) {
    throw new ProviderValidationError("ElevenLabs did not return a voice ID for the uploaded reference audio.");
  }

  return payload.voice_id;
}

async function deleteTemporaryVoice(apiKey: string, voiceId: string): Promise<boolean> {
  const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/${encodeURIComponent(voiceId)}`, {
    method: "DELETE",
    headers: {
      "xi-api-key": apiKey
    }
  }).catch(() => undefined);

  return Boolean(response?.ok);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
