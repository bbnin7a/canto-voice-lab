import { elevenLabsProvider } from "./elevenlabs";
import { openAiProvider } from "./openai";
import type { TtsProvider } from "./types";
import type { ProviderId } from "../../shared/providerTypes";

const providers = new Map<ProviderId, TtsProvider>([
  [elevenLabsProvider.metadata.id, elevenLabsProvider],
  [openAiProvider.metadata.id, openAiProvider]
]);

export function getProviders(): TtsProvider[] {
  return [...providers.values()];
}

export function getProvider(id: ProviderId): TtsProvider | undefined {
  return providers.get(id);
}
