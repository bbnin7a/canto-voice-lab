import type { ProviderMetadata, TtsRequestBody } from "../../shared/providerTypes.js";

export interface TtsResult {
  audio: ArrayBuffer;
  mimeType: string;
  fileName: string;
  metadata: Record<string, string | number | boolean>;
  warnings?: string[];
}

export interface TtsProvider {
  metadata: ProviderMetadata;
  synthesize(request: TtsRequestBody): Promise<TtsResult>;
}

export class ProviderValidationError extends Error {
  code = "validation_error";

  constructor(message: string) {
    super(message);
    this.name = "ProviderValidationError";
  }
}

export class ProviderApiError extends Error {
  code = "provider_api_error";

  constructor(
    message: string,
    public status?: number,
    public detail?: string
  ) {
    super(message);
    this.name = "ProviderApiError";
  }
}
