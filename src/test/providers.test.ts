import { describe, expect, it, vi, afterEach } from "vitest";
import { elevenLabsProvider } from "../server/providers/elevenlabs";
import { openAiProvider } from "../server/providers/openai";
import { ProviderValidationError } from "../server/providers/types";
import type { TtsRequestBody } from "../shared/providerTypes";

const baseRequest: TtsRequestBody = {
  provider: "openai",
  apiKey: "test-key",
  text: "佢今日喺香港飲咗杯奶茶。",
  consentConfirmed: false,
  language: "zh-HK",
  settings: {}
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("provider metadata", () => {
  it("describes OpenAI as preset voice only", () => {
    expect(openAiProvider.metadata.capabilities.supportsReferenceAudio).toBe(false);
    expect(openAiProvider.metadata.capabilities.supportsCantonese).toBe("likely");
  });

  it("describes ElevenLabs as supporting reference audio with Cantonese caution", () => {
    expect(elevenLabsProvider.metadata.capabilities.supportsReferenceAudio).toBe(true);
    expect(elevenLabsProvider.metadata.capabilities.supportsCantonese).toBe("uncertain");
  });
});

describe("OpenAI adapter", () => {
  it("rejects reference audio when the adapter does not support it", async () => {
    await expect(
      openAiProvider.synthesize({
        ...baseRequest,
        referenceAudio: {
          fileName: "voice.mp3",
          mimeType: "audio/mpeg",
          base64: "AA=="
        }
      })
    ).rejects.toThrow(ProviderValidationError);
  });

  it("rejects unsupported reference audio types before provider calls", async () => {
    await expect(
      openAiProvider.synthesize({
        ...baseRequest,
        consentConfirmed: true,
        referenceAudio: {
          fileName: "voice.txt",
          mimeType: "text/plain",
          base64: "AA=="
        }
      })
    ).rejects.toThrow("Reference audio must be MP3");
  });

  it("calls the speech endpoint with Cantonese text", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await openAiProvider.synthesize(baseRequest);
    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: baseRequest.text
    });
    expect(result.mimeType).toBe("audio/mpeg");
  });
});

describe("ElevenLabs adapter", () => {
  it("requires a voice ID or reference audio", async () => {
    await expect(
      elevenLabsProvider.synthesize({
        ...baseRequest,
        provider: "elevenlabs"
      })
    ).rejects.toThrow("Enter an ElevenLabs voice ID");
  });

  it("uses an existing voice ID without creating a temporary voice", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await elevenLabsProvider.synthesize({
      ...baseRequest,
      provider: "elevenlabs",
      settings: {
        voiceId: "abc123"
      }
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/text-to-speech/abc123");
    expect(result.metadata.referenceAudioUsed).toBe(false);
  });

  it("creates and deletes a temporary voice for reference audio", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ voice_id: "temp-voice" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await elevenLabsProvider.synthesize({
      ...baseRequest,
      provider: "elevenlabs",
      consentConfirmed: true,
      referenceAudio: {
        fileName: "voice.mp3",
        mimeType: "audio/mpeg",
        base64: "AA=="
      }
    });

    expect(String(fetchMock.mock.calls[0][0])).toContain("/voices/add");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/text-to-speech/temp-voice");
    expect(String(fetchMock.mock.calls[2][0])).toContain("/voices/temp-voice");
    expect(result.metadata.temporaryVoiceCreated).toBe(true);
  });

  it("reports when temporary voice cleanup fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ voice_id: "temp-voice" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await elevenLabsProvider.synthesize({
      ...baseRequest,
      provider: "elevenlabs",
      consentConfirmed: true,
      referenceAudio: {
        fileName: "voice.mp3",
        mimeType: "audio/mpeg",
        base64: "AA=="
      }
    });

    expect(result.warnings).toEqual([
      "Temporary ElevenLabs voice cleanup failed; check your ElevenLabs voice library."
    ]);
  });
});
