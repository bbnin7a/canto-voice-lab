import { Download, KeyRound, Loader2, Mic, Play, ShieldCheck, Wand2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId, ProviderMetadata, ReferenceAudioPayload, TtsResponse } from "../shared/providerTypes";
import type { QualityRun, StorageMode } from "./appTypes";
import { base64ToBlob, createRunId, fileToBase64, summarizeSettings } from "./audioUtils";
import { DEFAULT_TEXT } from "./cantoneseSamples";
import { PanelTitle, QualityReview, SettingInput } from "./components";

export function App() {
  const [providers, setProviders] = useState<ProviderMetadata[]>([]);
  const [providerId, setProviderId] = useState<ProviderId>("elevenlabs");
  const [apiKey, setApiKey] = useState("");
  const [storageMode, setStorageMode] = useState<StorageMode>("session");
  const [text, setText] = useState(DEFAULT_TEXT);
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [referenceAudio, setReferenceAudio] = useState<ReferenceAudioPayload | undefined>();
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [downloadName, setDownloadName] = useState("cantonese-tts.mp3");
  const [isGenerating, setIsGenerating] = useState(false);
  const [qualityRuns, setQualityRuns] = useState<QualityRun[]>([]);
  const objectUrls = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      for (const url of objectUrls.current) {
        URL.revokeObjectURL(url);
      }
      objectUrls.current.clear();
    };
  }, []);

  useEffect(() => {
    fetch("/api/providers")
      .then((response) => response.json())
      .then((payload: { providers: ProviderMetadata[] }) => {
        setProviders(payload.providers);
        const firstProvider = payload.providers[0];
        if (firstProvider) {
          setProviderId(firstProvider.id);
        }
      })
      .catch(() => setError("Could not reach the local API server. Run npm run dev."));
  }, []);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === providerId),
    [providers, providerId]
  );

  useEffect(() => {
    const storage = storageMode === "local" ? window.localStorage : window.sessionStorage;
    setApiKey(storage.getItem(apiKeyStorageKey(providerId)) ?? "");
  }, [providerId, storageMode]);

  useEffect(() => {
    if (!selectedProvider) {
      return;
    }

    const defaults: Record<string, string | number> = {};
    for (const setting of selectedProvider.settings) {
      if (setting.defaultValue !== undefined) {
        defaults[setting.key] = setting.defaultValue;
      }
    }

    setSettings(defaults);
    setReferenceAudio(undefined);
    setConsentConfirmed(false);
    setAudioUrl("");
    setError("");
    setStatus("Ready");
  }, [selectedProvider]);

  const canUseReferenceAudio = Boolean(selectedProvider?.capabilities.supportsReferenceAudio);
  const generationBlocked =
    isGenerating ||
    !selectedProvider ||
    !apiKey.trim() ||
    !text.trim() ||
    Boolean(referenceAudio && !consentConfirmed);

  function persistApiKey(nextApiKey: string, nextStorageMode = storageMode) {
    setApiKey(nextApiKey);
    const key = apiKeyStorageKey(providerId);
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);

    if (nextApiKey.trim()) {
      const storage = nextStorageMode === "local" ? window.localStorage : window.sessionStorage;
      storage.setItem(key, nextApiKey);
    }
  }

  async function handleReferenceFile(file?: File) {
    if (!file) {
      setReferenceAudio(undefined);
      return;
    }

    const base64 = await fileToBase64(file);
    setReferenceAudio({
      fileName: file.name,
      mimeType: file.type || "audio/mpeg",
      base64
    });
  }

  async function handleGenerate() {
    if (!selectedProvider) {
      return;
    }

    setIsGenerating(true);
    setStatus("Generating Cantonese speech...");
    setError("");
    setAudioUrl("");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: selectedProvider.id,
          apiKey,
          text,
          consentConfirmed,
          language: "zh-HK",
          settings,
          referenceAudio
        })
      });

      const payload = (await response.json()) as TtsResponse;
      if (!payload.ok) {
        setError(payload.error.message);
        setStatus("Generation failed");
        return;
      }

      const blob = base64ToBlob(payload.audioBase64, payload.mimeType);
      const nextAudioUrl = rememberObjectUrl(URL.createObjectURL(blob));
      const reviewAudioUrl = rememberObjectUrl(URL.createObjectURL(blob));
      if (audioUrl) {
        revokeObjectUrl(audioUrl);
      }
      setAudioUrl(nextAudioUrl);
      setDownloadName(payload.fileName);
      setQualityRuns((current) => [
        {
          id: createRunId(),
          providerLabel: selectedProvider.label,
          providerId: selectedProvider.id,
          createdAt: new Date().toLocaleString(),
          text,
          settingsSummary: summarizeSettings(payload.metadata),
          referenceAudioUsed: Boolean(payload.metadata.referenceAudioUsed),
          cleanupWarning: typeof payload.metadata.cleanupWarning === "string" ? payload.metadata.cleanupWarning : undefined,
          audioUrl: reviewAudioUrl,
          downloadName: payload.fileName,
          rating: 0,
          notes: ""
        },
        ...current
      ]);
      setStatus(`Generated with ${selectedProvider.label}`);
    } catch {
      setError("Generation failed before the provider returned audio.");
      setStatus("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Canto Voice Lab</h1>
            <p>Compare Cantonese speech output from your own provider accounts.</p>
          </div>
          <div className="status-pill" aria-live="polite">
            {isGenerating ? <Loader2 className="spin" size={16} /> : <Volume2 size={16} />}
            <span>{status}</span>
          </div>
        </header>

        <div className="tool-grid">
          <section className="panel controls-panel" aria-label="Provider controls">
            <PanelTitle icon={<Wand2 size={18} />} title="Provider" />

            <div className="provider-list">
              {providers.map((provider) => (
                <button
                  className={provider.id === providerId ? "provider-card active" : "provider-card"}
                  key={provider.id}
                  onClick={() => setProviderId(provider.id)}
                  type="button"
                >
                  <span>{provider.label}</span>
                  <small>{provider.capabilities.supportsReferenceAudio ? "Reference audio" : "Preset voices"}</small>
                </button>
              ))}
            </div>

            {selectedProvider && (
              <div className="provider-note">
                <strong>{selectedProvider.description}</strong>
                <ul>
                  {selectedProvider.capabilities.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            <label className="field">
              <span>
                <KeyRound size={15} />
                API key
              </span>
              <input
                autoComplete="off"
                onChange={(event) => persistApiKey(event.target.value)}
                placeholder={selectedProvider ? `${selectedProvider.label} API key` : "API key"}
                type="password"
                value={apiKey}
              />
            </label>

            <div className="segmented" role="group" aria-label="API key storage">
              <button
                className={storageMode === "session" ? "active" : ""}
                onClick={() => {
                  setStorageMode("session");
                  persistApiKey(apiKey, "session");
                }}
                type="button"
              >
                Session
              </button>
              <button
                className={storageMode === "local" ? "active" : ""}
                onClick={() => {
                  setStorageMode("local");
                  persistApiKey(apiKey, "local");
                }}
                type="button"
              >
                Remember
              </button>
            </div>

            {selectedProvider?.settings.map((setting) => (
              <SettingInput
                key={setting.key}
                setting={setting}
                value={settings[setting.key]}
                onChange={(value) => setSettings((current) => ({ ...current, [setting.key]: value }))}
              />
            ))}
          </section>

          <section className="panel editor-panel" aria-label="Cantonese text editor">
            <PanelTitle icon={<Mic size={18} />} title="Cantonese Text" />
            <div className="language-row">
              <span>Language</span>
              <strong>zh-HK / 廣東話</strong>
            </div>
            <textarea
              aria-label="Cantonese text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              spellCheck={false}
            />
            <div className="editor-footer">
              <span>{text.length} characters</span>
              <button type="button" onClick={() => setText(DEFAULT_TEXT)}>
                Reset example
              </button>
            </div>

            <div className="warning">
              Some providers may pronounce Cantonese text as Mandarin. Use colloquial Traditional Chinese and listen carefully before publishing.
            </div>
          </section>

          <section className="panel audio-panel" aria-label="Reference and output audio">
            <PanelTitle icon={<ShieldCheck size={18} />} title="Voice & Output" />

            <div className={canUseReferenceAudio ? "upload-zone" : "upload-zone disabled"}>
              <label>
                <span>Reference recording</span>
                <input
                  accept="audio/*"
                  disabled={!canUseReferenceAudio}
                  onChange={(event) => handleReferenceFile(event.target.files?.[0])}
                  type="file"
                />
              </label>
              <small>
                {canUseReferenceAudio
                  ? referenceAudio?.fileName ?? "Upload a clean Cantonese clip, ideally 10-60 seconds."
                  : "This provider does not support uploaded reference audio here."}
              </small>
            </div>

            <label className="checkbox-row">
              <input
                checked={consentConfirmed}
                disabled={!referenceAudio}
                onChange={(event) => setConsentConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>I own this voice or have explicit permission to use it.</span>
            </label>

            <button
              className="generate-button"
              disabled={generationBlocked}
              onClick={handleGenerate}
              type="button"
            >
              {isGenerating ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              Generate speech
            </button>

            {error && <div className="error-box">{error}</div>}

            <div className="output-box">
              {audioUrl ? (
                <>
                  <audio controls src={audioUrl} />
                  <a className="download-link" download={downloadName} href={audioUrl}>
                    <Download size={16} />
                    Download audio
                  </a>
                </>
              ) : (
                <span>Generated audio will appear here.</span>
              )}
            </div>
          </section>
        </div>

        <QualityReview runs={qualityRuns} onClear={clearQualityRuns} onUpdate={updateQualityRun} />
      </section>
    </main>
  );

  function updateQualityRun(id: string, patch: Partial<Pick<QualityRun, "rating" | "notes">>) {
    setQualityRuns((current) =>
      current.map((run) => (run.id === id ? { ...run, ...patch } : run))
    );
  }

  function clearQualityRuns() {
    for (const run of qualityRuns) {
      revokeObjectUrl(run.audioUrl);
    }
    setQualityRuns([]);
  }

  function rememberObjectUrl(url: string) {
    objectUrls.current.add(url);
    return url;
  }

  function revokeObjectUrl(url: string) {
    URL.revokeObjectURL(url);
    objectUrls.current.delete(url);
  }
}

function apiKeyStorageKey(providerId: ProviderId) {
  return `canto-voice-lab:${providerId}:api-key`;
}
