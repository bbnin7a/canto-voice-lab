import { elevenLabsProvider } from "./elevenlabs.js";
import { openAiProvider } from "./openai.js";
import type { TtsProvider } from "./types.js";
import type { ProviderId } from "../../shared/providerTypes.js";

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
