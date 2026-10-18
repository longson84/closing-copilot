import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { Risk } from '../../../src/shared/types';
import { riskLabel } from '../format';

type IconName =
  | 'pipeline'
  | 'plus'
  | 'spark'
  | 'close'
  | 'upload'
  | 'file'
  | 'check'
  | 'alert'
  | 'clock'
  | 'copy'
  | 'chevron'
  | 'phone'
  | 'message'
  | 'mail'
  | 'meeting'
  | 'send'
  | 'back'
  | 'user'
  | 'camera'
  | 'download'
  | 'share'
  | 'offline'
  | 'search'
  | 'building';

const paths: Record<IconName, ReactNode> = {
  pipeline: <path d="M4 6h16M4 12h10M4 18h6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  spark: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  file: <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: <path d="M12 8v5M12 16.5v.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />,
  clock: <path d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  copy: <path d="M9 9h10v12H9zM5 15V3h10" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />,
  message: <path d="M21 12a8 8 0 01-11.8 7L4 20l1.1-4.6A8 8 0 1121 12z" />,
  mail: <path d="M3 6h18v12H3zM3 7l9 6 9-6" />,
  meeting: <path d="M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />,
  send: <path d="M4 12l16-8-6 16-2-7-8-1z" />,
  back: <path d="M15 6l-6 6 6 6" />,
  user: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" />,
  camera: <path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1zM12 17a4 4 0 100-8 4 4 0 000 8z" />,
  search: <path d="M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4" />,
  building: <path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 10h4a1 1 0 011 1v10M3 21h18M8 8h3M8 12h3M8 16h3" />,
  download: <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />,
  share: <path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1" />,
  offline: <path d="M2 8.5a15 15 0 0120 0M5.5 12a10 10 0 0113 0M9 15.5a5 5 0 016 0M12 19.5v.01M3 3l18 18" />,
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
    >
      {paths[name]}
    </svg>
  );
}

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span className={`badge badge-${risk.toLowerCase()}`}>
      <span className="badge-dot" />
      {riskLabel[risk]}
    </span>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

const AI_STEPS = ['Uploading securely…', 'Reading with Document AI…', 'Extracting fields with Gemini…', 'Cross-checking against the deal record…'];

/** Indeterminate, step-labelled progress shown while the server runs OCR + Gemini. */
export function AiProgress({ steps = AI_STEPS }: { steps?: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 1100);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="ai-progress" role="status" aria-live="polite">
      <div className="ai-progress-bar">
        <span style={{ width: `${((i + 1) / (steps.length + 0.6)) * 100}%` }} />
      </div>
      <ol className="ai-steps">
        {steps.map((s, j) => (
          <li key={s} className={j < i ? 'done' : j === i ? 'active' : ''}>
            {j < i ? <Icon name="check" size={14} /> : j === i ? <Spinner size={12} /> : <span className="ai-step-dot" />}
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Dropzone({
  onFile,
  file,
  hint,
  disabled,
  compact,
}: {
  onFile: (f: File) => void;
  file?: File | null;
  hint: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const pickFrom = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = '';
  };
  return (
    <div className="picker">
    <div
      className={`dropzone${over ? ' over' : ''}${file ? ' has-file' : ''}${compact ? ' compact' : ''}${disabled ? ' disabled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f && !disabled) onFile(f);
      }}
      onClick={() => !disabled && input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          input.current?.click();
        }
      }}
    >
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <span className="dropzone-icon">
        <Icon name={file ? 'file' : 'upload'} size={20} />
      </span>
      {file ? (
        <span className="dropzone-text">
          <strong>{file.name}</strong>
          <span>{(file.size / 1024).toFixed(0)} KB · click to replace</span>
        </span>
      ) : (
        <span className="dropzone-text">
          <strong>Drop a file here or click to browse</strong>
          <span>{hint}</span>
        </span>
      )}
    </div>
    {/* Phone: camera capture + file/WhatsApp picker instead of drag & drop. */}
    <div className={`pick-mobile${compact ? ' compact' : ''}`}>
      {file ? (
        <div className="pick-file">
          <Icon name="file" size={16} />
          <span>
            <strong>{file.name}</strong>
            <small>{(file.size / 1024).toFixed(0)} KB</small>
          </span>
        </div>
      ) : (
        !compact && <p className="pick-hint">{hint}</p>
      )}
      <div className="pick-buttons">
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pickFrom} />
        <button type="button" className="btn btn-primary btn-touch" disabled={disabled} onClick={() => camera.current?.click()}>
          <Icon name="camera" size={18} /> {file ? 'Retake photo' : 'Take photo'}
        </button>
        <button type="button" className="btn btn-secondary btn-touch" disabled={disabled} onClick={() => input.current?.click()}>
          <Icon name="upload" size={18} /> Choose file
        </button>
      </div>
    </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel]);
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="dlg-title">{title}</h3>
        <div className="dialog-body">{body}</div>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={busy} autoFocus>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-note" role="alert">
      <Icon name="alert" size={16} />
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
