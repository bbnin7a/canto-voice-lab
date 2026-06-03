import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getProvider, getProviders } from "./providers/index.js";
import { ProviderApiError, ProviderValidationError } from "./providers/types.js";
import type { TtsRequestBody, TtsResponse } from "../shared/providerTypes.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(express.json({ limit: "30mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/providers", (_request, response) => {
  response.json({
    providers: getProviders().map((provider) => provider.metadata)
  });
});

app.post("/api/tts", async (request, response) => {
  const body = request.body as TtsRequestBody;
  const provider = getProvider(body.provider);

  if (!provider) {
    response.status(400).json(toError("unknown_provider", "Choose a supported provider."));
    return;
  }

  try {
    const result = await provider.synthesize(body);
    const payload: TtsResponse = {
      ok: true,
      provider: body.provider,
      mimeType: result.mimeType,
      fileName: result.fileName,
      audioBase64: Buffer.from(result.audio).toString("base64"),
      metadata: result.metadata
    };

    if (result.warnings?.length) {
      payload.metadata.cleanupWarning = result.warnings.join(" ");
    }

    response.json(payload);
  } catch (error) {
    if (error instanceof ProviderValidationError) {
      response.status(400).json(toError(error.code, error.message));
      return;
    }

    if (error instanceof ProviderApiError) {
      response.status(error.status && error.status < 500 ? 400 : 502).json(
        toError(error.code, error.message, error.detail)
      );
      return;
    }

    response.status(500).json(toError("internal_error", "The local server could not generate audio."));
  }
});

const dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(dirname, "../../dist");
app.use(express.static(clientDist));
app.get("*", (_request, response) => {
  response.sendFile(path.join(clientDist, "index.html"));
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Canto Voice Lab API listening on http://127.0.0.1:${port}`);
});

function toError(code: string, message: string, detail?: string): TtsResponse {
  return {
    ok: false,
    error: {
      code,
      message,
      detail
    }
  };
}
