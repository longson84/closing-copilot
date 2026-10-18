import { useState, type KeyboardEvent, type ReactNode } from 'react';
import type { CustomerStatus, WhatsAppMessage } from '../../../src/shared/types';
import { statusLabel } from '../format';
import { Icon } from './ui';

export function StatusPill({ status }: { status: CustomerStatus }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}>{statusLabel[status]}</span>;
}

export function OriginBadge({ origin }: { origin: 'AI' | 'AGENT' | 'DEAL' }) {
  if (origin === 'AI')
    return (
      <span className="origin origin-ai">
        <Icon name="spark" size={11} /> AI
      </span>
    );
  if (origin === 'DEAL') return <span className="origin origin-deal">Deal deadline</span>;
  return <span className="origin origin-agent">You</span>;
}

export function WhatsAppBadge() {
  return (
    <span className="origin origin-wa">
      <Icon name="message" size={11} /> WhatsApp
    </span>
  );
}

/** Multi-select chip group. */
export function ChipToggles<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  label: string;
}) {
  return (
    <div className="chip-toggles" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            type="button"
            key={o}
            className={`chip-toggle${on ? ' on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
          >
            {on && <Icon name="check" size={12} />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Free-text tags: type and press Enter or comma. */
export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    const t = draft.trim().replace(/,$/, '');
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="tag-input">
      {value.map((t) => (
        <span key={t} className="tag-item">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
            <Icon name="close" size={11} />
          </button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={commit} placeholder={value.length ? '' : placeholder} />
    </div>
  );
}

export function Transcript({ messages }: { messages: WhatsAppMessage[] }) {
  return (
    <div className="wa-chat">
      {messages.map((m, i) => (
        <div key={i} className={`wa-msg wa-${m.from.toLowerCase()}`}>
          <p>{m.text}</p>
          {m.time && <span className="wa-time">{m.time}</span>}
        </div>
      ))}
    </div>
  );
}

export function Section({ title, hint, action, children }: { title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        {action ?? (hint && <span className="card-hint">{hint}</span>)}
      </div>
      {children}
    </section>
  );
}

/** Fired after reminders change so the nav badge refreshes. */
export const REMINDERS_CHANGED = 'cc:reminders-changed';

export const BEDROOMS = ['Studio', '1BR', '2BR', '3BR', '4BR', '5BR', 'Penthouse'] as const;
export const SEGMENT_OPTS = ['CCR', 'RCR', 'OCR'] as const;
