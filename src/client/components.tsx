import { Download, History, Star, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ProviderSetting } from "../shared/providerTypes";
import type { QualityRun } from "./appTypes";

export function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

export function SettingInput({
  setting,
  value,
  onChange
}: {
  setting: ProviderSetting;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
}) {
  return (
    <label className="field">
      <span>{setting.label}</span>
      {setting.type === "select" ? (
        <select value={String(value ?? setting.defaultValue ?? "")} onChange={(event) => onChange(event.target.value)}>
          {setting.options?.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          min={setting.min}
          max={setting.max}
          onChange={(event) => onChange(setting.type === "number" ? Number(event.target.value) : event.target.value)}
          placeholder={setting.placeholder}
          step={setting.step}
          type={setting.type}
          value={value ?? ""}
        />
      )}
    </label>
  );
}

export function QualityReview({
  runs,
  onClear,
  onUpdate
}: {
  runs: QualityRun[];
  onClear: () => void;
  onUpdate: (id: string, patch: Partial<Pick<QualityRun, "rating" | "notes">>) => void;
}) {
  return (
    <section className="panel quality-panel" aria-label="Quality review">
      <div className="quality-header">
        <PanelTitle icon={<History size={18} />} title="Quality Review" />
        <button className="text-button" disabled={runs.length === 0} onClick={onClear} type="button">
          <Trash2 size={15} />
          Clear
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="empty-review">
          Generate Cantonese speech to compare naturalness, pronunciation, pacing, and voice match.
        </div>
      ) : (
        <div className="run-list">
          {runs.map((run) => (
            <article className="run-card" key={run.id}>
              <div className="run-meta">
                <div>
                  <strong>{run.providerLabel}</strong>
                  <span>{run.createdAt}</span>
                </div>
                <small>{run.settingsSummary}</small>
              </div>
              <p>{run.text}</p>
              {run.cleanupWarning && <div className="warning compact-warning">{run.cleanupWarning}</div>}
              <audio controls src={run.audioUrl} />
              <div className="rating-row" aria-label={`Rating for ${run.providerLabel}`}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    aria-label={`Rate ${rating} stars`}
                    className={run.rating >= rating ? "star active" : "star"}
                    key={rating}
                    onClick={() => onUpdate(run.id, { rating })}
                    type="button"
                  >
                    <Star size={17} />
                  </button>
                ))}
                <span>{run.rating ? `${run.rating}/5` : "Not rated"}</span>
              </div>
              <textarea
                aria-label={`Quality notes for ${run.providerLabel}`}
                className="notes-input"
                onChange={(event) => onUpdate(run.id, { notes: event.target.value })}
                placeholder="Notes: tone accuracy, Cantonese pronunciation, pauses, voice similarity..."
                value={run.notes}
              />
              <a className="download-link compact" download={run.downloadName} href={run.audioUrl}>
                <Download size={16} />
                Download
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
