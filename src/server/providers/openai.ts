import type { ProviderMetadata } from "../../shared/providerTypes.js";
import { assertBaseRequest, assertOk, getStringSetting } from "./common.js";
import { ProviderValidationError, type TtsProvider, type TtsResult } from "./types.js";

export const openAiMetadata: ProviderMetadata = {
  id: "openai",
  label: "OpenAI",
  description: "Preset-voice TTS for Cantonese text. Reference-audio cloning is not available in this adapter.",
  capabilities: {
    supportsReferenceAudio: false,
    supportsCantonese: "likely",
    supportsStreaming: false,
    requiresVoiceId: false,
    notes: [
      "Uses preset voices rather than uploaded-reference cloning.",
      "Cantonese quality can vary by model and text style; colloquial Hong Kong wording is recommended."
    ]
  },
  settings: [
    {
      key: "model",
      label: "Model",
      type: "select",
      defaultValue: "gpt-4o-mini-tts",
      options: [
        { value: "gpt-4o-mini-tts", label: "gpt-4o-mini-tts" },
        { value: "tts-1", label: "tts-1" },
        { value: "tts-1-hd", label: "tts-1-hd" }
      ]
    },
    {
      key: "voice",
      label: "Voice",
      type: "select",
      defaultValue: "alloy",
      options: [
        { value: "alloy", label: "Alloy" },
        { value: "ash", label: "Ash" },
        { value: "ballad", label: "Ballad" },
        { value: "coral", label: "Coral" },
        { value: "echo", label: "Echo" },
        { value: "fable", label: "Fable" },
        { value: "nova", label: "Nova" },
        { value: "onyx", label: "Onyx" },
        { value: "sage", label: "Sage" },
        { value: "shimmer", label: "Shimmer" },
        { value: "verse", label: "Verse" }
      ]
    }
  ]
};

export const openAiProvider: TtsProvider = {
  metadata: openAiMetadata,
  async synthesize(request): Promise<TtsResult> {
    assertBaseRequest(request);

    if (request.referenceAudio) {
      throw new ProviderValidationError("OpenAI reference-audio cloning is not available in this adapter.");
    }

    const model = getStringSetting(request, "model", "gpt-4o-mini-tts");
    const voice = getStringSetting(request, "voice", "alloy");

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        voice,
        input: request.text,
        response_format: "mp3"
      })
    });

    await assertOk(response, "OpenAI");

    return {
      audio: await response.arrayBuffer(),
      mimeType: "audio/mpeg",
      fileName: "openai-cantonese-tts.mp3",
      metadata: {
        model,
        voice,
        language: request.language,
        referenceAudioUsed: false
      }
    };
  }
};
