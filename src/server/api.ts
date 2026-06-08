import { getProvider, getProviders } from "./providers";
import { ProviderApiError, ProviderValidationError } from "./providers/types";
import type { TtsRequestBody, TtsResponse } from "../shared/providerTypes";

export function providersResponse() {
  return {
    providers: getProviders().map((provider) => provider.metadata)
  };
}

export async function synthesizeResponse(body: TtsRequestBody): Promise<{
  status: number;
  payload: TtsResponse;
}> {
  const provider = getProvider(body.provider);

  if (!provider) {
    return {
      status: 400,
      payload: toError("unknown_provider", "Choose a supported provider.")
    };
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

    return {
      status: 200,
      payload
    };
  } catch (error) {
    if (error instanceof ProviderValidationError) {
      return {
        status: 400,
        payload: toError(error.code, error.message)
      };
    }

    if (error instanceof ProviderApiError) {
      return {
        status: error.status && error.status < 500 ? 400 : 502,
        payload: toError(error.code, error.message, error.detail)
      };
    }

    return {
      status: 500,
      payload: toError("internal_error", "The server could not generate audio.")
    };
  }
}

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
