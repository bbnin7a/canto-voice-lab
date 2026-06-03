import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../client/App";
import { elevenLabsMetadata } from "../server/providers/elevenlabs";
import { openAiMetadata } from "../server/providers/openai";

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  if (!window.URL.createObjectURL) {
    Object.defineProperty(window.URL, "createObjectURL", {
      value: vi.fn(() => "blob:http://127.0.0.1/test-audio"),
      configurable: true
    });
  }
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/providers") {
        return new Response(JSON.stringify({ providers: [elevenLabsMetadata, openAiMetadata] }), { status: 200 });
      }

      if (url === "/api/tts") {
        return new Response(
          JSON.stringify({
            ok: true,
            provider: "openai",
            mimeType: "audio/mpeg",
            fileName: "test-cantonese.mp3",
            audioBase64: "AQID",
            metadata: {
              model: "gpt-4o-mini-tts",
              voice: "alloy",
              language: "zh-HK",
              referenceAudioUsed: false
            }
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "validation_error",
            message: "Enter an API key for the selected provider."
          }
        }),
        { status: 400 }
      );
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the tool with Cantonese defaults", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Canto Voice Lab" })).toBeInTheDocument();
    expect(screen.getByText("zh-HK / 廣東話")).toBeInTheDocument();
    expect(screen.getByLabelText("Cantonese text")).toHaveValue(
      "大家好，我哋今日試吓用自然啲嘅廣東話嚟讀呢段文字。佢唔需要太誇張，但要有少少人味同停頓。"
    );
  });

  it("disables reference upload when OpenAI is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /OpenAI/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Reference recording/i)).toBeDisabled();
    });
    expect(screen.getByText("This provider does not support uploaded reference audio here.")).toBeInTheDocument();
  });

  it("requires an API key before generation can run", async () => {
    render(<App />);

    expect(await screen.findByRole("button", { name: /Generate speech/i })).toBeDisabled();
  });

  it("adds generated audio to the quality review workflow", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /OpenAI/i }));
    await user.type(screen.getByLabelText("API key"), "test-key");
    await user.click(screen.getByRole("button", { name: /Generate speech/i }));

    expect(await screen.findByText("Generated with OpenAI")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Quality review" })).toHaveTextContent("OpenAI");

    await user.click(screen.getByRole("button", { name: "Rate 4 stars" }));
    expect(screen.getByText("4/5")).toBeInTheDocument();
  });
});
