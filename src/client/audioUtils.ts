export async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return dataUrl.split(",", 2)[1] ?? "";
}

export function base64ToBlob(base64: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const bytes = new Uint8Array(byteCharacters.length);
  for (let index = 0; index < byteCharacters.length; index += 1) {
    bytes[index] = byteCharacters.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

export function createRunId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function summarizeSettings(metadata: Record<string, string | number | boolean>) {
  const parts = [
    metadata.model ? `model ${metadata.model}` : "",
    metadata.voice ? `voice ${metadata.voice}` : "",
    metadata.voiceId ? `voice ID ${metadata.voiceId}` : "",
    metadata.referenceAudioUsed ? "reference audio" : "no reference audio"
  ].filter(Boolean);

  return parts.join(" · ");
}
